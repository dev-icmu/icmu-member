-- Paper form identifiers and fee records are separate from issued membership IDs.
-- Existing online/legacy rows intentionally keep null form, fee and audit values.
-- Both data access and bridge renewal must stop when Supabase expires a session.
create or replace function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from private.admin_bridge_sessions b
    join auth.sessions s on s.id=b.session_id and s.user_id=b.user_id
    where b.user_id=auth.uid() and b.session_id::text=auth.jwt()->>'session_id'
      and b.verified_until>now() and b.web_expires_at>now()
      and (s.not_after is null or s.not_after>now())
  );
$$;
create or replace function private.bridge_session_exists(p_user_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions s where s.id=p_session_id and s.user_id=p_user_id
    and (s.not_after is null or s.not_after>now()));
$$;

alter table public.member
  add column form_number varchar(50) unique,
  add column school_class varchar(30),
  add column address varchar(500),
  add column other_skills varchar(500),
  add column application_source varchar(10) check (application_source in ('paper','online')),
  add column fee_amount numeric(10,2) check (fee_amount between 0 and 999999.99),
  add column fee_paid_at timestamptz,
  add column processed_by uuid references auth.users(id) on delete set null,
  add column processed_by_name text,
  add column processed_at timestamptz,
  add column approved_by uuid references auth.users(id) on delete set null,
  add column approved_by_name text,
  add column approved_at timestamptz;

create function private.save_member_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  v_result jsonb;
  v_actor_name text;
  v_fee_received boolean;
  is_new boolean := p_id is null;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and not is_new then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;

  if is_new then
    m.application_source:=case when p_admin then 'paper' else 'online' end;
    if p_admin then m.fee_amount:=500; end if;
  else
    select * into m from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  end if;

  if p_payload ? 'school_class' then m.school_class:=nullif(btrim(p_payload->>'school_class'),''); end if;
  if p_payload ? 'address' then m.address:=nullif(btrim(p_payload->>'address'),''); end if;
  if p_payload ? 'other_skills' then m.other_skills:=nullif(btrim(p_payload->>'other_skills'),''); end if;
  if p_admin then
    if p_payload ? 'application_source' and p_payload->>'application_source' is not null then
      if p_payload->>'application_source' not in ('paper','online')
        or (m.application_source is not null and p_payload->>'application_source'<>m.application_source) then
        raise exception 'Application source cannot be changed' using errcode='22023';
      end if;
      m.application_source:=p_payload->>'application_source';
    end if;
    if p_payload ? 'form_number' then
      if jsonb_typeof(p_payload->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
      m.form_number:=nullif(btrim(p_payload->>'form_number'),'');
    end if;
    if p_payload ? 'fee_amount' then
      if jsonb_typeof(p_payload->'fee_amount') not in ('number','null') then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
      if (p_payload->>'fee_amount')::numeric<>round((p_payload->>'fee_amount')::numeric,2) then raise exception 'Fee amount can have at most two decimal places' using errcode='22023'; end if;
      m.fee_amount:=(p_payload->>'fee_amount')::numeric;
    end if;
    if m.fee_amount is not null and (m.fee_amount<0 or m.fee_amount>999999.99) then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
    if p_payload ? 'fee_received' then
      if jsonb_typeof(p_payload->'fee_received') is distinct from 'boolean' then raise exception 'Choose whether the fee has been received' using errcode='22023'; end if;
      v_fee_received:=(p_payload->>'fee_received')::boolean;
      if v_fee_received and m.fee_amount is null then raise exception 'Enter the fee amount before recording payment' using errcode='22023'; end if;
      m.fee_paid_at:=case when v_fee_received then coalesce(m.fee_paid_at,now()) else null end;
    end if;
    if m.application_source='paper' and (m.form_number is null or m.school_class is null or m.address is null or m.fee_amount is null) then
      raise exception 'Paper applications need a form number, class, address and fee amount' using errcode='22023';
    end if;
    if m.processed_at is null then
      select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'),''),'ICMU admin') into v_actor_name from auth.users where id=auth.uid();
      m.processed_by:=auth.uid(); m.processed_by_name:=v_actor_name; m.processed_at:=now();
    end if;
  end if;

  -- The existing core still validates and saves member/guardian data atomically.
  -- Any later unique form-number failure rolls this entire statement back too.
  v_result:=private.save_member(p_id,p_payload,p_admin);
  update public.member set
    form_number=m.form_number,school_class=m.school_class,address=m.address,other_skills=m.other_skills,
    application_source=m.application_source,fee_amount=m.fee_amount,fee_paid_at=m.fee_paid_at,
    processed_by=m.processed_by,processed_by_name=m.processed_by_name,processed_at=m.processed_at
  where id=(v_result->>'id')::uuid;
  return v_result;
end; $$;
revoke all on function private.save_member_application(uuid,jsonb,boolean) from public,anon,authenticated;

create or replace function private.submit_application(p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$
  select private.save_member_application(null,p_payload,false);
$$;
create or replace function private.admin_save(p_id uuid,p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$
  select private.save_member_application(p_id,p_payload,true);
$$;

-- Only approval issues an ID. Online and legacy records retain their existing rules.
create or replace function private.approve(p_id uuid) returns varchar language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype; seq int; prefix text; result varchar; v_actor_name text;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if m.membership_status='accepted' then return m.member_id; end if;
  if m.membership_status<>'pending' or not m.is_active then raise exception 'Only active pending applications can be approved' using errcode='22023'; end if;
  if m.application_source='paper' and m.fee_paid_at is null then raise exception 'Record the membership fee before approving this paper application' using errcode='22023'; end if;
  if m.batch_year is null then raise exception 'Member batch year is missing' using errcode='22023'; end if;
  prefix:=lpad((m.batch_year%100)::text,2,'0')||'M';
  perform pg_advisory_xact_lock(74123,m.batch_year);
  select greatest(coalesce(max(substring(member_id from 4)::int),0),coalesce((select current_count from public.batch_counts where batch_year=m.batch_year),0))+1 into seq from public.member where member_id like prefix||'%';
  if seq>999 then raise exception 'Batch year sequence exhausted'; end if;
  result:=prefix||lpad(seq::text,3,'0');
  insert into public.batch_counts(batch_year,current_count) values(m.batch_year,seq) on conflict(batch_year) do update set current_count=excluded.current_count;
  select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'),''),'ICMU admin') into v_actor_name from auth.users where id=auth.uid();
  update public.member set membership_status='accepted',member_id=result,approved_by=auth.uid(),approved_by_name=v_actor_name,approved_at=now() where id=p_id;
  return result;
end; $$;

notify pgrst, 'reload schema';

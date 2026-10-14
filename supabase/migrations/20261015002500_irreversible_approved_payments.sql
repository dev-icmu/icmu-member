begin;

create or replace function private.save_member_application(p_id uuid,p_payload jsonb,p_admin boolean)
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

  if p_payload ? 'city' then m.city:=nullif(btrim(p_payload->>'city'),''); end if;
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
      -- Irreversible check: Fee amount cannot be changed after approval with payment
      if m.membership_status='accepted' and m.fee_paid_at is not null and (p_payload->>'fee_amount')::numeric is distinct from m.fee_amount then
        raise exception 'Fee amount cannot be changed after member approval' using errcode='22023';
      end if;
      m.fee_amount:=(p_payload->>'fee_amount')::numeric;
    end if;
    if m.fee_amount is not null and (m.fee_amount<0 or m.fee_amount>999999.99) then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
    if p_payload ? 'fee_received' then
      if jsonb_typeof(p_payload->'fee_received') is distinct from 'boolean' then raise exception 'Choose whether the fee has been received' using errcode='22023'; end if;
      v_fee_received:=(p_payload->>'fee_received')::boolean;
      -- Irreversible check: Fee payment cannot be reversed after approval
      if m.membership_status='accepted' and m.fee_paid_at is not null and not v_fee_received then
        raise exception 'Payment cannot be reversed after member approval' using errcode='22023';
      end if;
      if v_fee_received and m.fee_amount is null then raise exception 'Enter the fee amount before recording payment' using errcode='22023'; end if;
      m.fee_paid_at:=case when v_fee_received then coalesce(m.fee_paid_at,now()) else null end;
    end if;
    if m.application_source='paper' and (m.form_number is null or m.city is null or m.fee_amount is null) then
      raise exception 'Paper applications need a form number, city and fee amount' using errcode='22023';
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

notify pgrst, 'reload schema';
commit;

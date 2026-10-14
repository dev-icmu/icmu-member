begin;

-- 1. Ensure any remaining payments in public.member are safe in public.membership_fee
insert into public.membership_fee (
  member_id,
  academic_year,
  fee_amount,
  paid_date,
  payment_method,
  recorded_by,
  recorded_by_name,
  notes
)
select
  m.id,
  coalesce((select value from public.config where key = 'ACADEMIC_YEAR'), '2026/2027'),
  coalesce(m.fee_amount, 500.00),
  coalesce(m.fee_paid_at, now()),
  'cash',
  m.processed_by,
  m.processed_by_name,
  'Migrated from member table'
from public.member m
where m.fee_paid_at is not null
on conflict (member_id, academic_year) do nothing;

-- 2. Safely drop legacy payment columns from public.member
alter table public.member
  drop column if exists fee_amount,
  drop column if exists fee_paid_at;

-- 3. Update private.prepare_application without fee_amount
create or replace function private.prepare_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v jsonb:=p_payload;
  g jsonb;
  key text;
  text_value text;
  skill_value jsonb;
  skill_id uuid;
  skill_active boolean;
  chosen uuid[];
  existing public.member%rowtype;
  is_paper boolean;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and p_id is not null then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(v) is distinct from 'object' or octet_length(v::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;
  if p_id is not null then
    select * into existing from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  end if;
  is_paper:=p_admin and (p_id is null or existing.form_number is not null);

  foreach key in array array['full_name','name_with_initials','index_number','email_address','city'] loop
    if v ? key then
      if jsonb_typeof(v->key) not in ('string','null') then raise exception 'Enter text for %',key using errcode='22023'; end if;
      v:=jsonb_set(v,array[key],coalesce(to_jsonb(nullif(lower(regexp_replace(btrim(v->>key),'\s+',' ','g')),'')),'null'::jsonb));
    end if;
  end loop;

  v:=v-'other_skills'-'school_class'-'address'-'application_source'-'fee_amount';
  if v ? 'form_number' and p_admin then
    if jsonb_typeof(v->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
    text_value:=nullif(btrim(v->>'form_number'),'');
    if text_value is not null and text_value !~ '^[0-9]{4}$' then raise exception 'Enter the 4-digit form number' using errcode='22023'; end if;
    v:=jsonb_set(v,'{form_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
  end if;
  if p_admin and v ? 'index_number' and v->>'index_number' is not null and v->>'index_number' !~ '^[0-9]{5}$' then
    raise exception 'Enter the 5-digit school admission number' using errcode='22023';
  end if;
  if is_paper and p_id is null and coalesce(v->>'index_number','') !~ '^[0-9]{5}$' then
    raise exception 'Enter the 5-digit school admission number' using errcode='22023';
  end if;

  if v ? 'whatsapp_number' then
    text_value:=regexp_replace(v->>'whatsapp_number','[[:space:]()-]','','g');
    if text_value ~ '^0[0-9]{9}$' then text_value:='+94'||substring(text_value from 2);
    elsif text_value ~ '^0094[0-9]{9}$' then text_value:='+'||substring(text_value from 3);
    elsif text_value ~ '^94[0-9]{9}$' then text_value:='+'||text_value; end if;
    v:=jsonb_set(v,'{whatsapp_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
  end if;
  if v ? 'guardian' and v->'guardian'<>'null'::jsonb then
    g:=v->'guardian';
    if jsonb_typeof(g) is distinct from 'object' then raise exception 'Enter valid guardian details' using errcode='22023'; end if;
    foreach key in array array['guardian_name','occupation'] loop
      if g ? key then
        if jsonb_typeof(g->key) not in ('string','null') then raise exception 'Enter text for %',key using errcode='22023'; end if;
        g:=jsonb_set(g,array[key],coalesce(to_jsonb(nullif(lower(regexp_replace(btrim(g->>key),'\s+',' ','g')),'')),'null'::jsonb));
      end if;
    end loop;
    text_value:=regexp_replace(g->>'contact_number','[[:space:]()-]','','g');
    if text_value ~ '^0[0-9]{9}$' then text_value:='+94'||substring(text_value from 2);
    elsif text_value ~ '^0094[0-9]{9}$' then text_value:='+'||substring(text_value from 3);
    elsif text_value ~ '^94[0-9]{9}$' then text_value:='+'||text_value; end if;
    g:=jsonb_set(g,'{contact_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
    v:=jsonb_set(v,'{guardian}',g);
  end if;

  if p_admin then
    if v ? 'custom_skills' then
      if jsonb_typeof(v->'custom_skills') is distinct from 'array' or jsonb_array_length(v->'custom_skills')>20 then
        raise exception 'Add up to 20 new skills' using errcode='22023';
      end if;
      if v ? 'interests' then
        if jsonb_typeof(v->'interests') is distinct from 'array' then raise exception 'Choose skills from the list' using errcode='22023'; end if;
        select coalesce(array_agg(value::uuid),'{}'::uuid[]) into chosen from jsonb_array_elements_text(v->'interests');
      else chosen:=coalesce(existing.interests,'{}'::uuid[]); end if;
      for skill_value in select value from jsonb_array_elements(v->'custom_skills') order by lower(regexp_replace(btrim(value#>>'{}'),'\s+',' ','g')) loop
        if jsonb_typeof(skill_value) is distinct from 'string' then raise exception 'Enter a skill name' using errcode='22023'; end if;
        text_value:=lower(regexp_replace(btrim(skill_value#>>'{}'),'\s+',' ','g'));
        if char_length(text_value) not between 1 and 50 then raise exception 'Use a skill name between 1 and 50 characters' using errcode='22023'; end if;
        insert into public.skill(skill_name,is_active,is_protected) values(text_value,true,false)
          on conflict do nothing;
        select id,is_active into skill_id,skill_active from public.skill
          where lower(regexp_replace(btrim(skill_name),'\s+',' ','g'))=text_value;
        if skill_id is null or skill_active is not true then raise exception 'This skill is inactive. Restore it in Skills before selecting it' using errcode='22023'; end if;
        chosen:=array_append(chosen,skill_id);
      end loop;
      select coalesce(array_agg(distinct id),'{}'::uuid[]) into chosen from unnest(chosen) id;
      v:=jsonb_set(v,'{interests}',to_jsonb(chosen));
    end if;
  end if;
  return v-'custom_skills';
end; $$;

revoke all on function private.prepare_application(uuid,jsonb,boolean) from public,anon,authenticated;

-- 4. Update private.save_member_application to manage relational membership_fee
create or replace function private.save_member_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  v_result jsonb;
  v_member_id uuid;
  v_actor_name text;
  v_fee_received boolean;
  v_active_year text;
  v_has_active_fee boolean;
  is_new boolean := p_id is null;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and not is_new then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;

  -- Active academic cycle
  begin
    select coalesce(nullif(value, ''), '2026/2027') into v_active_year
    from public.config where key = 'ACADEMIC_YEAR';
  exception when others then
    v_active_year := '2026/2027';
  end;

  if not is_new then
    select * into m from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
    select exists (
      select 1 from public.membership_fee
      where member_id = p_id and academic_year = v_active_year
    ) into v_has_active_fee;
  end if;

  if p_payload ? 'city' then m.city:=nullif(btrim(p_payload->>'city'),''); end if;
  if p_payload ? 'other_skills' then m.other_skills:=nullif(btrim(p_payload->>'other_skills'),''); end if;
  if p_admin then
    if p_payload ? 'form_number' then
      if jsonb_typeof(p_payload->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
      m.form_number:=nullif(btrim(p_payload->>'form_number'),'');
    end if;

    if p_payload ? 'fee_received' then
      if jsonb_typeof(p_payload->'fee_received') is distinct from 'boolean' then raise exception 'Choose whether the fee has been received' using errcode='22023'; end if;
      v_fee_received:=(p_payload->>'fee_received')::boolean;

      -- Irreversible check: Fee payment cannot be reversed after approval
      if not is_new and m.membership_status='accepted' and v_has_active_fee and not v_fee_received then
        raise exception 'Payment cannot be reversed after member approval' using errcode='22023';
      end if;
    end if;

    if (is_new or m.form_number is not null) and (m.form_number is null or m.city is null) then
      raise exception 'Paper applications need a form number and city' using errcode='22023';
    end if;

    if m.processed_at is null then
      select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'),''),'ICMU admin') into v_actor_name from auth.users where id=auth.uid();
      m.processed_by:=auth.uid(); m.processed_by_name:=v_actor_name; m.processed_at:=now();
    else
      v_actor_name := coalesce(m.processed_by_name, 'ICMU admin');
    end if;
  end if;

  v_result:=private.save_member(p_id,p_payload,p_admin);
  v_member_id:=(v_result->>'id')::uuid;

  update public.member set
    form_number=m.form_number,other_skills=m.other_skills,
    processed_by=m.processed_by,processed_by_name=m.processed_by_name,processed_at=m.processed_at
  where id=v_member_id;

  -- Manage membership_fee relation for the active cycle
  if p_admin and p_payload ? 'fee_received' then
    if v_fee_received then
      insert into public.membership_fee (
        member_id,
        academic_year,
        fee_amount,
        paid_date,
        payment_method,
        recorded_by,
        recorded_by_name
      ) values (
        v_member_id,
        v_active_year,
        500.00,
        now(),
        'cash',
        auth.uid(),
        v_actor_name
      )
      on conflict (member_id, academic_year) do update
      set fee_amount = excluded.fee_amount,
          paid_date = excluded.paid_date,
          updated_at = now();
    else
      -- Fee explicitly marked false on pending member
      delete from public.membership_fee
      where member_id = v_member_id and academic_year = v_active_year;
    end if;
  end if;

  return v_result;
end; $$;

revoke all on function private.save_member_application(uuid,jsonb,boolean) from public,anon,authenticated;

-- 5. Update private.approve to check membership_fee relation
create or replace function private.approve(p_id uuid) returns varchar language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  seq int;
  prefix text;
  result varchar;
  v_active_year text;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if m.membership_status='accepted' then return m.member_id; end if;
  if m.membership_status<>'pending' or not m.is_active then raise exception 'Only active pending applications can be approved' using errcode='22023'; end if;

  -- Active academic cycle
  begin
    select coalesce(nullif(value, ''), '2026/2027') into v_active_year
    from public.config where key = 'ACADEMIC_YEAR';
  exception when others then
    v_active_year := '2026/2027';
  end;

  -- Validate paper applications have fee recorded in membership_fee
  if m.form_number is not null and not exists (
    select 1 from public.membership_fee
    where member_id = p_id and academic_year = v_active_year
  ) then
    raise exception 'Record the membership fee before approving this application' using errcode='22023';
  end if;

  if m.batch_year is null then raise exception 'Member batch year is missing' using errcode='22023'; end if;
  prefix:=lpad((m.batch_year%100)::text,2,'0')||'M';
  perform pg_advisory_xact_lock(74123,m.batch_year);
  select greatest(coalesce(max(substring(member_id from 4)::int),0),coalesce((select current_count from public.batch_counts where batch_year=m.batch_year),0))+1 into seq from public.member where member_id like prefix||'%';
  if seq>999 then raise exception 'Batch year sequence exhausted'; end if;
  result:=prefix||lpad(seq::text,3,'0');
  insert into public.batch_counts(batch_year,current_count) values(m.batch_year,seq) on conflict(batch_year) do update set current_count=excluded.current_count;
  update public.member set membership_status='accepted',member_id=result where id=p_id;
  return result;
end; $$;

revoke all on function private.approve(uuid) from public,anon,authenticated;
grant execute on function private.approve(uuid) to authenticated;

-- 6. Update private.membership_revenue to query membership_fee join member
create or replace function private.membership_revenue(p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  today date := (now() at time zone 'Asia/Colombo')::date;
  first_day date;
  result jsonb;
  v_cutoff_batch int;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_period is null or p_period not in('all','7d','30d','6m','1y') then
    raise exception 'Choose a valid fee range' using errcode='22023';
  end if;

  -- Read dynamic cutoff batch year from config (fallback to 2008)
  begin
    select coalesce(nullif(value, '')::int, 2008) into v_cutoff_batch
    from public.config where key = 'ACADEMIC_BATCH_YEAR';
  exception when others then
    v_cutoff_batch := 2008;
  end;

  first_day := case p_period
    when 'all' then '-infinity'::date
    when '7d' then today - 6
    when '30d' then today - 29
    when '6m' then (date_trunc('month', today) - interval '5 months')::date
    else (date_trunc('month', today) - interval '11 months')::date
  end;

  select jsonb_build_object(
    'total', coalesce(sum(mf.fee_amount), 0),
    'payments', count(*),
    'missing_amounts', 0,
    'approved', coalesce(sum(mf.fee_amount) filter (where m.membership_status = 'accepted'), 0),
    'pending', coalesce(sum(mf.fee_amount) filter (where m.membership_status = 'pending'), 0),
    'rejected', coalesce(sum(mf.fee_amount) filter (where m.membership_status = 'rejected'), 0),
    'pending_count', (
      select count(*)
      from public.member
      where membership_status = 'pending'
        and (batch_year is null or batch_year > v_cutoff_batch)
    )
  ) into result
  from public.membership_fee mf
  join public.member m on mf.member_id = m.id
  where mf.paid_date >= (first_day::timestamp at time zone 'Asia/Colombo')
    and mf.paid_date <= now()
    and (m.batch_year is null or m.batch_year > v_cutoff_batch);

  return result;
end; $$;

revoke all on function private.membership_revenue(text) from public,anon,authenticated;
grant execute on function private.membership_revenue(text) to authenticated;

-- 7. Update public.admin_record_membership_fee without modifying member.fee_amount / fee_paid_at
create or replace function public.admin_record_membership_fee(
  p_member_id uuid,
  p_academic_year text,
  p_fee_amount numeric default 500.00,
  p_notes text default null,
  p_payment_method text default 'cash'
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_admin_id uuid := auth.uid();
  v_admin_name text;
  v_fee_id uuid;
  v_member record;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;

  select id, full_name, membership_status, is_active into v_member
  from public.member where id = p_member_id;

  if not found then raise exception 'Member not found' using errcode='22023'; end if;
  if p_academic_year is null or trim(p_academic_year) = '' then
    raise exception 'Academic year is required' using errcode='22023';
  end if;
  if p_fee_amount is null or p_fee_amount <= 0 then
    raise exception 'Enter a valid fee amount' using errcode='22023';
  end if;

  v_admin_name := coalesce(
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'display_name'),
    (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'display_name'),
    'ICMU Admin'
  );

  insert into public.membership_fee (
    member_id,
    academic_year,
    fee_amount,
    paid_date,
    payment_method,
    notes,
    recorded_by,
    recorded_by_name
  ) values (
    p_member_id,
    trim(p_academic_year),
    p_fee_amount,
    now(),
    coalesce(p_payment_method, 'cash'),
    p_notes,
    v_admin_id,
    v_admin_name
  )
  on conflict (member_id, academic_year) do update
  set fee_amount = excluded.fee_amount,
      paid_date = excluded.paid_date,
      payment_method = excluded.payment_method,
      notes = excluded.notes,
      recorded_by = excluded.recorded_by,
      recorded_by_name = excluded.recorded_by_name,
      updated_at = now()
  returning id into v_fee_id;

  update public.member
  set processed_by = coalesce(processed_by, v_admin_id),
      processed_by_name = coalesce(processed_by_name, v_admin_name),
      processed_at = coalesce(processed_at, now()),
      updated_at = now()
  where id = p_member_id;

  return jsonb_build_object(
    'id', v_fee_id,
    'member_id', p_member_id,
    'academic_year', trim(p_academic_year),
    'fee_amount', p_fee_amount,
    'paid_date', now()
  );
end; $$;

revoke all on function public.admin_record_membership_fee(uuid,text,numeric,text,text) from public,anon;
grant execute on function public.admin_record_membership_fee(uuid,text,numeric,text,text) to authenticated;

commit;

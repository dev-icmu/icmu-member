begin;

-- 1. Remove notes column from public.membership_fee (notes are stored inside each entry in fees JSONB array)
alter table public.membership_fee drop column if exists notes;

-- 2. Update private.save_member_application without references to membership_fee.notes
create or replace function private.save_member_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  v_result jsonb;
  v_member_id uuid;
  v_actor_name text;
  v_fee_received boolean;
  v_active_year text;
  v_has_active_fee boolean := false;
  v_existing_fee_row public.membership_fee%rowtype;
  v_new_fee_entry jsonb;
  v_filtered_fees jsonb;
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

    select * into v_existing_fee_row from public.membership_fee where member_id=p_id for update;
    if found then
      select exists (
        select 1 from jsonb_array_elements(v_existing_fee_row.fees) elem
        where elem->>'academic_year' = v_active_year
      ) into v_has_active_fee;
    end if;
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

  -- Manage membership_fee JSONB array for the active cycle (without top-level notes column)
  if p_admin and p_payload ? 'fee_received' then
    select * into v_existing_fee_row from public.membership_fee where member_id=v_member_id for update;

    if v_fee_received then
      v_new_fee_entry := jsonb_build_object(
        'academic_year', v_active_year,
        'fee_amount', 500.00,
        'paid_date', now(),
        'payment_method', 'cash',
        'recorded_by_name', v_actor_name
      );

      if not found then
        insert into public.membership_fee (member_id, fees)
        values (v_member_id, jsonb_build_array(v_new_fee_entry));
      else
        -- Remove existing entry for v_active_year if present, then append new entry
        select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_filtered_fees
        from jsonb_array_elements(v_existing_fee_row.fees) elem
        where elem->>'academic_year' <> v_active_year;

        update public.membership_fee
        set fees = v_filtered_fees || jsonb_build_array(v_new_fee_entry),
            updated_at = now()
        where member_id = v_member_id;
      end if;
    else
      -- Fee explicitly marked false on pending member: remove active cycle from fees array
      if found then
        select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_filtered_fees
        from jsonb_array_elements(v_existing_fee_row.fees) elem
        where elem->>'academic_year' <> v_active_year;

        if jsonb_array_length(v_filtered_fees) = 0 then
          delete from public.membership_fee where member_id = v_member_id;
        else
          update public.membership_fee
          set fees = v_filtered_fees,
              updated_at = now()
          where member_id = v_member_id;
        end if;
      end if;
    end if;
  end if;

  return v_result;
end; $$;

revoke all on function private.save_member_application(uuid,jsonb,boolean) from public,anon,authenticated;

-- 3. Update public.admin_record_membership_fee to manage fees array without top-level notes column
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
  v_existing public.membership_fee%rowtype;
  v_new_fee jsonb;
  v_filtered_fees jsonb;
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

  v_new_fee := jsonb_build_object(
    'academic_year', trim(p_academic_year),
    'fee_amount', p_fee_amount,
    'paid_date', now(),
    'payment_method', coalesce(p_payment_method, 'cash'),
    'notes', p_notes,
    'recorded_by_name', v_admin_name
  );

  select * into v_existing from public.membership_fee where member_id = p_member_id for update;

  if not found then
    insert into public.membership_fee (
      member_id,
      fees
    ) values (
      p_member_id,
      jsonb_build_array(v_new_fee)
    ) returning id into v_fee_id;
  else
    v_fee_id := v_existing.id;

    -- Filter out existing academic_year fee record if any
    select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_filtered_fees
    from jsonb_array_elements(v_existing.fees) elem
    where elem->>'academic_year' <> trim(p_academic_year);

    update public.membership_fee
    set fees = v_filtered_fees || jsonb_build_array(v_new_fee),
        updated_at = now()
    where id = v_fee_id;
  end if;

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

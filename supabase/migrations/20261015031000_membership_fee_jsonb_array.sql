begin;

-- 1. Create a temporary staging table to consolidate existing membership_fee records by member_id
create temporary table temp_consolidated_fees as
select
  member_id,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'academic_year', academic_year,
        'fee_amount', fee_amount,
        'paid_date', paid_date,
        'payment_method', coalesce(payment_method, 'cash'),
        'notes', notes,
        'recorded_by_name', recorded_by_name
      ) order by paid_date desc
    ) filter (where academic_year is not null),
    '[]'::jsonb
  ) as fees,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'text', notes,
        'date', paid_date
      ) order by paid_date desc
    ) filter (where notes is not null and btrim(notes) <> ''),
    '[]'::jsonb
  ) as notes,
  min(created_at) as created_at,
  max(updated_at) as updated_at
from public.membership_fee
group by member_id;

-- 2. Drop the old membership_fee table and recreate with 1 row per member and jsonb arrays
drop table if exists public.membership_fee cascade;

create table public.membership_fee (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.member(id) on delete cascade,
  fees jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for member lookup and jsonb search
create unique index if not exists membership_fee_member_uidx on public.membership_fee(member_id);
create index if not exists membership_fee_fees_gin_idx on public.membership_fee using gin (fees);

-- Enable RLS
alter table public.membership_fee enable row level security;

create policy admin_read_membership_fee on public.membership_fee
  for select to authenticated using ((select private.is_admin()));

create policy admin_insert_membership_fee on public.membership_fee
  for insert to authenticated with check ((select private.is_admin()));

create policy admin_update_membership_fee on public.membership_fee
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy admin_delete_membership_fee on public.membership_fee
  for delete to authenticated using ((select private.is_admin()));

grant select, insert, update, delete on public.membership_fee to authenticated;

-- Restore aggregated data into new table
insert into public.membership_fee (member_id, fees, notes, created_at, updated_at)
select member_id, fees, notes, created_at, updated_at
from temp_consolidated_fees
on conflict (member_id) do nothing;

drop table temp_consolidated_fees;


-- 3. Update private.save_member_application to manage fees jsonb array
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

  -- Manage membership_fee JSONB array for the active cycle
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
        insert into public.membership_fee (member_id, fees, notes)
        values (v_member_id, jsonb_build_array(v_new_fee_entry), '[]'::jsonb);
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

        if jsonb_array_length(v_filtered_fees) = 0 and jsonb_array_length(v_existing_fee_row.notes) = 0 then
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


-- 4. Update private.approve to verify active year in fees jsonb array
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

  -- Validate paper applications have fee recorded in membership_fee fees array
  if m.form_number is not null and not exists (
    select 1
    from public.membership_fee mf,
         jsonb_array_elements(mf.fees) elem
    where mf.member_id = p_id
      and elem->>'academic_year' = v_active_year
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


-- 5. Update private.membership_revenue to unflatten fees jsonb array
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
    'total', coalesce(sum((elem->>'fee_amount')::numeric), 0),
    'payments', count(elem),
    'missing_amounts', 0,
    'approved', coalesce(sum((elem->>'fee_amount')::numeric) filter (where m.membership_status = 'accepted'), 0),
    'pending', coalesce(sum((elem->>'fee_amount')::numeric) filter (where m.membership_status = 'pending'), 0),
    'rejected', coalesce(sum((elem->>'fee_amount')::numeric) filter (where m.membership_status = 'rejected'), 0),
    'pending_count', (
      select count(*)
      from public.member
      where membership_status = 'pending'
        and (batch_year is null or batch_year > v_cutoff_batch)
    )
  ) into result
  from public.membership_fee mf
  cross join lateral jsonb_array_elements(mf.fees) elem
  join public.member m on mf.member_id = m.id
  where (elem->>'paid_date')::timestamp with time zone >= (first_day::timestamp at time zone 'Asia/Colombo')
    and (elem->>'paid_date')::timestamp with time zone <= now()
    and (m.batch_year is null or m.batch_year > v_cutoff_batch);

  return result;
end; $$;

revoke all on function private.membership_revenue(text) from public,anon,authenticated;
grant execute on function private.membership_revenue(text) to authenticated;


-- 6. Update public.admin_record_membership_fee to manage fees and notes jsonb arrays in 1 row per member
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
  v_new_note jsonb;
  v_filtered_fees jsonb;
  v_notes jsonb;
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

  if p_notes is not null and btrim(p_notes) <> '' then
    v_new_note := jsonb_build_object('text', btrim(p_notes), 'date', now());
  end if;

  select * into v_existing from public.membership_fee where member_id = p_member_id for update;

  if not found then
    insert into public.membership_fee (
      member_id,
      fees,
      notes
    ) values (
      p_member_id,
      jsonb_build_array(v_new_fee),
      case when v_new_note is not null then jsonb_build_array(v_new_note) else '[]'::jsonb end
    ) returning id into v_fee_id;
  else
    v_fee_id := v_existing.id;

    -- Filter out existing academic_year fee record if any
    select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_filtered_fees
    from jsonb_array_elements(v_existing.fees) elem
    where elem->>'academic_year' <> trim(p_academic_year);

    v_notes := coalesce(v_existing.notes, '[]'::jsonb);
    if v_new_note is not null then
      v_notes := v_notes || jsonb_build_array(v_new_note);
    end if;

    update public.membership_fee
    set fees = v_filtered_fees || jsonb_build_array(v_new_fee),
        notes = v_notes,
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


-- 7. Update public.admin_get_member_fee_history to return fees array directly
create or replace function public.admin_get_member_fee_history(p_member_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_fees jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;

  select coalesce(fees, '[]'::jsonb) into v_fees
  from public.membership_fee
  where member_id = p_member_id;

  return coalesce(v_fees, '[]'::jsonb);
end; $$;

revoke all on function public.admin_get_member_fee_history(uuid) from public,anon;
grant execute on function public.admin_get_member_fee_history(uuid) to authenticated;

commit;

begin;

-- 1. Configuration table for system-wide key-value settings
create table if not exists public.config (
  key character varying(100) primary key,
  value text not null,
  description text null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.config enable row level security;

-- Admin read policy
create policy admin_read_config on public.config
  for select to authenticated using ((select private.is_admin()));

-- Seed default configuration
insert into public.config (key, value, description)
values
  ('ACADEMIC_YEAR', '2026/2027', 'Active academic cycle for membership fee collection (March to March)'),
  ('ACADEMIC_BATCH_YEAR', '2008', 'Cutoff batch year: only batches above this year count towards active fees'),
  ('MEMBERSHIP_FEE_LKR', '500', 'Standard yearly membership fee in LKR')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

grant select on public.config to authenticated;


-- 2. Relational Yearly Membership Fee Table
create table if not exists public.membership_fee (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member(id) on delete cascade,
  academic_year character varying(20) not null,
  fee_amount numeric not null default 500.00,
  paid_date timestamp with time zone not null default now(),
  payment_method character varying(50) default 'cash',
  notes text null,
  recorded_by uuid references auth.users(id),
  recorded_by_name character varying(255) null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_member_academic_year unique (member_id, academic_year)
);

create index if not exists membership_fee_member_idx on public.membership_fee(member_id);
create index if not exists membership_fee_academic_year_idx on public.membership_fee(academic_year, paid_date desc);

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


-- 3. Backfill existing payments from public.member into public.membership_fee for 2026/2027
insert into public.membership_fee (
  member_id,
  academic_year,
  fee_amount,
  paid_date,
  payment_method,
  recorded_by,
  recorded_by_name
)
select
  m.id,
  '2026/2027',
  coalesce(m.fee_amount, 500.00),
  m.fee_paid_at,
  'cash',
  m.processed_by,
  m.processed_by_name
from public.member m
where m.fee_paid_at is not null
on conflict (member_id, academic_year) do nothing;


-- 4. Dynamic revenue function reading ACADEMIC_BATCH_YEAR from public.config
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
    'total', coalesce(sum(fee_amount), 0),
    'payments', count(*) filter (where fee_amount is not null),
    'missing_amounts', count(*) filter (where fee_amount is null),
    'approved', coalesce(sum(fee_amount) filter (where membership_status = 'accepted'), 0),
    'pending', coalesce(sum(fee_amount) filter (where membership_status = 'pending'), 0),
    'rejected', coalesce(sum(fee_amount) filter (where membership_status = 'rejected'), 0),
    'pending_count', (
      select count(*)
      from public.member
      where membership_status = 'pending'
        and (batch_year is null or batch_year > v_cutoff_batch)
    )
  ) into result from public.member
  where fee_paid_at is not null
    and fee_paid_at >= (first_day::timestamp at time zone 'Asia/Colombo')
    and fee_paid_at <= now()
    and (batch_year is null or batch_year > v_cutoff_batch);

  return result;
end; $$;


-- 5. Stored Procedure: Record a member fee payment
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
  v_current_academic_year text;
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

  -- Resolve admin display name
  v_admin_name := coalesce(
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'display_name'),
    (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'display_name'),
    'ICMU Admin'
  );

  -- Insert into membership_fee
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

  -- If this matches active academic year in config, sync to public.member for backward compatibility
  select value into v_current_academic_year from public.config where key = 'ACADEMIC_YEAR';
  if v_current_academic_year is not null and trim(p_academic_year) = v_current_academic_year then
    update public.member
    set fee_amount = p_fee_amount,
        fee_paid_at = now(),
        processed_by = coalesce(processed_by, v_admin_id),
        processed_by_name = coalesce(processed_by_name, v_admin_name),
        processed_at = coalesce(processed_at, now()),
        updated_at = now()
    where id = p_member_id;
  end if;

  return jsonb_build_object(
    'id', v_fee_id,
    'member_id', p_member_id,
    'academic_year', trim(p_academic_year),
    'fee_amount', p_fee_amount,
    'recorded_by_name', v_admin_name
  );
end; $$;

revoke all on function public.admin_record_membership_fee(uuid, text, numeric, text, text) from public, anon;
grant execute on function public.admin_record_membership_fee(uuid, text, numeric, text, text) to authenticated;


-- 6. Stored Procedure: Get member fee payment history
create or replace function public.admin_get_member_fee_history(p_member_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  v_history jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'academic_year', f.academic_year,
        'fee_amount', f.fee_amount,
        'paid_date', f.paid_date,
        'payment_method', f.payment_method,
        'notes', f.notes,
        'recorded_by', f.recorded_by,
        'recorded_by_name', f.recorded_by_name,
        'created_at', f.created_at
      ) order by f.academic_year desc, f.paid_date desc
    ),
    '[]'::jsonb
  ) into v_history
  from public.membership_fee f
  where f.member_id = p_member_id;

  return v_history;
end; $$;

revoke all on function public.admin_get_member_fee_history(uuid) from public, anon;
grant execute on function public.admin_get_member_fee_history(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

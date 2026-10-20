begin;

-- Withdrawals are recorded as permanent debits. Only the receipt reference may
-- be filled in later, after the private file upload succeeds.
create table public.admin_withdrawal (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  bank_name text not null check (char_length(btrim(bank_name)) between 2 and 100),
  account_holder text not null check (char_length(btrim(account_holder)) between 2 and 150),
  account_number text not null check (char_length(btrim(account_number)) between 4 and 34),
  transfer_reference text check (transfer_reference is null or char_length(transfer_reference) <= 100),
  purpose text not null check (char_length(btrim(purpose)) between 3 and 300),
  receipt_path text unique,
  withdrawn_by uuid not null references auth.users(id),
  withdrawn_by_name text not null,
  withdrawn_at timestamptz not null default now()
);
create index admin_withdrawal_time_idx on public.admin_withdrawal(withdrawn_at desc, id desc);
alter table public.admin_withdrawal enable row level security;
revoke all on public.admin_withdrawal from public, anon, authenticated;
grant select on public.admin_withdrawal to authenticated;
create policy admin_read_withdrawals on public.admin_withdrawal
  for select to authenticated using ((select private.is_admin()));

create function private.prevent_withdrawal_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Withdrawals cannot be deleted' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'receipt_path') is distinct from (to_jsonb(old) - 'receipt_path')
     or old.receipt_path is not null or new.receipt_path is null then
    raise exception 'Withdrawal details cannot be changed' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger admin_withdrawal_immutable before update or delete on public.admin_withdrawal
  for each row execute function private.prevent_withdrawal_changes();

-- Keep the same receipt scope as the membership revenue card: batches newer
-- than the configured cutoff, with a real payment timestamp and amount.
create function private.withdrawal_income_total() returns numeric
language sql volatile security definer set search_path = '' as $$
  select coalesce(sum((fee.entry->>'fee_amount')::numeric), 0)
  from public.membership_fee mf
  join public.member m on m.id = mf.member_id
  cross join lateral jsonb_array_elements(mf.fees) as fee(entry)
  where (m.batch_year is null or m.batch_year > coalesce(
      (select nullif(value, '')::int from public.config where key = 'ACADEMIC_BATCH_YEAR'), 2008))
    and (fee.entry->>'paid_date')::timestamptz <= now()
    and (fee.entry->>'fee_amount')::numeric > 0;
$$;

create function private.record_admin_withdrawal(
  p_amount numeric, p_bank_name text, p_account_holder text,
  p_account_number text, p_transfer_reference text, p_purpose text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_available numeric;
  v_actor_name text;
  v_row public.admin_withdrawal%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 9999999999.99 or p_amount <> round(p_amount, 2) then
    raise exception 'Enter a valid amount with at most two decimal places' using errcode = '22023';
  end if;
  if coalesce(char_length(btrim(p_bank_name)), 0) not between 2 and 100
    or coalesce(char_length(btrim(p_account_holder)), 0) not between 2 and 150
    or coalesce(char_length(btrim(p_account_number)), 0) not between 4 and 34
    or coalesce(char_length(btrim(p_purpose)), 0) not between 3 and 300
    or char_length(coalesce(p_transfer_reference, '')) > 100 then
    raise exception 'Complete the bank, account and purpose details' using errcode = '22023';
  end if;

  -- Serializes competing withdrawals. Fee changes take the same lock below.
  perform pg_advisory_xact_lock(72201, 1);
  select private.withdrawal_income_total() - coalesce(sum(amount), 0)
    into v_available from public.admin_withdrawal;
  if p_amount > v_available then
    raise exception 'Amount exceeds the available balance. Refresh and try again.' using errcode = '22023';
  end if;

  select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'), ''),
                  nullif(btrim(raw_app_meta_data->>'web_index'), ''), 'ICMU admin')
    into v_actor_name from auth.users where id = auth.uid();
  insert into public.admin_withdrawal
    (amount, bank_name, account_holder, account_number, transfer_reference,
     purpose, withdrawn_by, withdrawn_by_name)
  values
    (p_amount, btrim(p_bank_name), btrim(p_account_holder), btrim(p_account_number),
     nullif(btrim(p_transfer_reference), ''), btrim(p_purpose), auth.uid(), v_actor_name)
  returning * into v_row;
  return jsonb_build_object('withdrawal', to_jsonb(v_row),
                            'available_balance', v_available - p_amount);
end; $$;

create function public.admin_record_withdrawal(
  p_amount numeric, p_bank_name text, p_account_holder text,
  p_account_number text, p_transfer_reference text, p_purpose text
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.record_admin_withdrawal(p_amount, p_bank_name, p_account_holder,
                                         p_account_number, p_transfer_reference, p_purpose);
$$;

-- A payment edit cannot quietly leave the account overdrawn.
create function private.check_withdrawal_balance_after_fee_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(72201, 1);
  if private.withdrawal_income_total() < (select coalesce(sum(amount), 0) from public.admin_withdrawal) then
    raise exception 'This fee change would leave recorded withdrawals above available funds' using errcode = '22023';
  end if;
  return null;
end; $$;
create trigger membership_fee_withdrawal_balance
  after insert or update or delete on public.membership_fee
  for each statement execute function private.check_withdrawal_balance_after_fee_change();
create trigger member_batch_withdrawal_balance
  after update of batch_year or delete on public.member
  for each statement execute function private.check_withdrawal_balance_after_fee_change();
create trigger config_withdrawal_balance
  after insert or update or delete on public.config
  for each statement execute function private.check_withdrawal_balance_after_fee_change();

create function private.withdrawal_passbook(p_limit integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Choose between 1 and 500 entries' using errcode = '22023';
  end if;
  with entries as (
    select (mf.id::text || ':' || fee.ord::text) as id, 'credit'::text as kind,
      (fee.entry->>'paid_date')::timestamptz as happened_at,
      (fee.entry->>'fee_amount')::numeric as amount,
      m.full_name as person, fee.entry->>'academic_year' as detail,
      null::text as bank_name, null::text as account_holder, null::text as account_number,
      null::text as transfer_reference, null::text as purpose,
      null::text as actor_name, null::text as receipt_path
    from public.membership_fee mf
    join public.member m on m.id = mf.member_id
    cross join lateral jsonb_array_elements(mf.fees) with ordinality as fee(entry, ord)
    where (m.batch_year is null or m.batch_year > coalesce(
      (select nullif(value, '')::int from public.config where key = 'ACADEMIC_BATCH_YEAR'), 2008))
      and (fee.entry->>'paid_date')::timestamptz <= now()
      and (fee.entry->>'fee_amount')::numeric > 0
    union all
    select w.id::text, 'debit', w.withdrawn_at, w.amount,
      null, null, w.bank_name, w.account_holder, w.account_number,
      w.transfer_reference, w.purpose, w.withdrawn_by_name, w.receipt_path
    from public.admin_withdrawal w
  ), balances as (
    select e.*, sum(case when kind = 'credit' then amount else -amount end)
      over (order by happened_at, kind, id rows between unbounded preceding and current row) as balance_after
    from entries e
  ), recent as (
    select * from balances order by happened_at desc, kind desc, id desc limit p_limit
  )
  select jsonb_build_object(
    'received', coalesce((select sum(amount) from balances where kind = 'credit'), 0),
    'withdrawn', coalesce((select sum(amount) from balances where kind = 'debit'), 0),
    'available', coalesce((select sum(case when kind = 'credit' then amount else -amount end) from balances), 0),
    'total_entries', (select count(*) from balances),
    'entries', coalesce((select jsonb_agg(to_jsonb(recent) order by happened_at desc, kind desc, id desc) from recent), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
create function public.admin_withdrawal_passbook(p_limit integer default 100) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.withdrawal_passbook(p_limit);
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('admin-withdrawal-receipts', 'admin-withdrawal-receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy admin_read_withdrawal_receipts on storage.objects
  for select to authenticated using
  (bucket_id = 'admin-withdrawal-receipts' and (select private.is_admin()));
create policy admin_upload_withdrawal_receipts on storage.objects
  for insert to authenticated with check
  (bucket_id = 'admin-withdrawal-receipts' and (select private.is_admin())
   and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy admin_remove_unused_withdrawal_receipts on storage.objects
  for delete to authenticated using
  (bucket_id = 'admin-withdrawal-receipts' and (select private.is_admin())
   and (storage.foldername(name))[1] = (select auth.uid())::text
   and not exists (select 1 from public.admin_withdrawal where receipt_path = name));

create function private.attach_withdrawal_receipt(p_id uuid, p_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.admin_withdrawal%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_path is null or char_length(p_path) > 400
     or p_path not like auth.uid()::text || '/' || p_id::text || '/%' then
    raise exception 'Invalid receipt path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects
                 where bucket_id = 'admin-withdrawal-receipts' and name = p_path) then
    raise exception 'Receipt upload was not found' using errcode = '22023';
  end if;
  update public.admin_withdrawal set receipt_path = p_path
  where id = p_id and receipt_path is null returning * into v_row;
  if not found then raise exception 'Withdrawal not found or already has a receipt' using errcode = '22023'; end if;
  return to_jsonb(v_row);
end; $$;
create function public.admin_attach_withdrawal_receipt(p_id uuid, p_path text) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.attach_withdrawal_receipt(p_id, p_path);
$$;

revoke all on function private.prevent_withdrawal_changes(), private.withdrawal_income_total(),
  private.record_admin_withdrawal(numeric,text,text,text,text,text),
  private.check_withdrawal_balance_after_fee_change(), private.withdrawal_passbook(integer),
  private.attach_withdrawal_receipt(uuid,text),
  public.admin_record_withdrawal(numeric,text,text,text,text,text),
  public.admin_withdrawal_passbook(integer), public.admin_attach_withdrawal_receipt(uuid,text)
  from public, anon, authenticated;
grant execute on function private.record_admin_withdrawal(numeric,text,text,text,text,text),
  private.withdrawal_passbook(integer), private.attach_withdrawal_receipt(uuid,text),
  public.admin_record_withdrawal(numeric,text,text,text,text,text),
  public.admin_withdrawal_passbook(integer), public.admin_attach_withdrawal_receipt(uuid,text)
  to authenticated;

notify pgrst, 'reload schema';
commit;

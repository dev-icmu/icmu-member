begin;

-- Keep the existing recipient values while giving the column the business
-- meaning used by the withdrawal form and passbook.
drop function public.admin_record_withdrawal(text,numeric,text,text,text,text,text,text);
drop function private.record_admin_withdrawal(text,numeric,text,text,text,text,text,text);

alter table public.admin_withdrawal
  drop constraint admin_withdrawal_payout_details_check;
alter table public.admin_withdrawal
  rename column account_holder to transferred_to;

alter table public.admin_withdrawal
  add constraint admin_withdrawal_payout_details_check check (
    (method = 'bank_transfer'
      and char_length(btrim(bank_name)) between 2 and 100
      and char_length(btrim(transferred_to)) between 2 and 150
      and char_length(btrim(account_number)) between 4 and 34
      and cash_recipient is null)
    or
    (method = 'cash'
      and bank_name is null and transferred_to is null and account_number is null
      and transfer_reference is null
      and char_length(btrim(cash_recipient)) between 2 and 150)
  );

create function private.record_admin_withdrawal(
  p_method text, p_amount numeric, p_bank_name text, p_transferred_to text,
  p_account_number text, p_transfer_reference text, p_cash_recipient text, p_purpose text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_available numeric;
  v_actor_name text;
  v_row public.admin_withdrawal%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_method not in ('bank_transfer', 'cash') then
    raise exception 'Choose bank transfer or cash by hand' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 9999999999.99 or p_amount <> round(p_amount, 2) then
    raise exception 'Enter a valid amount with at most two decimal places' using errcode = '22023';
  end if;
  if coalesce(char_length(btrim(p_purpose)), 0) not between 3 and 300 then
    raise exception 'Enter a purpose between 3 and 300 characters' using errcode = '22023';
  end if;
  if p_method = 'bank_transfer' and (
      coalesce(char_length(btrim(p_bank_name)), 0) not between 2 and 100
      or coalesce(char_length(btrim(p_transferred_to)), 0) not between 2 and 150
      or coalesce(char_length(btrim(p_account_number)), 0) not between 4 and 34
      or char_length(coalesce(p_transfer_reference, '')) > 100) then
    raise exception 'Enter the bank, recipient, and account number for this transfer' using errcode = '22023';
  end if;
  if p_method = 'cash' and coalesce(char_length(btrim(p_cash_recipient)), 0) not between 2 and 150 then
    raise exception 'Enter who received the cash' using errcode = '22023';
  end if;

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
    (method, amount, bank_name, transferred_to, account_number, transfer_reference,
     cash_recipient, purpose, withdrawn_by, withdrawn_by_name)
  values
    (p_method, p_amount,
     case when p_method = 'bank_transfer' then btrim(p_bank_name) end,
     case when p_method = 'bank_transfer' then btrim(p_transferred_to) end,
     case when p_method = 'bank_transfer' then btrim(p_account_number) end,
     case when p_method = 'bank_transfer' then nullif(btrim(p_transfer_reference), '') end,
     case when p_method = 'cash' then btrim(p_cash_recipient) end,
     btrim(p_purpose), auth.uid(), v_actor_name)
  returning * into v_row;
  return jsonb_build_object('withdrawal', to_jsonb(v_row),
                            'available_balance', v_available - p_amount);
end; $$;

create function public.admin_record_withdrawal(
  p_method text, p_amount numeric, p_bank_name text,
  p_transferred_to text, p_account_number text,
  p_transfer_reference text, p_cash_recipient text,
  p_purpose text
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.record_admin_withdrawal(p_method, p_amount, p_bank_name, p_transferred_to,
    p_account_number, p_transfer_reference, p_cash_recipient, p_purpose);
$$;

create or replace function private.withdrawal_passbook(p_limit integer) returns jsonb
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
      null::text as method, null::text as bank_name, null::text as transferred_to,
      null::text as account_number, null::text as transfer_reference,
      null::text as cash_recipient, null::text as purpose,
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
      null, null, w.method, w.bank_name, w.transferred_to, w.account_number,
      w.transfer_reference, w.cash_recipient, w.purpose, w.withdrawn_by_name, w.receipt_path
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

revoke all on function private.record_admin_withdrawal(text,numeric,text,text,text,text,text,text),
  public.admin_record_withdrawal(text,numeric,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function private.record_admin_withdrawal(text,numeric,text,text,text,text,text,text),
  public.admin_record_withdrawal(text,numeric,text,text,text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;

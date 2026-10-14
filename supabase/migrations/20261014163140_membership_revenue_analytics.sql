begin;
create function private.membership_revenue(p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  today date:=(now() at time zone 'Asia/Colombo')::date;
  first_day date;
  result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_period is null or p_period not in('all','7d','30d','6m','1y') then
    raise exception 'Choose a valid fee range' using errcode='22023';
  end if;
  first_day:=case p_period when 'all' then '-infinity'::date when '7d' then today-6
    when '30d' then today-29 when '6m' then (date_trunc('month',today)-interval '5 months')::date
    else (date_trunc('month',today)-interval '11 months')::date end;
  -- Use actual received amounts and payment dates, never inferred dues or the
  -- current fee constant. Historical fees may differ from today's LKR 500.
  select jsonb_build_object(
    'total',coalesce(sum(fee_amount),0),
    'payments',count(*) filter(where fee_amount is not null),
    'missing_amounts',count(*) filter(where fee_amount is null),
    'approved',coalesce(sum(fee_amount) filter(where membership_status='accepted'),0),
    'pending',coalesce(sum(fee_amount) filter(where membership_status='pending'),0),
    'rejected',coalesce(sum(fee_amount) filter(where membership_status='rejected'),0)
  ) into result from public.member
  where fee_paid_at is not null and fee_paid_at>=(first_day::timestamp at time zone 'Asia/Colombo')
    and fee_paid_at<=now();
  return result;
end; $$;
create function public.admin_membership_revenue(p_period text default 'all') returns jsonb
language sql stable security invoker set search_path='' as $$ select private.membership_revenue(p_period); $$;
revoke all on function private.membership_revenue(text),public.admin_membership_revenue(text) from public,anon;
grant execute on function private.membership_revenue(text),public.admin_membership_revenue(text) to authenticated;
notify pgrst,'reload schema';
commit;

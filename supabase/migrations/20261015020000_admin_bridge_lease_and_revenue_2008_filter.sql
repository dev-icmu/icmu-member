begin;

-- Extend admin bridge lease from 60 seconds to 15 minutes to eliminate excessive network pings.
create or replace function public.admin_bridge_register(
  p_user_id uuid,
  p_session_id uuid,
  p_web_user_id uuid,
  p_web_index text,
  p_web_token text,
  p_web_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not private.bridge_session_exists(p_user_id,p_session_id)
    or not exists(select 1 from private.admin_bridge_identities where user_id=p_user_id and web_user_id=p_web_user_id)
    or p_web_expires_at<=now() or length(p_web_token)<32 or length(p_web_token)>512 then raise exception 'Invalid bridge session' using errcode='42501'; end if;
  insert into private.admin_bridge_sessions values(
    p_session_id,p_user_id,p_web_user_id,p_web_index,p_web_token,p_web_expires_at,now()+interval '15 minutes'
  )
  on conflict(session_id) do update set
    web_token=excluded.web_token,web_expires_at=excluded.web_expires_at,verified_until=excluded.verified_until;
  return true;
end; $$;

create or replace function public.admin_bridge_renew(
  p_user_id uuid,
  p_session_id uuid,
  p_allowed boolean
) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update private.admin_bridge_sessions set verified_until=case when p_allowed then now()+interval '15 minutes' else now() end
  where session_id=p_session_id and user_id=p_user_id and web_expires_at>now()
    and private.bridge_session_exists(p_user_id,p_session_id);
  return found and p_allowed;
end; $$;

revoke all on function public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_renew(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_renew(uuid,uuid,boolean) to service_role;

-- Exclude 2008 batch from revenue calculations (both received payments and pending counts).
create or replace function private.membership_revenue(p_period text) returns jsonb
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

  select jsonb_build_object(
    'total',coalesce(sum(fee_amount),0),
    'payments',count(*) filter(where fee_amount is not null),
    'missing_amounts',count(*) filter(where fee_amount is null),
    'approved',coalesce(sum(fee_amount) filter(where membership_status='accepted'),0),
    'pending',coalesce(sum(fee_amount) filter(where membership_status='pending'),0),
    'rejected',coalesce(sum(fee_amount) filter(where membership_status='rejected'),0),
    'pending_count',(select count(*) from public.member where membership_status='pending' and (batch_year is distinct from 2008))
  ) into result from public.member
  where fee_paid_at is not null and fee_paid_at>=(first_day::timestamp at time zone 'Asia/Colombo')
    and fee_paid_at<=now()
    and (batch_year is distinct from 2008);

  return result;
end; $$;

revoke all on function private.membership_revenue(text) from public,anon;
grant execute on function private.membership_revenue(text) to authenticated;

notify pgrst,'reload schema';
commit;

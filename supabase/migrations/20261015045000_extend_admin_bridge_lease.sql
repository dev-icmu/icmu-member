begin;

-- Extend admin bridge lease from 15 minutes to 2 hours to prevent session timeouts during long form completions or idle periods.
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
    p_session_id,p_user_id,p_web_user_id,p_web_index,p_web_token,p_web_expires_at,
    least(now() + interval '2 hours', p_web_expires_at)
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
  update private.admin_bridge_sessions set verified_until=case when p_allowed then least(now() + interval '2 hours', web_expires_at) else now() end
  where session_id=p_session_id and user_id=p_user_id and web_expires_at>now()
    and private.bridge_session_exists(p_user_id,p_session_id);
  return found and p_allowed;
end; $$;

revoke all on function public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_renew(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_renew(uuid,uuid,boolean) to service_role;

notify pgrst,'reload schema';
commit;

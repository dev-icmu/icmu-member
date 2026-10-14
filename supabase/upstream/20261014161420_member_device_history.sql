-- The main site owns device history; only a verified account proof can register.
begin;
create table accounts_private.member_portal_sessions (
  token_hash text primary key references contacts_private.sessions(token_hash) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null unique
);
alter table accounts_private.member_portal_sessions enable row level security;
revoke all on accounts_private.member_portal_sessions from public,anon,authenticated;
create index member_portal_sessions_user_idx on accounts_private.member_portal_sessions(user_id);

create function accounts_private.remove_member_device() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.users u set active_sessions=coalesce((select jsonb_agg(item)
    from jsonb_array_elements(coalesce(u.active_sessions,'[]'::jsonb)) item
    where item->>'sessionId' is distinct from 'icmu-member:'||old.session_id::text),'[]'::jsonb)
  where u.id=old.user_id;
  return old;
end; $$;
revoke all on function accounts_private.remove_member_device() from public,anon,authenticated;
create trigger remove_member_device after delete on accounts_private.member_portal_sessions
for each row execute function accounts_private.remove_member_device();

create function accounts_private.register_member_device(p_session_id uuid,p_user_agent text) returns boolean
language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=contacts_private.current_admin_id();
  headers jsonb:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  proof_hash text; old_session uuid; login_time timestamptz; devices jsonb; agent text; os text; browser text;
begin
  if owner_id is null or coalesce(headers->>'x-contacts-token','') !~ '^[a-f0-9]{64}$' then
    raise exception 'Verified admin sign-in required' using errcode='42501';
  end if;
  if p_session_id is null or length(coalesce(p_user_agent,''))>512 then
    raise exception 'Invalid device information' using errcode='22023';
  end if;
  proof_hash:=encode(extensions.digest(headers->>'x-contacts-token','sha256'),'hex');
  select active_sessions into devices from public.users where id=owner_id for update;
  select created_at into login_time from contacts_private.sessions where token_hash=proof_hash and user_id=owner_id and expires_at>now();
  if not found then raise exception 'Session expired' using errcode='42501'; end if;
  select session_id into old_session from accounts_private.member_portal_sessions where token_hash=proof_hash;
  if found then
    if old_session<>p_session_id then raise exception 'Device already registered' using errcode='22023'; end if;
    return true;
  end if;
  devices:=coalesce(devices,'[]'::jsonb);
  if jsonb_array_length(devices)>=32 then raise exception 'Remove an old device before signing in' using errcode='22023'; end if;
  agent:=coalesce(p_user_agent,'');
  os:=case when agent ilike '%Android%' then 'Android' when agent ~* 'iPhone|iPad' then 'iOS'
    when agent ilike '%Windows%' then 'Windows' when agent ilike '%Macintosh%' then 'macOS' when agent ilike '%Linux%' then 'Linux' else 'Device' end;
  browser:=case when agent ilike '%Edg/%' then 'Edge' when agent ~* 'Chrome|CriOS' then 'Chrome'
    when agent ~* 'Firefox|FxiOS' then 'Firefox' when agent ilike '%Safari%' then 'Safari' else 'Browser' end;
  insert into accounts_private.member_portal_sessions values(proof_hash,owner_id,p_session_id);
  update public.users set last_login=greatest(coalesce(last_login,login_time),login_time),
    active_sessions=devices||jsonb_build_array(jsonb_build_object('sessionId','icmu-member:'||p_session_id::text,
      'deviceName',os||' • '||browser||' (ICMU Member)','userAgent',agent,'platform',os,
      'source','icmu-member','loginTime',login_time,'ip','Not recorded')) where id=owner_id;
  return true;
end; $$;
create function public.register_member_device(p_session_id uuid,p_user_agent text) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.register_member_device(p_session_id,p_user_agent); $$;
revoke all on function accounts_private.register_member_device(uuid,text),public.register_member_device(uuid,text) from public;
grant execute on function accounts_private.register_member_device(uuid,text),public.register_member_device(uuid,text) to anon,authenticated;

-- Existing profile controls keep their contract. Removing a Member device now
-- deletes its login proof, so the Member lease cannot renew.
create or replace function accounts_private.update_active_sessions(p_id uuid,p_sessions jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform accounts_private.require_owner(p_id);
  if jsonb_typeof(p_sessions) is distinct from 'array' or octet_length(p_sessions::text)>32768 then
    raise exception 'Invalid session display data' using errcode='22023';
  end if;
  perform 1 from public.users where id=p_id for update;
  delete from contacts_private.sessions s using accounts_private.member_portal_sessions m
    where m.token_hash=s.token_hash and m.user_id=p_id and not exists(
      select 1 from jsonb_array_elements(p_sessions) item where item->>'sessionId'='icmu-member:'||m.session_id::text);
  update public.users set active_sessions=p_sessions where id=p_id;
  return found;
end; $$;
notify pgrst,'reload schema';
commit;

-- REVIEW ONLY: apply to ICMU-WEB (dmdvulgsexgkraawqijg), never the member project.
-- Requires the companion web client changes in docs/ICMU_WEB_AUTH_BOUNDARY.md.
-- No account rows or passwords are changed by this migration.
begin;

create schema if not exists accounts_private;
revoke all on schema accounts_private from public;
grant usage on schema accounts_private to anon,authenticated,service_role;

-- Reuse the existing revocable credential store, but resolve any active account.
-- The contacts module still applies its own exact admin-role requirement.
create function accounts_private.current_user_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare
  h jsonb:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
  token text;
  actor uuid;
begin
  token:=h->>'x-contacts-token';
  if token is not null then
    if token !~ '^[a-f0-9]{64}$' then return null; end if;
    select u.id into actor from contacts_private.sessions s join public.users u on u.id=s.user_id
    where s.token_hash=encode(extensions.digest(token,'sha256'),'hex') and s.expires_at>now()
      and s.credential_hash=u.password_hash and u.is_active is true and u.index_number=h->>'x-user-index';
    return actor;
  end if;
  if auth.uid() is null then return null; end if;
  select u.id into actor from public.users u join auth.users a on lower(a.email)=lower(u.email)
  where a.id=auth.uid() and a.email_confirmed_at is not null and u.is_active is true
    and u.index_number=h->>'x-user-index'
    and exists(select 1 from auth.identities i where i.user_id=a.id and i.provider='google')
    and exists(select 1 from auth.sessions s where s.user_id=a.id and s.id::text=auth.jwt()->>'session_id'
      and (s.not_after is null or s.not_after>now()));
  return actor;
end; $$;

create function accounts_private.is_super_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users where id=accounts_private.current_user_id()
    and lower(trim(role)) in ('super-admin','super_admin','superadmin'));
$$;
create function accounts_private.require_owner(p_id uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if accounts_private.current_user_id() is null or
     (accounts_private.current_user_id() is distinct from p_id and not accounts_private.is_super_admin()) then
    raise exception 'Verified account required' using errcode='42501';
  end if;
end; $$;

-- Authentication keeps its public signature and adds a revocable proof to the
-- existing response. The frontend must store token/expires_at separately.
create function accounts_private.verify_user_login(p_index_number text,p_password text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  u public.users%rowtype;
  attempt contacts_private.login_attempts%rowtype;
  token text;
  expiry timestamptz:=now()+interval '8 hours';
begin
  if p_index_number is null or length(p_index_number)>100 or p_password is null
    or octet_length(p_password)<1 or octet_length(p_password)>72 then
    return jsonb_build_object('success',false,'message','Sign-in failed.');
  end if;
  select * into u from public.users where index_number=p_index_number;
  if not found or u.is_active is not true or u.password_hash is null then
    return jsonb_build_object('success',false,'message','Sign-in failed.');
  end if;
  insert into contacts_private.login_attempts(user_id) values(u.id) on conflict do nothing;
  select * into attempt from contacts_private.login_attempts where user_id=u.id for update;
  if attempt.window_started<=now()-interval '15 minutes' then
    update contacts_private.login_attempts set attempts=0,window_started=now() where user_id=u.id;
    attempt.attempts:=0;
  end if;
  if attempt.attempts>=10 then return jsonb_build_object('success',false,'message','Sign-in failed. Try again later.'); end if;
  if u.password_hash<>extensions.crypt(p_password,u.password_hash) then
    update contacts_private.login_attempts set attempts=attempts+1 where user_id=u.id;
    return jsonb_build_object('success',false,'message','Sign-in failed.');
  end if;
  update contacts_private.login_attempts set attempts=0,window_started=now() where user_id=u.id;
  delete from contacts_private.sessions where expires_at<=now();
  delete from contacts_private.sessions where token_hash in
    (select token_hash from contacts_private.sessions where user_id=u.id order by created_at desc offset 9);
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into contacts_private.sessions(token_hash,user_id,credential_hash,expires_at)
    values(encode(extensions.digest(token,'sha256'),'hex'),u.id,u.password_hash,expiry);
  update public.users set last_login=now() where id=u.id;
  return jsonb_build_object('success',true,'id',u.id,'name',u.full_name,'role',u.role,'index_number',u.index_number,
    'email',u.email,'avatar_url',u.avatar_url,'token',token,'expires_at',expiry);
end; $$;
create or replace function public.verify_user_login(p_index_number text,p_password text) returns jsonb
language sql security invoker set search_path='' as $$
  select accounts_private.verify_user_login(p_index_number,p_password);
$$;

create function accounts_private.set_user_password(p_index_number text,p_password text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.users%rowtype;
begin
  if p_password is null or char_length(p_password)<8 or octet_length(p_password)>72 then
    raise exception 'Password must have at least 8 characters and at most 72 bytes' using errcode='22023';
  end if;
  select * into u from public.users where index_number=p_index_number and is_active is true for update;
  if not found then return jsonb_build_object('success',false,'message','Active account not found.'); end if;
  perform accounts_private.require_owner(u.id);
  update public.users set password_hash=extensions.crypt(p_password,extensions.gen_salt('bf')) where id=u.id;
  delete from contacts_private.sessions where user_id=u.id;
  return jsonb_build_object('success',true,'id',u.id,'name',u.full_name,'role',u.role,'index_number',u.index_number,'email',u.email);
end; $$;
create or replace function public.set_user_password(p_index_number text,p_password text) returns jsonb
language sql security invoker set search_path='' as $$ select accounts_private.set_user_password(p_index_number,p_password); $$;

create function accounts_private.link_google_identity(p_id uuid,p_email text,p_avatar text) returns boolean
language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
  perform accounts_private.require_owner(p_id);
  select a.email into verified_email from auth.users a where a.id=auth.uid() and a.email_confirmed_at is not null
    and exists(select 1 from auth.identities i where i.user_id=a.id and i.provider='google')
    and exists(select 1 from auth.sessions s where s.user_id=a.id and s.id::text=auth.jwt()->>'session_id'
      and (s.not_after is null or s.not_after>now()));
  if verified_email is null or lower(verified_email) is distinct from lower(p_email) then
    raise exception 'Verified Google identity required' using errcode='42501';
  end if;
  update public.users set email=verified_email,avatar_url=p_avatar where id=p_id;
  return found;
end; $$;
create or replace function public.link_google_identity(p_id uuid,p_email text,p_avatar text) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.link_google_identity(p_id,p_email,p_avatar); $$;

create function accounts_private.unlink_google_identity(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin perform accounts_private.require_owner(p_id); update public.users set email=null where id=p_id; return found; end; $$;
create or replace function public.unlink_google_identity(p_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.unlink_google_identity(p_id); $$;

create function accounts_private.update_user_avatar(p_id uuid,p_avatar text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform accounts_private.require_owner(p_id);
  if length(p_avatar)>2048 then raise exception 'Avatar URL too long' using errcode='22023'; end if;
  update public.users set avatar_url=p_avatar where id=p_id; return found;
end; $$;
create or replace function public.update_user_avatar(p_id uuid,p_avatar text) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.update_user_avatar(p_id,p_avatar); $$;

create function accounts_private.update_active_sessions(p_id uuid,p_sessions jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform accounts_private.require_owner(p_id);
  if jsonb_typeof(p_sessions) is distinct from 'array' or octet_length(p_sessions::text)>32768 then
    raise exception 'Invalid session display data' using errcode='22023';
  end if;
  update public.users set active_sessions=p_sessions where id=p_id; return found;
end; $$;
create or replace function public.update_active_sessions(p_id uuid,p_sessions jsonb) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.update_active_sessions(p_id,p_sessions); $$;

create function accounts_private.update_user_settings(p_id uuid,p_settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform accounts_private.require_owner(p_id);
  if jsonb_typeof(p_settings) is distinct from 'object' or octet_length(p_settings::text)>16384 then
    raise exception 'Invalid settings' using errcode='22023';
  end if;
  update public.users set user_settings=p_settings where id=p_id;
end; $$;
create or replace function public.update_user_settings(p_id uuid,p_settings jsonb) returns void
language sql security invoker set search_path='' as $$ select accounts_private.update_user_settings(p_id,p_settings); $$;

create function accounts_private.update_user_profile(p_id uuid,p_full_name text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform accounts_private.require_owner(p_id);
  if p_full_name is null or char_length(trim(p_full_name))<1 or char_length(p_full_name)>160 then
    raise exception 'Enter a name between 1 and 160 characters' using errcode='22023';
  end if;
  update public.users set full_name=trim(p_full_name) where id=p_id; return found;
end; $$;
create function public.update_user_profile(p_id uuid,p_full_name text) returns boolean
language sql security invoker set search_path='' as $$ select accounts_private.update_user_profile(p_id,p_full_name); $$;

-- Public profile fields remain selectable. Hashes, device metadata, email and
-- preferences are accessible only through narrowly checked RPCs.
revoke all on public.users from public,anon,authenticated;
grant select(id,index_number,full_name,role,is_active,created_at,avatar_url,last_login) on public.users to anon,authenticated;
grant insert(id,index_number,full_name,role,is_active,created_at),update(index_number,full_name,role,is_active),delete on public.users to anon,authenticated;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='users' loop
    execute format('drop policy %I on public.users',p.policyname);
  end loop;
end; $$;
alter table public.users enable row level security;
create policy account_profile_read on public.users for select to anon,authenticated using(true);
create policy account_superadmin_insert on public.users for insert to anon,authenticated with check(accounts_private.is_super_admin());
create policy account_superadmin_update on public.users for update to anon,authenticated using(accounts_private.is_super_admin()) with check(accounts_private.is_super_admin());
create policy account_superadmin_delete on public.users for delete to anon,authenticated using(accounts_private.is_super_admin());

create function accounts_private.account_profile(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform accounts_private.require_owner(p_id);
  select to_jsonb(u)-'password_hash' into result from public.users u where id=p_id;
  return result;
end; $$;
create function public.account_profile(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select accounts_private.account_profile(p_id);
$$;

-- The member bridge resolves the proof's own immutable identity, never an index lookup.
create function accounts_private.current_account_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=accounts_private.current_user_id();
begin
  if actor is null then raise exception 'Verified account required' using errcode='42501'; end if;
  return accounts_private.account_profile(actor);
end; $$;
create function public.current_account_profile() returns jsonb language sql stable security invoker set search_path='' as $$
  select accounts_private.current_account_profile();
$$;

create function accounts_private.account_directory() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not accounts_private.is_super_admin() then raise exception 'Verified super admin required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(u)-'password_hash'-'active_sessions'-'user_settings' order by u.created_at),'[]'::jsonb)
    into result from public.users u;
  return result;
end; $$;
create function public.account_directory() returns jsonb language sql stable security invoker set search_path='' as $$
  select accounts_private.account_directory();
$$;

revoke all on all functions in schema accounts_private from public,anon,authenticated;
grant execute on function accounts_private.current_user_id(),accounts_private.is_super_admin(),accounts_private.verify_user_login(text,text),
  accounts_private.set_user_password(text,text),accounts_private.link_google_identity(uuid,text,text),accounts_private.unlink_google_identity(uuid),
  accounts_private.update_user_avatar(uuid,text),accounts_private.update_active_sessions(uuid,jsonb),accounts_private.update_user_settings(uuid,jsonb),
  accounts_private.account_profile(uuid),accounts_private.current_account_profile(),accounts_private.account_directory(),accounts_private.update_user_profile(uuid,text) to anon,authenticated,service_role;
revoke all on function public.verify_user_login(text,text),public.set_user_password(text,text),public.link_google_identity(uuid,text,text),
  public.unlink_google_identity(uuid),public.update_user_avatar(uuid,text),public.update_active_sessions(uuid,jsonb),public.update_user_settings(uuid,jsonb),
  public.account_profile(uuid),public.current_account_profile(),public.account_directory(),public.update_user_profile(uuid,text) from public;
grant execute on function public.verify_user_login(text,text),public.set_user_password(text,text),public.link_google_identity(uuid,text,text),
  public.unlink_google_identity(uuid),public.update_user_avatar(uuid,text),public.update_active_sessions(uuid,jsonb),public.update_user_settings(uuid,jsonb),
  public.account_profile(uuid),public.current_account_profile(),public.account_directory(),public.update_user_profile(uuid,text) to anon,authenticated,service_role;

commit;

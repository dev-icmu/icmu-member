-- Minimal Supabase Auth boundary for local PostgreSQL integration tests.
-- These are tables and claim readers, not a mock implementation of the admin RPCs.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;

create table auth.users (
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  raw_app_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false
);
create type auth.aal_level as enum ('aal1', 'aal2', 'aal3');
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz,
  updated_at timestamptz,
  not_after timestamptz,
  aal auth.aal_level
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), auth.jwt()->>'sub')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
-- No direct auth.users/auth.sessions privileges for service_role: the real migration
-- must use its narrowly scoped private helper functions to inspect those tables.

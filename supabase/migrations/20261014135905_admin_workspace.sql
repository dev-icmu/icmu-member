-- Member administration keeps the existing member IDs, batches and review states.
-- The icmu-web login bridge holds its opaque web credential only in this private schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table private.admin_bridge_identities (
  web_user_id uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade
);
create table private.admin_bridge_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  web_user_id uuid not null,
  web_index text not null,
  web_token text not null,
  web_expires_at timestamptz not null,
  verified_until timestamptz not null
);
alter table private.admin_bridge_identities enable row level security;
alter table private.admin_bridge_sessions enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;

create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from private.admin_bridge_sessions b join auth.sessions s on s.id=b.session_id and s.user_id=b.user_id
      where b.user_id=auth.uid() and b.session_id::text=auth.jwt()->>'session_id'
      and b.verified_until>now() and b.web_expires_at>now())
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;
create function public.admin_access() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;
revoke all on function public.admin_access() from public, anon;
grant execute on function public.admin_access() to authenticated;

create function public.admin_bridge_identity(p_web_user_id uuid) returns uuid language sql security invoker set search_path='' as $$
  select user_id from private.admin_bridge_identities where web_user_id=p_web_user_id;
$$;
create function private.bridge_identity_matches(p_user_id uuid,p_web_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=p_user_id and raw_app_meta_data->>'identity_provider'='icmu-web' and raw_app_meta_data->>'web_user_id'=p_web_user_id::text);
$$;
create function private.bridge_session_exists(p_user_id uuid,p_session_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions where id=p_session_id and user_id=p_user_id);
$$;
revoke all on function private.bridge_identity_matches(uuid,uuid),private.bridge_session_exists(uuid,uuid) from public,anon,authenticated;
grant execute on function private.bridge_identity_matches(uuid,uuid),private.bridge_session_exists(uuid,uuid) to service_role;
create function public.admin_bridge_link_identity(p_web_user_id uuid,p_user_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not private.bridge_identity_matches(p_user_id,p_web_user_id) then raise exception 'Invalid bridge identity' using errcode='42501'; end if;
  insert into private.admin_bridge_identities(web_user_id,user_id) values(p_web_user_id,p_user_id) on conflict(web_user_id) do nothing;
  if not exists(select 1 from private.admin_bridge_identities where web_user_id=p_web_user_id and user_id=p_user_id) then raise exception 'Identity already linked' using errcode='23505'; end if;
  return true;
end; $$;
create function public.admin_bridge_register(p_user_id uuid,p_session_id uuid,p_web_user_id uuid,p_web_index text,p_web_token text,p_web_expires_at timestamptz) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not private.bridge_session_exists(p_user_id,p_session_id)
    or not exists(select 1 from private.admin_bridge_identities where user_id=p_user_id and web_user_id=p_web_user_id)
    or p_web_expires_at<=now() or length(p_web_token)<32 or length(p_web_token)>512 then raise exception 'Invalid bridge session' using errcode='42501'; end if;
  insert into private.admin_bridge_sessions values(p_session_id,p_user_id,p_web_user_id,p_web_index,p_web_token,p_web_expires_at,now()+interval '60 seconds')
  on conflict(session_id) do update set web_token=excluded.web_token,web_expires_at=excluded.web_expires_at,verified_until=excluded.verified_until;
  return true;
end; $$;
create function public.admin_bridge_session(p_user_id uuid,p_session_id uuid) returns jsonb language sql security invoker set search_path='' as $$
  select jsonb_build_object('web_index',b.web_index,'web_token',b.web_token,'web_expires_at',b.web_expires_at)
  from private.admin_bridge_sessions b
  where b.session_id=p_session_id and b.user_id=p_user_id and b.web_expires_at>now() and private.bridge_session_exists(p_user_id,p_session_id);
$$;
create function public.admin_bridge_renew(p_user_id uuid,p_session_id uuid,p_allowed boolean) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update private.admin_bridge_sessions set verified_until=case when p_allowed then now()+interval '60 seconds' else now() end
  where session_id=p_session_id and user_id=p_user_id and web_expires_at>now()
    and private.bridge_session_exists(p_user_id,p_session_id);
  return found and p_allowed;
end; $$;
create function public.admin_bridge_revoke(p_user_id uuid,p_session_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin delete from private.admin_bridge_sessions where session_id=p_session_id and user_id=p_user_id; return true; end; $$;
revoke all on function public.admin_bridge_identity(uuid), public.admin_bridge_link_identity(uuid,uuid), public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_session(uuid,uuid), public.admin_bridge_renew(uuid,uuid,boolean), public.admin_bridge_revoke(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_bridge_identity(uuid), public.admin_bridge_link_identity(uuid,uuid), public.admin_bridge_register(uuid,uuid,uuid,text,text,timestamptz), public.admin_bridge_session(uuid,uuid), public.admin_bridge_renew(uuid,uuid,boolean), public.admin_bridge_revoke(uuid,uuid) to service_role;

alter table public.member add column is_active boolean not null default true, add column deactivated_at timestamptz;
alter table public.member add constraint member_status_valid check(membership_status in ('pending','accepted','rejected'));
create index member_status_created_idx on public.member(membership_status,created_at desc,id);
create index member_active_idx on public.member(is_active) where membership_status='accepted';
create index member_guardian_idx on public.member(guardian_id);
create index member_assignment_team_idx on public.member_team_assignment(team_id);

-- Replace broad authenticated access and anonymous direct inserts with narrow policies/RPCs.
do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('member','guardian','batch_counts','production_team','skill','member_team_assignment') loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;
revoke all on public.member,public.guardian,public.batch_counts,public.member_team_assignment from anon,authenticated;
grant select on public.member,public.guardian to authenticated;
grant select,insert,delete on public.member_team_assignment to authenticated;
grant select on public.skill,public.production_team to anon,authenticated;
grant insert,update on public.skill,public.production_team to authenticated;
revoke delete on public.skill,public.production_team from anon,authenticated;
revoke insert,update on public.skill,public.production_team from anon;
create policy admin_read_member on public.member for select to authenticated using((select private.is_admin()));
create policy admin_read_guardian on public.guardian for select to authenticated using((select private.is_admin()));
create policy admin_read_assignment on public.member_team_assignment for select to authenticated using((select private.is_admin()));
create policy admin_add_assignment on public.member_team_assignment for insert to authenticated with check(
  (select private.is_admin()) and exists(select 1 from public.member m where m.id=member_team_assignment.member_id and m.membership_status='accepted' and m.is_active)
  and exists(select 1 from public.production_team t where t.id=member_team_assignment.team_id and t.is_active));
create policy admin_remove_assignment on public.member_team_assignment for delete to authenticated using((select private.is_admin()));
create policy active_skills on public.skill for select to anon using(is_active);
create policy authenticated_skills on public.skill for select to authenticated using(is_active or (select private.is_admin()));
create policy active_teams on public.production_team for select to anon using(is_active);
create policy authenticated_teams on public.production_team for select to authenticated using(is_active or (select private.is_admin()));
create policy admin_insert_skill on public.skill for insert to authenticated with check((select private.is_admin()) and not coalesce(is_protected,false));
create policy admin_update_skill on public.skill for update to authenticated using((select private.is_admin()) and not coalesce(is_protected,false)) with check((select private.is_admin()) and not coalesce(is_protected,false));
create policy admin_insert_team on public.production_team for insert to authenticated with check((select private.is_admin()) and not coalesce(is_protected,false));
create policy admin_update_team on public.production_team for update to authenticated using((select private.is_admin()) and not coalesce(is_protected,false)) with check((select private.is_admin()) and not coalesce(is_protected,false));

create function private.save_member(p_id uuid,p_payload jsonb,p_admin boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype; g jsonb; v_id uuid; v_guardian uuid; v_interests uuid[]; is_new boolean:=p_id is null;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and not is_new then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;
  if is_new then m.id:=gen_random_uuid(); m.joined_date:=current_date; m.membership_status:='pending'; m.is_active:=true;
  else select * into m from public.member where id=p_id for update; if not found then raise exception 'Member not found' using errcode='P0002'; end if; end if;
  if p_payload ? 'full_name' then m.full_name:=btrim(p_payload->>'full_name'); end if;
  if p_payload ? 'name_with_initials' then m.name_with_initials:=btrim(p_payload->>'name_with_initials'); end if;
  if p_payload ? 'index_number' then m.index_number:=nullif(btrim(p_payload->>'index_number'),''); end if;
  if p_payload ? 'date_of_birth' then
    if not is_new and m.member_id is not null and (p_payload->>'date_of_birth')::date<>m.date_of_birth then raise exception 'Date of birth is locked after a member ID is issued'; end if;
    m.date_of_birth:=(p_payload->>'date_of_birth')::date;
    m.batch_year:=extract(year from m.date_of_birth)::int-case when extract(month from m.date_of_birth)=1 then 1 else 0 end;
  end if;
  if p_admin and p_payload ? 'joined_date' then m.joined_date:=(p_payload->>'joined_date')::date; end if;
  if p_payload ? 'city' then m.city:=nullif(btrim(p_payload->>'city'),''); end if;
  if p_payload ? 'email_address' then m.email_address:=nullif(lower(btrim(p_payload->>'email_address')),''); end if;
  if p_payload ? 'whatsapp_number' then m.whatsapp_number:=btrim(p_payload->>'whatsapp_number'); end if;
  if m.full_name is null or length(m.full_name)<2 or length(m.full_name)>200 or m.name_with_initials is null or length(m.name_with_initials)<2 or length(m.name_with_initials)>100 then raise exception 'Enter the member full name and initials' using errcode='22023'; end if;
  if m.date_of_birth is null or m.date_of_birth>=current_date or m.date_of_birth<date '1940-01-01' or m.joined_date>current_date then raise exception 'Enter valid birth and joined dates' using errcode='22023'; end if;
  if m.whatsapp_number is null or m.whatsapp_number !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Enter a valid international WhatsApp number' using errcode='22023'; end if;
  if m.email_address is not null and m.email_address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address' using errcode='22023'; end if;
  if p_payload ? 'interests' then
    if jsonb_typeof(p_payload->'interests')<>'array' or jsonb_array_length(p_payload->'interests')>100 then raise exception 'Invalid interests' using errcode='22023'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) into v_interests from jsonb_array_elements_text(p_payload->'interests');
    if exists(select 1 from unnest(v_interests) i where not exists(select 1 from public.skill s where s.id=i and (s.is_active or i=any(coalesce(m.interests,'{}'::uuid[]))))) then raise exception 'Choose an available skill' using errcode='22023'; end if;
    m.interests:=v_interests;
  end if;
  g:=p_payload->'guardian';
  if is_new and (g is null or jsonb_typeof(g)<>'object') then raise exception 'Guardian details are required' using errcode='22023'; end if;
  if g is not null then
    if coalesce(length(btrim(g->>'guardian_name')),0)<2 or length(g->>'guardian_name')>150 or length(g->>'occupation')>100 or length(g->>'contact_number')>15 or coalesce(g->>'contact_number','') !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Enter a guardian name and valid contact number' using errcode='22023'; end if;
    -- Copy-on-write avoids changing a sibling member who shares this guardian.
    v_guardian:=m.guardian_id;
    if v_guardian is null or exists(select 1 from public.member where guardian_id=v_guardian and id<>m.id) then
      insert into public.guardian(guardian_name,contact_number,occupation) values(btrim(g->>'guardian_name'),g->>'contact_number',nullif(btrim(g->>'occupation'),'')) returning id into v_guardian;
    else update public.guardian set guardian_name=btrim(g->>'guardian_name'),contact_number=g->>'contact_number',occupation=nullif(btrim(g->>'occupation'),'') where id=v_guardian; end if;
    m.guardian_id:=v_guardian;
  end if;
  if is_new then
    insert into public.member(id,guardian_id,index_number,full_name,name_with_initials,date_of_birth,joined_date,city,whatsapp_number,email_address,interests,batch_year,membership_status,is_active)
    values(m.id,m.guardian_id,m.index_number,m.full_name,m.name_with_initials,m.date_of_birth,m.joined_date,m.city,m.whatsapp_number,m.email_address,coalesce(m.interests,'{}'::uuid[]),m.batch_year,'pending',true) returning id into v_id;
  else update public.member set guardian_id=m.guardian_id,index_number=m.index_number,full_name=m.full_name,name_with_initials=m.name_with_initials,date_of_birth=m.date_of_birth,joined_date=m.joined_date,city=m.city,whatsapp_number=m.whatsapp_number,email_address=m.email_address,interests=m.interests,batch_year=m.batch_year where id=m.id returning id into v_id; end if;
  return jsonb_build_object('id',v_id);
end; $$;
revoke all on function private.save_member(uuid,jsonb,boolean) from public,anon,authenticated;

create function private.submit_application(p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$ select private.save_member(null,p_payload,false); $$;
create function public.submit_member_application(p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.submit_application(p_payload); $$;
grant usage on schema private to anon;
revoke all on function private.submit_application(jsonb),public.submit_member_application(jsonb) from public;
grant execute on function private.submit_application(jsonb),public.submit_member_application(jsonb) to anon,authenticated;
create function private.admin_save(p_id uuid,p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$ select private.save_member(p_id,p_payload,true); $$;
create function public.admin_save_member(p_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_save(p_id,p_payload); $$;
revoke all on function private.admin_save(uuid,jsonb),public.admin_save_member(uuid,jsonb) from public,anon;
grant execute on function private.admin_save(uuid,jsonb),public.admin_save_member(uuid,jsonb) to authenticated;

create function private.approve(p_id uuid) returns varchar language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype; seq int; prefix text; result varchar;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if m.membership_status='accepted' then return m.member_id; end if;
  if m.membership_status<>'pending' or not m.is_active then raise exception 'Only active pending applications can be approved' using errcode='22023'; end if;
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
create or replace function public.approve_member(p_id uuid) returns varchar language sql security invoker set search_path='' as $$ select private.approve(p_id); $$;
revoke all on function private.approve(uuid),public.approve_member(uuid),public.generate_member_id(date) from public,anon,authenticated;
grant execute on function private.approve(uuid),public.approve_member(uuid) to authenticated;

create function private.review_member(p_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_status is null or p_status not in ('pending','rejected') then raise exception 'Choose a valid application status' using errcode='22023'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if not ((m.membership_status='pending' and p_status='rejected') or (m.membership_status='rejected' and p_status='pending')) then raise exception 'Application status changed. Refresh and try again.' using errcode='22023'; end if;
  update public.member set membership_status=p_status where id=p_id;
  return jsonb_build_object('id',p_id,'membership_status',p_status);
end; $$;
create function public.admin_review_member(p_id uuid,p_status text) returns jsonb language sql security invoker set search_path='' as $$ select private.review_member(p_id,p_status); $$;
create function private.set_member_active(p_id uuid,p_active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_active is null then raise exception 'Activity is required' using errcode='22023'; end if;
  update public.member set is_active=p_active,deactivated_at=case when p_active then null else now() end where id=p_id and membership_status='accepted';
  if not found then raise exception 'Accepted member not found' using errcode='P0002'; end if;
  return jsonb_build_object('id',p_id,'is_active',p_active);
end; $$;
create function public.admin_set_member_active(p_id uuid,p_active boolean) returns jsonb language sql security invoker set search_path='' as $$ select private.set_member_active(p_id,p_active); $$;
revoke all on function private.review_member(uuid,text),public.admin_review_member(uuid,text),private.set_member_active(uuid,boolean),public.admin_set_member_active(uuid,boolean) from public,anon;
grant execute on function private.review_member(uuid,text),public.admin_review_member(uuid,text),private.set_member_active(uuid,boolean),public.admin_set_member_active(uuid,boolean) to authenticated;

create function public.admin_member_analytics() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'counts',jsonb_build_object('total',count(*),'accepted',count(*) filter(where membership_status='accepted'),'pending',count(*) filter(where membership_status='pending'),'rejected',count(*) filter(where membership_status='rejected'),'active',count(*) filter(where membership_status='accepted' and is_active),'inactive',count(*) filter(where membership_status='accepted' and not is_active),'teams',(select count(*) from public.production_team where is_active),'skills',(select count(*) from public.skill where is_active)),
    'monthly',(select jsonb_agg(jsonb_build_object('month',to_char(month,'YYYY-MM'),'label',to_char(month,'Mon'),'applications',(select count(*) from public.member where created_at>=month and created_at<month+interval '1 month'),'accepted',(select count(*) from public.member where membership_status='accepted' and created_at>=month and created_at<month+interval '1 month')) order by month) from generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') month),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by batch_year) from (select batch_year,count(*) as count from public.member where membership_status='accepted' group by batch_year) b),'[]'::jsonb),
    'interests',coalesce((select jsonb_agg(to_jsonb(s) order by count desc) from (select s.id,s.skill_name as name,count(m.id) as count from public.skill s left join public.member m on s.id=any(m.interests) group by s.id) s),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(t) order by name) from (select t.id,t.team_name as name,count(m.id) as count from public.production_team t left join public.member_team_assignment a on a.team_id=t.id left join public.member m on m.id=a.member_id and m.membership_status='accepted' and m.is_active group by t.id) t),'[]'::jsonb),
    'recent',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from (select id,full_name,membership_status,created_at,member_id,is_active from public.member order by created_at desc,id limit 5) r),'[]'::jsonb)
  ) into result from public.member;
  return result;
end; $$;
revoke all on function public.admin_member_analytics() from public,anon;
grant execute on function public.admin_member_analytics() to authenticated;

create or replace function public.update_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
revoke all on function public.update_updated_at() from public,anon,authenticated;
notify pgrst, 'reload schema';

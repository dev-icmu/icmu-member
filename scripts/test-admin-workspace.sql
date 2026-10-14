-- Run as the database owner against a disposable/local database after migrations.
-- The synthetic Auth/session/member fixtures and counters are always rolled back.
-- This file does not need existing administrator credentials or member identifiers.
begin;

do $test$
declare
  v_admin uuid := gen_random_uuid();
  v_session uuid := gen_random_uuid();
  v_web_user uuid := gen_random_uuid();
  v_member uuid;
  v_application uuid;
  v_paper uuid;
  v_legacy uuid;
  v_team uuid := gen_random_uuid();
  v_skill uuid := gen_random_uuid();
  v_guardian uuid;
  v_member_id varchar;
  v_payload jsonb;
  v_baseline jsonb;
  v_summary jsonb;
  v_guardian_count bigint;
  v_paid_at timestamptz;
  v_tag text := replace(gen_random_uuid()::text, '-', '');
  v_blocked boolean;
begin
  insert into auth.users(id, aud, role, raw_app_meta_data)
  values (v_admin, 'authenticated', 'authenticated', jsonb_build_object('identity_provider','icmu-web','web_user_id',v_web_user,'display_name','Fixture Admin'));
  insert into auth.sessions(id, user_id, created_at, updated_at, aal)
  values (v_session, v_admin, now(), now(), 'aal1');
  -- Service APIs must work without direct privileges on the Auth schema tables.
  execute 'set local role service_role';
  perform public.admin_bridge_link_identity(v_web_user,v_admin);
  if public.admin_bridge_identity(v_web_user) is distinct from v_admin then raise exception 'TEST: bridge identity link failed'; end if;
  perform public.admin_bridge_register(v_admin,v_session,v_web_user,'test-'||v_tag,repeat('test',16),now()+interval '1 hour');
  if public.admin_bridge_session(v_admin,v_session)->>'web_token' is distinct from repeat('test',16) then raise exception 'TEST: bridge session lookup failed'; end if;
  if not public.admin_bridge_renew(v_admin,v_session,true) then raise exception 'TEST: bridge session renewal failed'; end if;
  execute 'reset role';

  insert into public.production_team(id,team_name,is_active,is_protected) values(v_team,'Test team '||v_tag,true,false);
  insert into public.skill(id,skill_name,is_active,is_protected) values(v_skill,'Test skill '||v_tag,true,false);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_admin,'role','authenticated','session_id',v_session)::text,true);
  execute 'set local role authenticated';
  if not public.admin_access() then raise exception 'TEST: valid admin bridge denied'; end if;
  v_baseline := public.admin_member_analytics();
  select count(*) into v_guardian_count from public.guardian;

  v_payload := jsonb_build_object(
    'full_name','Test Student '||v_tag,'name_with_initials','T. Student',
    'date_of_birth','2012-01-31','joined_date',current_date,'index_number',null,
    'email_address',v_tag||'@example.invalid','whatsapp_number','+94771234567',
    'interests',jsonb_build_array(v_skill),
    'form_number','0000-'||v_tag,'school_class','8 B','address','Test address','other_skills','Sound mixing','fee_received',true,
    'guardian',jsonb_build_object('guardian_name','Test Guardian','contact_number','+94777654321','occupation','Test'));

  v_member := (public.admin_save_member(null,v_payload)->>'id')::uuid;
  if not exists(select 1 from public.member where id=v_member and membership_status='pending' and member_id is null and batch_year=2011 and is_active) then
    raise exception 'TEST: admin create did not preserve pending and January batch rules';
  end if;
  select guardian_id into v_guardian from public.member where id=v_member;

  -- This fails after a guardian INSERT, so rollback must remove that guardian too.
  v_blocked := false;
  begin
    perform public.admin_save_member(null,v_payload);
  exception when unique_violation then v_blocked := true;
  end;
  if not v_blocked or (select count(*) from public.guardian) <> v_guardian_count+1 then
    raise exception 'TEST: failed duplicate member created an orphan guardian';
  end if;

  perform public.admin_save_member(v_member,jsonb_build_object('full_name','Edited Test Student','city','Colombo',
    'guardian',jsonb_build_object('guardian_name','Edited Test Guardian','contact_number','+94777654321','occupation','Updated')));
  if not exists(select 1 from public.member m join public.guardian g on g.id=m.guardian_id where m.id=v_member and m.full_name='Edited Test Student' and g.guardian_name='Edited Test Guardian' and g.id=v_guardian) then
    raise exception 'TEST: member and guardian edit did not persist together';
  end if;

  v_member_id := public.approve_member(v_member);
  if v_member_id !~ '^11M[0-9]{3}$' or public.approve_member(v_member)<>v_member_id then
    raise exception 'TEST: approval identifier or idempotency failed';
  end if;
  insert into public.member_team_assignment(member_id,team_id) values(v_member,v_team);
  if not exists(select 1 from public.member_team_assignment where member_id=v_member and team_id=v_team) then
    raise exception 'TEST: eligible team assignment failed';
  end if;

  perform public.admin_set_member_active(v_member,false);
  if not exists(select 1 from public.member where id=v_member and not is_active and deactivated_at is not null and membership_status='accepted' and member_id=v_member_id) then
    raise exception 'TEST: deactivation changed approval or lost member ID';
  end if;
  v_summary := public.admin_member_analytics();
  if (v_summary#>>'{counts,total}')::bigint<>(v_baseline#>>'{counts,total}')::bigint+1
    or (v_summary#>>'{counts,accepted}')::bigint<>(v_baseline#>>'{counts,accepted}')::bigint+1
    or (v_summary#>>'{counts,inactive}')::bigint<>(v_baseline#>>'{counts,inactive}')::bigint+1 then
    raise exception 'TEST: exact analytics counts are incorrect after create/approve/deactivate';
  end if;
  if not exists(select 1 from jsonb_array_elements(v_summary->'teams') t where t->>'id'=v_team::text and (t->>'count')::int=0) then
    raise exception 'TEST: team analytics include an inactive member';
  end if;

  perform public.admin_set_member_active(v_member,true);
  if not exists(select 1 from public.member where id=v_member and is_active and deactivated_at is null) then raise exception 'TEST: reactivation failed'; end if;
  delete from public.member_team_assignment where member_id=v_member and team_id=v_team;

  -- Public registration must force pending status and server-chosen identifiers.
  execute 'set local role anon';
  v_blocked := false;
  begin perform public.approve_member(v_member); exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'TEST: anonymous approval remained exposed'; end if;
  v_blocked := false;
  begin insert into public.member(full_name) values('Test blocked direct insert'); exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'TEST: anonymous direct member INSERT remained exposed'; end if;
  v_application := (public.submit_member_application(v_payload||jsonb_build_object('email_address',null,'membership_status','accepted','member_id','99M999','is_active',false))->>'id')::uuid;
  execute 'set local role authenticated';
  if not exists(select 1 from public.member where id=v_application and membership_status='pending' and member_id is null and is_active and application_source='online' and form_number is null and fee_amount is null and fee_paid_at is null and processed_by is null) then
    raise exception 'TEST: public registration accepted privileged fields';
  end if;
  perform public.admin_review_member(v_application,'rejected');
  if not exists(select 1 from public.member where id=v_application and membership_status='rejected') then raise exception 'TEST: rejection failed'; end if;
  perform public.admin_review_member(v_application,'pending');
  if not exists(select 1 from public.member where id=v_application and membership_status='pending') then raise exception 'TEST: reopening failed'; end if;

  v_blocked := false;
  begin perform public.admin_review_member(v_application,null); exception when invalid_parameter_value then v_blocked := true; end;
  if not v_blocked then raise exception 'TEST: null review status was accepted'; end if;

  -- Online applications still approve without introducing a paper fee requirement.
  perform public.approve_member(v_application);

  -- A paper application can be saved unpaid, but only approval issues its member ID.
  v_paper := (public.admin_save_member(null,v_payload||jsonb_build_object('form_number','0001-'||v_tag,'email_address',null,'fee_received',false,'processed_by',gen_random_uuid(),'processed_by_name','Forged'))->>'id')::uuid;
  if not exists(select 1 from public.member where id=v_paper and form_number='0001-'||v_tag and fee_amount=500 and fee_paid_at is null and membership_status='pending' and member_id is null and processed_by=v_admin and processed_by_name='Fixture Admin' and processed_at is not null) then
    raise exception 'TEST: new paper defaults, form number or processing audit failed';
  end if;
  v_blocked := false;
  begin perform public.approve_member(v_paper); exception when invalid_parameter_value then v_blocked := true; end;
  if not v_blocked or exists(select 1 from public.member where id=v_paper and (member_id is not null or approved_by is not null)) then raise exception 'TEST: unpaid paper application was approved'; end if;

  v_blocked := false;
  begin perform public.admin_save_member(v_paper,jsonb_build_object('application_source','online')); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: paper application source could bypass fee requirement'; end if;

  select count(*) into v_guardian_count from public.guardian;
  v_blocked := false;
  begin perform public.admin_save_member(null,v_payload||jsonb_build_object('form_number','0001-'||v_tag,'email_address',null)); exception when unique_violation then v_blocked:=true; end;
  if not v_blocked or (select count(*) from public.guardian)<>v_guardian_count then raise exception 'TEST: duplicate printed form number created an orphan guardian'; end if;

  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',true,'fee_paid_at','2000-01-01','approved_by_name','Forged'));
  select fee_paid_at into v_paid_at from public.member where id=v_paper;
  if v_paid_at is null or v_paid_at<now() then raise exception 'TEST: fee payment time was not assigned by the server'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('city','Galle'));
  if (select fee_paid_at from public.member where id=v_paper) is distinct from v_paid_at then raise exception 'TEST: ordinary edit changed payment timestamp'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',false));
  if (select fee_paid_at from public.member where id=v_paper) is not null then raise exception 'TEST: explicit unpaid correction failed'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',true));
  v_member_id := public.approve_member(v_paper);
  if not exists(select 1 from public.member where id=v_paper and approved_by=v_admin and approved_by_name='Fixture Admin' and approved_at is not null and member_id=v_member_id) then raise exception 'TEST: approval audit or receipt identifier failed'; end if;

  -- Legacy rows retain unknown source/fee data when edited and approved.
  execute 'reset role';
  insert into public.member(full_name,name_with_initials,date_of_birth,joined_date,whatsapp_number,batch_year)
  values('Legacy Fixture','L. Fixture','2011-05-01',current_date,'+94771234567',2011) returning id into v_legacy;
  execute 'set local role authenticated';
  perform public.admin_save_member(v_legacy,jsonb_build_object('city','Kandy'));
  if not exists(select 1 from public.member where id=v_legacy and application_source is null and fee_amount is null and fee_paid_at is null) then raise exception 'TEST: legacy edit invented a paper fee'; end if;
  perform public.approve_member(v_legacy);

  -- Auth expiry denies reads and cannot be bypassed by renewing the web bridge.
  execute 'reset role';
  update auth.sessions set not_after=now()-interval '1 second' where id=v_session;
  execute 'set local role authenticated';
  if public.admin_access() or exists(select 1 from public.member) then raise exception 'TEST: expired Auth session retained admin access'; end if;
  execute 'set local role service_role';
  if public.admin_bridge_renew(v_admin,v_session,true) or public.admin_bridge_session(v_admin,v_session) is not null then raise exception 'TEST: expired Auth session bridge remained usable'; end if;
  v_blocked := false;
  begin perform public.admin_bridge_register(v_admin,v_session,v_web_user,'test-'||v_tag,repeat('test',16),now()+interval '1 hour'); exception when insufficient_privilege then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: expired Auth session could register a new bridge'; end if;
  execute 'reset role';
  update auth.sessions set not_after=now()+interval '1 hour' where id=v_session;
  execute 'set local role authenticated';
  if not public.admin_access() then raise exception 'TEST: valid bounded Auth session was denied'; end if;

  -- The same authenticated role without a bridge session must lose admin access.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_admin,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if public.admin_access() or exists(select 1 from public.member) then raise exception 'TEST: missing bridge did not deny access'; end if;
  v_blocked := false;
  begin perform public.approve_member(v_application); exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'TEST: unverified administrator could approve'; end if;
  execute 'reset role';
  raise notice 'PASS: admin member create/edit, guardian atomicity, approval, assignment, status, activity, exact analytics and access boundaries';
end;
$test$;

rollback;

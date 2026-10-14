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
  v_skill_count bigint;
  v_paid_at timestamptz;
  v_job jsonb;
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
    'full_name','Test Student '||v_tag,
    'date_of_birth','2012-01-31','joined_date',current_date,'index_number','41001',
    'email_address',v_tag||'@example.invalid','whatsapp_number','+94771234567',
    'interests',jsonb_build_array(v_skill),
    'form_number','0000','city','Colombo','fee_received',true,
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
  if not exists(select 1 from public.member m join public.guardian g on g.id=m.guardian_id where m.id=v_member and m.full_name='edited test student' and g.guardian_name='edited test guardian' and g.id=v_guardian) then
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
  v_application := (public.submit_member_application(v_payload||jsonb_build_object('email_address',null,'index_number','41002','membership_status','accepted','member_id','99M999','is_active',false,'custom_skills',jsonb_build_array('public forbidden skill')))->>'id')::uuid;
  execute 'set local role authenticated';
  if not exists(select 1 from public.member where id=v_application and membership_status='pending' and member_id is null and is_active and form_number is null and processed_by is null) then
    raise exception 'TEST: public registration accepted privileged fields';
  end if;
  if exists(select 1 from public.skill where skill_name='public forbidden skill') then raise exception 'TEST: public application created a catalog skill'; end if;
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
  v_paper := (public.admin_save_member(null,v_payload||jsonb_build_object('form_number','0001','index_number','41003','email_address',null,'fee_received',false,'processed_by',gen_random_uuid(),'processed_by_name','Forged'))->>'id')::uuid;
  if not exists(select 1 from public.member where id=v_paper and form_number='0001' and membership_status='pending' and member_id is null and processed_by=v_admin and processed_by_name='Fixture Admin' and processed_at is not null) then
    raise exception 'TEST: new paper defaults, form number or processing audit failed';
  end if;

  -- Server-side normalization and atomic, case-insensitive catalog creation.
  perform public.admin_save_member(v_paper,jsonb_build_object('full_name','  R M P G T HASARINDA  ','city','  COLOMBO ',
    'whatsapp_number','0701234567','other_skills','This must not be stored',
    'guardian',jsonb_build_object('guardian_name','  UPPER Guardian ','contact_number','0094707654321','occupation',' TEACHER '),
    'custom_skills',jsonb_build_array(' Audio   Mixing ','audio mixing','TEST SKILL '||v_tag)));
  if not exists(select 1 from public.member m join public.guardian g on g.id=m.guardian_id where m.id=v_paper
    and m.full_name='r m p g t hasarinda' and m.city='colombo' and m.name_with_initials is null and m.other_skills is null
    and m.whatsapp_number='+94701234567' and g.guardian_name='upper guardian' and g.occupation='teacher' and g.contact_number='+94707654321') then
    raise exception 'TEST: application text or local phone normalization failed';
  end if;
  if (select count(*) from public.skill where skill_name='audio mixing')<>1
    or not exists(select 1 from public.member m join public.skill s on s.id=any(m.interests) where m.id=v_paper and s.skill_name='audio mixing')
    or (select cardinality(interests) from public.member where id=v_paper)<>2 then
    raise exception 'TEST: custom skill pills were not deduplicated and assigned';
  end if;
  select count(*) into v_skill_count from public.skill;
  v_blocked:=false;
  begin
    perform public.admin_save_member(null,v_payload||jsonb_build_object('form_number','0001','index_number','41009','email_address',null,'custom_skills',jsonb_build_array('rollback skill')));
  exception when unique_violation then v_blocked:=true; end;
  if not v_blocked or (select count(*) from public.skill)<>v_skill_count then raise exception 'TEST: failed application left an orphan skill'; end if;
  v_blocked:=false;
  begin perform public.admin_save_member(v_paper,'{"form_number":"1e03"}'::jsonb); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: invalid printed digits accepted'; end if;
  v_blocked:=false;
  begin perform public.admin_save_member(v_paper,'{"custom_skills":[null]}'::jsonb); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: malformed custom skill accepted'; end if;
  v_blocked:=false;
  begin perform private.prepare_application(null,'{}',true); exception when insufficient_privilege then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: internal prepare function exposed'; end if;
  v_blocked := false;
  begin perform public.approve_member(v_paper); exception when invalid_parameter_value then v_blocked := true; end;
  if not v_blocked or exists(select 1 from public.member where id=v_paper and member_id is not null) then raise exception 'TEST: unpaid paper application was approved'; end if;

  select count(*) into v_guardian_count from public.guardian;
  v_blocked := false;
  begin perform public.admin_save_member(null,v_payload||jsonb_build_object('form_number','0001','index_number','41004','email_address',null)); exception when unique_violation then v_blocked:=true; end;
  if not v_blocked or (select count(*) from public.guardian)<>v_guardian_count then raise exception 'TEST: duplicate printed form number created an orphan guardian'; end if;

  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',true,'approved_by_name','Forged'));
  select (elem->>'paid_date')::timestamptz into v_paid_at from public.membership_fee mf, jsonb_array_elements(mf.fees) elem where mf.member_id=v_paper and elem->>'academic_year'='2026/2027';
  if v_paid_at is null or v_paid_at<now() then raise exception 'TEST: fee payment time was not assigned by the server'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('city','Galle'));
  if (select (elem->>'paid_date')::timestamptz from public.membership_fee mf, jsonb_array_elements(mf.fees) elem where mf.member_id=v_paper and elem->>'academic_year'='2026/2027') is distinct from v_paid_at then raise exception 'TEST: ordinary edit changed payment timestamp'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',false));
  if exists (select 1 from public.membership_fee mf, jsonb_array_elements(mf.fees) elem where mf.member_id=v_paper and elem->>'academic_year'='2026/2027') then raise exception 'TEST: explicit unpaid correction failed'; end if;
  perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',true));
  v_member_id := public.approve_member_with_notification(v_paper,true);
  perform public.approve_member_with_notification(v_paper,true);

  -- Approved with paid cannot be changed back to unpaid (irreversible).
  v_blocked:=false;
  begin perform public.admin_save_member(v_paper,jsonb_build_object('fee_received',false)); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: approved paid member could be marked unpaid'; end if;

  execute 'reset role';
  if (select count(*) from private.whatsapp_approval_queue)<>1 then raise exception 'TEST: approval queue missing or duplicated'; end if;
  if public.admin_whatsapp_status(v_paper)->>'status'<>'queued' then raise exception 'TEST: wrong notification status'; end if;
  if exists(select 1 from private.whatsapp_approval_queue where member_id in(v_member,v_application)) then raise exception 'TEST: message queued without consent'; end if;
  execute 'set local role authenticated';
  v_blocked:=false;
  begin perform public.claim_approval_whatsapp(); exception when insufficient_privilege then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: client could claim service queue'; end if;
  execute 'reset role';
  execute 'set local role service_role';
  v_job:=public.claim_approval_whatsapp();
  if v_job->>'member_id'<>v_member_id then raise exception 'TEST: wrong queue member'; end if;
  if public.claim_approval_whatsapp() is not null then raise exception 'TEST: queue lease duplicated'; end if;
  if public.finish_approval_whatsapp((v_job->>'id')::uuid,gen_random_uuid(),'submitted','wamid.fake',null) then raise exception 'TEST: wrong lease accepted'; end if;
  if not public.finish_approval_whatsapp((v_job->>'id')::uuid,(v_job->>'claim_id')::uuid,'submitted','wamid.fixture',null) then raise exception 'TEST: delivery receipt not saved'; end if;
  if public.finish_approval_whatsapp((v_job->>'id')::uuid,(v_job->>'claim_id')::uuid,'queued',null,null) then raise exception 'TEST: submitted message could be requeued'; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  if public.admin_whatsapp_status(v_paper)->>'status'<>'submitted' then raise exception 'TEST: provider acceptance status missing'; end if;
  if not exists(select 1 from public.member where id=v_paper and member_id=v_member_id) then raise exception 'TEST: approval receipt identifier failed'; end if;
  v_summary:=public.admin_membership_revenue('all');
  if (v_summary->>'total')::numeric<>1000 or (v_summary->>'payments')::int<>2 then raise exception 'TEST: unpaid applications counted as revenue'; end if;
  execute 'reset role';
  update public.membership_fee set fees = jsonb_build_array(jsonb_build_object('academic_year','2026/2027','fee_amount',250,'paid_date',now()-interval '40 days','payment_method','cash')) where member_id=v_paper;
  if (public.admin_membership_revenue('all')->>'total')::numeric<>750 or (public.admin_membership_revenue('7d')->>'total')::numeric<>500 then raise exception 'TEST: revenue used default fee or wrong payment window'; end if;
  update public.membership_fee set fees = jsonb_build_array(jsonb_build_object('academic_year','2026/2027','fee_amount',250,'paid_date',now()+interval '1 day','payment_method','cash')) where member_id=v_paper;
  if (public.admin_membership_revenue('all')->>'total')::numeric<>500 then raise exception 'TEST: future payment counted'; end if;
  update public.membership_fee set fees = jsonb_build_array(jsonb_build_object('academic_year','2026/2027','fee_amount',250,'paid_date',(((now() at time zone 'Asia/Colombo')::date-6)::timestamp at time zone 'Asia/Colombo')-interval '1 second','payment_method','cash')) where member_id=v_paper;
  if (public.admin_membership_revenue('7d')->>'total')::numeric<>500 then raise exception 'TEST: payment before Colombo boundary included'; end if;
  update public.membership_fee set fees = jsonb_build_array(jsonb_build_object('academic_year','2026/2027','fee_amount',250,'paid_date',(((now() at time zone 'Asia/Colombo')::date-6)::timestamp at time zone 'Asia/Colombo'),'payment_method','cash')) where member_id=v_paper;
  if (public.admin_membership_revenue('7d')->>'total')::numeric<>750 then raise exception 'TEST: Colombo start date excluded'; end if;
  update public.membership_fee set fees = jsonb_build_array(jsonb_build_object('academic_year','2026/2027','fee_amount',500,'paid_date',now(),'payment_method','cash')) where member_id=v_paper;
  execute 'set local role authenticated';
  v_blocked:=false;
  begin perform public.admin_membership_revenue('bad'); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: invalid revenue range accepted'; end if;

  -- 2008 batch must be excluded from revenue calculations and pending counts
  execute 'reset role';
  update public.member set batch_year=2008 where id=v_paper;
  update public.member set batch_year=2008 where id=v_application;
  execute 'set local role authenticated';
  if (public.admin_membership_revenue('all')->>'total')::numeric<>500 then raise exception 'TEST: 2008 batch was included in revenue'; end if;
  if (public.admin_membership_revenue('all')->>'pending_count')::numeric<>(select count(*) from public.member where membership_status='pending' and (batch_year is distinct from 2008)) then raise exception 'TEST: 2008 batch was included in pending_count'; end if;
  execute 'reset role';
  update public.member set batch_year=2011 where id=v_paper;
  update public.member set batch_year=2011 where id=v_application;
  execute 'set local role authenticated';


  -- Legacy rows retain unknown source/fee data when edited and approved.
  execute 'reset role';
  insert into public.member(full_name,name_with_initials,date_of_birth,joined_date,whatsapp_number,batch_year)
  values('Legacy Fixture','L. Fixture','2011-05-01',current_date,'+94771234567',2011) returning id into v_legacy;
  execute 'set local role authenticated';
  perform public.admin_save_member(v_legacy,jsonb_build_object('city','Kandy'));
  if not exists(select 1 from public.member where id=v_legacy and form_number is null) then raise exception 'TEST: legacy edit invented a paper fee'; end if;
  perform public.approve_member(v_legacy);

  -- Period summaries use Colombo calendar boundaries and exclude future rows.
  execute 'reset role';
  update public.member set created_at=(((now() at time zone 'Asia/Colombo')::date-6)::timestamp at time zone 'Asia/Colombo') where id=v_member;
  update public.member set created_at=now() where id=v_application;
  update public.member set created_at=now()+interval '2 days' where id=v_paper;
  execute 'set local role authenticated';
  v_summary:=public.admin_application_activity('7d');
  if jsonb_array_length(v_summary->'points')<>7 or (v_summary->>'has_enough_data')::boolean is not true
    or (v_summary->>'total')::bigint<>(select count(*) from public.member where created_at>=(((now() at time zone 'Asia/Colombo')::date-6)::timestamp at time zone 'Asia/Colombo') and created_at<(((now() at time zone 'Asia/Colombo')::date+1)::timestamp at time zone 'Asia/Colombo')) then
    raise exception 'TEST: 7-day activity boundary or total incorrect';
  end if;
  if jsonb_array_length(public.admin_application_activity('30d')->'points')<>30
    or jsonb_array_length(public.admin_application_activity('6m')->'points')<>6
    or jsonb_array_length(public.admin_application_activity('1y')->'points')<>12 then raise exception 'TEST: activity period sizes incorrect'; end if;
  v_blocked:=false;
  begin perform public.admin_application_activity('anything'); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: unbounded activity range accepted'; end if;
  if (select sum((b->>'total')::int) from jsonb_array_elements(public.admin_member_batches()) b)<>(select count(*) from public.member where batch_year is not null) then raise exception 'TEST: batch summaries lost records'; end if;
  v_blocked:=false;
  begin perform public.admin_save_member(v_paper,'{"city":""}'::jsonb); exception when invalid_parameter_value then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: required paper city could be cleared'; end if;

  -- Config entries exist and are readable by authenticated admin
  if not exists (select 1 from public.config where key = 'ACADEMIC_YEAR' and value = '2026/2027') then
    raise exception 'TEST: ACADEMIC_YEAR not seeded in public.config';
  end if;
  if not exists (select 1 from public.config where key = 'ACADEMIC_BATCH_YEAR' and value = '2008') then
    raise exception 'TEST: ACADEMIC_BATCH_YEAR not seeded in public.config';
  end if;

  -- Yearly membership fee recording, history query and active year synchronization
  perform public.admin_record_membership_fee(v_member, '2026/2027', 500, 'Initial payment');
  if not exists (
    select 1 from public.membership_fee mf, jsonb_array_elements(mf.fees) elem
    where mf.member_id = v_member and elem->>'academic_year' = '2026/2027' and (elem->>'fee_amount')::numeric = 500
  ) then
    raise exception 'TEST: membership_fee entry not recorded';
  end if;
  perform public.admin_record_membership_fee(v_member, '2027/2028', 500, 'Next board advance payment');
  if jsonb_array_length(public.admin_get_member_fee_history(v_member)) <> 2 then
    raise exception 'TEST: admin_get_member_fee_history did not return 2 years of payments';
  end if;

  -- Ensure legacy payment columns were dropped from public.member
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'member' and column_name in ('fee_amount', 'fee_paid_at')
  ) then
    raise exception 'TEST: payment columns fee_amount / fee_paid_at still present on member table';
  end if;

  -- Ensure scalar payment columns and top-level notes were dropped from public.membership_fee, and fees jsonb exists
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'membership_fee' and column_name in ('academic_year', 'fee_amount', 'paid_date', 'payment_method', 'notes')
  ) then
    raise exception 'TEST: scalar payment or notes columns still present on membership_fee table';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'membership_fee' and column_name = 'fees'
  ) then
    raise exception 'TEST: fees jsonb column not present on membership_fee table';
  end if;

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
  v_blocked:=false;
  begin perform public.admin_member_batches(); exception when insufficient_privilege then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: unverified administrator could read batches'; end if;
  v_blocked:=false;
  begin perform public.admin_application_activity('1y'); exception when insufficient_privilege then v_blocked:=true; end;
  if not v_blocked then raise exception 'TEST: unverified administrator could read activity'; end if;
  execute 'reset role';
  raise notice 'PASS: admin member create/edit, guardian atomicity, approval, assignment, status, activity, exact analytics and access boundaries';
end;
$test$;

rollback;

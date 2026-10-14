-- The paper fee is fixed. New skill pills are resolved in the same transaction
-- as the application, so validation failures cannot leave catalog orphans.
create unique index skill_normalized_name_key on public.skill
  (lower(regexp_replace(btrim(skill_name), '\s+', ' ', 'g')));

create function private.normalize_skill_text() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.skill_name:=lower(regexp_replace(btrim(new.skill_name),'\s+',' ','g'));
  new.skill_desc:=nullif(lower(btrim(new.skill_desc)),'');
  if char_length(new.skill_name) not between 1 and 50 then
    raise exception 'Use a skill name between 1 and 50 characters' using errcode='22023';
  end if;
  return new;
end; $$;
revoke all on function private.normalize_skill_text() from public,anon,authenticated;
create trigger normalize_skill_text before insert or update of skill_name,skill_desc on public.skill
for each row execute function private.normalize_skill_text();

create function private.prepare_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v jsonb:=p_payload;
  g jsonb;
  key text;
  text_value text;
  skill_value jsonb;
  skill_id uuid;
  skill_active boolean;
  chosen uuid[];
  existing public.member%rowtype;
  is_paper boolean;
  fixed_fee constant numeric:=500;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and p_id is not null then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(v) is distinct from 'object' or octet_length(v::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;
  if p_id is not null then
    select * into existing from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  end if;
  is_paper:=p_admin and (p_id is null or existing.application_source='paper');

  foreach key in array array['full_name','name_with_initials','index_number','email_address','city','school_class','address'] loop
    if v ? key then
      if jsonb_typeof(v->key) not in ('string','null') then raise exception 'Enter text for %',key using errcode='22023'; end if;
      v:=jsonb_set(v,array[key],coalesce(to_jsonb(nullif(lower(regexp_replace(btrim(v->>key),'\s+',' ','g')),'')),'null'::jsonb));
    end if;
  end loop;
  -- The old free-text column remains readable for historical records. New skills
  -- must reference catalog rows; no new application can write the old field.
  v:=v-'other_skills';
  if v ? 'form_number' and p_admin then
    if jsonb_typeof(v->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
    text_value:=nullif(btrim(v->>'form_number'),'');
    if text_value is not null and text_value !~ '^[0-9]{4}$' then raise exception 'Enter the 4-digit form number' using errcode='22023'; end if;
    v:=jsonb_set(v,'{form_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
  end if;
  if p_admin and v ? 'index_number' and v->>'index_number' is not null and v->>'index_number' !~ '^[0-9]{5}$' then
    raise exception 'Enter the 5-digit school admission number' using errcode='22023';
  end if;
  if is_paper and p_id is null and coalesce(v->>'index_number','') !~ '^[0-9]{5}$' then
    raise exception 'Enter the 5-digit school admission number' using errcode='22023';
  end if;

  if v ? 'whatsapp_number' then
    text_value:=regexp_replace(v->>'whatsapp_number','[[:space:]()-]','','g');
    if text_value ~ '^0[0-9]{9}$' then text_value:='+94'||substring(text_value from 2);
    elsif text_value ~ '^0094[0-9]{9}$' then text_value:='+'||substring(text_value from 3);
    elsif text_value ~ '^94[0-9]{9}$' then text_value:='+'||text_value; end if;
    v:=jsonb_set(v,'{whatsapp_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
  end if;
  if v ? 'guardian' and v->'guardian'<>'null'::jsonb then
    g:=v->'guardian';
    if jsonb_typeof(g) is distinct from 'object' then raise exception 'Enter valid guardian details' using errcode='22023'; end if;
    foreach key in array array['guardian_name','occupation'] loop
      if g ? key then
        if jsonb_typeof(g->key) not in ('string','null') then raise exception 'Enter text for %',key using errcode='22023'; end if;
        g:=jsonb_set(g,array[key],coalesce(to_jsonb(nullif(lower(regexp_replace(btrim(g->>key),'\s+',' ','g')),'')),'null'::jsonb));
      end if;
    end loop;
    text_value:=regexp_replace(g->>'contact_number','[[:space:]()-]','','g');
    if text_value ~ '^0[0-9]{9}$' then text_value:='+94'||substring(text_value from 2);
    elsif text_value ~ '^0094[0-9]{9}$' then text_value:='+'||substring(text_value from 3);
    elsif text_value ~ '^94[0-9]{9}$' then text_value:='+'||text_value; end if;
    g:=jsonb_set(g,'{contact_number}',coalesce(to_jsonb(text_value),'null'::jsonb));
    v:=jsonb_set(v,'{guardian}',g);
  end if;

  if p_admin then
    if v ? 'fee_amount' and (jsonb_typeof(v->'fee_amount') is distinct from 'number' or (v->>'fee_amount')::numeric<>fixed_fee) then
      raise exception 'The membership fee is fixed at LKR 500' using errcode='22023';
    end if;
    if p_id is null or (existing.fee_amount is null and v->'fee_received'='true'::jsonb) then
      v:=jsonb_set(v,'{fee_amount}',to_jsonb(fixed_fee));
    elsif v ? 'fee_amount' and existing.fee_amount is distinct from fixed_fee then
      raise exception 'Previously recorded fees cannot be overwritten' using errcode='22023';
    end if;
    if v ? 'custom_skills' then
      if jsonb_typeof(v->'custom_skills') is distinct from 'array' or jsonb_array_length(v->'custom_skills')>20 then
        raise exception 'Add up to 20 new skills' using errcode='22023';
      end if;
      if v ? 'interests' then
        if jsonb_typeof(v->'interests') is distinct from 'array' then raise exception 'Choose skills from the list' using errcode='22023'; end if;
        select coalesce(array_agg(value::uuid),'{}'::uuid[]) into chosen from jsonb_array_elements_text(v->'interests');
      else chosen:=coalesce(existing.interests,'{}'::uuid[]); end if;
      -- Consistent lock ordering avoids deadlocks when two applications add the same skills.
      for skill_value in select value from jsonb_array_elements(v->'custom_skills') order by lower(regexp_replace(btrim(value#>>'{}'),'\s+',' ','g')) loop
        if jsonb_typeof(skill_value) is distinct from 'string' then raise exception 'Enter a skill name' using errcode='22023'; end if;
        text_value:=lower(regexp_replace(btrim(skill_value#>>'{}'),'\s+',' ','g'));
        if char_length(text_value) not between 1 and 50 then raise exception 'Use a skill name between 1 and 50 characters' using errcode='22023'; end if;
        insert into public.skill(skill_name,is_active,is_protected) values(text_value,true,false)
          on conflict do nothing;
        select id,is_active into skill_id,skill_active from public.skill
          where lower(regexp_replace(btrim(skill_name),'\s+',' ','g'))=text_value;
        if skill_id is null or skill_active is not true then raise exception 'This skill is inactive. Restore it in Skills before selecting it' using errcode='22023'; end if;
        chosen:=array_append(chosen,skill_id);
      end loop;
      select coalesce(array_agg(distinct id),'{}'::uuid[]) into chosen from unnest(chosen) id;
      v:=jsonb_set(v,'{interests}',to_jsonb(chosen));
    end if;
  end if;
  return v-'custom_skills';
end; $$;
revoke all on function private.prepare_application(uuid,jsonb,boolean) from public,anon,authenticated;

-- One member name is sufficient. Keep historical initials without requiring them.
alter table public.member alter column name_with_initials drop not null;

create or replace function private.save_member(p_id uuid,p_payload jsonb,p_admin boolean) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if m.full_name is null or length(m.full_name)<2 or length(m.full_name)>200 then raise exception 'Enter the member name' using errcode='22023'; end if;
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

create or replace function private.save_member_application(p_id uuid,p_payload jsonb,p_admin boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  v_result jsonb;
  v_actor_name text;
  v_fee_received boolean;
  is_new boolean := p_id is null;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and not is_new then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;

  if is_new then
    m.application_source:=case when p_admin then 'paper' else 'online' end;
    if p_admin then m.fee_amount:=500; end if;
  else
    select * into m from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  end if;

  if p_payload ? 'city' then m.city:=nullif(btrim(p_payload->>'city'),''); end if;
  if p_payload ? 'school_class' then m.school_class:=nullif(btrim(p_payload->>'school_class'),''); end if;
  if p_payload ? 'address' then m.address:=nullif(btrim(p_payload->>'address'),''); end if;
  if p_payload ? 'other_skills' then m.other_skills:=nullif(btrim(p_payload->>'other_skills'),''); end if;
  if p_admin then
    if p_payload ? 'application_source' and p_payload->>'application_source' is not null then
      if p_payload->>'application_source' not in ('paper','online')
        or (m.application_source is not null and p_payload->>'application_source'<>m.application_source) then
        raise exception 'Application source cannot be changed' using errcode='22023';
      end if;
      m.application_source:=p_payload->>'application_source';
    end if;
    if p_payload ? 'form_number' then
      if jsonb_typeof(p_payload->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
      m.form_number:=nullif(btrim(p_payload->>'form_number'),'');
    end if;
    if p_payload ? 'fee_amount' then
      if jsonb_typeof(p_payload->'fee_amount') not in ('number','null') then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
      if (p_payload->>'fee_amount')::numeric<>round((p_payload->>'fee_amount')::numeric,2) then raise exception 'Fee amount can have at most two decimal places' using errcode='22023'; end if;
      m.fee_amount:=(p_payload->>'fee_amount')::numeric;
    end if;
    if m.fee_amount is not null and (m.fee_amount<0 or m.fee_amount>999999.99) then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
    if p_payload ? 'fee_received' then
      if jsonb_typeof(p_payload->'fee_received') is distinct from 'boolean' then raise exception 'Choose whether the fee has been received' using errcode='22023'; end if;
      v_fee_received:=(p_payload->>'fee_received')::boolean;
      if v_fee_received and m.fee_amount is null then raise exception 'Enter the fee amount before recording payment' using errcode='22023'; end if;
      m.fee_paid_at:=case when v_fee_received then coalesce(m.fee_paid_at,now()) else null end;
    end if;
    if m.application_source='paper' and (m.form_number is null or m.city is null or m.fee_amount is null) then
      raise exception 'Paper applications need a form number, city and fee amount' using errcode='22023';
    end if;
    if m.processed_at is null then
      select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'),''),'ICMU admin') into v_actor_name from auth.users where id=auth.uid();
      m.processed_by:=auth.uid(); m.processed_by_name:=v_actor_name; m.processed_at:=now();
    end if;
  end if;

  -- The existing core still validates and saves member/guardian data atomically.
  -- Any later unique form-number failure rolls this entire statement back too.
  v_result:=private.save_member(p_id,p_payload,p_admin);
  update public.member set
    form_number=m.form_number,school_class=m.school_class,address=m.address,other_skills=m.other_skills,
    application_source=m.application_source,fee_amount=m.fee_amount,fee_paid_at=m.fee_paid_at,
    processed_by=m.processed_by,processed_by_name=m.processed_by_name,processed_at=m.processed_at
  where id=(v_result->>'id')::uuid;
  return v_result;
end; $$;

create or replace function private.admin_save(p_id uuid,p_payload jsonb) returns jsonb
language sql security definer set search_path='' as $$
  select private.save_member_application(p_id,private.prepare_application(p_id,p_payload,true),true);
$$;
create or replace function private.submit_application(p_payload jsonb) returns jsonb
language sql security definer set search_path='' as $$
  select private.save_member_application(null,private.prepare_application(null,p_payload,false),false);
$$;
-- Return only batch summaries to verified admins, without loading member rows.
create function private.member_batches() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(b order by b.batch_year desc) from (
    select batch_year,count(*) total,
      count(*) filter(where membership_status='accepted') accepted,
      count(*) filter(where membership_status='pending') pending,
      count(*) filter(where membership_status='rejected') rejected
    from public.member where batch_year is not null group by batch_year
  ) b),'[]'::jsonb);
end; $$;
revoke all on function private.member_batches() from public,anon,authenticated;
grant execute on function private.member_batches() to authenticated;
create function public.admin_member_batches() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.member_batches(); $$;
revoke all on function public.admin_member_batches() from public,anon;
grant execute on function public.admin_member_batches() to authenticated;
notify pgrst,'reload schema';

create function private.application_activity(p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  today date := (now() at time zone 'Asia/Colombo')::date;
  first_day date;
  step interval;
  monthly boolean;
  result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_period is null or p_period not in ('7d','30d','6m','1y') then raise exception 'Choose a valid activity range' using errcode='22023'; end if;
  monthly := p_period in ('6m','1y');
  first_day := case p_period when '7d' then today-6 when '30d' then today-29
    when '6m' then (date_trunc('month',today)-interval '5 months')::date
    else (date_trunc('month',today)-interval '11 months')::date end;
  step := case when monthly then interval '1 month' else interval '1 day' end;
  with buckets as (
    select d::date as bucket from generate_series(first_day::timestamp,today::timestamp,step) d
  ), counts as (
    select case when monthly then date_trunc('month',created_at at time zone 'Asia/Colombo')::date
      else (created_at at time zone 'Asia/Colombo')::date end as bucket,count(*) applications
    from public.member
    where created_at >= (first_day::timestamp at time zone 'Asia/Colombo')
      and created_at < ((today+1)::timestamp at time zone 'Asia/Colombo')
    group by 1
  ), points as (
    select b.bucket,to_char(b.bucket,case when monthly then 'Mon YY' else 'DD Mon' end) label,
      coalesce(c.applications,0) applications from buckets b left join counts c using(bucket)
  ) select jsonb_build_object('points',jsonb_agg(points order by bucket),'total',coalesce(sum(applications),0),
      'has_enough_data',count(*) filter(where applications>0)>=2) into result from points;
  return result;
end; $$;
revoke all on function private.application_activity(text) from public,anon,authenticated;
grant execute on function private.application_activity(text) to authenticated;
create function public.admin_application_activity(p_period text) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.application_activity(p_period); $$;
revoke all on function public.admin_application_activity(text) from public,anon;
grant execute on function public.admin_application_activity(text) to authenticated;
notify pgrst,'reload schema';

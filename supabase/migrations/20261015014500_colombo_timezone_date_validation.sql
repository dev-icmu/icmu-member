begin;

-- Align date checks with Asia/Colombo calendar day instead of server UTC.
-- This prevents false-positive "Enter valid birth and joined dates" errors
-- when students or admins in Sri Lanka submit registrations during UTC night hours (00:00 - 05:30 Colombo).
create or replace function private.save_member(p_id uuid,p_payload jsonb,p_admin boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.member%rowtype;
  g jsonb;
  v_id uuid;
  v_guardian uuid;
  v_interests uuid[];
  is_new boolean:=p_id is null;
  v_today date := (now() at time zone 'Asia/Colombo')::date;
begin
  if p_admin and not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if not p_admin and not is_new then raise exception 'Not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise exception 'Invalid member details' using errcode='22023'; end if;
  if is_new then m.id:=gen_random_uuid(); m.joined_date:=v_today; m.membership_status:='pending'; m.is_active:=true;
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
  if m.date_of_birth is null or m.date_of_birth>=v_today or m.date_of_birth<date '1940-01-01' or m.joined_date>v_today then raise exception 'Enter valid birth and joined dates' using errcode='22023'; end if;
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

notify pgrst, 'reload schema';

commit;

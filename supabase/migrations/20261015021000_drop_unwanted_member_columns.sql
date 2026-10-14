begin;

-- Drop unwanted columns from public.member
alter table public.member
  drop column if exists school_class,
  drop column if exists address,
  drop column if exists application_source,
  drop column if exists approved_by,
  drop column if exists approved_by_name,
  drop column if exists approved_at;

-- Update private.prepare_application without school_class, address, application_source
create or replace function private.prepare_application(p_id uuid,p_payload jsonb,p_admin boolean)
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
  is_paper:=p_admin and (p_id is null or existing.form_number is not null);

  foreach key in array array['full_name','name_with_initials','index_number','email_address','city'] loop
    if v ? key then
      if jsonb_typeof(v->key) not in ('string','null') then raise exception 'Enter text for %',key using errcode='22023'; end if;
      v:=jsonb_set(v,array[key],coalesce(to_jsonb(nullif(lower(regexp_replace(btrim(v->>key),'\s+',' ','g')),'')),'null'::jsonb));
    end if;
  end loop;

  v:=v-'other_skills'-'school_class'-'address'-'application_source';
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

-- Update private.save_member_application without school_class, address, application_source
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
    if p_admin then m.fee_amount:=500; end if;
  else
    select * into m from public.member where id=p_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  end if;

  if p_payload ? 'city' then m.city:=nullif(btrim(p_payload->>'city'),''); end if;
  if p_payload ? 'other_skills' then m.other_skills:=nullif(btrim(p_payload->>'other_skills'),''); end if;
  if p_admin then
    if p_payload ? 'form_number' then
      if jsonb_typeof(p_payload->'form_number') not in ('string','null') then raise exception 'Enter the printed form number as text' using errcode='22023'; end if;
      m.form_number:=nullif(btrim(p_payload->>'form_number'),'');
    end if;
    if p_payload ? 'fee_amount' then
      if jsonb_typeof(p_payload->'fee_amount') not in ('number','null') then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
      if (p_payload->>'fee_amount')::numeric<>round((p_payload->>'fee_amount')::numeric,2) then raise exception 'Fee amount can have at most two decimal places' using errcode='22023'; end if;
      -- Irreversible check: Fee amount cannot be changed after approval with payment
      if m.membership_status='accepted' and m.fee_paid_at is not null and (p_payload->>'fee_amount')::numeric is distinct from m.fee_amount then
        raise exception 'Fee amount cannot be changed after member approval' using errcode='22023';
      end if;
      m.fee_amount:=(p_payload->>'fee_amount')::numeric;
    end if;
    if m.fee_amount is not null and (m.fee_amount<0 or m.fee_amount>999999.99) then raise exception 'Enter a valid fee amount' using errcode='22023'; end if;
    if p_payload ? 'fee_received' then
      if jsonb_typeof(p_payload->'fee_received') is distinct from 'boolean' then raise exception 'Choose whether the fee has been received' using errcode='22023'; end if;
      v_fee_received:=(p_payload->>'fee_received')::boolean;
      -- Irreversible check: Fee payment cannot be reversed after approval
      if m.membership_status='accepted' and m.fee_paid_at is not null and not v_fee_received then
        raise exception 'Payment cannot be reversed after member approval' using errcode='22023';
      end if;
      if v_fee_received and m.fee_amount is null then raise exception 'Enter the fee amount before recording payment' using errcode='22023'; end if;
      m.fee_paid_at:=case when v_fee_received then coalesce(m.fee_paid_at,now()) else null end;
    end if;
    if (is_new or m.form_number is not null) and (m.form_number is null or m.city is null or m.fee_amount is null) then
      raise exception 'Paper applications need a form number, city and fee amount' using errcode='22023';
    end if;
    if m.processed_at is null then
      select coalesce(nullif(btrim(raw_app_meta_data->>'display_name'),''),'ICMU admin') into v_actor_name from auth.users where id=auth.uid();
      m.processed_by:=auth.uid(); m.processed_by_name:=v_actor_name; m.processed_at:=now();
    end if;
  end if;

  v_result:=private.save_member(p_id,p_payload,p_admin);
  update public.member set
    form_number=m.form_number,other_skills=m.other_skills,
    fee_amount=m.fee_amount,fee_paid_at=m.fee_paid_at,
    processed_by=m.processed_by,processed_by_name=m.processed_by_name,processed_at=m.processed_at
  where id=(v_result->>'id')::uuid;
  return v_result;
end; $$;

revoke all on function private.save_member_application(uuid,jsonb,boolean) from public,anon,authenticated;

-- Update private.approve without approved_by, approved_by_name, approved_at, application_source
create or replace function private.approve(p_id uuid) returns varchar language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype; seq int; prefix text; result varchar;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if m.membership_status='accepted' then return m.member_id; end if;
  if m.membership_status<>'pending' or not m.is_active then raise exception 'Only active pending applications can be approved' using errcode='22023'; end if;
  if (m.form_number is not null or m.fee_amount is not null) and m.fee_paid_at is null then
    raise exception 'Record the membership fee before approving this application' using errcode='22023';
  end if;
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

revoke all on function private.approve(uuid) from public,anon,authenticated;
grant execute on function private.approve(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

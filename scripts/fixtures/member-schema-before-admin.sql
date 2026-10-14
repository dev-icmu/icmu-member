-- Schema-only fixture captured from the deployed member database on 2026-10-14.
-- No production records or credentials. Preserve existing types and constraints here.


create table public.batch_counts (
  batch_year integer not null,
  current_count integer default 0
);

create table public.guardian (
  id uuid not null default gen_random_uuid(),
  guardian_name varchar(150) not null,
  occupation varchar(100),
  contact_number varchar(15) not null,
  created_at timestamp with time zone default now()
);

create table public.production_team (
  id uuid not null default gen_random_uuid(),
  team_name varchar(100) not null,
  created_at timestamp with time zone default now(),
  required_skills uuid[],
  is_active boolean default true,
  is_protected boolean default false
);

create table public.skill (
  id uuid not null default gen_random_uuid(),
  skill_name varchar(50) not null,
  created_at timestamp with time zone default now(),
  skill_desc text,
  is_active boolean default true,
  is_protected boolean default false
);

create table public.member (
  id uuid not null default gen_random_uuid(),
  guardian_id uuid,
  member_id varchar(6),
  index_number varchar(20),
  full_name varchar(255) not null,
  name_with_initials varchar(255) not null,
  date_of_birth date not null,
  joined_date date not null,
  city varchar(100),
  whatsapp_number varchar(15) not null,
  email_address varchar(254),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  interests uuid[],
  membership_status varchar(20) default 'pending'::character varying,
  batch_year integer
);

create table public.member_team_assignment (
  member_id uuid not null,
  team_id uuid not null,
  assigned_at timestamp with time zone default now()
);

alter table public.guardian add constraint guardian_pkey PRIMARY KEY (id);

alter table public.member add constraint member_email_address_key UNIQUE (email_address);

alter table public.member add constraint member_email_check CHECK (((email_address)::text = lower((email_address)::text)));

alter table public.member add constraint member_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES guardian(id) ON DELETE SET NULL;

alter table public.member add constraint member_index_number_key UNIQUE (index_number);

alter table public.member add constraint member_joined_date_check CHECK ((joined_date >= date_of_birth));

alter table public.member add constraint member_member_id_check CHECK (((member_id)::text ~ '^\d{2}M\d{3}$'::text));

alter table public.member add constraint member_member_id_key UNIQUE (member_id);

alter table public.member add constraint member_pkey PRIMARY KEY (id);

alter table public.member add constraint member_whatsapp_check CHECK (((whatsapp_number)::text ~ '^\+[1-9]\d{1,14}$'::text));

alter table public.production_team add constraint production_team_pkey PRIMARY KEY (id);

alter table public.production_team add constraint production_team_team_name_key UNIQUE (team_name);

alter table public.skill add constraint skill_pkey PRIMARY KEY (id);

alter table public.skill add constraint skill_skill_desc_check CHECK ((length(skill_desc) <= 50));

alter table public.skill add constraint skill_skill_name_unique UNIQUE (skill_name);

alter table public.member_team_assignment add constraint member_team_assignment_member_id_fkey FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE;

alter table public.member_team_assignment add constraint member_team_assignment_pkey PRIMARY KEY (member_id, team_id);

alter table public.member_team_assignment add constraint member_team_assignment_team_id_fkey FOREIGN KEY (team_id) REFERENCES production_team(id) ON DELETE CASCADE;

alter table public.batch_counts add constraint batch_counts_pkey PRIMARY KEY (batch_year);

CREATE OR REPLACE FUNCTION public.approve_member(p_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_batch_year INT;
    v_status VARCHAR(20);
    v_new_count INT;
    v_suffix VARCHAR(2);
    v_prefix VARCHAR(3);
    v_final_id VARCHAR(6);
BEGIN
    -- Get member details
    SELECT batch_year, membership_status INTO v_batch_year, v_status
    FROM member WHERE id = p_id;

    IF v_status = 'accepted' THEN
        RAISE EXCEPTION 'Member is already accepted';
    END IF;
    
    IF v_batch_year IS NULL THEN
        RAISE EXCEPTION 'Member does not have a batch year assigned';
    END IF;

    -- Upsert batch count (Locks the row to prevent race conditions from 2 admins clicking at once)
    INSERT INTO batch_counts (batch_year, current_count)
    VALUES (v_batch_year, 1)
    ON CONFLICT (batch_year) DO UPDATE
    SET current_count = batch_counts.current_count + 1
    RETURNING current_count INTO v_new_count;

    -- Calculate prefix (e.g. 2026 -> 26, 26 + M -> 26M)
    v_suffix := RIGHT(v_batch_year::TEXT, 2);
    v_prefix := v_suffix || 'M';

    -- Format final ID padding to 3 digits (e.g., 26M001, 26M014)
    v_final_id := v_prefix || LPAD(v_new_count::TEXT, 3, '0');

    -- Update member record
    UPDATE member
    SET member_id = v_final_id,
        membership_status = 'accepted'
    WHERE id = p_id;

    RETURN v_final_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_member_id(p_date_of_birth date)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    batch_year INT;
    batch_suffix VARCHAR(2);
    prefix VARCHAR(3);
    current_max INT;
    next_seq INT;
BEGIN
    -- 1. Calculate batch year
    IF EXTRACT(MONTH FROM p_date_of_birth) = 1 THEN
        batch_year := EXTRACT(YEAR FROM p_date_of_birth) - 1;
    ELSE
        batch_year := EXTRACT(YEAR FROM p_date_of_birth);
    END IF;

    -- 2. Get 2-digit suffix
    batch_suffix := LPAD((batch_year % 100)::TEXT, 2, '0');
    
    -- 3. Build prefix pattern
    prefix := batch_suffix || 'M';

    -- 4. Acquire advisory lock
    PERFORM pg_advisory_xact_lock(batch_year::BIGINT);

    -- 5. Query max existing sequence
    SELECT MAX(SUBSTRING(member_id FROM 4 FOR 3)::INT) INTO current_max 
    FROM member 
    WHERE member_id LIKE prefix || '%';

    -- 6. Calculate next_seq
    next_seq := COALESCE(current_max, 0) + 1;

    -- 7. If next_seq > 999, raise exception
    IF next_seq > 999 THEN
        RAISE EXCEPTION 'Batch year sequence exhausted';
    END IF;

    -- 8. Return prefix || LPAD(next_seq::TEXT, 3, '0');
    RETURN prefix || LPAD(next_seq::TEXT, 3, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE TRIGGER trigger_member_updated_at BEFORE UPDATE ON public.member FOR EACH ROW EXECUTE FUNCTION update_updated_at();

alter table public.batch_counts enable row level security;

alter table public.guardian enable row level security;

alter table public.production_team enable row level security;

alter table public.skill enable row level security;

alter table public.member enable row level security;

alter table public.member_team_assignment enable row level security;

create policy "anon_insert_guardian" on public.guardian for insert to anon with check (true);

create policy "auth_all_guardian" on public.guardian for all to authenticated using (true) with check (true);

create policy "anon_insert_member" on public.member for insert to anon with check (true);

create policy "auth_all_member" on public.member for all to authenticated using (true) with check (true);

create policy "auth_update_member" on public.member for update to authenticated using (true) with check (true);

create policy "anon_insert_mta" on public.member_team_assignment for insert to anon with check (true);

create policy "auth_all_mta" on public.member_team_assignment for all to authenticated using (true) with check (true);

create policy "anon_read_production_team" on public.production_team for select to anon using (true);

create policy "anon_select_team" on public.production_team for select to anon using (true);

create policy "auth_all_production_team" on public.production_team for all to authenticated using (true) with check (true);

create policy "auth_all_team" on public.production_team for all to authenticated using (true) with check (true);

create policy "anon_read_skill" on public.skill for select to anon using (true);

create policy "anon_select_skill" on public.skill for select to anon using (true);

create policy "auth_all_skill" on public.skill for all to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

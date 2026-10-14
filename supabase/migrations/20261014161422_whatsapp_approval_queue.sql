begin;
create table private.whatsapp_consent (
  member_id uuid primary key references public.member(id) on delete cascade,
  phone text not null,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);
create table private.whatsapp_approval_queue (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.member(id) on delete cascade,
  status text not null default 'queued' check(status in('queued','processing','submitted','failed','uncertain','cancelled')),
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  claim_id uuid,
  claimed_at timestamptz,
  provider_message_id text,
  error_code text,
  submitted_at timestamptz
);
alter table private.whatsapp_consent enable row level security;
alter table private.whatsapp_approval_queue enable row level security;
revoke all on private.whatsapp_consent,private.whatsapp_approval_queue from public,anon,authenticated;
create index whatsapp_approval_pending_idx on private.whatsapp_approval_queue(next_attempt_at) where status='queued';

create function private.queue_approval_whatsapp() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.membership_status='accepted' and old.membership_status is distinct from 'accepted' and new.member_id is not null
    and exists(select 1 from private.whatsapp_consent c where c.member_id=new.id and c.phone=new.whatsapp_number) then
    insert into private.whatsapp_approval_queue(member_id) values(new.id) on conflict(member_id) do nothing;
  end if;
  return new;
end; $$;
revoke all on function private.queue_approval_whatsapp() from public,anon,authenticated;
create trigger queue_approval_whatsapp after update of membership_status on public.member
for each row execute function private.queue_approval_whatsapp();

create function private.approve_with_notification(p_id uuid,p_whatsapp_consent boolean) returns varchar
language plpgsql security definer set search_path='' as $$
declare m public.member%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into m from public.member where id=p_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  -- A repeat approval must never create a new message or new consent.
  if m.membership_status='pending' then
    if p_whatsapp_consent is true then
      insert into private.whatsapp_consent(member_id,phone,recorded_by) values(p_id,m.whatsapp_number,auth.uid())
      on conflict(member_id) do update set phone=excluded.phone,recorded_by=excluded.recorded_by,recorded_at=now();
    else
      delete from private.whatsapp_consent where member_id=p_id;
    end if;
  end if;
  return private.approve(p_id);
end; $$;
create function public.approve_member_with_notification(p_id uuid,p_whatsapp_consent boolean default false) returns varchar
language sql security invoker set search_path='' as $$ select private.approve_with_notification(p_id,p_whatsapp_consent); $$;
revoke all on function private.approve_with_notification(uuid,boolean),public.approve_member_with_notification(uuid,boolean) from public,anon;
grant execute on function private.approve_with_notification(uuid,boolean),public.approve_member_with_notification(uuid,boolean) to authenticated;

create function private.whatsapp_status(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select jsonb_build_object('status',status,'submitted_at',submitted_at,'error_code',error_code) into result
    from private.whatsapp_approval_queue where member_id=p_id;
  return coalesce(result,jsonb_build_object('status','not_requested'));
end; $$;
create function public.admin_whatsapp_status(p_id uuid) returns jsonb language sql security invoker set search_path=''
as $$ select private.whatsapp_status(p_id); $$;
revoke all on function private.whatsapp_status(uuid),public.admin_whatsapp_status(uuid) from public,anon;
grant execute on function private.whatsapp_status(uuid),public.admin_whatsapp_status(uuid) to authenticated;

-- Service-only queue leasing. A lost response is ambiguous and is never retried
-- automatically: the provider may already have accepted the message.
create function private.claim_approval_whatsapp() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job private.whatsapp_approval_queue%rowtype; m public.member%rowtype;
begin
  update private.whatsapp_approval_queue set status='uncertain',error_code='worker_interrupted'
    where status='processing' and claimed_at<now()-interval '5 minutes';
  update private.whatsapp_approval_queue q set status='cancelled',error_code='expired_or_changed'
    where q.status='queued' and (q.created_at<now()-interval '7 days' or not exists(
      select 1 from public.member recipient join private.whatsapp_consent c on c.member_id=recipient.id and c.phone=recipient.whatsapp_number
      where recipient.id=q.member_id and recipient.membership_status='accepted' and recipient.is_active and recipient.member_id is not null));
  select * into job from private.whatsapp_approval_queue where status='queued' and next_attempt_at<=now()
    order by created_at limit 1 for update skip locked;
  if not found then return null; end if;
  select * into m from public.member where id=job.member_id;
  update private.whatsapp_approval_queue set status='processing',claim_id=gen_random_uuid(),claimed_at=now(),attempts=attempts+1
    where id=job.id returning * into job;
  return jsonb_build_object('id',job.id,'claim_id',job.claim_id,'phone',m.whatsapp_number,
    'full_name',initcap(m.full_name),'member_id',m.member_id,'joined_date',to_char(m.joined_date,'DD Mon YYYY'));
end; $$;
create function public.claim_approval_whatsapp() returns jsonb language sql security invoker set search_path=''
as $$ select private.claim_approval_whatsapp(); $$;

create function private.finish_approval_whatsapp(p_id uuid,p_claim_id uuid,p_status text,p_message_id text,p_error_code text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if p_status not in('submitted','failed','uncertain','queued') or p_status is null
    or length(coalesce(p_message_id,''))>256 or length(coalesce(p_error_code,''))>100
    or (p_status='submitted' and nullif(p_message_id,'') is null) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update private.whatsapp_approval_queue set
    status=case when p_status='queued' and attempts>=5 then 'failed' else p_status end,
    provider_message_id=p_message_id,error_code=p_error_code,
    next_attempt_at=now()+interval '5 minutes'*greatest(attempts,1),
    submitted_at=case when p_status='submitted' then now() else submitted_at end
    where id=p_id and claim_id=p_claim_id and status='processing';
  return found;
end; $$;
create function public.finish_approval_whatsapp(p_id uuid,p_claim_id uuid,p_status text,p_message_id text default null,p_error_code text default null)
returns boolean language sql security invoker set search_path=''
as $$ select private.finish_approval_whatsapp(p_id,p_claim_id,p_status,p_message_id,p_error_code); $$;
revoke all on function private.claim_approval_whatsapp(),public.claim_approval_whatsapp(),
  private.finish_approval_whatsapp(uuid,uuid,text,text,text),public.finish_approval_whatsapp(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.claim_approval_whatsapp(),public.claim_approval_whatsapp(),
  private.finish_approval_whatsapp(uuid,uuid,text,text,text),public.finish_approval_whatsapp(uuid,uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;

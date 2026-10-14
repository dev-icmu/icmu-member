-- Run only after pg_cron + pg_net are enabled and the same random worker secret
-- exists in Edge Function secrets and Vault (name: icmu_whatsapp_worker_secret).
-- This file is setup, not a migration, and contains no credentials.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='icmu_whatsapp_worker_secret' and length(decrypted_secret)>=32) then
    raise exception 'Save the WhatsApp worker secret in Vault first';
  end if;
end; $$;

select cron.schedule('icmu-whatsapp-approvals','* * * * *',$job$
  select net.http_post(
    url:='https://damggnckfqohgupcexpo.supabase.co/functions/v1/whatsapp-approval',
    headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='icmu_whatsapp_worker_secret')),
    body:='{}'::jsonb,
    timeout_milliseconds:=60000
  );
$job$);

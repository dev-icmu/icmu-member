# WhatsApp approval messages

## Current mode: open WhatsApp manually

Approve the application, then open its member profile and choose **Open WhatsApp**. The `wa.me` link opens the recipient's chat with the approval message filled in. Review it and tap **Send** inside WhatsApp.

The message uses whichever WhatsApp account is signed in on that device or WhatsApp Web. It does not automatically use **+94 71 797 2021**. Opening the link does not send the message or provide a delivery receipt; the member app cannot confirm whether it was sent, received or read.

Current approvals do not opt into the automatic queue: the frontend sends `p_whatsapp_consent:false`. Keep `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`. Docker, WAHA and a tunnel are unnecessary for this mode. This manual-mode change is local source only; no remote settings or deployment were changed, and no messages were sent.

## Future WAHA setup — paused

Keep WAHA closed for now. The remaining instructions are retained for a future deliberate switch to automatic delivery. The worker requires **both** `WHATSAPP_DELIVERY_MODE=waha` and `WHATSAPP_ENABLED=true`; setting only one cannot enable it. The current manual approval UI also does not create queue jobs.

The future Windows test uses intended sender **+94 71 797 2021** (`+94717972021`). WAHA links to that phone's WhatsApp session; this adapter does not require a Meta template, access token or Phone Number ID.

Keep sending disabled until the checks below are complete. These files do not install Docker or cloudflared, start services, deploy the WAHA worker or send messages. Docker and cloudflared were not available on the checked PATH. The queue migration is already recorded as applied in [the deployment record](DEPLOYMENT_2026-10-14.md); the provider change does not require rerunning it. The new WAHA worker source still needs deployment.

WAHA is an unofficial WhatsApp client and the account can be blocked. Use a sender whose owner accepts that risk. See [WAHA's introduction](https://waha.devlike.pro/docs/overview/introduction/).

### 1. Prepare the Windows PC

Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) and complete its WSL 2/virtualization prerequisites. Start Docker Desktop with **Linux containers** selected. Keep the PC awake and connected during testing.

Open PowerShell:

```powershell
docker version
docker compose version
Set-Location -LiteralPath 'C:\Users\User\Documents\DEV PROJECTS\icmu-member\supabase\setup\waha'
docker pull devlikeapro/waha:latest
```

The checked-in [compose.yaml](../supabase/setup/waha/compose.yaml) binds port 3000 only to `127.0.0.1`, reads the adjacent `.env`, and keeps the linked session in a named Docker volume. `latest` is for testing; record a tested image version before planning permanent hosting.

### 2. Generate credentials and link the phone

Run initialization once in the same folder. Reuse an existing `.env` instead of overwriting credentials:

```powershell
if (Test-Path -LiteralPath '.env') {
    Write-Host 'A WAHA .env already exists. Reuse its credentials; initialization skipped.'
} else {
    docker run --rm --volume "${PWD}:/app/env" devlikeapro/waha:latest init-waha /app/env
}
```

Save the generated dashboard/Swagger login and **original plaintext API key** in a private password manager. Do not paste them into chat, source files, screenshots or shell commands. The local `.env` is ignored by Git. If its `WAHA_API_KEY` starts with `sha512:`, that is the stored hash; the worker needs the original plaintext key. See [WAHA's credential guidance](https://waha.devlike.pro/docs/how-to/security/).

Validate and start the container:

```powershell
docker compose config --quiet
docker compose up -d
docker compose ps
```

Open [the local dashboard](http://localhost:3000/dashboard), sign in with the generated login, and connect with the plaintext API key. Start session `default`. On the phone for **+94 71 797 2021**, open WhatsApp **Linked devices → Link a device** and scan the QR code. Wait for **WORKING** and verify the linked account number. These steps follow [WAHA's quick start](https://waha.devlike.pro/docs/overview/quick-start/).

Before exposing the service, confirm an unauthenticated API request is rejected:

```powershell
curl.exe --silent --output NUL --write-out "%{http_code}" http://127.0.0.1:3000/api/sessions/default
```

Expect `401`. In a private browser window, verify `/dashboard` and `/` (Swagger, if enabled) require their generated username/password. API authentication and dashboard/Swagger authentication are separate; keep all three protected and do not enable authentication bypasses. [WAHA security](https://waha.devlike.pro/docs/how-to/security/) documents the settings.

### 3. Optional temporary connection from Supabase

Hosted Supabase cannot reach the PC's `localhost`. For an end-to-end test, install [cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/), then run this in another PowerShell window **after verifying API, dashboard and Swagger authentication**:

```powershell
cloudflared tunnel --url http://127.0.0.1:3000
```

Save the printed HTTPS `trycloudflare.com` origin. The service becomes Internet-reachable; the random hostname is not authentication. Keep the terminal running, use synthetic test data, and stop it afterward. Quick Tunnels have no uptime guarantee and their hostname changes when restarted. Browser email challenges cannot authenticate this worker's API calls. See [Cloudflare's Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

The PC, container and tunnel must all remain running for automatic delivery. Keep `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false` while paused. Permanent use needs an always-on host with a stable HTTPS address.

### 4. Configure and deploy while disabled

Enter these in the **member project's** [Edge Function secrets](https://supabase.com/dashboard/project/damggnckfqohgupcexpo/functions/secrets):

| Secret | Value |
| --- | --- |
| `WHATSAPP_DELIVERY_MODE` | `manual` — current mode; automatic delivery is paused |
| `WHATSAPP_ENABLED` | `false` |
| `WAHA_BASE_URL` | Tunnel HTTPS origin only; no `/api`, query parameters or credentials |
| `WAHA_API_KEY` | Original plaintext API key, at least 32 characters; never its `sha512:` hash |
| `WAHA_SESSION` | `default` |
| `WAHA_SENDER_PHONE` | `+94717972021` |
| `WHATSAPP_WORKER_SECRET` | Separate randomly generated secret of at least 32 characters, saved privately |

Use the dashboard for secrets so values do not enter shell history. Never use frontend variables. The old Meta phone-ID, access-token, Graph-version and template settings are unused by this adapter.

From the repository root, check the CLI help, authenticate and deploy only the worker. These are instructions, not a claim that deployment has happened:

```powershell
Set-Location -LiteralPath 'C:\Users\User\Documents\DEV PROJECTS\icmu-member'
npx supabase functions deploy --help
npx supabase login
npx supabase functions deploy whatsapp-approval --project-ref damggnckfqohgupcexpo
```

`supabase/config.toml` already sets `verify_jwt=false` for this function because it checks its own `x-worker-secret`. Deploy the current source including `delivery.mjs`; the old deployed Meta adapter does not read WAHA settings. See [Supabase's deployment guide](https://supabase.com/docs/guides/functions/deploy).

### 5. Future controlled WAHA test

**`tests/admin-preview.html` uses a mocked backend and cannot validate the real queue or worker delivery.** A future WAHA test uses the real application's `/admin/applications` route connected to the member project. First restore an explicit consent-based queue opt-in for that future workflow; the current manual UI intentionally passes `p_whatsapp_consent:false`, so changing worker settings alone will not queue new approvals.

1. Keep `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`. Once the future queue opt-in is implemented, create a designated synthetic application using a consenting tester's own number. Follow the agreed test process for recording the fee and explicit notification consent, then approve it. This creates a real test record and allocates a member ID; do not use an existing student's record.
2. Inspect pending work in the member project's SQL editor with this read-only query. Match the form and member UUID to the designated test:

   ```sql
   select q.id, q.member_id, m.form_number, q.status, q.attempts, q.next_attempt_at
   from private.whatsapp_approval_queue q
   join public.member m on m.id = q.member_id
   where q.status in ('queued', 'processing')
   order by q.created_at;
   ```

3. Continue only when the queue is empty or contains **only the intended test**, with no unrelated queued or processing jobs. For a send test, exactly that test should be queued. Otherwise leave sending disabled and review separately: the worker claims available jobs, not a supplied test ID.
4. Enable `pg_cron` and `pg_net` in the member project. Save the same worker secret in Supabase Vault as `icmu_whatsapp_worker_secret`. Then manually run [whatsapp_schedule.sql](../supabase/setup/whatsapp_schedule.sql) there. It is setup, not a migration. This schedule permits at most three sends per minute through one invocation; do not add parallel schedules or manual calls.
5. Reconfirm `default` is **WORKING**, its sender is **+94 71 797 2021**, the tunnel URL is current, and no unrelated jobs have entered the queue. To deliberately enable this future test, set **both** `WHATSAPP_DELIVERY_MODE=waha` and `WHATSAPP_ENABLED=true`.
6. Confirm the queue status is **submitted**, check the consenting tester's phone receives the message, then immediately restore `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`. If it does not progress, inspect worker logs rather than repeatedly approving new test records.

Before claiming jobs, the worker checks WAHA is reachable, `default` is `WORKING`, and the sender matches `WAHA_SENDER_PHONE`. An offline PC, expired tunnel, unpaired session or wrong account does not consume jobs. Readiness has an 8-second timeout; each send has a 15-second timeout, with at most three sends per invocation. Readiness does not guarantee later delivery.

### Future automatic queue and failure behavior

Both message methods include the member's name, member ID and joined date, plus a reminder to collect the receipt. A phone number on a paper form is not consent. In a future automatic workflow, explicit queue consent makes approval and queue creation commit together. Current manual approvals leave that consent false and create no new automatic jobs.

Each member can have one approval message. Existing approvals are not backfilled. Jobs over seven days old, changed recipient numbers and deactivated members are cancelled when the worker next checks the queue.

- **Submitted** means WAHA returned a message ID, not that the phone received or read it. Delivery webhooks and incoming messages are not implemented.
- Only a structured WAHA HTTP 429 rejection retries, at increasing intervals and up to five attempts.
- Timeouts, interrupted workers, server/proxy errors and malformed success responses become **uncertain** and do not automatically retry: a message may already have been sent. Review the sender's WhatsApp history and provider state before intervening.
- Other rejections become **failed**. Member approval remains saved.

### Stop or resume a future WAHA test

Restore `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`, stop the cloudflared terminal with **Ctrl+C**, then stop WAHA:

```powershell
Set-Location -LiteralPath 'C:\Users\User\Documents\DEV PROJECTS\icmu-member\supabase\setup\waha'
docker compose stop
```

The named session volume remains. Avoid `docker compose down -v` unless intentionally removing the linked session. If automatic delivery is deliberately resumed later, run `docker compose up -d`, verify the session and sender, start a new tunnel, update `WAHA_BASE_URL`, and repeat queue checks before switching to `waha` mode and enabling it.

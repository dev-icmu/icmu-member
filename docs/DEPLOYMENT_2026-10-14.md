# Release record: 14 October 2026

## Published applications

- Website: https://isipathanamedia.online, Netlify site `5758f197-a4fe-433c-a2b9-42848bb17821`, deploy `6acf982a5fbf9edcfd03330d`.
- Member portal: https://members.isipathanamedia.online, Netlify site `515939a4-98c9-48da-9865-1cf4e446db65`, deploy `6acf98297d39277a925547ad`.
- Previous deploys: website `6acc11692a0919000829dc9d`; member `6ac7949d7641670008e06a82`. Do not restore the old account frontend alone: it is incompatible with the new database account boundary.
- The website's four existing Netlify edge functions were included: `og-news`, `extract-og`, `proxy-image`, and `sitemap`.

## Supabase

- Website project `dmdvulgsexgkraawqijg`: account-boundary migration `20261014141029` applied. Connector-generated history timestamp was aligned with the local migration through CLI history repair; SQL was executed only once.
- Member project `damggnckfqohgupcexpo`: migrations `20261014135905` and `20261014142047` applied through CLI.
- `shared-admin-login` deployed with platform JWT verification disabled because the function verifies its own initial password login and subsequent bearer sessions.
- `ICMU_WEB_URL` and `ICMU_WEB_PUBLISHABLE_KEY` configured. Supabase supplies the built-in server credentials; no service key was copied to the browser or repository.
- Shared login is enabled. The user set `ICMU_WEB_ACCOUNT_BOUNDARY_READY=true` in the project dashboard after the CLI returned a permissions error for that final setting. Live requests now reach account verification and reject invalid credentials with HTTP 401.

## Verification

- Both production builds pass; both live sites and their login routes return HTTP 200.
- Website sitemap responds with XML after the edge-function release.
- Login preflight returns HTTP 204 for localhost and the live member origin.
- Website anonymous roles cannot read password hashes or resolve an authenticated account identity.
- Anonymous member reads and client execution of bridge identity RPCs are denied.
- Existing member counts remain unchanged: seven accepted, five pending.
- `node scripts/deployment-smoke.mjs` passes after activation. It uses only public configuration and an intentionally nonexistent login.
- A real administrator must still sign in with their own account to confirm successful login and the paper-form workflow. No real account passwords or student records were changed for testing.

## Existing advisories outside this release

The website advisor still reports RLS disabled on `push_subscriptions` and `fm-vibhavi`, legacy functions with mutable search paths, and legacy public security-definer functions. These were not altered by the account release. See [RLS remediation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) and [function search-path remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

The member advisor reports the old `generate_member_id` function's mutable search path, `pg_trgm` in the public schema, and disabled leaked-password protection. The old ID function's client execution grant is revoked. The new private bridge tables and counter table intentionally have no client RLS policies; privileged checked routines manage them.

## Admin refinements and notification preparation

- Member frontend deployed: 6acfab24c83848c97612707c at https://members.isipathanamedia.online. Earlier refinement release: 6acfa7b71a96ab5a630ce9dd.
- Member migrations applied: 20261014154800_application_form_refinements and 20261014161422_whatsapp_approval_queue.
- Website migration applied: 20261014161420_member_device_history. Existing profile/device screens remain compatible; no new website frontend build was needed for this addition.
- shared-admin-login version 4 deployed; new sign-ins record the Member device and update the main site's last login. Main-site device removal revokes Member renewal; the existing permission lease lasts at most 60 seconds.
- whatsapp-approval version 1 deployed with custom server-secret authentication. Sender credentials, scheduler and sending are NOT enabled. Intended sender: +94 71 797 2021. See WHATSAPP_SETUP.md.
- Verified: 36 Node tests, the upstream account/database boundary test, four member migrations in local PostgreSQL, build, scoped lint (no errors), desktop/mobile menu and synthetic approval flow. Browser console showed no errors; 375px view had no horizontal overflow.
- Live smoke checks pass for CORS, rejected invalid login, protected analytics, protected notification RPCs, device registration and worker authorization, and both frontend routes. Member count remains 13; notification queue remains empty. No real student approval or WhatsApp message was used for testing.
- Advisors: existing unrelated notices remain above. New private queue/consent/device tables intentionally have RLS with no client policies and no direct client grants.
- Source changes remain local and uncommitted. The website migration is also copied under this repository's supabase/upstream because the sibling ignores its migrations directory.

## WAHA sender change prepared locally

The local `whatsapp-approval` source now uses WAHA instead of Meta's Cloud API. This provider change has not been deployed or enabled. The existing queue schema and worker authentication remain unchanged. Before activation, follow `WHATSAPP_SETUP.md` to run WAHA on Windows, link the intended account, configure its HTTPS endpoint and server secrets, and deploy the updated function. No live messages were sent for this change.

## Mobile chrome and membership revenue

- Member frontend deployed as `6acfaf733d48a15b254bb670`. The live site serves the verified `index-zCcmIEoI.js` and `index-BhpidnGb.css` build assets.
- Mobile header now has separate brand and account islands, compacts on scroll, and keeps the breadcrumb in the page. Heavy scroll-edge shading was reduced; surfaces use near-black with restrained green accents and pale text.
- Revenue analytics migration `20261014163140_membership_revenue_analytics` applied to the member project. The checked admin RPC aggregates recorded fee amounts by payment date, supports date ranges, and excludes future payments. It does not estimate revenue from the current membership fee.
- Analytics includes an eye toggle which hides all fee amounts and stores only the visibility preference on the device.
- Verified the database revenue cases (historical fees, unpaid/future payments, Colombo date boundaries and invalid ranges), protected live RPC, production build and scoped lint. Mobile views at 320px and 390px have no horizontal overflow; compact islands, account menu and amount visibility were checked with synthetic data. Physical-device performance was not measured.
- The preceding mobile/revenue frontend release was `6acfaedf685f602fb10f1ae6`. Source changes remain local and uncommitted.

## Manual WhatsApp mode prepared locally

The current local change uses **Open WhatsApp** in the approved member's profile to open a prefilled `wa.me` chat. The operator taps **Send** using their signed-in WhatsApp account; the member app does not send or record delivery. New approvals pass `p_whatsapp_consent:false`. WAHA remains paused: keep `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`; future automatic delivery requires both `waha` mode and explicit enablement. This change has not been deployed, has not changed remote secrets or services, and has sent no messages. Earlier release entries above remain the historical deployment record.

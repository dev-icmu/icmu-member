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

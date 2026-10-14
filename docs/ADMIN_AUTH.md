# Admin accounts and access

The member workspace is designed to use existing **ICMU website index numbers and passwords**. Shared login is disabled until the website's account authorization issues are remediated and verified; see `ICMU_WEB_AUTH_BOUNDARY.md`. Accounts are maintained in `icmu-web`; this application does not offer admin signup or password setup. An active admin or super admin role is required. Writer-only and broadcaster-only accounts are refused.

The two applications currently use different Supabase projects. Membership records stay in the member project. Copying the website's browser session or changing this project's Supabase URL would not connect the accounts safely.

## Sign-in flow

1. `/login` sends the index number and password to the member project's `shared-admin-login` Edge Function over HTTPS.
2. The Edge Function calls the website's existing `create_contacts_session` endpoint. That endpoint checks the password, active admin role, and its login attempt limit. The legacy `verify_user_login` endpoint and client-provided `x-user-index` header alone are not used as authorization.
3. After successful verification, the function calls the website's checked `current_account_profile()` RPC with that credential and links its immutable user UUID to a member-project Auth user. It never chooses the identity from an unverified index lookup. A reserved internal email identifies that account. No email is sent and the website password is never copied to the member database.
4. A server-generated one-time Auth link is exchanged for a member-project session. The browser receives only that session's access and refresh tokens.
5. The website's opaque credential stays in the member project's private bridge session table, linked to the exact Auth session. Browser storage never receives the website credential.

The reserved Auth identity has server-controlled `app_metadata.identity_provider = 'icmu-web'` and `app_metadata.web_user_id`. Authorization never trusts `user_metadata`. Existing Auth accounts are not automatically admins. Existing data and unrelated accounts are preserved.

## Access and revocation

The database checks both a live member Auth session and a bridge authorization lease with a maximum lifetime of 15 minutes. The frontend renews this lease every 5 minutes while an authenticated session is active in a visible tab, and when the tab regains focus. Inactive/background tabs pause polling to save network and compute resources. Renewal rechecks the website's current role, active status, password hash, and credential expiry through `can_manage_contacts`.

Disabling a website account, removing its admin role, changing its password, or revoking its opaque credential stops further renewals. Database access expires within 15 minutes of the last successful check (or immediately upon returning to the tab). Failed identity-service checks fail closed. Returning to a tab starts background verification while preserving the open editor and its draft. Denial or a failed check immediately hides the workspace and clears its cached data; all database requests remain subject to the lease even while that check is pending. The website credential lasts at most eight hours; signing in again establishes a new one.

The React auth provider always renders public pages. Admin routes must wait for `accessLoading` to finish and require `isAdmin === true`. The context clears query and mutation caches on account changes, access loss, and sign-out. Slow verification responses cannot restore a logged-out session.

The footer name or index number is display information. Client-side checks are for navigation only; member, guardian, team, skill, and analytics access is enforced by database policies and RPC authorization.

## Edge Function configuration

Source: `supabase/functions/shared-admin-login/index.ts`

Required runtime configuration:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`: member-project server runtime values supplied by Supabase.
- `ICMU_WEB_URL` and `ICMU_WEB_PUBLISHABLE_KEY`: the existing website's project URL and public publishable key. The publishable key is not a service key.
- `ICMU_WEB_ACCOUNT_BOUNDARY_READY=true`: enable only after the upstream account-boundary update and its companion frontend changes have been reviewed, applied, and tested. Absence of this flag leaves shared sign-in disabled.

The function has custom authentication: password verification for `action: 'login'`; a verified member-project bearer token for `refresh` and `logout`. Its platform JWT check must therefore be disabled for the initial login endpoint. Disabling that check does not disable the checks inside the function. All responses use `Cache-Control: no-store`. Cross-origin requests use explicit credentials in the request body or Authorization header, never ambient cookies.

The deployment process may embed the trusted website URL and public publishable key as configuration defaults in the uploaded source if environment configuration is unavailable. Service-role credentials must always remain runtime server secrets. Never add them to a `VITE_` variable or browser source.

The function requires the service-role-only RPCs `admin_bridge_identity`, `admin_bridge_link_identity`, `admin_bridge_register`, `admin_bridge_session`, `admin_bridge_renew`, and `admin_bridge_revoke`. The browser only calls the boolean `admin_access` RPC after the Edge Function has validated the session. Bridge RPC grants must exclude `anon`, `authenticated`, and `PUBLIC`.

## Recovery and verification

For a forgotten password or account access issue, contact an ICMU super admin through the established website account process. This panel intentionally has no second password reset flow.

If provisioning an internal Auth identity fails after account creation but before the UUID mapping is saved, an operator must inspect that identity and its server-controlled metadata, then repair the mapping. An account with the same email is never automatically adopted.

Two simultaneous first logins may race to create that identity. The losing request briefly retries only the trusted UUID mapping, then validates its server-controlled metadata. It does not list users or adopt an account by email.

Run `node --test scripts/admin-auth.test.mjs` for client session, revocation, and race checks. Run the database authorization tests supplied with the admin migration before deployment. A complete acceptance check also requires signing in with an actual active ICMU website admin account, then verifying access loss after deactivation. Do not test by changing a real account without its owner's authorization.

Supabase references: [Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [JWT verification](https://supabase.com/docs/guides/auth/jwts).

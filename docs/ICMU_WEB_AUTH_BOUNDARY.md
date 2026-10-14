# Shared-login prerequisite: ICMU website account boundary

**Prepared for review. Not applied.** The SQL in `supabase/upstream/20261014141029_shared_admin_account_boundary.sql` targets the separate **icmu-web** database. It must not be included in the member project's migration run.

The same prepared migration is also present locally in `icmu-web/supabase/migrations`, with its companion frontend and tests. The website repository's `docs/ACCOUNT_BOUNDARY.md` describes the coordinated release. Neither migration copy has been applied to the website.

Read-only inspection of the website database on 14 October 2026 found:

- `public.set_user_password(index, password)` can be executed by unauthenticated callers and overwrites an active account's password without verifying ownership.
- `public.users` grants public SELECT on every column, including `password_hash`.
- Existing account UPDATE policies and profile-changing RPCs accept `x-user-index` as identity proof. A caller can choose this header.

The shared member login cannot be considered production-ready while those account boundaries remain. The Edge Function therefore defaults to disabled until `ICMU_WEB_ACCOUNT_BOUNDARY_READY=true` is explicitly configured after remediation and verification. No real credentials were read or changed to inspect these definitions.

## Proposed database changes

The prepared SQL keeps the existing login and profile RPC signatures. It uses the existing revocable credential store and adds an `accounts_private` identity resolver. The resolver checks the opaque credential, its expiry, the current password hash, the active account, and matching index number. It also accepts an existing linked, confirmed Google identity with a live Auth session. The index header alone never authorizes an account change.

`verify_user_login` retains its current response fields and adds `token` and `expires_at`. It issues a maximum eight-hour opaque credential for every active role, including writers and broadcasters. Its password verification shares the existing per-account 10-attempt / 15-minute limit with the contacts login endpoint. It returns generic login failures.

Password setting requires a verified owner or super admin. Initial password setup and resets for another account require a super admin; a signed-in user can still change their own password. Direct account creation, role changes, deactivation, and deletion require verified super-admin proof. Public account reads are restricted to the explicit profile columns needed for names, roles, and author credits. `account_profile(id)` provides private account fields only to the owner or a verified super admin, never the password hash. `account_directory()` returns the management directory only to a verified super admin. Owners can update their display name through `update_user_profile`.

Avatar, settings, and device-display RPCs require a verified owner or super admin. Linking Google also checks the actual confirmed Google Auth identity instead of trusting an email supplied by the browser. Contact management retains its existing admin-only role requirement.

The bridge's `current_account_profile()` RPC resolves the credential's own immutable account UUID. It does not accept a requested identity or rely on an unverified index lookup.

## Prepared companion changes in icmu-web

These changes were implemented in the sibling `icmu-web` repository and released with the matching upstream migration on 14 October 2026. Existing screens now supply the new proof. See `DEPLOYMENT_2026-10-14.md` for the release and verification record.

1. In `src/context/AuthContext.jsx`, store the `token` and `expires_at` returned by `verify_user_login` through the existing `storeContactsSession` helper before fetching private profile data. Do not clear that credential by calling `establishContactsSession` again. This preserves writer and broadcaster login, and the same token still passes the contacts module's separate admin check when appropriate.
2. In `src/lib/supabaseClient.js`, use the exact same-origin credential allowlist in `src/lib/accountAccess.js` for account and contacts endpoints. Attach both index and opaque token. Never send the token to auth, storage, external hosts, SSO cookies, or arbitrary URLs.
3. Replace public wildcard account reads with checked profile/directory RPCs and use `id,index_number,full_name,role,is_active,created_at,avatar_url,last_login` after user inserts. The public author list no longer asks for private email.
4. Use `account_profile({p_id})` for the signed-in account's email, `user_settings`, and device-display `active_sessions` rather than public table queries. Remove the direct client `last_login` update because login now stamps it on the server.
5. Replace anonymous first-time password setup with a message to contact a super admin. The super admin creates the account and sets a temporary password using the existing account-management screen. Raise that screen's minimum password length to eight characters. Existing eight accounts already have passwords, so ordinary existing-account login needs no credential change from this migration.
6. Check the stored credential expiry on restoration and before authenticated work. Require sign-in again after expiry, revocation, or deactivation. Changing your password revokes old proofs and signs your current browser back in with the new password. Profile data in storage is never proof. The existing `rememberMe` UI remembers the account and storage preference but cannot extend an eight-hour proof.

## Review and release checks

Before applying, inspect the SQL and companion changes together. Run rollback-only checks with synthetic accounts for anonymous/header-only denials, valid owner profile writes, valid super-admin account management, normal admin denial for role/password administration, writer/broadcaster self-service, password-change revocation, and Google identity matching. Verify direct password-hash selection is refused by column permissions.

Deploy the companion website changes and SQL in a coordinated release, sign in with an authorised test account, and verify account management. Only then enable the member bridge and run the member login/deactivation checks. No migration should reset existing passwords silently. Since password hashes were publicly readable, administrators should arrange password rotation through a trusted process.

This proposal hardens the account authority used by the member bridge. The website also has legacy header-based authorization on other content tables; those need a separate coordinated migration to the verified account helpers before the entire website can be described as hardened.

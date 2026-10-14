# ICMU member workspace

## Current delivery status

The user authorized release on 14 October 2026. Both frontends are live, the member migrations and the website account-boundary migration are applied, and the shared-login Edge Function is deployed. The final bridge activation and acceptance status are recorded in `DEPLOYMENT_2026-10-14.md`.

The public portfolio remains separate from the admin workspace.

## Paper membership process

1. The student hands in the completed physical form and membership fee.
2. An administrator chooses **Submit an application** and enters the printed form number, full name, birth date, city, guardian details and relevant skills. Form numbers are text, so `0001` keeps its leading zeros and remains separate from the member ID.
3. The membership fee is fixed at **LKR 500**. **Membership fee received** must be explicitly checked. An unpaid application can be saved as pending.
4. Approving a paid pending application generates the member ID. An application has no member ID before approval. Duplicate approval returns the existing ID and does not consume another number.
5. The member profile opens with a **Tear-off receipt** reference: printed form number, name, member ID, joined date, processed by and approved by. The administrator writes the details on the physical receipt, tears it off and returns it to the student.

There is no automatic payment collection or digital signature process. The fee checkbox records a payment the administrator has checked. The database records the payment timestamp and processing/approval identity. Existing records do not gain a payment record simply because this release is installed.

Member IDs retain the existing batch-year rule, including the January birth adjustment. The date of birth is locked once an ID exists. Deactivation preserves the member ID, record and assignment history. Reactivation restores that same record.

## Pages and actions

- `/admin`: exact member/application counts, activity defaulting to 7 days with 30-day, 6-month and 1-year options, recent applications and skills distribution.
- `/admin/members`: search, pagination, sorting, active/inactive filtering, profiles, edits, deactivation and restoration.
- `/admin/applications`: pending/approved/rejected filters, form-number search, fee visibility, approval, rejection and reopening.
- `/admin/teams`: create/edit/deactivate teams, required skills, paginated roster and assignments.
- `/admin/skills`: create/edit/deactivate skills; protected system entries remain protected.
- `/admin/analytics`: batch distribution, active team memberships and application outcomes.

Edits, approvals and state changes invalidate related queries so counts and directories refresh together. Errors stay visible and failed mutations are not retried automatically.

## Database and shared account release

The applications use different Supabase projects. Member data must stay in the member project. Do not substitute the website project URL in the member frontend.

Review these changes together:

1. `icmu-web` companion source and `supabase/upstream/20261014141029_shared_admin_account_boundary.sql`. This SQL targets the **website** database only. It closes the existing anonymous password-changing and password-hash exposure paths used by the account authority. Its enforced account permissions require the companion website frontend, so release those together.
2. Member migrations, in order: `20261014135905_admin_workspace.sql`, then `20261014142047_paper_member_applications.sql`, `20261014154800_application_form_refinements.sql` and `20261014161422_whatsapp_approval_queue.sql`.
3. `supabase/functions/shared-admin-login/index.ts` with the server configuration in `ADMIN_AUTH.md`.
4. The member frontend.

Keep `ICMU_WEB_ACCOUNT_BOUNDARY_READY` disabled until the website changes are released and account login/management have been verified. Then enable the bridge, verify an active website admin can sign in here, and check member create/edit/approve/deactivate with an authorised test account. Verify role loss or account deactivation removes member access. Never use a real student's record as a test fixture.

The local changes do not reset existing website passwords. Existing admins will need to sign in again for the new credential proof. See `ICMU_WEB_AUTH_BOUNDARY.md` and the sibling website's `docs/ACCOUNT_BOUNDARY.md` for release details and the remaining unrelated website authorization limitations.

## Local verification

```sh
node --test scripts/admin-auth.test.mjs src/entities/members/lib/memberPayload.test.mjs
node scripts/test-admin-database.mjs
node --test scripts/upstream-auth-boundary.test.mjs
npm run build
```

The database suite uses disposable PostgreSQL through PGlite with a schema-only copy of the original member tables and minimal Supabase Auth fixtures. It applies both member migrations, tests lifecycle/permissions/fee/audit/session expiry, and rolls back every synthetic row and counter. It does not connect to production.

For UI checks, start Vite and open `/tests/admin-preview.html`. This localhost-only development entry uses synthetic data and intercepts database requests. It is not imported by the application or included in the production build. It tests layout and interaction; it does not replace the database authorization suite or a deployed login check.

Desktop and 390px mobile checks cover the sidebar, member pagination, pending form creation, paid approval, unpaid approval prevention and the handwritten receipt reference. Inputs and dialogs support keyboard interaction; dialogs lock background scrolling.

The production build and scoped admin lint pass. Full-repository lint still reports seven existing React hook errors in `AeroShards.jsx`, `animated-toast-stack.jsx` and `combobox/content.jsx`; these are outside this admin change. The build also reports the existing large shared bundle warning. `npm audit fix` updated two transitive packages and the current audit reports no vulnerabilities.

## Account and notification refinements

The avatar and sidebar account button open profile, security and devices links to the main ICMU site, plus local refresh and sign out. New Member sign-ins appear in the main site device list and update its last-login time. Removing a Member device or changing the password revokes its proof; the Member permission lease expires within 60 seconds. Existing sessions appear after signing in again. The upstream migration is `20261014161420_member_device_history.sql`.

WhatsApp currently uses a manual `wa.me` link: approve an application, open its member profile, choose **Open WhatsApp**, then review and tap **Send** in WhatsApp. It uses the account signed in on that device; the member app does not send automatically or confirm delivery. Approvals pass `p_whatsapp_consent:false` and create no automatic queue jobs. Keep `WHATSAPP_DELIVERY_MODE=manual` and `WHATSAPP_ENABLED=false`; WAHA remains paused. See `WHATSAPP_SETUP.md` for the current flow and retained future WAHA instructions.

## Membership fee analytics

Analytics includes received membership fees, with an all-time or date-range total and breakdown by current application status. The amount comes from fee_amount where fee_paid_at is recorded and is not in the future. Unpaid applications are excluded, historical amounts are preserved, and date windows use Asia/Colombo. The display is a total of recorded receipts; refunds and expenses are not tracked. Eye-toggle privacy stores only a boolean on the device and replaces all rendered revenue amounts with masked placeholders.

Mobile chrome has separate logo and account islands. These compact after scrolling 112px and expand below 48px. The breadcrumb is in page content. Touch controls remain at least 44px, hidden refresh controls are inert, and reduced-motion settings remove movement. Mobile gradients and palette are scoped to the workspace.

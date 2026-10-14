# Admin workspace and paper application architecture

Date: 2026-10-14. Scope: current local source only. No live database operations were performed for this review.

## Existing graph query

The existing graph contains 627 nodes and is dated 2026-09-24. A vocabulary-constrained BFS query used `admin member auth approve guardian skill team query`, with a 1,500-token output budget. It returned the older `AdminPage`, `AuthContext`, `useApproveMember`, `GuardianStep`, `MembersTable`, `SkillsTable`, `TeamsTable`, and `queryClient` nodes.

The graph does not contain the new `AdminDashboard`, `MemberDirectory`, `MemberEditor`, `CatalogPanel`, or `adminAuth` module. Its old line locations must not be used as current source locations. This note supplements that graph without pretending it has been rebuilt.

Graph extraction cost for this query: 0 input tokens and 0 output tokens. The cached traversal used no model API. Source-review conversation usage is separate and is not measured by graphify.

## Current source relationships

These relationships were verified directly from imports, calls, and render branches in the current files. They are source observations, not edges added to the older graph.

| Source | Relationship | Target |
| --- | --- | --- |
| `src/context/AuthContext.jsx` | Owns a controller and publishes its verified state | `src/lib/adminAuth.js` |
| `src/lib/adminAuth.js` | Verifies Supabase identity, shared-login lease, and server admin access; clears query cache on identity loss/change | `shared-admin-login`, `auth.getUser`, `admin_access` |
| `src/pages/AdminPage.jsx` | Gates the workspace on verified access, then routes sidebar sections | `AdminDashboard`, `MemberDirectory`, `TeamsTab`, `SkillsTab` |
| `src/features/admin/components/MemberDirectory.jsx` | Uses URL search/status/activity/page/sort and renders edit/review/profile dialogs | `useMembers`, `MemberEditor`, member review mutations |
| `src/features/admin/components/MemberEditor.jsx` | Builds paper-form input and saves through validated hooks | `useAdminCreateMember`, `useUpdateMember`, `buildMemberPayload` |
| `src/entities/members/hooks/useMembers.js` | Sends mutations to checked RPCs and invalidates members, analytics, teams, roster, and skills | `admin_save_member`, `approve_member`, `admin_review_member`, `admin_set_member_active` |
| `src/features/admin/components/MemberDirectory.jsx` | After successful approval opens member details; accepted profiles expose receipt fields | `useApproveMember`, `MemberDetails`, `ReceiptDetails` |
| `src/features/admin/components/CatalogPanel.jsx` | Edits real persisted catalog rows and manages paginated roster assignments | Skill/team hooks and accepted, active `useMembers` queries |
| `src/components/motion/animated-sidebar.jsx` | Provides responsive navigation, mobile portal, scroll lock, keyboard loop, and focus return | `AdminWorkspace` sidebar |

## Paper application state

1. New admin entries use `application_source: paper`. Form number is text, so leading zeros survive. Class and address are required for paper entries.
2. New admin entries begin with a fee amount of LKR 500 and an unchecked payment control. Saving creates a pending application with no membership ID.
3. The editor interprets `fee_paid_at` as the recorded-payment state. Existing records do not receive an invented fee amount or application source. Unchanged payment state is omitted from edit payloads, preserving the original payment timestamp.
4. The database permits unpaid pending forms but rejects their approval. The confirmation dialog mirrors that check for paper applications.
5. Approval assigns the membership ID and trusted approval audit fields. Member details then show the name, membership ID, and joining date for the paper receipt.
6. Deactivation preserves the membership ID and history; catalog roster assignment is restricted to accepted, active members and active teams.

Authoritative source for these rules: `supabase/migrations/20261014142047_paper_member_applications.sql`, with existing member lifecycle and RLS rules in `supabase/migrations/20261014135905_admin_workspace.sql`.

## Review boundaries

This review covered local component lifecycle, cache invalidation, payment/source payload handling, and query-based navigation. It did not prove deployment status or live authentication. UI receipt content is a guide for writing the existing paper receipt; there is no signature-upload or payment-processing integration.

The refreshed full graph can be generated later if broader architecture navigation is needed. No graph nodes, edges, or community scores were invented or rewritten in this lightweight pass.

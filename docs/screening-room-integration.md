# Screening Room integration

## Source and scope

Adapted from https://github.com/TheDeptCollective/DEPT-CO-WATCH-PARTY/pull/1, branch `screening-room-mvp`, inspected PR head `da18cc5b85698aedffa77d0f407e15c348d362be`. Reuses its cinematic library, admin components, provider/timestamp helpers, original migration and permission tests. No blind merge, source hosting config, sample seed, public registration, or demo bypass was imported.

The main website had no Supabase client, database or authentication integration. Its public pages, quote builder and FormSubmit inquiry backend remain unchanged. The only public UI change is a Screening Room navigation link. Screening styles are scoped under `.screening-scope`. No new hosted site, domain or subscription is required.

## Routes and authentication

All of these use the existing TanStack website deployment:

- `/screening-room`: cinematic collection homepage
- `/screening-room/screening`: finished films
- `/screening-room/drafts`: drafts
- `/screening-room/search`: film/project/category search
- `/screening-room/films/:filmId`: details, project versions, YouTube player, timestamped draft feedback
- `/screening-room/admin`: films, projects, categories, invitations/memberships and feedback moderation
- `/screening-room/login`: invitation-only sign-in and password-reset request
- `/screening-room/callback`: invitation/recovery password setup

The parent route disables SSR for screening contents. The browser creates a dedicated Supabase client for `pozmyqfosfaeheiqwioh` using only the supplied **public publishable key**, with an isolated `dept-screening-auth` session storage key. No generic site Supabase variables are overridden. No private data is fetched before authentication and active membership verification. No private film metadata is embedded in server HTML or build output.

Guests are redirected to login with a validated screening-only `next` path. After authentication and membership verification, the intended page is restored. Open redirects to other origins/public routes are rejected. Browser Back/deep links work with real routes. Invitation and recovery callbacks return to the same main domain. Profile checks run on auth changes, window focus and periodically; RLS still checks current membership on every database request. Auth callbacks do not make nested Supabase calls while the auth lock is held.

Admin UI requires the database profile role. Database policies independently enforce all mutations and role restrictions. A viewer directly opening `/screening-room/admin` sees an access-denied state. The invitation function additionally validates the caller's JWT and `is_admin()` before using its server-only key. Authenticated viewers can read published drafts/finished films, leave draft feedback and delete their own feedback; admins can moderate all feedback.

## Live setup observed on October 15, 2026

Read-only requests to the supplied project returned:

- Email auth enabled; anonymous sign-in disabled; `disable_signup: false` (**public signup is currently enabled**).
- REST requests for `public.videos` and `public.profiles` returned `PGRST205` / table not found in schema cache.
- The public key cannot inspect the full schema, Auth users, SQL migration history, email redirect settings or deploy functions.

**The prepared migration has not been applied or verified by this integration. No live tables, users, settings or permissions were changed.** Confirm in the Supabase dashboard; missing REST schema entries alone are not a full database audit.

## Remaining setup, in order

1. In the supplied Supabase project, run `supabase/preflight.sql` in the SQL editor. It is read-only. Check existing tables/functions/auth triggers and users. If any named objects already exist, compare definitions and policies; do not drop, overwrite, or rerun the migration blindly. If this project serves any other authentication system, stop before installing its global invitation-only Auth trigger. Keep this screening project isolated rather than changing another app's Auth.
2. If the screening schema is absent and this is the intended dedicated project, apply `supabase/migrations/202610150001_screening_room.sql`. This is the original transactional migration, with no destructive drops or automatic user backfill. If already applied, verify all RLS policies/grants against that file instead.
3. Auth settings: disable **Allow new users to sign up**. Keep anonymous sign-in and unused providers disabled. The migration's trigger also refuses non-invited user creation.
4. Auth URL configuration: set Site URL to `https://www.thedeptcollective.com/screening-room/callback`. Allow the exact callback and its query variants: `https://www.thedeptcollective.com/screening-room/callback` and `https://www.thedeptcollective.com/screening-room/callback?next=*`. For deliberate local testing, add `http://127.0.0.1:5174/screening-room/callback` and `http://127.0.0.1:5174/screening-room/callback?next=*`. Add apex-domain equivalents only if the production site actually uses that origin. Avoid an unrestricted production wildcard. Ensure invite/recovery email templates honor Supabase's `RedirectTo` (standard `ConfirmationURL` templates do).
5. Invite the owner through Auth → Users using the screening callback. Promote only that intended owner's profile through SQL: `update public.profiles set role='admin' where email='YOUR_OWNER_EMAIL';`. Existing Auth users need deliberate authorization/profile creation; do not bulk-backfill all users. Open a fresh invitation and set a password.
6. Deploy `supabase/functions/screening-invite-user/index.ts` as **screening-invite-user** to this same Supabase project. Set server secret `APP_ORIGIN=https://www.thedeptcollective.com`. Supabase supplies its server-only service-role environment key; never paste that key into frontend code or VITE variables. This separately named function avoids replacing any previous `invite-user` deployment. Until deployed, use dashboard invitations. Do not disable JWT verification unless required by your Supabase gateway configuration; the function itself always verifies the user and admin permission.
7. Deploy the website through its existing main-repository hosting pipeline when approved. No second site is required. Then verify a real invited viewer, an admin, a revoked viewer, invite/reset email delivery, a draft comment, and a real YouTube embed. These live checks require the schema and actual invited accounts.

Unlisted YouTube is not DRM: authenticated viewers can discover and share the underlying provider link. The application/database protect metadata and membership, not YouTube's own hosting URLs.

## Checks

- `bunx vitest run --config vitest.screening.config.ts`: provider helpers, route safety, guest redirects/no private queries, intended-page return, inactive membership, viewer/admin access, logout/revocation, callback setup and reset destinations. Auth is mocked in component tests; there is no mock or bypass in production.
- `node scripts/test-screening-rls.mjs`: executes the actual migration and SQL assertions in isolated PostgreSQL/PGlite with minimal Supabase Auth roles/UID function. Tests anonymous denial, invitation trigger, viewer writes, role escalation, draft feedback, revoked accounts and admin writes. No live database mutation.
- Browser: main homepage public, original inquiry preserved, screening navigation, unauthenticated deep links redirect to login, mobile login layout.
- Production build, focused lint and project typecheck pass with the locked dependencies.

## Dashboard setup progress

The user approved applying the migration and inviting riann.grant@gmail.com as administrator. Dashboard preflight confirmed no public tables, no Auth users, no Auth triggers, and no conflicting screening functions. The original migration was applied successfully. A live read-only check confirmed all five tables have RLS enabled and anonymous SELECT is denied. Public signup was disabled (settings save confirmed), and the production Site URL plus the four documented callback redirects were saved.

Dashboard invitation attempts did not produce a user record or a confirmed success. Administrator promotion has therefore NOT been performed. Custom SMTP is disabled; delivery needs investigation/configuration. Do not claim the invitation was delivered.

The screening-invite-user function is staged in the dashboard editor but NOT deployed; APP_ORIGIN has NOT yet been set. The main website integration remains local/unpublished. Production invitation callbacks require publishing the screening routes.

## Invitation correction applied

Live Auth logs showed the original invited_profile trigger rejected the /invite request before invited_at was updated. The additive migration 202610160001_defer_invitation_check.sql was explicitly approved and applied successfully. It validates the final Auth row using a deferred constraint trigger, preserving rejection of uninvited accounts at commit. Isolated PostgreSQL regression tests now reproduce the insert-then-update invitation order and verify uninvited commits are rejected; permission tests pass.

The user saved Gmail SMTP credentials directly in Supabase. After the correction, the invitation created riann.grant@gmail.com successfully, and that exact profile was promoted and verified as admin with is_active=true. Inbox receipt and password setup have not been verified. Production callback routes still require deployment of the local website integration. The invitation Edge Function remains staged, not deployed.

# DEPT. GALLERIES — Phase 3

## Planned gallery email automation

See [the $0 gallery-email implementation plan](./dept-gallery-email-plan.md) for branded delivery, expiration reminders, history, duplicate protection and free-tier safeguards. The local email editor, backend, additive migration and tests are prepared; no email scheduler, migration, deployment or live sending has been enabled. Existing gallery and Screening Room behavior is unchanged.

## Status and approval boundary

Application implementation remains local. **The user-approved Phase 3 database/storage migration was applied on November 25, 2026.** The private JPEG preview bucket and protected database functions now exist. The gallery-media Edge Function was separately approved and deployed on November 25, 2026. The user authorized the gallery-only main-branch release after testing. Website hosting deployment must be verified separately. The user confirmed successful photo upload, private-gallery access and UGREEN download testing before authorizing the main-branch push. Do not rerun the Phase 3 migration. This project has no Supabase CLI migration-history table; this document records the dashboard application.

Read-only inspection on November 25, 2026 confirmed the existing Supabase project `pozmyqfosfaeheiqwioh` has **one gallery, zero photos**, RLS enabled on all three gallery tables, no storage buckets and no storage-object policies. The private unpublished **First collection** remains intact. Phase 2 migration was previously applied on November 18; do not rerun it. Existing Screening Room Auth, profiles, role checks and routes remain unchanged.

## Implementation

- Existing black/cream/Satoshi design retained. Existing admin login uses database-verified roles, never editable Auth metadata. Existing studio admin `riann.grant@gmail.com` retains access.
- Multiple JPEG selection/drop, sequential browser optimization, progress, individual failures and retries. Longest edge 2048px or 1600px; no upscaling. Canvas re-encoding strips original metadata. Input limit 80 MB / 60 megapixels, optimized output at most 2 MB. Originals remain on the administrator's device/NAS.
- Edge upload verifies the user's Auth token and database admin role, checks JPEG size/dimensions and fully decodes it within bounded memory. SQL rechecks the actor's current database role. Only successful storage uploads can finalize a photo record.
- Durable upload reservations and immutable UUID paths make retries idempotent. Replacement preserves the photo ID, order and cover; old objects enter the cleanup queue. No full-resolution object is stored in Supabase or PostgreSQL.
- Ordered photo previews, cover selection, deletion, private/public collection rendering, responsive lightbox, and authorized admin preview of drafts. Admin preview does not grant visitors draft access.
- Protected UGREEN URL plus opt-in downloads toggle in gallery editor, test-link and removal controls. Saving gallery and delivery settings is atomic. `Download Photos` opens a same-origin authorization endpoint, which redirects to UGREEN only after access and expiry checks. There are no misleading individual-original/ZIP-download buttons.
- Preview sizes display actual recorded uploaded byte counts, with original input size shown separately. This is not an account-wide Supabase usage meter. Pending uploads/deletions can consume additional space.
- Manual **Clean unused previews** processes up to 100 queued objects using Storage's delete API. Referenced objects are excluded; only this feature's UUID paths are accepted. Abandoned uploads become eligible after one hour. Failed deletions remain queued for retry. No scheduler, home-network access, NAS filesystem operation, R2, or new paid service.

## Security architecture

The `dept-gallery-previews` bucket is private with no anon/authenticated object policies. Service credentials exist only inside Supabase's Edge runtime. Browser builds contain only the existing public project key. Administrator actions verify Auth.getUser and is_gallery_admin; service-only SQL functions recheck active administrator roles. Viewer tokens cannot manage storage.

For visitors, existing bcrypt password verification, database rate limiting and short-lived HttpOnly cookies remain. The site server forwards the scoped token to the media service. Its service-only manifest checks published status, expiration and gallery-scoped session before any signing or URL release. Unknown, draft, expired and unauthorized private galleries return the same locked result. Public directory only includes published, unexpired public galleries; public covers also use private storage signing.

Signed previews last at most **120 seconds**, shortened to gallery/session expiration. A copied signed URL can remain usable until that time even after revocation; already downloaded images cannot be revoked. Pages refresh signing/access while open and on focus. Private storage paths are never returned as separate metadata fields; authorized signed URLs necessarily contain their object path. Anonymous callers cannot retrieve private photo records, NAS URLs, internal manifests, password hashes or storage keys.

The exact delivery URL allowlist accepts only HTTPS `ug.link` / `www.ug.link` share-download links and the user-approved `dept-hq.us25.ug.link` share-download host, with a 32-character lowercase hexadecimal share ID. Credentials, arbitrary hosts, IP addresses, ports, extra query parameters and wildcard subdomains are rejected. UGREEN is opened by the client, never fetched/proxied by our server. New UGREEN domains must be independently verified before updating both validators.

The supplied share successfully redirected to the approved UGREEN host and displayed a password prompt. **Its protected contents and actual download have not been verified.** Do not store NAS administrator credentials or the share password in the database. UGREEN's password, permissions and expiration are independent: website expiry cannot revoke an external URL a recipient already obtained. Set UGREEN permissions/expiry to match delivery intent.

## Applied migration — November 25, 2026

`supabase/migrations/202611250001_gallery_delivery.sql`:

1. Adds nullable `preview_file_size` to photos; makes legacy original-object keys optional because originals now remain on NAS. Existing values are preserved.
2. Adds private, RLS-enabled delivery settings and upload reservations with constraints, indexes, foreign keys and no browser table privileges.
3. Adds service-only authorization/signing-manifest and upload lifecycle/cleanup functions. Extends admin save/list functions without changing their role checks. A distinct `gallery_save_delivery` entry point makes old-backend setups fail visibly instead of silently ignoring new fields.
4. Adds cleanup handling for interrupted uploads and replacements. Cleanup only runs when explicitly invoked; migration application does not remove photo objects.
5. Creates one **new private** JPEG-only bucket, 2 MB object limit. It changes no existing buckets or storage policies.

**No DROP TABLE, TRUNCATE, data reset, existing-row deletion, Auth change, Screening Room migration or seeded gallery is included.** This preserves the existing draft, gallery passwords/sessions, roles and all other project records. The renamed original save implementation remains internal and loses browser EXECUTE privileges. New functions are explicitly restricted by role. The migration is transactional and intended to run once.

Before applying, repeat the bucket/policy preflight in case another change has happened. A conflicting bucket name should stop the migration rather than take over an existing bucket.

## Setup after explicit approval

1. **Completed:** applied `202611250001_gallery_delivery.sql` through the dashboard after explicit approval. Verified a private JPEG-only 2 MB bucket and zero storage-object policies. Existing private draft and all 10 profiles were preserved. Do not rerun either migration.
2. **Completed November 25:** separately approved/deployed `supabase/functions/gallery-media` on the existing Supabase project through the dashboard, concatenating the unchanged validation, handler and entry modules into one index.ts. See its README. Use `--no-verify-jwt` at the gateway because visitor access uses gallery cookies rather than Supabase Auth JWTs; keep all in-function authorization checks intact. Supabase supplies the service-only environment automatically. Do not place privileged keys in the website or chat.
3. Verify real optimized upload, private anonymous denial, successful password access, photo display/reordering/cover/replacement, disabled/removed UGREEN links, expiry, cleanup and viewer denial against the deployed backend using a disposable test gallery. The user subsequently confirmed that photo upload, private access and UGREEN delivery worked.
4. Separately approve website publication when the live backend checks pass. No new hostname, hosted site, plan or subscription is required.

The existing hosting must serve the TanStack server routes; static-only hosting cannot enforce private cookies or downloads.

## First private client gallery

After the approved setup and tests:

1. Sign in at `/admin/galleries`; edit **First collection**. Set the client-facing title/slug, keep visibility **Private**, set a strong gallery password and optional expiration.
2. Upload selected finished JPEGs; the dashboard creates optimized previews only. Choose the cover and arrange the photo order. Preview the draft as admin.
3. Paste the UGREEN **share-download** URL, enable downloads, save and test the external share. Confirm downloads are allowed and its password/expiry are appropriate. Originals stay on NAS.
4. Publish the gallery. Verify the website link in a separate signed-out session, unlock it and test Download Photos. If the UGREEN share needs its own password, provide that to the client as well.
5. Send the website gallery URL and access instructions. Do not share admin access. Publish the website code only after separately approving production release.

## Verification and remaining limits

- **Live media service verified November 25, 2026:** public directory returns an empty list (no published galleries); existing private draft resolves as locked anonymously; download, admin preview, upload and cleanup reject anonymous callers with 403. Signed-in administrator draft preview works through the local dashboard. Gateway legacy JWT verification is disabled for this function only; in-function Auth and database role checks remain enforced. Existing invitation function unchanged.

- **Live database tests passed November 25, 2026**, after the approved migration: both gallery security/lifecycle SQL suites ran with actual pgcrypto inside one transaction and rolled back. Afterward: one existing gallery, zero photos; no test records persisted. Covered anonymous/viewer restrictions, bcrypt/session checks, URL protection, upload finalization, replacement and cleanup. The user subsequently verified actual photo upload and download.

- Isolated PostgreSQL (PGlite): both migrations plus Phase 2 regression and Phase 3 permission/lifecycle tests. Covers draft preservation, public RLS, viewer denial, private/session/expiry checks, service-only manifest access, URL isolation/allowlist, successful/failed finalization, idempotency, cover, replacement and cleanup reference protection. PGlite lacks pgcrypto: cryptographic primitives are explicitly substituted in this isolated harness. Actual bcrypt was tested during Phase 2; repeat live checks after migration approval.
- Automated gallery tests: cookie/origin/error boundaries, admin gate, allowlisted redirects, private media/signing denial, safe serializers, upload progress/retry flow and lightbox behavior.
- Real JPEG decode test: actual encoded JPEG through the upload handler, corrupt data rejection and storage failure without finalization; storage/network mocked.
- Browser: existing admin login/session and draft retained; responsive editor and upload controls checked at 390px without horizontal overflow. User subsequently confirmed real uploads and downloads; website publication is not inferred from those checks.
- Existing Screening Room regression tests, TypeScript, focused lint and production build run separately. See completion report for final counts.

Local test commands (using an installed Node runtime):

```sh
node scripts/test-gallery-database.mjs
node node_modules/vitest/vitest.mjs run --config vitest.galleries.config.ts
node node_modules/vitest/vitest.mjs run --config vitest.screening.config.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/components/galleries src/lib/galleries src/routes/api.galleries.index.ts
node node_modules/vite/bin/vite.js build
# Point at jpeg-js 0.4.4 installed in your tooling environment; no frontend dependency needed:
GALLERY_JPEG_MODULE=/absolute/path/to/jpeg-js node --experimental-strip-types scripts/test-gallery-upload.mjs
```

No production routes import demo-service/sample media. Old demo fixtures remain test-only. Missing setup fails closed and displays a setup notice, never a fabricated successful upload. Optional application monitoring/per-IP throttling is not added; existing password verification still has a persistent database attempt limiter. Concurrent gallery upload reservations use a 900 MB recorded-preview budget, not a guarantee against total project storage or bandwidth limits. Regularly review Supabase account usage and cleanup pending objects.

## Costs

No upgrades or paid image transforms enabled. At inspection the project is on Free. Supabase documents 1 GB free storage and separate bandwidth quotas; other project usage also counts. The 900 MB application budget leaves some headroom but is not a billing cap. Short-lived signing uses Edge invocations and image delivery uses bandwidth. UGREEN delivery uses your existing NAS/share service.

References: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Edge authorization](https://supabase.com/docs/guides/functions/auth), [Supabase usage](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Optional password update — applied November 25, 2026

`202611250002_gallery_optional_password.sql` adds a protected access-settings table and secure-link session exchange. Existing galleries default to password-required; existing password hashes and photo records are preserved. New passwords require at least four characters and remain limited to 72 UTF-8 bytes for bcrypt compatibility. Existing password attempt limiting remains unchanged.

The admin editor offers **Require a gallery password**. Turning it off keeps the gallery private/unlisted but lets anyone holding the full generated link enter without typing a password. **Copy gallery link** includes a random 256-bit key in a URL fragment. The page exchanges it for the same short-lived HttpOnly session, removes the fragment from the address bar, and uses the existing media service authorization. Slugs alone grant no private access. Re-enabling the password invalidates the prior share key and issued sessions. Changing modes does not remove the previously stored password hash. UGREEN's own share password is unaffected.

Code was pushed to main in f329732. The matching database migration was explicitly approved and applied November 25, 2026. Live transactional tests passed for four-character passwords, rejection of three-character passwords, secure-link sessions, private directory exclusion, mode-change revocation and password-change revocation. Test fixtures were rolled back; the existing one gallery and four photos remain intact. The already-deployed media service requires no change. Private share links are credentials: recipients can forward them. After a link session expires, reopen the full shared link.

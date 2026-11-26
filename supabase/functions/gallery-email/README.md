# Gallery email — local implementation, NOT deployed

Domain reported verified by the user: `delivery.thedeptcollective.com`.
Sender: `The Dept Collective <projects@delivery.thedeptcollective.com>`.
Reply-to: `hello@thedeptcollective.com`.

## Approval boundary and impact

`202611250003_gallery_email.sql` is **not applied**. It adds six private RLS-enabled tables, restricted RPCs and gallery/access-change cancellation triggers. It changes no existing gallery records, passwords, photo files, roles, Auth SMTP, Screening Room functions or storage policies. Existing save/publish/delete actions remain valid; the added triggers only cancel associated email work. No Cron extension, schedule, API key or email send is created by the migration. Its control row starts disabled. Never run it remotely without approval.

This function is separate from `gallery-media` and Screening Room invitations. Frontend code has no provider or service key. There are no added frontend packages or paid services.

## Required setup AFTER approval, in order

1. Inspect existing Supabase/Resend Free plans, shared usage and available free webhook slot. Confirm Resend's actual month reset date, DNS sender verification and **disable click/open tracking** on the sending domain. Do not use paid trial/upgrade/overage products. Do not change Google Workspace receiving or Screening Room SMTP.
2. Review and apply the additive migration only after approval. Check existing gallery/photo/profile counts before and after; run the transactional security tests in a suitable environment. `scripts/test-gallery-database.mjs` is local-only and uses substituted pgcrypto for control-flow tests.
3. Add a domain-restricted sending-only `RESEND_API_KEY` in Supabase Edge secrets, not the frontend. Create a strong random `GALLERY_EMAIL_CRON_SECRET` (at least 32 characters); store it in Edge secrets and Vault as `gallery_email_cron_secret`. Do not paste secrets into chat, migrations or source. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge runtime.
4. Separately approve deployment of `gallery-email` with gateway `verify_jwt=false`. All admin requests verify the real Supabase user AND `is_gallery_admin`; Cron uses its dedicated secret; the webhook verifies Svix signatures. Keep `GALLERY_EMAIL_ENABLED=false` and `GALLERY_EMAIL_FREE_PLANS_CONFIRMED=false` initially.
5. Configure the single free Resend webhook to `/functions/v1/gallery-email?action=webhook` on the existing Supabase project. Subscribe to delivered, delivery_delayed, bounced, complained, failed and suppressed events. Store its signing secret as `RESEND_WEBHOOK_SECRET`. Do not overwrite an existing webhook used by another feature; stop and review sharing if the free slot is occupied.
6. With separate activation approval, set the two Edge flags to `true`, then use privileged SQL to set `email_controls.enabled=true` and a short `verified_until` deadline (recommended seven days after the current shared-account usage review). Defaults cap gallery work at **80/day and 2,400 over a rolling 31 days**. The rolling window is deliberately more conservative than a calendar/billing month; do not reset it early. Limits may be lowered to reserve space for other senders. There is no frontend function for changing billing/flags/quotas.
7. Queue one explicitly approved test to the administrator through the dashboard. Verify provider acceptance AND signed delivered/bounce event handling. No test send has been performed in this implementation.
8. After test approval, install the separate `schedule.sql` in the existing project with pg_cron, pg_net and Vault available. This is an operational script, **not an automatically applied migration**. The scheduler starts only when that script is explicitly run. It invokes the worker hourly, at most 744 times in a 31-day month, plus administrator requests/webhooks. Keep this workload within the existing shared Free quotas.
9. Approve the site push/publication separately. Until migration/function setup, the editor offers an honest local preview and disables save/send. Production has no mock delivery data or auth bypass.

## Operation and limits

- Save does not send. Confirm send queues one delivery per saved settings revision. Repeating the same request reuses its job. Editing and saving creates a new version; re-sending after acceptance requires a deliberate edit/version and a new confirmed Send action. There is no one-click bulk send.
- Reminders are scheduled only for the current recipient after an accepted initial delivery. Seven days before expiry at 09:00 Toronto, and optional expiration-day 09:00 only before expiry. No expiration = no reminders. Already-missed windows are skipped. Expiration edits use a distinct reminder occurrence. Editing settings/access cancels pending payloads; the next tick may rebuild unattempted eligible reminders with current data, but never replays attempted jobs.
- Only published, existing and unexpired galleries can send. The worker rechecks eligibility immediately before calling Resend. A message accepted before an unpublish/delete cannot be recalled; links still enforce current website access. Already-attempted cancelled work is marked Unknown for review, not automatically resent.
- Outbox leases serialize claims. Each Resend send uses the stable job UUID as idempotency key and a frozen payload. A network error or missing DB acknowledgement is retried only within 23 hours and at most three attempts. Later uncertainty stops for manual review. The same job is reserved again if retried on a new UTC day, conservatively counting capacity even when Resend deduplicates it.
- Quota/rate-limit responses impose a one-hour worker hold; no paid fallback. Ineligible/missed reminders are never sent after a quota reset. An Unknown result needs checking in Resend before a new saved version is sent.
- Dashboard counts are this feature's conservative reservations, not total Resend/Supabase usage. Check both provider dashboards; these services share usage with existing features. Account checks expire and stop sending. A database size >450 MB or >20,000 durable jobs prevents new queue inserts. Deduplication rows are retained; no indefinite free history promise. Detailed webhook events age out after 90 days; terminal access-bearing snapshots are scrubbed after seven days.
- Free projects can pause or exceed shared allowances. There is no guaranteed exact delivery time or inbox placement. On Free, stop/hold and investigate; do not upgrade. Provider pricing changes require a new review.
- Pause sending with the SQL control row or `GALLERY_EMAIL_ENABLED=false`; unschedule only `dept-gallery-email-hourly` when deactivating this feature. Do not stop other Cron jobs. Stored credentials are never printed in logs. No NAS URL or attachment is sent.

## Local validation

Run database harness, gallery tests, Screening Room tests, TypeScript and production build. New tests cover fixed branded links, escaping, authorization, disabled configuration, duplicate calls, final eligibility, quotas, retry uncertainty and signed webhooks. The function entry uses Deno/npm Supabase imports; deployment/runtime integration still needs an approved live smoke test with configured secrets. Local tests fake Resend; they do not send email.

### Verified locally — November 25, 2026

- 55 gallery tests passed, including 18 new email worker/editor tests; 45 Screening Room tests passed.
- Isolated PostgreSQL migration/security/lifecycle/quota tests passed, including private-link rotation, deletion scrubbing, expiry, stale setup verification, daily/monthly holds and retry-window exhaustion. No production database connection was used.
- TypeScript, focused lint, production build and whitespace checks passed.
- Existing signed-in admin dashboard preview inspected at desktop and 390px mobile width; no horizontal page overflow. Preview uses `preview@example.test` only in unsaved browser state. Existing one gallery/four photo records were displayed; none were edited.
- No real email, remote migration, function deployment, scheduler activation, billing change or git push occurred. Live provider delivery and deployed webhook/Cron behavior still require approved setup and an approved test send.

# DEPT. GALLERIES — automated email implementation plan

Updated November 25, 2026. **Local implementation prepared after approval to build; not deployed or activated.** See [the setup and implementation notes](../supabase/functions/gallery-email/README.md). No migration, scheduler, account upgrade or live send has been enabled.

## Non-negotiable budget and approval boundary

Additional monthly service cost: **$0**. Reuse the existing Supabase project, database, Auth, website hosting, domain and UGREEN NAS delivery. Use only Resend Free transactional email and Supabase's included Cron/Edge capacity. No paid trial, paid automation, Resend Automations, new hosting, paid Supabase custom domain, dedicated IP, paid email templates or overage billing.

The implementation must fail closed: stop or defer sends when a budget, account configuration or provider limit cannot be verified. Never upgrade, increase a plan, attach billing details, disable a spending cap or switch providers automatically. A stopped email service is preferable to an additional charge. Reconfirm free-plan terms before activation and after any provider pricing notice; current limits are not a promise that providers will never change their plans.

Local application code and tests can be prepared separately. **Do not push, apply migrations, deploy functions/site code, register a live scheduler/webhook or activate sending without explicit approval.** Present the exact additive migration and its impact first. Existing galleries, previews, passwords, access sessions, storage, NAS links and Screening Room records must remain intact.

## Verified published limits and prerequisites

Official documentation checked November 25, 2026; these are provider limits, **not a live audit of this user's account usage or billing settings**.

| Service | Relevant current free allowance | Design consequence |
| --- | --- | --- |
| Resend transactional email | 100 emails per UTC day; 3,000 per month. Recipient count matters; inbound mail also consumes quota. | One recipient per message; no CC/BCC, attachments or inbound-email feature. Reserve capacity for any existing account usage. |
| Resend Free configuration | 3 verified domains; 1 webhook endpoint with all event types; 30-day provider data retention. | Use existing domain; keep compact durable history in Supabase. Confirm the free webhook slot is available or safely share the existing endpoint. |
| Supabase Edge Functions | 500,000 invocations/month; shared organization usage matters. Free workers have a 150-second wall-clock limit. | Short, bounded batches; do not treat all free capacity as available to this feature. |
| Supabase database/storage/traffic | 500 MB database/project, 1 GB file storage, 5 GB egress and 5 GB cached egress. | Store small email records only; existing gallery and Screening Room usage also counts. No photo email attachments. |
| Supabase Cron | Built-in Postgres scheduler; invokes functions with `pg_cron` + `pg_net`. Recommended maximum 8 concurrent jobs, under 10 minutes/job. | One hourly dispatch job, no separate scheduler vendor. Check extension availability on the existing project before activation. |

Sources: [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [Resend pricing](https://resend.com/pricing), [Supabase pricing](https://supabase.com/pricing), [Edge usage](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations), [Edge runtime limits](https://supabase.com/docs/guides/functions/limits), [Cron](https://supabase.com/docs/guides/cron), [scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Before implementation/activation, distinguish these prerequisites from assumptions:

1. Inspect actual Supabase organization plan and current shared database, traffic and function usage. Existing documentation records Free at the earlier inspection; that is not a current billing verification. If the organization is now paid, do not assume included usage is a hard billing cap. Stop activation until the zero-additional-cost constraint can be met without changing other services.
2. Use a genuine Resend **Free** account, not a paid trial. Verify no paid plan, paid add-on or automatic upgrade is enabled. No payment details are required for Free. If already sharing an account, inventory other transactional senders/inbound usage and reserve their capacity. A domain-restricted API key does not create a separate quota.
3. The user reports `delivery.thedeptcollective.com` verified in Resend. Confirmed sender choice: `The Dept Collective <projects@delivery.thedeptcollective.com>`; replies go to the existing `hello@thedeptcollective.com` alias. This does not require purchasing a mailbox. Preserve Google Workspace's existing MX records and authentication; use the provider's specified sending/return-path records without replacing unrelated DNS. If the DNS provider demands a paid change, report that blocker instead of purchasing anything. [Domain verification](https://resend.com/docs/dashboard/domains/introduction).
4. Existing domain renewal, Workspace, NAS power/connectivity and website hosting remain existing costs, not new costs introduced by this feature. Do not buy a new domain, mail service, NAS subscription or Supabase custom domain.
5. Confirm a free webhook slot and sending-domain verification/production restrictions. If the slot is occupied, propose a reviewed shared event receiver or bounded status polling; never buy another slot or break existing webhooks.
6. Store a sending-only Resend API key and webhook secret only in Edge secrets. Store a dedicated scheduler authentication secret in Vault and the Edge environment. Do not use a public key to authorize dispatch; never put service credentials in browser code, source control, chat or email.
7. Free projects may pause after inactivity and have no uptime SLA. Exact-time delivery and guaranteed inbox placement cannot be promised at $0. If paused/unavailable, display the missed-run state when service resumes; do not send stale or expired reminders to catch up. [Supabase pricing](https://supabase.com/pricing).

## Existing implementation to reuse

Inspected `GalleryAdmin.tsx`, `service.ts`, gallery types/configuration and the three gallery migrations. There is currently no gallery-email sender, recipient model, outbox or scheduler in these files.

- Reuse `/admin/galleries`, its current visual system, Supabase login and database-backed `public.is_gallery_admin()` authorization. This checks active profiles and studio/gallery administrator roles; do not replace it with editable Auth metadata.
- Keep `dept_galleries`, `dept_gallery_photos`, existing gallery RPCs and the private preview bucket intact.
- Use the existing public/private gallery routes and access controls. Optional-password private galleries already use a secure `#access=` link; password-protected galleries use the current password/session flow.
- Leave `gallery-media`, Screening Room Auth SMTP/invitations, Screening Room roles and all NAS/download authorization unchanged.

## Administrator experience

Add a compact **Gallery email** area to the selected gallery in the existing dashboard, rather than a new site or unrelated page redesign.

1. Enter one client name and recipient address per delivery. Normalize/validate the email server-side. Do not infer recipients from Screening Room members or send to every gallery visitor.
2. Edit the subject and plain-text message within a fixed branded cream/black email layout. Support a small explicit set of variables: client name, gallery title and formatted expiration. Generate the branded gallery button automatically. Escape all text; do not accept arbitrary HTML, scripts, sender headers or user-supplied destination URLs.
3. Preview the exact recipient, subject, message and gallery destination without sending. Keep access secrets out of analytics and ordinary logs. Do not automatically load private photo previews in email; the branded template needs no image attachments or expiring signed image URLs.
4. **Send Gallery Email** explicitly authorizes that delivery. Disable while pending and show the existing job if the administrator double-clicks or retries after a timeout. No send on save, publish, preview or page load.
5. Enable the seven-day reminder for that recipient when sending the first delivery; show the scheduled date clearly. Let the administrator turn it off. Optional **Expires today** notification is off by default. Do not schedule reminders for recipients who were never sent a gallery delivery.
6. Show history, delivery state, attempts, next scheduled reminder, quota warnings and a Refresh status action. A deliberate resend is a separate explicit action with the earlier send shown; never create a new delivery merely because the dashboard reloads.

Template defaults: “Your gallery is ready — {{gallery_title}}”, “Your gallery expires in 7 days”, and “Your gallery expires today”. Subjects and bodies remain editable. Do not claim an email is delivered merely because the send API accepted it.

## Branded link and private access

All calls to action point to `https://www.thedeptcollective.com/galleries/<current-slug>`, built from a fixed server-owned origin and the current validated slug. No email may contain a UGREEN URL, storage object key, direct original download or signed preview URL. Do not let arbitrary message text introduce external links; reject NAS/share URLs and unsupported URL variables at validation.

For password-required galleries, email the branded URL and state that the gallery password is supplied separately. Existing password hashes cannot be recovered and must never be changed or copied into the email system. For password-free private galleries, include the existing secure fragment key only for the specifically authorized recipient; explain in the send preview that this is a forwardable access credential. Reuse the current access settings without rotating keys or relaxing RLS. Disable click/open tracking so private gallery links are not rewritten through tracking redirects. Resend necessarily processes recipient and email content, including any private access link sent.

Recipients reach the NAS only through the website's existing protected **Download Photos** action. Gallery email does not modify NAS sharing, password or expiration settings.

## Additive database design (prepared locally, not applied)

Use private-schema tables with RLS enabled, no anon/authenticated table grants, and narrowly scoped role-checked RPCs. Service-only claim/status functions must not be executable by browser users. Security-definer functions use an empty search path and explicit schema-qualified names.

| Proposed table | Purpose |
| --- | --- |
| `dept_gallery_private.email_settings` | One gallery's recipient, editable message drafts, reminder preferences and settings revision. FK to existing gallery. |
| `dept_gallery_private.email_outbox` | Durable job, kind, eligibility window, recipient, content/settings snapshot, request key, expiration version, status, claim lease, attempts and provider ID. |
| `dept_gallery_private.email_events` | Compact verified status history; unique provider event IDs; timestamps and bounded failure reason. |
| `dept_gallery_private.email_usage` | Atomic daily/monthly capacity reservations and provider block state; conservative counts include uncertain attempts. |
| `dept_gallery_private.email_controls` | Disabled-by-default kill switch, fixed maximum budgets, last successful scheduler time and last verified account usage timestamp. |

Add indexes for due jobs, active leases, gallery history and unique deduplication keys. Retain minimal metadata after deleting a gallery using a nullable gallery reference; delete sensitive drafts/access-bearing snapshots and cancel pending jobs in the deletion transaction. Do not retain a runnable job with a deleted parent. Expiration/slug/recipient/access-mode changes invalidate unsent snapshots and regenerate eligible future jobs; do not silently reuse stale private links.

No existing table replacement, role grants, gallery resets, storage migrations or Auth changes. Present final migration SQL, grants, trigger effects, rollback considerations and preservation tests before requesting application approval.

## Scheduling and eligibility rules

Use one hourly Cron job; at most 744 scheduled Edge calls in a 31-day month, plus explicit administrator sends and verified delivery events. Prefer a database due-work check before invoking the worker. No per-gallery jobs, always-on worker, browser timer, external queue or paid workflow engine.

- One short worker batch handles at most 20 due messages sequentially, with a time budget below the Free worker limit. Use conservative spacing (at most one provider send/second initially), respect provider rate-limit responses and never busy-loop.
- Store UTC instants; display dates and compute reminder calendar dates in `America/Toronto`, including daylight-saving transitions.
- Seven-day reminder: due at 09:00 Toronto time on the date seven calendar days before expiration. Acceptable send window is that local calendar day, after the initial delivery was accepted. If delivered too late for that window, record skipped rather than sending a misleading “7 days” email.
- Optional expiration-day notification: due at 09:00 Toronto time on the expiration date **only if the gallery is still active**. If expiration is at/before 09:00, skip it with an explanation. No “already expired” email: that would conflict with the user's prohibition on automated emails for expired galleries.
- Galleries without expiration receive neither expiration reminder. Recipient reminders begin only after successful provider acceptance of the initial admin-authorized gallery delivery.
- A paused project, quota hold or outage may cause a missed reminder. Catch up only inside the original eligibility window; otherwise record skipped. Do not send old reminders after the date changes.
- Once sent, a given reminder is not replayed on every scheduler run. An administrator changing the expiration produces a new expiration version and cancels old unsent jobs; show the newly planned dates for review.

Check immediately before every provider request: feature enabled, recipient valid/not suppressed, gallery exists, `status='published'`, `expires_at IS NULL OR expires_at > current time`, settings/access version unchanged, job inside its eligibility window, reminder enabled and quota reserved. Unpublish/expire/delete must cancel pending work. Serialize job claims and final eligibility decisions with gallery edits where possible. An email already accepted by Resend cannot be recalled; the website still rechecks access if a gallery is revoked immediately afterward. Do not promise atomicity between PostgreSQL and an external email provider.

## Duplicate prevention and failures

- Durable database uniqueness for an initial delivery request and for each `(gallery, normalized recipient, reminder kind, expiration version)` occurrence. Explicit resends require a distinct approved request ID.
- Atomically claim jobs using row locks/leases and reserve quota in the same transaction. Multiple Cron runs/admin clicks cannot claim the same job or spend the same remaining budget.
- Freeze the payload before sending; a retry uses the identical payload and stable Resend `Idempotency-Key`. Resend retains these keys for **24 hours**, so database records—not the provider window alone—prevent long-term duplicates. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Retry transient failures with bounded backoff, at most three automatic attempts and only within 23 hours of the first attempt and within the original eligibility window. Resend quota errors put the job on hold until a valid reset; no immediate loop.
- If the provider may have accepted a send but the response/database update was lost, reconcile using the same key inside the safe window. Beyond it, mark **Unknown — review required** and do not automatically resend. Safety against duplicates takes precedence over guaranteed eventual delivery.
- Reject bad addresses/configuration with a visible failure; suppress automatic retries/reminders after a hard bounce or complaint. Never silently skip an error or label it delivered.
- Signed webhook handling verifies the raw payload, signature and timestamp before updating known provider IDs. Deduplicate event IDs; handle out-of-order delivery/bounce events without downgrading a terminal status to accepted. Bound payload sizes and retention. [Webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests).

History states: Draft, Scheduled, Queued, Sending, Accepted by provider, Delivered, Delayed, Bounced, Complained, Failed, Held for quota, Cancelled, Skipped and Unknown. “Delivered” means the recipient's mail server accepted it, not that it reached the inbox or was read. Open/click tracking is unnecessary.

## Quota monitoring and strict stops

Default **gallery-specific** budgets: 80 recipients/day and 2,400/month, below the provider ceilings. These are maximum budgets, not reserved capacity; reduce them if other Resend usage needs more headroom. No UI action can exceed the free provider limits. Budget changes require a reviewed configuration update, never an upgrade prompt.

- Count all manual deliveries, deliberate resends, reminders and uncertain send attempts. Single-recipient messages simplify accounting. Database locking prevents concurrent overspend. Do not release an uncertain reservation merely because an HTTP request timed out.
- Display local usage, remaining gallery budget, UTC daily reset, provider quota holds and the timestamp/scope of the last account-wide usage check. Match monthly accounting to the provider's actual reset period at setup; do not assume a reset date without verifying it.
- At 75% show “Approaching the free sending allowance”; at 90% show “Limited free capacity remaining”; at 100% hold sends and show the next valid reset. Do not use paid-upgrade CTAs.
- Resend's API returns daily/monthly quota errors and does not queue the rejected email itself. Keep eligible holds in our own database; discard missed reminders and expired-gallery deliveries rather than sending them after reset. [Resend quota behavior](https://resend.com/docs/knowledge-base/account-quotas-and-limits).
- Local counts are **not** total provider usage: other API keys, SMTP and inbound mail share the Resend quota. Surface provider limit responses immediately. Use official account usage information where available, otherwise show an explicit “Account-wide usage not verified” warning and require a fresh admin check before activation. Never fabricate live global usage from gallery rows.
- Track bounded worker runs and queue size, and expose a direct link to Supabase organization usage. Existing preview signing, Screening Room and other projects share free resources. No privileged Supabase Management API credential belongs in the browser merely to draw a meter.
- Retain detailed event history for 90 days and compact deduplication/usage records while they can prevent replay. Remove only this feature's aged events, request bodies and completed Cron run logs with bounded cleanup; preserve active jobs and deduplication records. Stop new queue inserts at a conservative storage threshold rather than growing without bound. Final thresholds must be based on inspected database headroom.
- A local counter cannot prevent unsolicited requests from counting as Edge invocations. Provider Free-plan enforcement, disabled billing/upgrades, authentication, bounded work and the shared-usage warning are all required. Do not claim an application counter alone guarantees a $0 bill on a paid organization.

For scale: 500 clients receiving delivery + one reminder + optional expiration-day notice generate 1,500 messages if all occur in the same month. It fits the proposed monthly budget but still must be spread within daily capacity. More than the free allowance, guaranteed uninterrupted scheduling or guaranteed exact-minute delivery cannot be supplied under this plan; hold/skip/report instead of enabling paid services.

## Implementation and verification sequence

1. Resolve the account/domain/quota prerequisites above; keep a written verified date and clear unresolved items. No live sends during inspection.
2. Prepare the additive migration and isolated database tests; do not apply it remotely. Reuse existing `is_gallery_admin()` checks and service-only authorization patterns.
3. Implement a server-only email renderer and bounded dispatcher, using direct Resend transactional API calls, no paid automation API. Keep automatic sends disabled by default.
4. Add the editor/send/history/quota UI to `GalleryAdmin`; missing setup displays a truthful setup-pending notice while uploads and gallery management continue working.
5. Add the signed event receiver and disabled scheduler-install instructions. Keep secrets out of migrations; use Vault/Edge secrets after approval. No scheduler creation as a side effect of opening the dashboard.
6. Run isolated tests with fake provider responses: admin/viewer/anonymous access; double-click/concurrent workers; provider acceptance followed by database failure; >24-hour uncertainty; quota races/reset/429; deleted/unpublished/expired galleries; expiration edits; Toronto DST; missing dates; access-key rotation; late/out-of-order/invalid webhooks; no NAS URLs or unsafe markup in mail; preserved private metadata restrictions. Test the admin UI's preview vs send distinction and stale-update handling.
7. Run gallery and Screening Room regressions, TypeScript, focused lint and production build. Show local admin preview using simulated provider responses clearly marked as test-only. No test code bypass in production.
8. Present the exact migration, configuration, function and Cron changes for approval. Only then apply/deploy in the existing project; verify the disabled configuration first. Send one explicitly approved test to the administrator before enabling client automation. Review real quota usage and event verification; activate the Cron job last.

## Completion criteria and current limitations

The local editor, renderer, dispatcher, migration, scheduler-install script and tests are prepared, but **none is claimed live**. Account settings, API secrets, available webhook slot, current shared usage and Cron extension state remain unverified for this new email feature. No new payment or account was created.

Within verified Free accounts and the stated workload, the design needs no new monthly subscription. It cannot guarantee free service indefinitely if providers change terms, immediate delivery during outages/quota exhaustion, inbox placement, or sends after expiration. Those cases produce a visible hold/skipped/unknown status and require review—never a paid fallback.

Implementation note: monthly application reservations use a conservative **rolling 31-day** window, not a claimed live Resend billing-period counter. Detailed status and deployment prerequisites are in the function README. The user-confirmed subdomain is for photo and future video delivery; this implementation sends gallery emails only.

# Quote Builder V1

- Route: `/start`; optional `package` query uses existing `inquiryKey` values.
- Package CTAs use `packageInquiryHref`. Invalid keys open general selection.
- Package names, prices, tiers and contact labels remain in `packages-data.ts`.
- `quote-model.ts` defines conditional questions, validation, relevant-field serialization and submission. `QuoteBuilder.tsx` owns a single reducer for answers, position, editing and request status.
- Branch changes discard old branch answers, retaining shared logistics/contact details. Back and Review/Edit retain current answers. Browser history records question positions. No cookies, local storage, account or draft persistence; refresh starts again with the URL package context.
- Required: service/unsure, primary branch choices, Story/Custom/Unsure description, date status (and date when specified), location or planning status, coverage choice (including unsure), investment choice (including unsure), name and email. Multi-select deliverables, goals, venue, timeline, phone, organization and additional notes are optional.
- Requests go to the existing recipient via `https://formsubmit.co/ajax/hello@thedeptcollective.com`. The existing simple HTML contact form is unchanged. Payload contains only relevant branch fields plus package context, shared answers and contact details. Honeypot retained; no uploads or automated pricing.
- Only an OK response with explicit `success: true` / `"true"` shows receipt. Network, timeout, HTTP, malformed response and negative acknowledgement failures retain answers for retry. A positive acknowledgement is provider acceptance, not proof of inbox delivery.
- Existing FormSubmit recipient activation is required. No new custom backend or secret is needed. Live delivery has NOT been exercised during development; verify a real inquiry on the published domain. No simulated response is used by production UI.
- No analytics system was found; none added.

## Verification

Browser checks: Story, Event Signature, Live Single Camera, Content Day, direct Custom, direct Unsure all reached Review. Invalid package falls back to selection. Review Edit, internal Back and browser Back preserve current answers. Mobile review checked at 320/375/390/430 px without horizontal overflow.

Isolated model/request checks (no email sent): all nine package keys/prices, branch filtering, conditional live/date answers, required validation, unsure path, network/HTTP/negative/malformed failures and explicit success acknowledgement.

Build and focused lint pass. Project typecheck has an existing unrelated `src/routes/__root.tsx` error concerning `Error` vs `unknown` in the error component.

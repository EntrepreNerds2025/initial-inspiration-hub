import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  defaultEmailDraft,
  renderEmail,
  validateDraft,
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  type EmailDraft,
  type EmailKind,
} from "../../../supabase/functions/_shared/gallery-email";
import { galleryEmailService, type GalleryEmailState } from "./email-service";
import type { ManagedGallery } from "./service";
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-CA", { timeZone: "America/Toronto" }) + " Toronto"
    : "—";
export function GalleryEmail({ gallery }: { gallery: ManagedGallery }) {
  const [draft, setDraft] = useState<EmailDraft>({ ...defaultEmailDraft });
  const [state, setState] = useState<GalleryEmailState | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof renderEmail> | null>(null);
  const [kind, setKind] = useState<EmailKind>("delivery");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let alive = true;
    galleryEmailService
      .load(gallery.id)
      .then((s) => {
        if (alive) {
          setState(s);
          setDraft(s.settings?.draft || { ...defaultEmailDraft });
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [gallery.id]);
  const active =
    gallery.status === "published" &&
    (!gallery.expires_at || Date.parse(gallery.expires_at) > Date.now());
  const enabled =
    !!state?.controls.enabled &&
    !!state.controls.verified_until &&
    Date.parse(state.controls.verified_until) > Date.now();
  const dirty = JSON.stringify(draft) !== JSON.stringify(state?.settings?.draft);
  const ready = active && enabled && !!state && !dirty && !busy;
  const lastDelivery = state?.history.find((h) => h.kind === "delivery");
  const usage = state
    ? Math.max(
        state.daily_used / state.controls.daily_limit,
        state.monthly_used / state.controls.monthly_limit,
      )
    : 0;
  const set = <K extends keyof EmailDraft>(key: K, value: EmailDraft[K]) => {
    setDraft((old) => ({ ...old, [key]: value }));
    setPreview(null);
  };
  const message = (selectedKind: EmailKind = kind) =>
    renderEmail({
      recipient: draft.recipient,
      client_name: draft.client_name,
      subject: draft[`${selectedKind}_subject`],
      body: draft[`${selectedKind}_body`],
      gallery_title: gallery.title,
      slug: gallery.slug,
      expires_at: gallery.expires_at,
      share_key:
        gallery.visibility === "private" && gallery.passwordRequired === false
          ? gallery.shareKey || null
          : null,
      password_required: gallery.visibility === "private" && gallery.passwordRequired !== false,
    });
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setState(await galleryEmailService.load(gallery.id));
      setNotice("History refreshed. Your unsaved edits are preserved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      validateDraft(draft);
      await galleryEmailService.save(gallery.id, draft, state?.settings?.revision || 0);
      const next = await galleryEmailService.load(gallery.id);
      setState(next);
      setDraft(next.settings!.draft);
      setNotice("Email saved. Saving does not send.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!ready) return;
    setBusy(true);
    setConfirm(false);
    setError("");
    setNotice("");
    try {
      const id = await galleryEmailService.enqueue(gallery.id, state!.settings!.revision);
      await galleryEmailService.dispatch(id);
      setNotice("Send request processed. Check the delivery status below.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      try {
        setState(await galleryEmailService.load(gallery.id));
      } catch {
        /* Retain existing status and error. */
      }
      setBusy(false);
    }
  }
  return (
    <section className="dg-email" aria-labelledby="gallery-email-title">
      <header>
        <span className="dg-label">CLIENT DELIVERY / EMAIL</span>
        <h3 id="gallery-email-title">A personal delivery.</h3>
        <p>
          Send your client a branded gallery link, then let carefully timed reminders take care of
          the follow-up.
        </p>
      </header>
      <p className="dg-email-sender">
        <strong>From</strong> {EMAIL_FROM}
        <br />
        <strong>Replies to</strong> {EMAIL_REPLY_TO}
      </p>
      {loading ? (
        <p role="status">Checking email setup…</p>
      ) : !state ? (
        <p className="dg-notice">
          LOCAL PREVIEW · Email setup is not installed. Edits below are not saved; no email can be
          sent.
        </p>
      ) : !enabled ? (
        <p className="dg-notice">
          Sending is disabled until the free-plan checks and email setup are approved.
        </p>
      ) : null}
      {error && (
        <p role="alert" className="dg-form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="dg-notice">
          {notice}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className="dg-email-fields">
          <label>
            Client name
            <input
              value={draft.client_name}
              maxLength={120}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="Client name"
            />
          </label>
          <label>
            Recipient email
            <input
              type="email"
              value={draft.recipient}
              maxLength={254}
              onChange={(e) => set("recipient", e.target.value)}
              placeholder="client@example.com"
            />
          </label>
        </div>
        <label>
          Email to edit
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as EmailKind);
              setPreview(null);
            }}
          >
            <option value="delivery">Gallery delivery</option>
            <option value="reminder">Seven-day reminder</option>
            <option value="expiration">Expires today</option>
          </select>
        </label>
        <label>
          Subject
          <input
            value={draft[`${kind}_subject`]}
            maxLength={160}
            onChange={(e) => set(`${kind}_subject`, e.target.value)}
          />
        </label>
        <label>
          Message
          <textarea
            rows={7}
            value={draft[`${kind}_body`]}
            maxLength={4000}
            onChange={(e) => set(`${kind}_body`, e.target.value)}
          />
        </label>
        <p className="dg-email-help">
          Available placeholders: {"{{client_name}}"}, {"{{gallery_title}}"}, {"{{expiration}}"}.
          Your website gallery link is added automatically. Do not paste NAS links or passwords.
        </p>
        <label className="dg-email-check">
          <input
            type="checkbox"
            checked={draft.reminder}
            onChange={(e) => set("reminder", e.target.checked)}
          />
          Remind this recipient 7 days before expiration
        </label>
        <label className="dg-email-check">
          <input
            type="checkbox"
            checked={draft.expiration}
            onChange={(e) => set("expiration", e.target.checked)}
          />
          Also notify on the expiration date, before access ends
        </label>
        <p className="dg-email-help">
          Reminders are scheduled after an accepted delivery, at 9:00 a.m. Toronto time. Missed
          windows and already-expired galleries are skipped.{" "}
          {gallery.expires_at
            ? "Expires: " + date(gallery.expires_at)
            : "This gallery has no expiration date, so reminders will not be scheduled."}
        </p>
        {gallery.visibility === "private" && (
          <p className="dg-email-help">
            {gallery.passwordRequired === false
              ? "The email includes the private access link. Anyone it is forwarded to can access this gallery."
              : "Send the gallery password separately. It is not included in this email."}
          </p>
        )}
        <div className="dg-admin-actions">
          <button
            type="button"
            className="dg-button"
            onClick={() => {
              try {
                validateDraft(draft);
                setPreview(message());
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Preview email
          </button>
          <button
            type="button"
            className="dg-button"
            disabled={!state || !dirty}
            onClick={() => void save()}
          >
            Save email & reminders
          </button>
          <button
            type="button"
            className="dg-button dg-primary"
            disabled={!ready}
            onClick={() => {
              try {
                validateDraft(draft);
                setKind("delivery");
                setPreview(message("delivery"));
                setConfirm(true);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Send Gallery Email
          </button>
        </div>
        {!active && (
          <p className="dg-email-help">Only published, unexpired galleries can be emailed.</p>
        )}
        {dirty && state && <p className="dg-email-help">Save your changes before sending.</p>}
      </fieldset>
      {preview && (
        <section className="dg-email-preview">
          <p>
            PREVIEW ONLY · To: {draft.recipient}
            <br />
            <strong>{preview.subject}</strong>
          </p>
          <iframe
            title="Branded gallery email preview"
            sandbox=""
            srcDoc={preview.html
              .replace(/href="[^"]*"/g, 'href="#"')
              .replace("<a href=", '<a tabindex="-1" aria-disabled="true" href=')}
            referrerPolicy="no-referrer"
          />
        </section>
      )}
      <div className="dg-email-history">
        <div className="dg-admin-actions">
          <h4>Delivery history & free allowance</h4>
          <button
            type="button"
            className="dg-button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh status
          </button>
        </div>
        {state ? (
          <>
            <p>
              {state.daily_used} / {state.controls.daily_limit} gallery emails today (UTC) ·{" "}
              {state.monthly_used} / {state.controls.monthly_limit} in the past 31 days.
            </p>
            <p className="dg-email-help">
              Gallery usage only. Other senders share Resend’s free allowance. Account-wide usage is
              not measured here. Free-plan verification valid until{" "}
              {date(state.controls.verified_until)}. Last scheduler run:{" "}
              {date(state.controls.last_run)}.
            </p>
            {enabled &&
              (!state.controls.last_run ||
                Date.now() - Date.parse(state.controls.last_run) > 7200000) && (
                <p role="status" className="dg-notice">
                  The email scheduler has not checked in recently. Reminders may be delayed; no paid
                  fallback is enabled.
                </p>
              )}
            {usage >= 0.75 && (
              <p role="status" className="dg-notice">
                {usage >= 1
                  ? "Free gallery allowance reached. Sends are held; no paid fallback."
                  : usage >= 0.9
                    ? "Limited free sending capacity remaining."
                    : "Approaching the free sending allowance."}
              </p>
            )}
            {state.controls.blocked_until &&
              Date.parse(state.controls.blocked_until) > Date.now() && (
                <p className="dg-notice">
                  Provider quota hold until {date(state.controls.blocked_until)}.
                </p>
              )}
            <a href="https://resend.com/usage" target="_blank" rel="noreferrer">
              Check Resend account usage
            </a>
            {state.history.length ? (
              <ol>
                {state.history.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {h.kind} / {h.status}
                    </strong>
                    <span>{h.recipient}</span>
                    <span>
                      Scheduled: {date(h.due_at)} · Attempts: {h.attempts}
                    </span>
                    {h.reason && <span>{h.reason}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No gallery emails requested yet.</p>
            )}
          </>
        ) : (
          <p>
            History and quota counts will appear after the approved setup. No demo delivery records
            are shown.
          </p>
        )}
      </div>
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="dg-editor-overlay" />
          <Dialog.Content className="dg dg-editor">
            <Dialog.Title>Send this gallery email?</Dialog.Title>
            <Dialog.Description>
              The delivery email will go to {draft.recipient}. Saving or previewing alone never
              sends.
            </Dialog.Description>
            <p>{preview?.subject || draft.delivery_subject}</p>
            {lastDelivery && (
              <p>
                Previous delivery: {lastDelivery.status}. Sending the same saved version again
                checks the existing request—it does not create another email.
              </p>
            )}
            <div className="dg-admin-actions">
              <Dialog.Close className="dg-button">Cancel</Dialog.Close>
              <button
                className="dg-button dg-primary"
                disabled={!ready}
                onClick={() => void send()}
              >
                Confirm send
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

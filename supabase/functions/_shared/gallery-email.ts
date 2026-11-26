// Shared, side-effect-free template code. No credentials or network calls.
export const EMAIL_FROM = "The Dept Collective <projects@delivery.thedeptcollective.com>";
export const EMAIL_REPLY_TO = "hello@thedeptcollective.com";
export const EMAIL_ORIGIN = "https://www.thedeptcollective.com";
export type EmailKind = "delivery" | "reminder" | "expiration";
export interface EmailDraft {
  recipient: string;
  client_name: string;
  reminder: boolean;
  expiration: boolean;
  delivery_subject: string;
  delivery_body: string;
  reminder_subject: string;
  reminder_body: string;
  expiration_subject: string;
  expiration_body: string;
}
export const defaultEmailDraft: EmailDraft = {
  recipient: "",
  client_name: "",
  reminder: true,
  expiration: false,
  delivery_subject: "Your gallery is ready — {{gallery_title}}",
  delivery_body:
    "Hi {{client_name}},\n\nYour collection is ready. View your photographs and download your files through your gallery below.\n\nThank you for creating with The Dept Collective.",
  reminder_subject: "Your gallery expires in 7 days — {{gallery_title}}",
  reminder_body:
    "Hi {{client_name}},\n\nA reminder to save your photographs before your gallery closes on {{expiration}}.\n\nThank you,\nThe Dept Collective",
  expiration_subject: "Your gallery expires today — {{gallery_title}}",
  expiration_body:
    "Hi {{client_name}},\n\nYour gallery closes today, {{expiration}}. Please save your files before access ends.\n\nThe Dept Collective",
};
export interface EmailSnapshot {
  recipient: string;
  subject: string;
  body: string;
  client_name: string;
  gallery_title: string;
  slug: string;
  expires_at: string | null;
  share_key: string | null;
  password_required: boolean;
}
export function validateDraft(d: EmailDraft) {
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(d.recipient) || d.recipient.length > 254)
    throw new Error("Enter one valid recipient email address.");
  if (d.client_name.length > 120 || /[\r\n<>]/.test(d.client_name))
    throw new Error("Use a short client name without markup.");
  for (const kind of ["delivery", "reminder", "expiration"] as const) {
    const subject = d[`${kind}_subject`],
      body = d[`${kind}_body`];
    if (
      !subject.trim() ||
      subject.length > 160 ||
      /[\r\n]/.test(subject) ||
      !body.trim() ||
      body.length > 4000
    )
      throw new Error("Use a subject of 1–160 characters and a message of 1–4,000 characters.");
    // All links are generated server-side. Reject pasted URLs, HTML and unknown placeholders.
    if (
      /[<>]|(?:https?:|www\.|ug\.link|share-download|\b[\w-]+\.[a-z]{2,}(?:[/\s]|$))/i.test(
        subject + "\n" + body,
      )
    )
      throw new Error(
        "Leave links and HTML out of the message; the branded gallery link is added for you.",
      );
    if (
      /\{\{[^}]+\}\}/g.test(
        (subject + body).replace(/\{\{(client_name|gallery_title|expiration)\}\}/g, ""),
      )
    )
      throw new Error("Use only client_name, gallery_title and expiration placeholders.");
  }
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function renderEmail(s: EmailSnapshot) {
  if (
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug) ||
    (s.share_key && !/^[a-f0-9]{64}$/.test(s.share_key))
  )
    throw new Error("Invalid gallery link.");
  const expiration = s.expires_at
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Toronto",
      }).format(new Date(s.expires_at)) + " (Toronto time)"
    : "No expiration date";
  const values: Record<string, string> = {
    client_name: s.client_name || "there",
    gallery_title: s.gallery_title,
    expiration,
  };
  const interpolate = (v: string) =>
    v.replace(/\{\{(client_name|gallery_title|expiration)\}\}/g, (_, key: string) => values[key]!);
  if (
    /(?:https?:|www\.|ug\.link|share-download)/i.test(
      s.gallery_title + s.client_name + s.subject + s.body,
    )
  )
    throw new Error("Email must not contain external delivery links.");
  const subject = interpolate(s.subject)
    .replace(/[\r\n]/g, " ")
    .slice(0, 240);
  const body = interpolate(s.body);
  const url = EMAIL_ORIGIN + "/galleries/" + s.slug + (s.share_key ? "#access=" + s.share_key : "");
  const note = s.password_required
    ? "Use the gallery password provided separately."
    : s.share_key
      ? "This private link grants access to your collection. Please keep it private."
      : "";
  const text = `${body}\n\nView your gallery: ${url}\n${note}\n\n${s.expires_at ? "Available until " + expiration : ""}\nThe Dept Collective\nReply to ${EMAIL_REPLY_TO}`;
  const html = `<!doctype html><html><body style="margin:0;background:#0a0a0a;color:#ded5c1;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:48px 24px"><table role="presentation" width="100%" style="max-width:600px;margin:auto"><tr><td><p style="font-size:12px;letter-spacing:3px">THE DEPT COLLECTIVE / GALLERIES</p><h1 style="font-size:36px;font-weight:400;overflow-wrap:anywhere">${escape(s.gallery_title)}</h1><div style="font-size:16px;line-height:1.8;white-space:pre-line;overflow-wrap:anywhere">${escape(body)}</div><p style="margin:36px 0"><a href="${escape(url)}" style="display:inline-block;padding:16px 24px;background:#ded5c1;color:#0a0a0a;text-decoration:none">View your gallery</a></p><p style="font-size:13px;line-height:1.6">${escape(note)}</p>${s.expires_at ? '<p style="font-size:13px">Available until ' + escape(expiration) + "</p>" : ""}<hr style="border:0;border-top:1px solid #363636;margin:32px 0"><p style="font-size:13px">The Dept Collective<br>Visual storytelling studio<br>Toronto / Canada</p></td></tr></table></td></tr></table></body></html>`;
  return { from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [s.recipient], subject, text, html };
}

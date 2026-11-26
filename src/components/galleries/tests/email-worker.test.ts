import { webcrypto } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import {
  createEmailHandler,
  verifyWebhook,
  type EmailDependencies,
} from "../../../../supabase/functions/gallery-email/handler";
import {
  defaultEmailDraft,
  renderEmail,
  validateDraft,
  type EmailSnapshot,
} from "../../../../supabase/functions/_shared/gallery-email";
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
const id = "a0000000-0000-4000-8000-000000000001";
const snapshot: EmailSnapshot = {
  recipient: "client@example.test",
  client_name: "Client",
  subject: defaultEmailDraft.delivery_subject,
  body: defaultEmailDraft.delivery_body,
  gallery_title: "Portraits & moments",
  slug: "portrait-session",
  expires_at: null,
  share_key: null,
  password_required: true,
};
const request = (
  action = "dispatch",
  body: unknown = { id },
  headers: Record<string, string> = {},
) =>
  new Request("https://example.test/functions/v1/gallery-email?action=" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer viewer", ...headers },
    body: JSON.stringify(body),
  });
function dependencies(): EmailDependencies {
  return {
    enabled: true,
    cronSecret: "a".repeat(40),
    webhookSecret: "",
    admin: vi.fn().mockResolvedValue(true),
    send: vi.fn().mockResolvedValue({ status: 200, id: "provider-id" }),
    rpc: vi.fn(async (name) =>
      name === "gallery_email_claim"
        ? { id, lease: id, snapshot }
        : name === "gallery_email_ready"
          ? true
          : null,
    ),
  };
}
describe("gallery email boundaries", () => {
  it("generates only a branded gallery link with the fixed sender and reply address", () => {
    const result = renderEmail(snapshot);
    expect(result.from).toContain("projects@delivery.thedeptcollective.com");
    expect(result.reply_to).toBe("hello@thedeptcollective.com");
    expect(result.html).toContain("https://www.thedeptcollective.com/galleries/portrait-session");
    expect(result.text).toContain("password provided separately");
    expect(result.html).not.toMatch(/ug\.link|supabase|storage|tracking/i);
    expect(result.to).toEqual(["client@example.test"]);
  });
  it("escapes content without accepting HTML or arbitrary links in edited messages", () => {
    expect(renderEmail({ ...snapshot, gallery_title: 'A < B & "C"' }).html).toContain(
      "A &lt; B &amp; &quot;C&quot;",
    );
    for (const body of ["<img src=x>", "https://ug.link/private", "www.example.com", "{{unknown}}"])
      expect(() =>
        validateDraft({ ...defaultEmailDraft, recipient: snapshot.recipient, delivery_body: body }),
      ).toThrow();
    expect(() =>
      validateDraft({ ...defaultEmailDraft, recipient: snapshot.recipient }),
    ).not.toThrow();
    expect(() => renderEmail({ ...snapshot, gallery_title: "https://ug.link/private" })).toThrow();
  });
  it("uses secure fragment only when supplied by the authorized snapshot", () => {
    expect(
      renderEmail({ ...snapshot, password_required: false, share_key: "f".repeat(64) }).text,
    ).toContain("#access=" + "f".repeat(64));
    expect(() => renderEmail({ ...snapshot, slug: "../admin" })).toThrow();
  });
  it("denies unauthenticated/viewer dispatch without touching data or sending", async () => {
    const d = dependencies();
    vi.mocked(d.admin).mockResolvedValue(false);
    expect((await createEmailHandler(d)(request())).status).toBe(403);
    expect(d.rpc).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });
  it("rejects untrusted origins, bad scheduler credentials and bad methods", async () => {
    const d = dependencies(),
      handler = createEmailHandler(d);
    expect(
      (await handler(request("dispatch", { id }, { Origin: "https://evil.test" }))).status,
    ).toBe(403);
    expect((await handler(request("tick"))).status).toBe(403);
    expect((await handler(new Request("https://example.test/?action=dispatch"))).status).toBe(405);
    expect(d.send).not.toHaveBeenCalled();
  });
  it("stays disabled even for a valid administrator", async () => {
    const d = dependencies();
    d.enabled = false;
    expect((await createEmailHandler(d)(request())).status).toBe(503);
    expect(d.send).not.toHaveBeenCalled();
    expect(d.rpc).not.toHaveBeenCalled();
  });
  it("does not accept client recipient or body overrides", async () => {
    const d = dependencies();
    await createEmailHandler(d)(
      request("dispatch", { id, to: "attacker@test.test", body: "override" }),
    );
    expect(vi.mocked(d.send).mock.calls[0]![0].to).toEqual([snapshot.recipient]);
    expect(vi.mocked(d.send).mock.calls[0]![1]).toBe("dept-gallery/" + id);
    expect(d.rpc).toHaveBeenCalledWith("gallery_email_finish", {
      p_id: id,
      p_lease: id,
      p_result: "accepted",
      p_provider: "provider-id",
    });
  });
  it("does not send if claim is already taken or final eligibility changed", async () => {
    for (const ready of [false, null]) {
      const d = dependencies();
      vi.mocked(d.rpc).mockImplementation(async (name) =>
        name === "gallery_email_claim"
          ? ready === null
            ? null
            : { id, lease: id, snapshot }
          : false,
      );
      await createEmailHandler(d)(request());
      expect(d.send).not.toHaveBeenCalled();
    }
  });
  it("records uncertainty instead of inventing successful delivery", async () => {
    const d = dependencies();
    vi.mocked(d.send).mockRejectedValue(new Error("timeout"));
    await createEmailHandler(d)(request());
    expect(d.rpc).toHaveBeenCalledWith("gallery_email_finish", {
      p_id: id,
      p_lease: id,
      p_result: "uncertain",
      p_provider: null,
    });
  });
  it("holds provider quota rejection without a second send", async () => {
    const d = dependencies();
    vi.mocked(d.send).mockResolvedValue({ status: 429 });
    await createEmailHandler(d)(request("tick", {}, { "x-gallery-cron-secret": d.cronSecret }));
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.rpc).toHaveBeenCalledWith("gallery_email_finish", {
      p_id: id,
      p_lease: id,
      p_result: "quota",
      p_provider: null,
    });
  });
  it("does not disclose errors or send again after a failed DB acknowledgement", async () => {
    const d = dependencies();
    vi.mocked(d.rpc).mockImplementation(async (name) => {
      if (name === "gallery_email_finish") throw new Error("secret database details");
      return name === "gallery_email_claim" ? { id, lease: id, snapshot } : true;
    });
    const response = await createEmailHandler(d)(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret database");
    expect(d.send).toHaveBeenCalledTimes(1);
  });
  it("limits an authorized scheduled batch to twenty messages", async () => {
    const d = dependencies();
    await createEmailHandler(d)(request("tick", {}, { "x-gallery-cron-secret": d.cronSecret }));
    expect(d.send).toHaveBeenCalledTimes(20);
  });
});
async function signed(raw: string, timestamp = Math.floor(Date.now() / 1000)) {
  const secretBytes = new TextEncoder().encode("test-only-webhook-secret-32-characters");
  const secret = "whsec_" + Buffer.from(secretBytes).toString("base64");
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`msg_test.${timestamp}.${raw}`),
  );
  return {
    secret,
    headers: new Headers({
      "svix-id": "msg_test",
      "svix-timestamp": String(timestamp),
      "svix-signature": "v1," + Buffer.from(signature).toString("base64"),
    }),
  };
}
describe("signed delivery history", () => {
  it("accepts authentic raw payloads and rejects mutation/replay/forgery", async () => {
    const raw = '{"type":"email.delivered"}';
    const { secret, headers } = await signed(raw);
    expect(await verifyWebhook(raw, headers, secret)).toBe(true);
    expect(await verifyWebhook(raw + " ", headers, secret)).toBe(false);
    expect(await verifyWebhook(raw, headers, secret, Date.now() + 600000)).toBe(false);
    expect(await verifyWebhook(raw, headers, "wrong")).toBe(false);
  });
  it("persists only a verified delivery event and never sends from a webhook", async () => {
    const raw = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "provider-id" },
    });
    const { secret, headers } = await signed(raw);
    const d = dependencies();
    d.webhookSecret = secret;
    const response = await createEmailHandler(d)(
      new Request("https://example.test/?action=webhook", { method: "POST", headers, body: raw }),
    );
    expect(response.status).toBe(200);
    expect(d.rpc).toHaveBeenCalledWith(
      "gallery_email_event",
      expect.objectContaining({ p_event: "msg_test", p_status: "delivered" }),
    );
    expect(d.send).not.toHaveBeenCalled();
  });
});

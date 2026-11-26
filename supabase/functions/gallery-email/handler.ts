import { renderEmail, type EmailSnapshot } from "../_shared/gallery-email.ts";
export interface EmailDependencies {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  admin: (authorization: string) => Promise<boolean>;
  send: (
    message: ReturnType<typeof renderEmail>,
    key: string,
  ) => Promise<{ status: number; id?: string }>;
  enabled: boolean;
  cronSecret: string;
  webhookSecret: string;
  pause?: () => Promise<void>;
}
const origins = new Set([
  "https://www.thedeptcollective.com",
  "https://thedeptcollective.com",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function verifyWebhook(
  raw: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
) {
  try {
    const id = headers.get("svix-id"),
      timestamp = headers.get("svix-timestamp"),
      signatures = headers.get("svix-signature");
    if (
      !secret.startsWith("whsec_") ||
      !id ||
      !timestamp ||
      !signatures ||
      !/^\d+$/.test(timestamp) ||
      Math.abs(now / 1000 - Number(timestamp)) > 300
    )
      return false;
    const decode = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      decode(secret.slice(6)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const payload = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for (const signature of signatures.split(" ")) {
      const [version, value] = signature.split(",");
      if (
        version === "v1" &&
        value &&
        (await crypto.subtle.verify("HMAC", key, decode(value), payload))
      )
        return true;
    }
    return false;
  } catch {
    return false;
  }
}
async function sameSecret(a: string, b: string) {
  if (b.length < 32 || !a) return false;
  const digest = async (v: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i]! ^ y[i]!;
  return difference === 0;
}
async function boundedText(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new Error("Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
export function createEmailHandler(deps: EmailDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    if (origin && origins.has(origin))
      Object.assign(headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization,apikey,content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
    const response = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers });
    if (origin && !origins.has(origin)) return response(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return response(405, { error: "POST required" });
    const action = new URL(request.url).searchParams.get("action");
    try {
      if (action === "webhook") {
        const raw = await boundedText(request, 32768);
        if (raw.length > 32768 || !(await verifyWebhook(raw, request.headers, deps.webhookSecret)))
          return response(401, { error: "Invalid signature" });
        const event = JSON.parse(raw) as {
          type?: string;
          created_at?: string;
          data?: { email_id?: string };
        };
        const states: Record<string, string> = {
          "email.delivered": "delivered",
          "email.delivery_delayed": "delayed",
          "email.bounced": "bounced",
          "email.complained": "complained",
          "email.failed": "failed",
          "email.suppressed": "failed",
        };
        const status = states[event.type || ""];
        if (
          status &&
          event.data?.email_id &&
          event.created_at &&
          Number.isFinite(Date.parse(event.created_at))
        )
          await deps.rpc("gallery_email_event", {
            p_event: request.headers.get("svix-id"),
            p_provider: event.data.email_id,
            p_status: status,
            p_time: event.created_at,
          });
        return response(200, { received: true });
      }
      let jobId: string | null = null;
      if (action === "tick") {
        if (
          !(await sameSecret(request.headers.get("x-gallery-cron-secret") || "", deps.cronSecret))
        )
          return response(403, { error: "Scheduler authorization required" });
      } else if (action === "dispatch") {
        if (!(await deps.admin(request.headers.get("Authorization") || "")))
          return response(403, { error: "Administrator access required" });
        const raw = await boundedText(request, 1000);
        if (raw.length > 1000) return response(400, { error: "Invalid request" });
        const body = JSON.parse(raw) as { id?: string };
        if (!body.id || !uuid.test(body.id))
          return response(400, { error: "Valid job ID required" });
        jobId = body.id;
      } else return response(404, { error: "Unknown action" });
      if (!deps.enabled)
        return response(503, {
          error: "Sending disabled pending approved free-plan setup. Your saved email is retained.",
        });
      if (action === "tick") await deps.rpc("gallery_email_schedule");
      let processed = 0;
      const started = Date.now();
      while (processed < (jobId ? 1 : 20) && Date.now() - started < 65000) {
        const job = (await deps.rpc("gallery_email_claim", { p_id: jobId })) as {
          id: string;
          lease: string;
          snapshot: EmailSnapshot;
        } | null;
        if (!job) break;
        // Recheck after claim, immediately before the external send. Never trust browser payloads.
        const ready = await deps.rpc("gallery_email_ready", { p_id: job.id, p_lease: job.lease });
        if (ready !== true) break;
        let result = "uncertain",
          provider: string | null = null;
        try {
          const delivery = await deps.send(renderEmail(job.snapshot), "dept-gallery/" + job.id);
          if (delivery.status >= 200 && delivery.status < 300 && delivery.id) {
            result = "accepted";
            provider = delivery.id;
          } else if (delivery.status === 429) result = "quota";
          else if (delivery.status >= 400 && delivery.status < 500 && delivery.status !== 409)
            result = "failed";
        } catch {
          /* Network uncertainty keeps the same payload and key, never a new job. */
        }
        await deps.rpc("gallery_email_finish", {
          p_id: job.id,
          p_lease: job.lease,
          p_result: result,
          p_provider: provider,
        });
        processed++;
        if (result === "quota") break;
        if (deps.pause) await deps.pause();
      }
      return response(200, { processed });
    } catch {
      return response(503, {
        error:
          "Email service unavailable. Check email history before retrying; no new send was created.",
      });
    }
  };
}

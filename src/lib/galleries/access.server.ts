import { GALLERY_PUBLIC_KEY, GALLERY_SUPABASE_URL } from "./config";
import { galleryMedia } from "./media.server";
import { validDeliveryUrl } from "../../../supabase/functions/_shared/gallery-validation";
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
async function rpc(name: string, args: Record<string, unknown>) {
  const response = await fetch(`${GALLERY_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: GALLERY_PUBLIC_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Gallery service unavailable");
  return response.json();
}
export async function galleryAccessRequest(request: Request, slug: string) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const reply = (body: unknown, status = 200, cookie?: string) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, ...(cookie ? { "Set-Cookie": cookie } : {}) },
    });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
    return reply({ error: "Invalid gallery link" }, 400);
  if (url.protocol !== "https:" && !local) return reply({ error: "HTTPS required" }, 400);
  const token =
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)dg_gallery_session=([a-f0-9]{64})(?:;|$)/)?.[1] || null;
  const cookie = (value: string, age: number) =>
    `dg_gallery_session=${value}; Path=/api/galleries/${slug}; HttpOnly; SameSite=Strict; Max-Age=${age}${local ? "" : "; Secure"}`;
  try {
    if (request.method === "GET") {
      if (url.searchParams.get("download") === "1") {
        const result = await galleryMedia("download", slug, token);
        if (!result.url || !validDeliveryUrl(result.url))
          return reply({ error: "Download unavailable" }, 403);
        return new Response(null, {
          status: 303,
          headers: { ...headers, Location: result.url, "Referrer-Policy": "no-referrer" },
        });
      }
      return reply(await galleryMedia("resolve", slug, token));
    }
    if (request.headers.get("origin") !== url.origin)
      return reply({ error: "Origin not allowed" }, 403);
    if (request.method === "DELETE") {
      if (token) await rpc("gallery_lock", { p_token: token });
      return reply({ state: "locked" }, 200, cookie("", 0));
    }
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply({ error: "JSON required" }, 415);
    // Bound streamed input as well as Content-Length; never log passwords or session tokens.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Password required" }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return reply({ error: "Request too large" }, 413);
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return reply({ error: "Invalid request" }, 400);
    }
    if (
      !data ||
      typeof data.password !== "string" ||
      new TextEncoder().encode(data.password).length > 72
    )
      return reply({ state: "invalid" }, 400);
    const result = await rpc("gallery_unlock", { p_slug: slug, p_password: data.password });
    if (result.state !== "unlocked")
      return reply({ state: result.state }, result.state === "rate-limited" ? 429 : 200);
    // Bearer token stays in an HttpOnly, short-lived cookie, never returned to frontend JS.
    const age = Math.max(
      0,
      Math.min(900, Math.floor((Date.parse(result.expires_at) - Date.now()) / 1000)),
    );
    const media = await galleryMedia("resolve", slug, result.token);
    if (!media.gallery) return reply({ state: "expired" }, 200, cookie("", 0));
    return reply({ state: "unlocked", gallery: media.gallery }, 200, cookie(result.token, age));
  } catch {
    return reply({ error: "Gallery service is not ready. Please try again later." }, 503);
  }
}

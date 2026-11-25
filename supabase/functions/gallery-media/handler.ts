import { validatePreview, validDeliveryUrl } from "../_shared/gallery-validation.ts";
// Structural boundary makes the privileged handler testable without secrets or a live database.
export interface Backend {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: any; error: any }>;
  storage: {
    from(bucket: string): {
      createSignedUrls(paths: string[], ttl: number): PromiseLike<{ data: any; error: any }>;
      upload(
        path: string,
        bytes: Uint8Array,
        options: Record<string, unknown>,
      ): Promise<{ error: any }>;
      remove(paths: string[]): Promise<{ error: any }>;
    };
  };
}
export interface Dependencies {
  backend: Backend;
  admin: (bearer: string) => Promise<string | null>;
  directory: () => Promise<{ slug: string }[]>;
  decode: (bytes: Uint8Array) => void;
}
const bucket = "dept-gallery-previews";
const keyPattern = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const origins = new Set([
  "https://thedeptcollective.com",
  "https://www.thedeptcollective.com",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);
export function createGalleryHandler(deps: Dependencies) {
  async function rpc(name: string, args: Record<string, unknown> = {}) {
    const { data, error } = await deps.backend.rpc(name, args);
    if (error) throw new Error(error.message || "Gallery operation failed");
    return data;
  }
  async function manifest(slug: string, token: string | null, actor: string | null) {
    return rpc("gallery_media_manifest", { p_slug: slug, p_token: token, p_actor: actor });
  }
  async function present(result: any, coverOnly = false) {
    if (!result.gallery || result.ttl < 1) return { state: "locked" };
    const raw = result.gallery;
    const records = coverOnly
      ? raw.photos.filter((p: any) => p.id === raw.cover_photo_id)
      : raw.photos;
    let signed: any[] = [];
    if (records.length) {
      if (records.some((p: any) => !keyPattern.test(p.key)))
        throw new Error("Invalid preview reference");
      const response = await deps.backend.storage.from(bucket).createSignedUrls(
        records.map((p: any) => p.key),
        Math.min(120, result.ttl),
      );
      if (
        response.error ||
        !response.data ||
        response.data.some((p: any) => p.error || !p.signedUrl)
      )
        throw new Error("Preview service unavailable");
      signed = response.data;
    }
    const photos = records.map(({ key, ...p }: any, i: number) => ({
      ...p,
      preview_url: signed[i].signedUrl,
    }));
    const { cover_photo_id, ...safe } = raw;
    return {
      state: result.state,
      gallery: {
        ...safe,
        photos: coverOnly ? [] : photos,
        cover: photos.find((p: any) => p.id === cover_photo_id) || null,
        has_download: !!result.download_url,
      },
    };
  }
  async function cleanup() {
    const rows = await rpc("gallery_preview_cleanup");
    const safe = rows.filter((r: any) => keyPattern.test(r.preview_object_key));
    if (safe.length) {
      const { error } = await deps.backend.storage
        .from(bucket)
        .remove(safe.map((r: any) => r.preview_object_key));
      if (error) throw new Error("Preview cleanup is pending. Retry cleanup.");
      await rpc("gallery_preview_cleanup", { p_ack: safe.map((r: any) => r.id) });
    }
    return { removed: safe.length, pendingLegacy: rows.length - safe.length };
  }
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    };
    if (origin && origins.has(origin))
      Object.assign(headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers":
          "authorization,apikey,content-type,x-gallery-id,x-upload-id,x-replace-id,x-filename,x-original-bytes",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.has(origin)) return reply({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    const action = new URL(request.url).searchParams.get("action");
    try {
      const adminAction = ["upload", "preview", "cleanup"].includes(action || "");
      const actor = adminAction
        ? await deps.admin(request.headers.get("authorization") || "")
        : null;
      if (adminAction && !actor) return reply({ error: "Administrator access required" }, 403);
      if (action === "cleanup") return reply(await cleanup());
      if (action === "upload") {
        if (request.headers.get("content-type") !== "image/jpeg")
          return reply({ error: "JPEG required" }, 415);
        const gallery = request.headers.get("x-gallery-id") || "";
        const upload = request.headers.get("x-upload-id") || "";
        const replace = request.headers.get("x-replace-id");
        if (
          !uuidPattern.test(gallery) ||
          !uuidPattern.test(upload) ||
          (replace && !uuidPattern.test(replace))
        )
          return reply({ error: "Invalid upload identifiers" }, 400);
        const bytes = await boundedBody(request, 2097152);
        const dims = validatePreview(bytes);
        deps.decode(bytes); // Full bounded JPEG decoding; signature/header checks alone are insufficient.
        const filename = decodeURIComponent(request.headers.get("x-filename") || "");
        const original = Number(request.headers.get("x-original-bytes"));
        if (
          !filename ||
          filename.length > 255 ||
          /[\x00-\x1f]/.test(filename) ||
          !Number.isSafeInteger(original) ||
          original < 1 ||
          original > 83886080
        )
          return reply({ error: "Invalid photo metadata" }, 400);
        const reservation = await rpc("gallery_preview_reserve", {
          p_actor: actor,
          p_upload: upload,
          p_gallery: gallery,
          p_replace: replace,
          p_filename: filename,
          p_original: original,
          p_bytes: bytes.length,
          p_width: dims.width,
          p_height: dims.height,
        });
        if (reservation.completed) return reply({ photo_id: reservation.photo_id });
        // A retry may find a completed storage upload from a lost response. Never overwrite it.
        const stored = await deps.backend.storage
          .from(bucket)
          .upload(reservation.object_key, bytes, {
            contentType: "image/jpeg",
            cacheControl: "120",
            upsert: false,
          });
        if (stored.error && String(stored.error.statusCode) !== "409")
          throw new Error("Preview upload failed. Retry this file.");
        const id = await rpc("gallery_preview_finish", { p_actor: actor, p_upload: upload });
        return reply({ photo_id: id });
      }
      if (action === "directory") {
        const list = await deps.directory();
        const galleries = [];
        for (const row of list) {
          const result = await present(await manifest(row.slug, null, null), true);
          if ("gallery" in result) galleries.push(result.gallery);
        }
        return reply(galleries);
      }
      const input = JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096)));
      if (
        typeof input.slug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) ||
        input.slug.length > 100
      )
        return reply({ error: "Invalid gallery" }, 400);
      const token =
        typeof input.token === "string" && /^[a-f0-9]{64}$/.test(input.token) ? input.token : null;
      const result = await manifest(input.slug, token, actor);
      if (action === "download") {
        if (
          !result.gallery ||
          result.ttl < 1 ||
          !result.download_url ||
          !validDeliveryUrl(result.download_url)
        )
          return reply({ error: "Download unavailable" }, 403);
        return reply({ url: result.download_url });
      }
      if (action === "resolve" || action === "preview") return reply(await present(result));
      return reply({ error: "Unknown operation" }, 400);
    } catch (error) {
      // Do not leak storage paths, SQL details, tokens, or delivery URLs through errors.
      return reply(
        {
          error:
            error instanceof RangeError
              ? "File is too large."
              : "Gallery operation failed. Check setup and retry.",
        },
        error instanceof RangeError ? 413 : 400,
      );
    }
  };
}
export async function boundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > limit) {
      await reader.cancel();
      throw new RangeError("Too large");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.length;
  }
  return bytes;
}

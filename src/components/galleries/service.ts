import { supabase } from "@/lib/screening/supabase";
import { GALLERY_PUBLIC_KEY, GALLERY_SUPABASE_URL } from "@/lib/galleries/config";
import type { Gallery, GalleryService, Photo } from "./types";
export interface ManagedGallery extends Gallery {
  revision: number;
  photos: Photo[];
  passwordConfigured: boolean;
  passwordRequired?: boolean;
  shareKey?: string | null;
  download_url?: string | null;
  downloads_enabled?: boolean;
}
export function galleryError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === "PGRST202" || e?.code === "42P01")
    return "Gallery database setup is not installed yet. Apply the gallery migration before continuing.";
  if (e?.code === "23505") return "That gallery link is already in use. Choose another slug.";
  if (e?.code === "42501") return "Your account does not have gallery administrator access.";
  return e?.message || "Unable to reach the gallery service. Please try again.";
}
async function access(slug: string, method = "GET", password?: string, signal?: AbortSignal) {
  const response = await fetch("/api/galleries/" + encodeURIComponent(slug), {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(password !== undefined ? { body: JSON.stringify({ password }) } : {}),
    ...(signal ? { signal } : {}),
  });
  const result = await response.json();
  if (!response.ok && response.status !== 429)
    throw new Error(result.error || "Gallery unavailable");
  return result;
}
export const galleryService: GalleryService = {
  async listPublic(signal) {
    const response = await fetch("/api/galleries/", {
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) throw new Error("The gallery directory is not available yet.");
    return response.json();
  },
  resolve: (slug, signal) => access(slug, "GET", undefined, signal),
  unlock: (slug, password, signal) => access(slug, "POST", password, signal),
  async requestDownload() {
    throw new Error(
      "Use Download Photos on the collection page to open its authorized UGREEN share.",
    );
  },
};
export const lockGallery = (slug: string) => access(slug, "DELETE");
async function adminRpc(name: string, args?: Record<string, unknown>) {
  if (!supabase) throw new Error("Sign in to manage galleries.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(galleryError(error));
  return data;
}
export const galleryAdminService = {
  list: async (): Promise<ManagedGallery[]> => adminRpc("gallery_admin_list"),
  save: async (g: ManagedGallery, password?: string): Promise<string> =>
    adminRpc("gallery_save_access", {
      p_gallery: {
        id: g.id,
        slug: g.slug,
        title: g.title,
        description: g.description,
        category: g.category,
        visibility: g.visibility,
        status: g.status,
        expires_at: g.expires_at,
        sort_order: g.sort_order,
        cover_photo_id: g.cover_photo_id,
        revision: g.revision,
        password_required: g.passwordRequired ?? true,
        ...(g.download_url !== undefined
          ? { download_url: g.download_url, downloads_enabled: g.downloads_enabled || false }
          : {}),
      },
      p_password: password || null,
    }),
  delete: (g: ManagedGallery) => adminRpc("gallery_delete", { p_id: g.id, p_revision: g.revision }),
  reorder: (g: ManagedGallery, ids: string[]) =>
    adminRpc("gallery_photo_manage", { p_gallery_id: g.id, p_revision: g.revision, p_order: ids }),
  deletePhoto: (g: ManagedGallery, id: string) =>
    adminRpc("gallery_photo_manage", { p_gallery_id: g.id, p_revision: g.revision, p_delete: id }),
};

export async function adminMedia(action: string, data: Record<string, unknown> = {}) {
  const { data: auth } = await supabase!.auth.getSession();
  if (!auth.session) throw new Error("Sign in to manage previews.");
  const response = await fetch(
    `${GALLERY_SUPABASE_URL}/functions/v1/gallery-media?action=${action}`,
    {
      method: "POST",
      headers: {
        apikey: GALLERY_PUBLIC_KEY,
        Authorization: `Bearer ${auth.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Preview service is not ready yet.");
  return result;
}
export async function uploadPreview(
  galleryId: string,
  uploadId: string,
  file: File,
  preview: Blob,
  progress: (value: number) => void,
  replaceId?: string,
) {
  const { data: auth } = await supabase!.auth.getSession();
  if (!auth.session) throw new Error("Sign in before uploading.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${GALLERY_SUPABASE_URL}/functions/v1/gallery-media?action=upload`);
    xhr.timeout = 120000;
    const headers: Record<string, string> = {
      apikey: GALLERY_PUBLIC_KEY,
      Authorization: `Bearer ${auth.session!.access_token}`,
      "Content-Type": "image/jpeg",
      "X-Gallery-Id": galleryId,
      "X-Upload-Id": uploadId,
      "X-Filename": encodeURIComponent(file.name),
      "X-Original-Bytes": String(file.size),
    };
    if (replaceId) headers["X-Replace-Id"] = replaceId;
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 95));
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(new Error("Connection interrupted. Retry this file."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        progress(100);
        resolve();
      } else reject(new Error("Upload was not saved. Check gallery setup and retry."));
    };
    xhr.send(preview);
  });
}

export async function unlockGalleryLink(slug: string, shareKey: string, signal: AbortSignal) {
  const response = await fetch("/api/galleries/" + encodeURIComponent(slug), {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareKey }),
    signal,
  });
  if (!response.ok) throw new Error("Gallery link unavailable");
  const result = await response.json();
  return result.state === "unlocked"
    ? { state: "authorized" as const, gallery: result.gallery }
    : { state: "locked" as const };
}

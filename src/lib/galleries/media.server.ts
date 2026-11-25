import { GALLERY_PUBLIC_KEY, GALLERY_SUPABASE_URL } from "./config";
export async function galleryMedia(
  action: "resolve" | "directory" | "download",
  slug?: string,
  token?: string | null,
) {
  const response = await fetch(
    `${GALLERY_SUPABASE_URL}/functions/v1/gallery-media?action=${action}`,
    {
      method: "POST",
      headers: { apikey: GALLERY_PUBLIC_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ slug, token }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Gallery media is not configured or access was denied.");
  return response.json();
}
export async function galleryDirectoryRequest() {
  try {
    return Response.json(await galleryMedia("directory"), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Gallery previews are not ready yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

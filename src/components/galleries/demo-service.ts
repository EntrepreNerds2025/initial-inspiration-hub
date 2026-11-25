import type { Gallery, GalleryAccess, GalleryService, GalleryView, PhotoPreview } from "./types";
import { isPublicGallery } from "./types";
import assets from "./sample-assets.json";
const captions: Record<string, string> = {
  "coast-01": "Dark coastal rocks surrounded by mist and ocean surf",
  "coast-02": "Waves rolling toward a distant coastline under a cloudy sky",
  "coast-03": "Coastal cliffs disappearing into ocean mist",
  "form-01": "Concrete facade with a repeating arrangement of windows",
  "form-02": "Curved concrete facade with repeating windows",
  "form-03": "A rhythm of concrete pillars along a modern building",
};
export const samplePhotos: PhotoPreview[] = assets.map((a) => ({
  ...a,
  filename: a.id + ".webp",
  alt: captions[a.id] || "Architecture and landscape sample photograph",
  credit_url: a.source,
}));
export const sampleRecords: Gallery[] = [
  {
    id: "g-coast",
    slug: "where-the-water-meets",
    title: "Where the water meets.",
    description:
      "A study in distance, weather and the quiet between waves. An illustrative collection of publicly licensed photographs, selected only to demonstrate the gallery experience.",
    category: "LANDSCAPE / STUDY 01",
    cover_photo_id: "coast-01",
    visibility: "public",
    status: "published",
    created_at: "2026-11-18T00:00:00Z",
    expires_at: null,
    sort_order: 0,
  },
  {
    id: "g-form",
    slug: "the-shape-of-silence",
    title: "The shape of silence.",
    description:
      "Lines, repetition and the way light gives structure a different life. Sample architecture photography for design review; not commissioned work by The Dept Collective.",
    category: "ARCHITECTURE / STUDY 02",
    cover_photo_id: "form-02",
    visibility: "public",
    status: "published",
    created_at: "2026-11-18T00:00:00Z",
    expires_at: null,
    sort_order: 1,
  },
  {
    id: "g-private",
    slug: "private-preview",
    title: "Client collection — sample",
    description:
      "A private-gallery layout preview using the same public sample photographs. No client content is present.",
    category: "PRIVATE DEMO",
    cover_photo_id: "coast-02",
    visibility: "private",
    status: "published",
    created_at: "2026-11-18T00:00:00Z",
    expires_at: null,
    sort_order: 2,
  },
  {
    id: "g-draft",
    slug: "draft-preview",
    title: "Unpublished collection — sample",
    description: "Sample draft",
    category: "STUDY",
    cover_photo_id: null,
    visibility: "public",
    status: "draft",
    created_at: "2026-11-18T00:00:00Z",
    expires_at: null,
    sort_order: 3,
  },
  {
    id: "g-expired",
    slug: "expired-preview",
    title: "Expired collection — sample",
    description: "Sample expired gallery",
    category: "PRIVATE DEMO",
    cover_photo_id: null,
    visibility: "private",
    status: "expired",
    created_at: "2026-11-18T00:00:00Z",
    expires_at: "2020-01-01T00:00:00Z",
    sort_order: 4,
  },
];
export function sampleView(g: Gallery): GalleryView {
  const photos = samplePhotos.filter((p) => p.id.startsWith(g.id === "g-form" ? "form" : "coast"));
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    description: g.description,
    category: g.category,
    cover: photos.find((p) => p.id === g.cover_photo_id) || photos[0] || null,
    photos,
    sample: true,
  };
}
function pause(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 450);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
/** Synthetic fixtures ONLY. This is NOT authentication. Never add private content here. */
export const galleryService: GalleryService = {
  async listPublic(signal) {
    await pause(signal);
    return sampleRecords
      .filter((g) => isPublicGallery(g))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(sampleView);
  },
  async resolve(slug, signal): Promise<GalleryAccess> {
    await pause(signal);
    const g = sampleRecords.find((x) => x.slug === slug);
    if (!g || g.status === "draft") return { state: "not-found" };
    if (g.status === "expired" || (g.expires_at && Date.parse(g.expires_at) <= Date.now()))
      return { state: "expired" };
    if (g.visibility === "private") return { state: "locked" };
    return { state: "public", gallery: sampleView(g) };
  },
  async unlock(slug, _discardedPassword, signal) {
    await pause(signal);
    const g = sampleRecords.find((x) => x.slug === slug);
    if (!g || g.status === "expired") return { state: "expired" };
    if (g.id !== "g-private") return { state: "invalid" };
    return { state: "unlocked", gallery: sampleView(g) };
  },
  async requestDownload() {
    throw new Error(
      "Demo only. Original files and download delivery are not connected. Preview images are never substituted for originals.",
    );
  },
};

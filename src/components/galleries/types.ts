/** Persistent domain models for Phase 2. Never return these directly to public clients. */
export interface Gallery {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  cover_photo_id: string | null;
  visibility: "public" | "private";
  status: "draft" | "published" | "expired";
  created_at: string;
  expires_at: string | null;
  sort_order: number;
}
export interface Photo {
  id: string;
  gallery_id: string;
  filename: string;
  original_object_key?: string | null;
  preview_object_key?: string;
  preview_file_size?: number;
  width: number;
  height: number;
  original_file_size: number;
  content_type: string;
  sort_order: number;
  created_at: string;
}
/** Authorized presentation DTO: storage keys and credentials never belong in this shape. */
export interface PhotoPreview {
  id: string;
  filename: string;
  preview_url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  alt: string;
  credit_url: string;
  preview_bytes: number;
}
export interface GalleryView {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  cover: PhotoPreview | null;
  photos: PhotoPreview[];
  sample: boolean;
  photo_count?: number;
  has_download?: boolean;
}
export type GalleryAccess =
  | { state: "public" | "authorized"; gallery: GalleryView }
  | { state: "locked" | "expired" | "not-found" };
export interface DownloadTicket {
  url: string;
  filename: string;
  expires_at: string;
}
/** Phase 2 transport contract. Server enforces ownership/authorization for EVERY request. */
export interface GalleryService {
  listPublic(signal?: AbortSignal): Promise<GalleryView[]>;
  resolve(slug: string, signal?: AbortSignal): Promise<GalleryAccess>;
  unlock(
    slug: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<
    { state: "unlocked"; gallery: GalleryView } | { state: "invalid" | "expired" | "rate-limited" }
  >;
  requestDownload(galleryId: string, photoId?: string): Promise<DownloadTicket>;
}
export function isPublicGallery(g: Gallery, now = Date.now()) {
  return (
    g.visibility === "public" &&
    g.status === "published" &&
    (!g.expires_at || Date.parse(g.expires_at) > now)
  );
}

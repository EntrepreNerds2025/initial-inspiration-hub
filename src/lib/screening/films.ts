export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "viewer";
  is_active: boolean;
};
export type Project = { id: string; title: string; description: string };
export type Category = { id: string; name: string; slug: string; sort_order: number };
export type Film = {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  youtube_url: string;
  youtube_video_id: string;
  provider: string;
  provider_video_id: string;
  thumbnail_url: string;
  backdrop_url: string;
  year: number;
  runtime: number;
  category_id: string | null;
  content_type: string;
  status: string;
  project_id: string | null;
  version_name: string;
  version_number: number;
  is_featured: boolean;
  is_draft: boolean;
  is_published: boolean;
  creator: string;
  creator_note?: string;
  display_status?: string;
  created_at: string;
  updated_at: string;
};
export type Feedback = {
  id: string;
  video_id: string;
  user_id: string;
  author_name: string;
  comment: string;
  timestamp_seconds: number | null;
  created_at: string;
};
export function youtubeId(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "");
    const id =
      host === "youtu.be"
        ? u.pathname.split("/")[1]
        : ["youtube.com", "youtube-nocookie.com"].includes(host)
          ? u.searchParams.get("v") ||
            (/^\/(embed|shorts|live)\//.test(u.pathname) ? u.pathname.split("/")[2] : null)
          : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function playerUrl(film: Film, seconds = 0): string | null {
  const id = film.provider_video_id || film.youtube_video_id;
  if (film.provider !== "youtube" || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&start=${Math.max(0, Math.floor(seconds))}`;
}
export function parseTimestamp(input: string): number | null {
  if (!input.trim()) return null;
  if (!/^\d{1,3}:[0-5]\d$/.test(input)) throw new Error("Use a timestamp like 02:14.");
  const [m = 0, s = 0] = input.split(":").map(Number);
  return m * 60 + s;
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function imageUrl(f: Film) {
  return f.thumbnail_url || `https://i.ytimg.com/vi/${f.youtube_video_id}/hqdefault.jpg`;
}
export function safeImage(url: string) {
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

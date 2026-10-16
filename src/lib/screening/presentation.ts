import type { Category, Film } from "./films";
export const statusLabels: Record<string, string> = {
  final: "FINAL",
  draft: "WIP",
  rough_cut: "ROUGH CUT",
  fine_cut: "ALMOST THERE",
  private_preview: "UNRELEASED",
  first_cut: "FIRST CUT",
  in_edit: "IN EDIT",
  experiment: "EXPERIMENT",
  archive: "ARCHIVE",
  needs_feedback: "NEEDS FEEDBACK",
};
export function statusLabel(f: Film) {
  return f.display_status || statusLabels[f.status] || f.status.replaceAll("_", " ").toUpperCase();
}
export function firstName(name: string) {
  return name.trim().split(/[\s.@_]+/)[0] || "friend";
}
export function isBehindScenes(f: Film, categories: Category[]) {
  const c = categories.find((c) => c.id === f.category_id);
  return (
    /^(bts|behind[- ]the[- ]scenes)$/i.test(c?.slug || "") ||
    /behind the scenes|production diar|camera test|outtakes/i.test(c?.name || "")
  );
}
export function featuredFilm(films: Film[]) {
  return films.find((f) => f.is_featured) || films.find((f) => !f.is_draft && f.status === "final");
}

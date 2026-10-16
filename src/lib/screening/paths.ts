export const SCREENING_BASE = "/screening-room";
export function safeScreeningNext(value: string | null | undefined): string {
  if (!value || /[\\\r\n]/.test(value)) return SCREENING_BASE;
  try {
    const u = new URL(value, "https://screening.invalid");
    if (
      u.origin !== "https://screening.invalid" ||
      !(u.pathname === SCREENING_BASE || u.pathname.startsWith(SCREENING_BASE + "/")) ||
      /\/(login|callback)\/?$/.test(u.pathname)
    )
      return SCREENING_BASE;
    return u.pathname + u.search;
  } catch {
    return SCREENING_BASE;
  }
}
export function screeningLoginPath(next: string) {
  return `${SCREENING_BASE}/login?next=${encodeURIComponent(safeScreeningNext(next))}`;
}
export function screeningCallback(origin: string, next: string = SCREENING_BASE) {
  return `${origin}${SCREENING_BASE}/callback?next=${encodeURIComponent(safeScreeningNext(next))}`;
}
export function screeningPage(path: string) {
  const suffix = path.slice(SCREENING_BASE.length).replace(/^\/+|\/+$/g, "");
  return suffix === ""
    ? "home"
    : ["screening", "drafts", "search", "admin", "my-list", "collections"].includes(suffix)
      ? suffix
      : suffix.startsWith("films/")
        ? "film"
        : "missing";
}

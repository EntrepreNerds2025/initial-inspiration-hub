import { describe, it, expect } from "vitest";
import { featuredFilm, isBehindScenes, firstName, statusLabel } from "@/lib/screening/presentation";
import type { Film } from "@/lib/screening/films";
const film = (fields: Partial<Film>) => ({ status: "final", is_draft: false, ...fields }) as Film;
describe("private cinema organization", () => {
  it("prefers featured work, otherwise newest finished release without inventing a draft hero", () => {
    const draft = film({ id: "draft", is_draft: true, status: "rough_cut" }),
      final = film({ id: "final" });
    expect(featuredFilm([draft, final])).toBe(final);
    expect(featuredFilm([draft])).toBeUndefined();
    expect(featuredFilm([final, { ...draft, is_featured: true }])?.id).toBe("draft");
  });
  it("uses explicit BTS categories, not arbitrary film title guesses", () => {
    const f = film({ category_id: "bts" });
    expect(
      isBehindScenes(f, [
        { id: "bts", name: "Behind the Scenes", slug: "behind-the-scenes", sort_order: 0 },
      ]),
    ).toBe(true);
    expect(isBehindScenes(f, [])).toBe(false);
  });
  it("maps legacy status and supports editorial labels without changing production status", () => {
    expect(statusLabel(film({ status: "draft" }))).toBe("WIP");
    expect(statusLabel(film({ display_status: "NEEDS FEEDBACK" }))).toBe("NEEDS FEEDBACK");
    expect(firstName("riann.grant")).toBe("riann");
  });
});

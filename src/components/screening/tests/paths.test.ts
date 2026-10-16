import { describe, it, expect } from "vitest";
import { safeScreeningNext, screeningCallback, screeningPage } from "@/lib/screening/paths";
describe("safe screening routes", () => {
  it.each([
    "https://evil.test/",
    "//evil.test/",
    "/start",
    "/screening-room/login",
    "/screening-room/callback",
    "/screening-room/../../start",
    "/screening-room\\evil",
    "/screening-room-else",
  ])("rejects invalid return target %s", (value) =>
    expect(safeScreeningNext(value)).toBe("/screening-room"),
  );
  it("retains a screening deep link", () =>
    expect(safeScreeningNext("/screening-room/films/abc")).toBe("/screening-room/films/abc"));
  it("uses same-origin callback", () =>
    expect(screeningCallback("https://www.thedeptcollective.com")).toBe(
      "https://www.thedeptcollective.com/screening-room/callback?next=%2Fscreening-room",
    ));
  it("maps private subroutes", () => {
    expect(screeningPage("/screening-room")).toBe("home");
    expect(screeningPage("/screening-room/films/abc")).toBe("film");
    expect(screeningPage("/screening-room/admin")).toBe("admin");
    expect(screeningPage("/screening-room/unknown")).toBe("missing");
  });
});

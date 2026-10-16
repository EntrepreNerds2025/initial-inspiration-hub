import { describe, it, expect } from "vitest";
import { youtubeId, parseTimestamp, playerUrl, type Film } from "@/lib/screening/films";
describe("YouTube provider input boundary", () => {
  it.each([
    "https://youtu.be/aqz-KE-bpKQ?t=20",
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtube.com/shorts/aqz-KE-bpKQ",
    "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
  ])("accepts supported URL %s", (url) => expect(youtubeId(url)).toBe("aqz-KE-bpKQ"));
  it.each([
    "https://evil.example/watch?v=aqz-KE-bpKQ",
    "https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ",
    "javascript:alert(1)",
    "https://youtu.be/short",
    "not a URL",
  ])("rejects invalid input %s", (url) => expect(youtubeId(url)).toBeNull());
  it("does not embed unsupported providers", () =>
    expect(playerUrl({ provider: "vimeo", provider_video_id: "123" } as Film)).toBeNull());
  it("uses privacy enhanced playback without autoplay", () => {
    const url = playerUrl({ provider: "youtube", provider_video_id: "aqz-KE-bpKQ" } as Film, 134)!;
    expect(url).toContain("youtube-nocookie.com");
    expect(url).toContain("start=134");
    expect(url).not.toContain("autoplay");
  });
});
describe("feedback timestamps", () => {
  it("parses an optional timestamp", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("02:14")).toBe(134);
  });
  it.each(["2:99", "-1:20", "abc", "2000:00"])("rejects %s", (v) =>
    expect(() => parseTimestamp(v)).toThrow(),
  );
});

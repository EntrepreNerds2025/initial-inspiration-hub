import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { galleryService, samplePhotos, sampleRecords } from "../demo-service";
import { isPublicGallery } from "../types";
import { GalleryLightbox } from "../GalleryLightbox";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function settle<T>(promise: Promise<T>) {
  await vi.runAllTimersAsync();
  return promise;
}
describe("gallery demo boundaries", () => {
  it("lists only published, unexpired public samples", async () => {
    vi.useFakeTimers();
    const result = await settle(galleryService.listPublic());
    expect(result.map((g) => g.id)).toEqual(["g-coast", "g-form"]);
  });
  it("returns no metadata for locked and expired collections", async () => {
    vi.useFakeTimers();
    expect(await settle(galleryService.resolve("private-preview"))).toEqual({ state: "locked" });
    expect(await settle(galleryService.resolve("expired-preview"))).toEqual({ state: "expired" });
  });
  it("does not expose drafts or unknown galleries", async () => {
    vi.useFakeTimers();
    for (const slug of ["draft-preview", "missing"])
      expect(await settle(galleryService.resolve(slug))).toEqual({ state: "not-found" });
  });
  it("excludes expired public records as well as private ones", () => {
    expect(isPublicGallery({ ...sampleRecords[0]!, expires_at: "2020-01-01" })).toBe(false);
    expect(isPublicGallery(sampleRecords[2]!)).toBe(false);
  });
  it("never substitutes preview files for original downloads", async () => {
    await expect(galleryService.requestDownload("g-coast", "coast-01")).rejects.toThrow(
      "Preview images are never substituted",
    );
  });
  it("cancels obsolete reads", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      galleryService.resolve("private-preview", controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("only unlocks the synthetic demo collection", async () => {
    vi.useFakeTimers();
    expect((await settle(galleryService.unlock("private-preview", "sample"))).state).toBe(
      "unlocked",
    );
    expect((await settle(galleryService.unlock("missing", "sample"))).state).toBe("expired");
  });
});
it("supports keyboard next, previous, and closing the lightbox", () => {
  function Harness() {
    const [index, setIndex] = useState<number | null>(0);
    return (
      <GalleryLightbox
        photos={samplePhotos.slice(0, 3)}
        index={index}
        setIndex={setIndex}
        download={() => {}}
        message=""
        busy={false}
      />
    );
  }
  render(<Harness />);
  expect(screen.getByRole("img").getAttribute("alt")).toBe(samplePhotos[0]!.alt);
  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(screen.getByRole("img").getAttribute("alt")).toBe(samplePhotos[1]!.alt);
  fireEvent.keyDown(document, { key: "ArrowLeft" });
  expect(screen.getByRole("img").getAttribute("alt")).toBe(samplePhotos[0]!.alt);
  fireEvent.click(screen.getByRole("button", { name: "Close photo" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

import { afterEach, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GalleryUpload } from "../GalleryUpload";
import { optimizeGalleryPhoto } from "@/lib/galleries/optimize";
import { uploadPreview } from "../service";
vi.mock("@/lib/galleries/optimize", () => ({ optimizeGalleryPhoto: vi.fn() }));
vi.mock("../service", () => ({ uploadPreview: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("uploads only the optimized preview and refreshes saved records", async () => {
  const preview = new Blob(["optimized"], { type: "image/jpeg" });
  vi.mocked(optimizeGalleryPhoto).mockResolvedValue(preview);
  vi.mocked(uploadPreview).mockResolvedValue();
  const saved = vi.fn().mockResolvedValue(undefined);
  render(<GalleryUpload galleryId="gallery" onSaved={saved} />);
  const original = new File(["full resolution"], "original.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Select photos"), { target: { files: [original] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload / retry remaining" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(uploadPreview).toHaveBeenCalledWith(
    "gallery",
    expect.any(String),
    original,
    preview,
    expect.any(Function),
    undefined,
  );
  expect(screen.getByText(/Saved — original remains/)).toBeInTheDocument();
});
it("reports failed uploads and permits retry without re-uploading successes", async () => {
  vi.mocked(optimizeGalleryPhoto).mockResolvedValue(new Blob(["small"]));
  vi.mocked(uploadPreview)
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockResolvedValueOnce();
  render(<GalleryUpload galleryId="gallery" onSaved={async () => {}} />);
  fireEvent.change(screen.getByLabelText("Select photos"), {
    target: { files: [new File(["a"], "one.jpg", { type: "image/jpeg" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload / retry remaining" }));
  await screen.findByText("Connection interrupted");
  fireEvent.click(screen.getByRole("button", { name: "Upload / retry remaining" }));
  await screen.findByText(/Saved — original remains/);
  expect(optimizeGalleryPhoto).toHaveBeenCalledTimes(1);
  expect(vi.mocked(uploadPreview).mock.calls[0]![1]).toBe(
    vi.mocked(uploadPreview).mock.calls[1]![1],
  );
});

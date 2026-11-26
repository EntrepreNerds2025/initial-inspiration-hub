import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GalleryEmail } from "../GalleryEmail";
import { galleryEmailService } from "../email-service";
import { defaultEmailDraft } from "../../../../supabase/functions/_shared/gallery-email";
import type { ManagedGallery } from "../service";
vi.mock("../email-service", () => ({
  galleryEmailService: { load: vi.fn(), save: vi.fn(), enqueue: vi.fn(), dispatch: vi.fn() },
}));
const gallery: ManagedGallery = {
  id: "test",
  slug: "test",
  title: "A collection",
  description: "",
  category: "Portrait",
  cover_photo_id: null,
  visibility: "private",
  status: "published",
  created_at: new Date().toISOString(),
  expires_at: null,
  sort_order: 0,
  revision: 1,
  photos: [],
  passwordConfigured: true,
};
const draft = { ...defaultEmailDraft, recipient: "client@example.test", client_name: "Client" };
const state = {
  settings: { draft, revision: 1 },
  controls: {
    enabled: true,
    verified_until: "2099-01-01",
    daily_limit: 80,
    monthly_limit: 2400,
    blocked_until: null,
    last_run: null,
  },
  daily_used: 0,
  monthly_used: 0,
  history: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(galleryEmailService.load).mockResolvedValue(state);
  vi.mocked(galleryEmailService.enqueue).mockResolvedValue("job");
});
afterEach(cleanup);
it("does not send on load or preview, then requires explicit confirmation", async () => {
  render(<GalleryEmail gallery={gallery} />);
  await screen.findByDisplayValue("client@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Preview email" }));
  expect(screen.getByTitle("Branded gallery email preview")).toBeTruthy();
  expect(galleryEmailService.enqueue).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send Gallery Email" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(galleryEmailService.dispatch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm send" }));
  await waitFor(() => expect(galleryEmailService.dispatch).toHaveBeenCalledWith("job"));
});
it("keeps preview available and sending disabled when migration is missing", async () => {
  vi.mocked(galleryEmailService.load).mockRejectedValue(
    new Error("Email setup is pending approval."),
  );
  render(<GalleryEmail gallery={gallery} />);
  await screen.findByText(/LOCAL PREVIEW/);
  expect(screen.getByRole("button", { name: "Send Gallery Email" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save email & reminders" })).toBeDisabled();
  expect(galleryEmailService.enqueue).not.toHaveBeenCalled();
});
it("requires save after edits and never sends when saving", async () => {
  render(<GalleryEmail gallery={gallery} />);
  await screen.findByDisplayValue("client@example.test");
  fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "New client" } });
  expect(screen.getByRole("button", { name: "Send Gallery Email" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Save email & reminders" }));
  await waitFor(() => expect(galleryEmailService.save).toHaveBeenCalled());
  expect(galleryEmailService.enqueue).not.toHaveBeenCalled();
});
it("keeps drafts and expired galleries unsendable", async () => {
  render(<GalleryEmail gallery={{ ...gallery, status: "draft" }} />);
  await screen.findByDisplayValue("client@example.test");
  expect(screen.getByRole("button", { name: "Send Gallery Email" })).toBeDisabled();
});

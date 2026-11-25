import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
vi.mock("@/lib/screening/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    rpc: mocks.rpc,
  },
}));
import { GalleryAdminGate } from "../GalleryAdminGate";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(cleanup);
it("shows login instead of management when signed out", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  render(
    <GalleryAdminGate>
      <p>Private management</p>
    </GalleryAdminGate>,
  );
  expect(await screen.findByRole("button", { name: "Sign in ↗" })).toBeInTheDocument();
  expect(screen.queryByText("Private management")).toBeNull();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("denies signed-in viewers even if they have a session", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "viewer", email: "viewer@example.test" } } },
  });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  render(
    <GalleryAdminGate>
      <p>Private management</p>
    </GalleryAdminGate>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("not an authorized");
  expect(screen.queryByText("Private management")).toBeNull();
});
it("allows management only after server confirms role", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "admin", email: "admin@example.test" } } },
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  render(
    <GalleryAdminGate>
      <p>Private management</p>
    </GalleryAdminGate>,
  );
  expect(await screen.findByText("Private management")).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledWith("is_gallery_admin");
});
it("fails closed when role verification fails", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "admin" } } } });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  render(
    <GalleryAdminGate>
      <p>Private management</p>
    </GalleryAdminGate>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("setup is not installed");
  expect(screen.queryByText("Private management")).toBeNull();
});

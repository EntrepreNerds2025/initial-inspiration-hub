import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  session: null as unknown,
  profile: null as unknown,
  listener: null as null | ((event: string, s: unknown) => void),
  queries: [] as string[],
  films: [] as unknown[],
  signIn: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/screening/supabase", () => ({
  APP_NAME: "THE SCREENING ROOM",
  configured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mock.session } }),
      onAuthStateChange: (fn: typeof mock.listener) => {
        mock.listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => {
        mock.session = null;
        mock.listener?.("SIGNED_OUT", null);
      },
      signInWithPassword: mock.signIn,
      resetPasswordForEmail: mock.reset,
      updateUser: mock.update,
    },
    from: (table: string) => {
      mock.queries.push(table);
      const result = {
        data: table === "profiles" ? mock.profile : table === "videos" ? mock.films : [],
        error: null,
      };
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single: async () => result,
        order: async () => result,
        then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
      };
    },
  },
}));
import { ScreeningGate } from "../ScreeningSection";
const film = {
  id: "film-1",
  title: "Private film title",
  is_published: true,
  is_draft: true,
  is_featured: true,
  year: 2026,
  runtime: 12,
  short_description: "Private description",
  description: "Private description",
  thumbnail_url: "https://example.com/a.jpg",
  backdrop_url: "https://example.com/a.jpg",
  content_type: "documentary",
  provider: "youtube",
  provider_video_id: "aqz-KE-bpKQ",
  youtube_video_id: "aqz-KE-bpKQ",
  created_at: "2026-10-15",
  version_name: "Draft",
  status: "draft",
  version_number: 1,
};
function member(role = "viewer", active = true) {
  mock.session = { user: { id: "viewer-1" } };
  mock.profile = {
    id: "viewer-1",
    role,
    is_active: active,
    display_name: "Guest",
    email: "test@example.com",
  };
  mock.films = [film];
}
function Harness({ initial = "/screening-room" }: { initial?: string }) {
  const [url, setUrl] = useState(initial);
  const u = new URL(url, "https://example.com");
  return (
    <>
      <output aria-label="Current route">{url}</output>
      <ScreeningGate path={u.pathname} search={u.search} go={(next) => setUrl(next)} />
    </>
  );
}
beforeEach(() => {
  mock.session = null;
  mock.profile = null;
  mock.films = [];
  mock.queries = [];
  mock.signIn.mockReset();
  mock.reset.mockReset();
  mock.update.mockReset();
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);
describe("screening access boundary", () => {
  it.each([
    "/screening-room",
    "/screening-room/drafts",
    "/screening-room/search",
    "/screening-room/films/film-1",
    "/screening-room/admin",
  ])("redirects guests without private queries: %s", async (path) => {
    render(<Harness initial={path} />);
    await screen.findByRole("button", { name: "Sign in" });
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/screening-room/login?next=");
    expect(mock.queries).toEqual([]);
    expect(screen.queryByText("Private film title")).not.toBeInTheDocument();
  });
  it("restores intended film after login", async () => {
    render(<Harness initial="/screening-room/films/film-1" />);
    await screen.findByRole("button", { name: "Sign in" });
    member();
    await act(async () => mock.listener?.("SIGNED_IN", mock.session));
    await screen.findByRole("heading", { name: "Private film title" });
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/screening-room/films/film-1",
    );
  });
  it("blocks nonmembers", async () => {
    member("viewer", false);
    render(<Harness />);
    await screen.findByRole("heading", { name: "Invitation required" });
    expect(mock.queries.every((t) => t === "profiles")).toBe(true);
  });
  it("denies a viewer directly entering admin", async () => {
    member();
    render(<Harness initial="/screening-room/admin" />);
    await screen.findByRole("heading", { name: "Administrator access required" });
    expect(screen.queryByRole("button", { name: "Add film" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Admin" })).not.toBeInTheDocument();
    expect(mock.queries.filter((t) => t === "profiles")).toHaveLength(1);
  });
  it("allows admin management and feedback tab", async () => {
    member("admin");
    render(<Harness initial="/screening-room/admin" />);
    await screen.findByRole("button", { name: "Add film" });
    fireEvent.click(screen.getByRole("button", { name: "feedback" }));
    await screen.findByRole("heading", { name: "Draft feedback" });
  });
  it("saves a film to My List and allows removing it", async () => {
    localStorage.clear();
    member();
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "+ My List" }));
    fireEvent.click(screen.getByRole("button", { name: "My List" }));
    await screen.findByRole("heading", { name: "My List" });
    expect(screen.getByRole("heading", { name: "Private film title" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Screening Room" }));
    fireEvent.click(await screen.findByRole("button", { name: "✓ My List" }));
    fireEvent.click(screen.getByRole("button", { name: "My List" }));
    await screen.findByText("Nothing here yet. Your extremely prestigious watchlist awaits.");
  });
  it("renders the private cinema with fixture content for isolated visual review", async () => {
    member();
    mock.films = [
      {
        ...film,
        title: "A closer look.",
        thumbnail_url: "https://www.thedeptcollective.com/media/dept-hero-poster.jpg",
        backdrop_url: "https://www.thedeptcollective.com/media/dept-hero-poster.jpg",
      },
      ...Array.from({ length: 5 }, (_, i) => ({
        ...film,
        id: "final-" + i,
        title: "Screening study " + (i + 1),
        is_featured: false,
        is_draft: false,
        status: "final",
        thumbnail_url: "https://www.thedeptcollective.com/media/dept-hero-poster.jpg",
      })),
    ];
    render(<Harness />);
    await screen.findByRole("button", { name: "Watch" });
    if (process.env["CINEMA_PREVIEW"]) {
      const fs = await import("node:fs/promises");
      const css =
        (await fs.readFile("src/components/screening/screening.css", "utf8")) +
        (await fs.readFile("src/components/screening/private-cinema.css", "utf8"));
      await fs.mkdir("/tmp/dept-cinema-preview", { recursive: true });
      await fs.copyFile(
        "src/assets/fonts/Satoshi-Variable.ttf",
        "/tmp/dept-cinema-preview/Satoshi-Variable.ttf",
      );
      await fs.copyFile(
        "src/assets/dept-logo-beige.png",
        "/tmp/dept-cinema-preview/dept-logo-beige.png",
      );
      await fs.writeFile(
        "/tmp/dept-cinema-preview/index.html",
        '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}' +
          css.replace("../../assets/fonts/Satoshi-Variable.ttf", "./Satoshi-Variable.ttf") +
          '</style><div class="screening-scope">' +
          document
            .querySelector(".screening-app")!
            .outerHTML.replaceAll("/src/assets/dept-logo-beige.png", "./dept-logo-beige.png") +
          "</div></html>",
      );
    }
  });
  it("clears metadata on logout and observed revocation", async () => {
    member();
    render(<Harness />);
    await screen.findByRole("button", { name: "Watch" });
    mock.profile = { id: "viewer-1", is_active: false };
    await act(async () => mock.listener?.("TOKEN_REFRESHED", mock.session));
    await screen.findByRole("heading", { name: "Invitation required" });
    expect(screen.queryByText("Private film title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    await screen.findByRole("button", { name: "Sign in" });
  });
  it("returns film versions and YouTube playback under the prefix", async () => {
    member();
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "Watch" }));
    await screen.findByTitle("Private film title");
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/screening-room/films/film-1",
    );
    expect(screen.getByTitle("Private film title")).toHaveAttribute(
      "src",
      expect.stringContaining("youtube-nocookie.com/embed/"),
    );
    await screen.findByRole("heading", { name: "Leave a note for Riann." });
  });
  it("returns reset emails to screening callback and preserves next", async () => {
    mock.reset.mockResolvedValue({ error: null });
    window.history.replaceState(null, "", "/screening-room/login?next=%2Fscreening-room%2Fdrafts");
    render(<Harness initial="/screening-room/login?next=%2Fscreening-room%2Fdrafts" />);
    fireEvent.click(await screen.findByRole("button", { name: "Forgot your password?" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "invited@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() =>
      expect(mock.reset).toHaveBeenCalledWith("invited@example.com", {
        redirectTo: expect.stringContaining(
          "/screening-room/callback?next=%2Fscreening-room%2Fdrafts",
        ),
      }),
    );
  });
  it("requires password setup at the callback, then returns to intended page", async () => {
    member();
    mock.update.mockResolvedValue({ error: null });
    render(<Harness initial="/screening-room/callback?next=%2Fscreening-room%2Fdrafts" />);
    await screen.findByRole("heading", { name: "Make yourself at home." });
    expect(mock.queries).toEqual(["profiles"]);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "a-long-test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password & enter" }));
    await screen.findByRole("heading", { name: "In the Cutting Room" });
  });
});

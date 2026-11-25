import { afterEach, describe, it, expect, vi } from "vitest";
import { galleryAccessRequest } from "@/lib/galleries/access.server";
afterEach(() => vi.unstubAllGlobals());
const origin = "https://www.thedeptcollective.com";
function req(method: string, body?: unknown, extra: Record<string, string> = {}) {
  return new Request(origin + "/api/galleries/client-gallery", {
    method,
    headers: { origin, "content-type": "application/json", ...extra },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
describe("private access HTTP boundary", () => {
  it("puts session token in secure HttpOnly cookie, never JSON", async () => {
    const token = "a".repeat(64);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        Response.json({
          state: "unlocked",
          token,
          expires_at: new Date(Date.now() + 900000).toISOString(),
          gallery: { title: "Authorized" },
        }),
      ),
    );
    const response = await galleryAccessRequest(
      req("POST", { password: "long-password" }),
      "client-gallery",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/galleries/client-gallery");
    expect(JSON.stringify(await response.json())).not.toContain(token);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects cross-origin password requests without contacting database", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await galleryAccessRequest(
          req("POST", { password: "test" }, { origin: "https://other.example" }),
          "client-gallery",
        )
      ).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards only the scoped session for reads", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ state: "locked" }));
    vi.stubGlobal("fetch", fetch);
    const token = "b".repeat(64);
    await galleryAccessRequest(
      req("GET", undefined, { cookie: "dg_gallery_session=" + token }),
      "client-gallery",
    );
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
      slug: "client-gallery",
      token,
    });
  });
  it("revokes the database session and clears its cookie on lock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(null)));
    const response = await galleryAccessRequest(
      req("DELETE", undefined, { cookie: "dg_gallery_session=" + "b".repeat(64) }),
      "client-gallery",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("preserves backend rate limiting response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ state: "rate-limited" })));
    expect(
      (await galleryAccessRequest(req("POST", { password: "test" }), "client-gallery")).status,
    ).toBe(429);
  });
  it("fails closed on backend failure without leaking details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("private internals", { status: 500 })),
    );
    const response = await galleryAccessRequest(req("GET"), "client-gallery");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private internals");
  });
  it("rejects oversized and malformed input", async () => {
    expect(
      (await galleryAccessRequest(req("POST", { password: "x".repeat(3000) }), "client-gallery"))
        .status,
    ).toBe(413);
    expect((await galleryAccessRequest(req("POST", { password: "x" }), "../client")).status).toBe(
      400,
    );
  });
  it("requires HTTPS outside local preview", async () => {
    expect(
      (
        await galleryAccessRequest(
          new Request("http://example.com/api/galleries/client-gallery"),
          "client-gallery",
        )
      ).status,
    ).toBe(400);
  });
});
it("download redirect checks the protected service and suppresses referrers", async () => {
  const url = "https://ug.link/dept-hq/filemgr/share-download/?id=" + "a".repeat(32);
  const fetch = vi.fn().mockResolvedValue(Response.json({ url }));
  vi.stubGlobal("fetch", fetch);
  const response = await galleryAccessRequest(
    new Request(origin + "/api/galleries/client-gallery?download=1", {
      headers: { cookie: "dg_gallery_session=" + "c".repeat(64) },
    }),
    "client-gallery",
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(url);
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(JSON.parse(fetch.mock.calls[0]![1].body).token).toBe("c".repeat(64));
});
it("rejects unsafe download redirects even if a backend returns one", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ url: "https://evil.example" })));
  expect(
    (
      await galleryAccessRequest(
        new Request(origin + "/api/galleries/client-gallery?download=1"),
        "client-gallery",
      )
    ).status,
  ).toBe(403);
});
it("exchanges a secure share key for an HttpOnly session without exposing it in JSON", async () => {
  const key = "d".repeat(64),
    token = "e".repeat(64);
  const network = vi
    .fn()
    .mockImplementation(async (url: string) =>
      Response.json(
        url.includes("gallery_unlock_link")
          ? { state: "unlocked", token, expires_at: new Date(Date.now() + 900000).toISOString() }
          : { state: "authorized", gallery: { title: "Link gallery" } },
      ),
    );
  vi.stubGlobal("fetch", network);
  const response = await galleryAccessRequest(req("POST", { shareKey: key }), "client-gallery");
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  const body = await response.text();
  expect(body).not.toContain(key);
  expect(body).not.toContain(token);
  expect(network.mock.calls[0]![0]).toContain("gallery_unlock_link");
});

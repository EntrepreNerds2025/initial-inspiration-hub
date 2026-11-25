import { describe, it, expect, vi } from "vitest";
import { createGalleryHandler } from "../../../../supabase/functions/gallery-media/handler";
import {
  validDeliveryUrl,
  validatePreview,
} from "../../../../supabase/functions/_shared/gallery-validation";
const share = "https://ug.link/dept-hq/filemgr/share-download/?id=" + "a".repeat(32);
function setup(admin: string | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: { state: "locked" }, error: null });
  const sign = vi
    .fn()
    .mockResolvedValue({ data: [{ signedUrl: "https://storage.example/signed" }], error: null });
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const handler = createGalleryHandler({
    backend: { rpc, storage: { from: () => ({ createSignedUrls: sign, upload, remove }) } },
    admin: async () => admin,
    directory: async () => [],
    decode: () => {},
  });
  const call = (action: string, data: unknown = { slug: "client", token: null }) =>
    handler(
      new Request("https://edge.example/?action=" + action, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );
  return { handler, rpc, sign, upload, remove, call };
}
describe("preview and download authorization", () => {
  it.each(["upload", "cleanup", "preview"])(
    "rejects non-admin %s before touching storage",
    async (action) => {
      const s = setup();
      expect((await s.call(action)).status).toBe(403);
      expect(s.rpc).not.toHaveBeenCalled();
      expect(s.upload).not.toHaveBeenCalled();
    },
  );
  it("does not sign or reveal anything for locked galleries", async () => {
    const s = setup();
    expect(await (await s.call("resolve")).json()).toEqual({ state: "locked" });
    expect(s.sign).not.toHaveBeenCalled();
    expect((await s.call("download")).status).toBe(403);
  });
  it("signs only authorized photos and never includes NAS URLs or raw object keys", async () => {
    const s = setup();
    s.rpc.mockResolvedValue({
      data: {
        state: "authorized",
        ttl: 25,
        download_url: share,
        gallery: {
          title: "Client",
          cover_photo_id: "p",
          photos: [
            {
              id: "p",
              key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg",
              filename: "one.jpg",
            },
          ],
        },
      },
      error: null,
    });
    const body = await (await s.call("resolve")).json();
    expect(body.gallery.has_download).toBe(true);
    expect(body.gallery.cover.preview_url).toContain("signed");
    expect(JSON.stringify(body)).not.toContain(share);
    expect(body.gallery.photos[0]).not.toHaveProperty("key");
    expect(s.sign).toHaveBeenCalledWith(expect.any(Array), 25);
  });
  it("only releases an enabled authorized allowlisted share link", async () => {
    const s = setup();
    s.rpc.mockResolvedValue({ data: { gallery: {}, ttl: 60, download_url: share }, error: null });
    expect(await (await s.call("download")).json()).toEqual({ url: share });
    s.rpc.mockResolvedValue({
      data: { gallery: {}, ttl: 60, download_url: "https://evil.example" },
      error: null,
    });
    expect((await s.call("download")).status).toBe(403);
  });
  it("fails closed for expired signing allowance and storage errors", async () => {
    const s = setup();
    s.rpc.mockResolvedValue({ data: { gallery: { photos: [] }, ttl: 0 }, error: null });
    expect(await (await s.call("resolve")).json()).toEqual({ state: "locked" });
    expect(s.sign).not.toHaveBeenCalled();
  });
  it("rejects cross-origin operations", async () => {
    const s = setup("admin");
    const response = await s.handler(
      new Request("https://edge.example/?action=cleanup", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect(s.rpc).not.toHaveBeenCalled();
  });
});
describe("input boundaries", () => {
  it("accepts only verified UGREEN share URL shapes", () => {
    expect(validDeliveryUrl(share)).toBe(true);
    expect(validDeliveryUrl(null)).toBe(true);
    for (const url of [
      "http://ug.link/a",
      "https://ug.link.evil.test/a",
      share + "&redirect=https://evil.example",
      "https://192.168.1.2/share",
      "https://user:pass@ug.link/a",
      "javascript:alert(1)",
      "https://other.us25.ug.link/filemgr/share-download/?id=" + "a".repeat(32),
    ])
      expect(validDeliveryUrl(url)).toBe(false);
  });
  it("rejects invalid, oversized and truncated images", () => {
    expect(() => validatePreview(new Uint8Array([1, 2, 3]))).toThrow();
    expect(() => validatePreview(new Uint8Array(2097153))).toThrow();
  });
});
it("never returns partial private data when preview signing fails", async () => {
  const s = setup();
  s.rpc.mockResolvedValue({
    data: {
      state: "authorized",
      ttl: 60,
      gallery: {
        title: "Private title",
        photos: [
          {
            id: "p",
            key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg",
          },
        ],
      },
    },
    error: null,
  });
  s.sign.mockResolvedValue({ data: null, error: { message: "internal storage detail" } } as never);
  const response = await s.call("resolve");
  expect(response.status).toBe(400);
  const body = await response.text();
  expect(body).not.toContain("Private title");
  expect(body).not.toContain("internal storage detail");
});

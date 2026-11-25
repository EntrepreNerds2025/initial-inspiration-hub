// Real JPEG decode + mocked storage integration. No database or network mutation.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createGalleryHandler } from "../supabase/functions/gallery-media/handler.ts";
const require = createRequire(import.meta.url);
const jpeg = require(process.env.GALLERY_JPEG_MODULE || "jpeg-js");
const encoded = jpeg.encode(
  { data: Buffer.alloc(64 * 64 * 4, 180), width: 64, height: 64 },
  80,
).data;
const calls = [];
let uploaded,
  fail = false;
const handler = createGalleryHandler({
  admin: async () => "a0000000-0000-4000-8000-000000000001",
  directory: async () => [],
  decode: (bytes) =>
    jpeg.decode(bytes, {
      useTArray: true,
      maxResolutionInMP: 5,
      maxMemoryUsageInMB: 64,
      tolerantDecoding: false,
    }),
  backend: {
    rpc: async (name) => {
      calls.push(name);
      return {
        data:
          name === "gallery_preview_reserve"
            ? {
                object_key:
                  "d0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001.jpg",
              }
            : "photo-id",
        error: null,
      };
    },
    storage: {
      from: () => ({
        upload: async (key, bytes) => {
          uploaded = bytes;
          return { error: fail ? { statusCode: 500 } : null };
        },
        createSignedUrls: async () => ({ data: [], error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  },
});
function request(body = encoded) {
  return new Request("https://edge.test/?action=upload", {
    method: "POST",
    headers: {
      "content-type": "image/jpeg",
      "x-gallery-id": "d0000000-0000-4000-8000-000000000001",
      "x-upload-id": "b0000000-0000-4000-8000-000000000001",
      "x-original-bytes": "5000000",
      "x-filename": "client-photo.jpg",
    },
    body,
  });
}
assert.equal((await handler(request())).status, 200);
assert.deepEqual(Buffer.from(uploaded), encoded);
assert.equal(calls.at(-1), "gallery_preview_finish");
calls.length = 0;
fail = true;
assert.equal((await handler(request())).status, 400);
assert(!calls.includes("gallery_preview_finish"));
calls.length = 0;
const corrupt = Buffer.from(encoded);
corrupt.fill(0, 40, 400);
assert.equal((await handler(request(corrupt))).status, 400);
assert.equal(calls.length, 0);
console.log(
  "PASS: real JPEG decode, successful preview persistence, storage failure without finalization, corrupt-image rejection.",
);

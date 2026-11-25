import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/galleries/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/lib/galleries/access.server")).galleryAccessRequest(request, params.slug),
      POST: async ({ request, params }) =>
        (await import("@/lib/galleries/access.server")).galleryAccessRequest(request, params.slug),
      DELETE: async ({ request, params }) =>
        (await import("@/lib/galleries/access.server")).galleryAccessRequest(request, params.slug),
    },
  },
});

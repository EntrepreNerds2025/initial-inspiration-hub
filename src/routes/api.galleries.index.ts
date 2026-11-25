import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/galleries/")({
  server: {
    handlers: {
      GET: async () => (await import("@/lib/galleries/media.server")).galleryDirectoryRequest(),
    },
  },
});

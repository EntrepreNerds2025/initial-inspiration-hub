import { createFileRoute } from "@tanstack/react-router";
import { GalleryAdmin } from "@/components/galleries/GalleryAdmin";
export const Route = createFileRoute("/admin/galleries")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gallery Administration | The Dept Collective" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: GalleryAdmin,
});

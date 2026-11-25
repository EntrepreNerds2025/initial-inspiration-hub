import { createFileRoute } from "@tanstack/react-router";
import { GalleryDetail } from "@/components/galleries/GalleryDetail";
export const Route = createFileRoute("/galleries/$slug")({ component: GalleryPage });
function GalleryPage() {
  const { slug } = Route.useParams();
  return <GalleryDetail key={slug} slug={slug} />;
}

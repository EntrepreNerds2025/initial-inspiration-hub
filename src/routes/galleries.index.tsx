import { createFileRoute } from "@tanstack/react-router";
import { GalleryDirectory } from "@/components/galleries/GalleryDirectory";
export const Route = createFileRoute("/galleries/")({ component: GalleryDirectory });

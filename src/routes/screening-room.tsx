import { createFileRoute } from "@tanstack/react-router";
import { ScreeningSection } from "@/components/screening/ScreeningSection";
export const Route = createFileRoute("/screening-room")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Screening Room | Dept. Collective" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ScreeningSection,
});

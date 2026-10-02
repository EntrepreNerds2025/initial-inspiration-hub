import ScribeHeader from "@/components/scribe/ScribeHeader";
import { createFileRoute } from "@tanstack/react-router";
import FeaturedHero from "@/components/scribe/FeaturedHero";
import { featuredContent } from "@/components/scribe/content";
import "@/components/scribe/scribe.css";

export const Route = createFileRoute("/departments_/scribe")({
  head: () => ({
    meta: [
      { title: "The Scribe Dept. | Your Response?" },
      {
        name: "description",
        content:
          "Original films and worship storytelling from The Scribe Dept., a department of Dept. Collective.",
      },
    ],
  }),
  component: ScribePage,
});
function ScribePage() {
  return (
    <main className="scribe-page">
      <ScribeHeader />
      <FeaturedHero content={featuredContent} />
    </main>
  );
}

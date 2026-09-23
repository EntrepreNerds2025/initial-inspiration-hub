import { createFileRoute } from "@tanstack/react-router";
import FeaturedHero from "@/components/scribe/FeaturedHero";
import { featuredContent, scribeNavigation } from "@/components/scribe/content";
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
      <header className="scribe-header">
        <a className="scribe-brand" href="/departments/scribe">
          THE SCRIBE DEPT.<small>A DEPARTMENT OF DEPT. COLLECTIVE</small>
        </a>
        <nav aria-label="Scribe navigation">
          {scribeNavigation.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ) : (
              <button key={item.label} disabled title={`${item.label} — coming soon`}>
                {item.label}
                <span className="sr-only"> — coming soon</span>
              </button>
            ),
          )}
        </nav>
        <a className="scribe-parent" href="/">
          DEPT. COLLECTIVE ↗
        </a>
      </header>
      <FeaturedHero content={featuredContent} />
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import QuoteBuilder from "@/components/quote/QuoteBuilder";
export const Route = createFileRoute("/start")({
  validateSearch: (search: Record<string, unknown>) => ({
    package: typeof search["package"] === "string" ? search["package"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Start a Project | Dept. Collective" },
      {
        name: "description",
        content: "Tell us what you’re making. Build your production brief with Dept. Collective.",
      },
    ],
  }),
  component: Start,
});
function Start() {
  const search = Route.useSearch();
  return <QuoteBuilder packageKey={search.package} />;
}

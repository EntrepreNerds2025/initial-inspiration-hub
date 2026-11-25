import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/galleries")({
  head: () => ({
    meta: [
      { title: "DEPT. GALLERIES | The Dept Collective" },
      {
        name: "description",
        content:
          "A collection of moments, captured. Photography collections by The Dept Collective.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "DEPT. GALLERIES | The Dept Collective" },
    ],
  }),
  component: Outlet,
});

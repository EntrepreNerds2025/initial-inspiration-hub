import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/packages")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "packages", replace: true });
  },
});

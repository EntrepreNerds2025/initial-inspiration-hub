import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Manifesto from "@/components/site/Manifesto";
import SelectedWork from "@/components/site/SelectedWork";
import Director from "@/components/site/Director";
import PackagesSection from "@/components/packages/PackagesSection";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Dept Collective" },
      {
        name: "description",
        content:
          "The Dept Collective is a visual storytelling studio in Toronto, Canada. Brand films, documentaries, and community stories with care in every frame.",
      },
      { property: "og:title", content: "The Dept Collective" },
      {
        property: "og:description",
        content: "Director & cinematographer. Brand films, documentaries, and community stories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  // reveal-on-scroll for any element with .reveal (hero elements start .on)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal:not(.on)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Manifesto />
        <SelectedWork />
        <PackagesSection />
        <Director />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

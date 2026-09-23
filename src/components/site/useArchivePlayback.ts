import { useEffect, useRef, useState } from "react";

// Prepare rows near the viewport, then keep every prepared preview playing.
export function useArchivePlayback(blocked: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const prepared = useRef(new Set<string>());
  const [active, setActive] = useState<string[]>([]);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const entries = Array.from(container.querySelectorAll<HTMLElement>(".archive-entry"));
    const columns = () => getComputedStyle(container).gridTemplateColumns.split(" ").length;
    const rowFor = (entry: HTMLElement) => {
      const count = columns();
      const start = Math.floor(entries.indexOf(entry) / count) * count;
      return entries.slice(start, start + count);
    };
    const update = () => {
      const selected = blocked || document.hidden ? [] : [...prepared.current];
      setActive((previous) => (previous.join() === selected.join() ? previous : selected));
    };
    const configure = () => {
      entries.forEach((entry, index) => {
        const initial = index < columns();
        entry.dataset["initialRow"] = String(initial);
        if (initial || reduced.matches) entry.dataset["revealed"] = "true";
        else if (!entry.dataset["revealed"]) entry.dataset["revealed"] = "false";
        entry.style.setProperty("--archive-reveal-delay", `${(index % columns()) * 60}ms`);
      });
    };
    configure();
    const prepare = new IntersectionObserver(
      (changes) => {
        changes.forEach((change) => {
          if (!change.isIntersecting) return;
          const entry = change.target.closest<HTMLElement>(".archive-entry")!;
          rowFor(entry).forEach((item) => prepared.current.add(item.dataset["project"]!));
        });
        update();
      },
      { rootMargin: "0px 0px 600px 0px", threshold: 0 },
    );
    const reveal = new IntersectionObserver(
      (changes) => {
        changes.forEach((change) => {
          if (!change.isIntersecting) return;
          const entry = change.target.closest<HTMLElement>(".archive-entry")!;
          rowFor(entry).forEach((item) => {
            item.dataset["revealed"] = "true";
          });
        });
      },
      { threshold: 0.08 },
    );
    entries.forEach((entry) => {
      const media = entry.querySelector(".archive-films");
      if (media) {
        prepare.observe(media);
        reveal.observe(media);
      }
    });
    document.addEventListener("visibilitychange", update);
    window.addEventListener("resize", configure);
    reduced.addEventListener("change", configure);
    update();
    return () => {
      prepare.disconnect();
      reveal.disconnect();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("resize", configure);
      reduced.removeEventListener("change", configure);
    };
  }, [blocked]);
  return { root, active };
}

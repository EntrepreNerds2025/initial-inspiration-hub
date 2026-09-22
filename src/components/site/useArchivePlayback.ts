import { useEffect, useRef, useState } from "react";

// One observer coordinates the contact sheet; at most two projects play at once.
export function useArchivePlayback(blocked: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string[]>([]);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ratios = new Map<HTMLElement, number>();
    const readyAt = new Map<HTMLElement, number>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const entries = Array.from(container.querySelectorAll<HTMLElement>(".archive-entry"));
    entries.forEach((entry) => {
      if (!entry.dataset["revealed"]) entry.dataset["revealed"] = "false";
    });
    const update = () => {
      if (reduced.matches)
        entries.forEach((entry) => {
          entry.dataset["revealed"] = "true";
        });
      const selected =
        blocked || document.hidden || reduced.matches
          ? []
          : [...ratios]
              .filter(
                ([entry, ratio]) =>
                  ratio >= 0.6 && performance.now() >= (readyAt.get(entry) ?? Infinity),
              )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([entry]) => entry.dataset["project"]!);
      setActive((previous) => (previous.join() === selected.join() ? previous : selected));
    };
    const observer = new IntersectionObserver(
      (changes) => {
        changes.forEach((change) => {
          const entry = change.target.closest<HTMLElement>(".archive-entry")!;
          ratios.set(entry, change.intersectionRatio);
          if (change.intersectionRatio >= 0.15 && !readyAt.has(entry)) {
            const alreadyRevealed = entry.dataset["revealed"] === "true";
            const columns = getComputedStyle(container).gridTemplateColumns.split(" ").length;
            const delay =
              alreadyRevealed || reduced.matches ? 0 : (entries.indexOf(entry) % columns) * 80;
            entry.style.setProperty("--archive-reveal-delay", `${delay}ms`);
            entry.dataset["revealed"] = "true";
            const duration = alreadyRevealed || reduced.matches ? 0 : 600 + delay;
            readyAt.set(entry, performance.now() + duration);
            timers.add(setTimeout(update, duration + 20));
          }
        });
        update();
      },
      { threshold: [0, 0.15, 0.6, 0.8, 1] },
    );
    entries.forEach((entry) => {
      const media = entry.querySelector(".archive-films");
      if (media) observer.observe(media);
    });
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
    };
  }, [blocked]);
  return { root, active };
}

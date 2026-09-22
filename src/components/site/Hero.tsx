import { useEffect, useId, useRef, useState } from "react";
import HeroWordmark from "./HeroWordmark";
import { heroPoster, heroVideo as HERO_VIDEO } from "./hero-media";
import "./hero.css";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const maskId = useId().replace(/:/g, "");
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setVideoEnabled(!reduced.matches);
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(pointer: coarse), (max-width: 600px)");
    const stage = section.querySelector<HTMLElement>(".dept-hero-stage");
    const smooth = (start: number, end: number, value: number) => {
      const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
      return t * t * (3 - 2 * t);
    };
    let frame = 0;
    let visible = true;
    const paint = () => {
      frame = 0;
      const bounds = section.getBoundingClientRect();
      const distance = section.offsetHeight - (stage?.offsetHeight ?? window.innerHeight);
      const progress = reduced.matches
        ? 0
        : Math.max(0, Math.min(1, -bounds.top / Math.max(1, distance)));
      // One native-scroll timeline: reveal first, enter the letters, then
      // dissolve only the remaining black mask into the SAME media layer.
      const reveal = smooth(0.06, 0.85, progress);
      const expansion = smooth(compact.matches ? 0.42 : 0.4, 1, progress);
      section.style.setProperty("--hero-media", String(0.025 + reveal * 0.975));
      section.style.setProperty("--hero-contrast", String(0.72 + reveal * 0.28));
      section.style.setProperty("--hero-saturation", String(0.2 + reveal * 0.5));
      section.style.setProperty(
        "--hero-scale",
        String(Math.exp(expansion * Math.log(compact.matches ? 9 : 26))),
      );
      section.style.setProperty("--hero-mask", String(1 - smooth(0.85, 1, progress)));
      section.style.setProperty("--hero-details", String(1 - smooth(0.12, 0.36, progress)));
      // Scrolling should never wait for the opening title sequence.
      section.classList.toggle("hero-has-scrolled", progress > 0.01);
      const details = section.querySelector<HTMLElement>(".dept-hero-details");
      if (details) details.inert = progress >= 0.36;
      if (video.current) {
        if (visible && !document.hidden && !reduced.matches)
          void video.current.play().catch(() => {});
        else video.current.pause();
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) schedule();
      else video.current?.pause();
    });
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    compact.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
      compact.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [videoEnabled]);

  return (
    <header
      id="top"
      ref={root}
      className="dept-hero"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !cursor.current) return;
        cursor.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        cursor.current.dataset["visible"] = "true";
        cursor.current.dataset["active"] = String(
          event.target instanceof Element && !!event.target.closest("a, button"),
        );
      }}
      onPointerLeave={() => {
        if (cursor.current) cursor.current.dataset["visible"] = "false";
      }}
    >
      <div className="dept-hero-stage">
        <h1 className="sr-only">dept. collective — Visual storytelling studio</h1>
        <div className="dept-hero-composition" aria-hidden="true">
          <div className="dept-hero-paper" />
          <div className="dept-hero-media">
            <img src={heroPoster} alt="" fetchPriority="high" />
            {videoEnabled && (
              <video
                ref={video}
                src={HERO_VIDEO}
                poster={heroPoster}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                style={{ visibility: "hidden" }}
                onPlaying={(event) => {
                  event.currentTarget.style.visibility = "visible";
                }}
                onError={() => {
                  if (video.current) video.current.style.display = "none";
                }}
              />
            )}
          </div>
          <svg className="dept-hero-mask" width="100%" height="100%" aria-hidden="true">
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100%"
                height="100%"
                style={{ maskType: "luminance" }}
              >
                <rect width="100%" height="100%" fill="white" />
                <g className="dept-hero-letters" fill="black">
                  <HeroWordmark />
                </g>
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="#0a0a0a" mask={`url(#${maskId})`} />
          </svg>
        </div>
        <div className="dept-hero-details">
          <p className="dept-hero-identity">VISUAL STORYTELLING STUDIO</p>
          <div className="dept-hero-bottom">
            <span>TORONTO / CANADA</span>
            <span className="dept-hero-year">EST. 2026</span>
            <a
              href="#hero-entered"
              className="dept-hero-enter"
              onClick={(event) => {
                const section = root.current;
                const stage = section?.querySelector<HTMLElement>(".dept-hero-stage");
                if (!section || !stage) return;
                event.preventDefault();
                const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const top =
                  window.scrollY +
                  section.getBoundingClientRect().top +
                  section.offsetHeight -
                  (reduced ? 0 : stage.offsetHeight);
                window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
              }}
            >
              SCROLL TO ENTER <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="dept-hero-intro" aria-hidden="true">
          <span>VISUAL STORYTELLING STUDIO</span>
        </div>
      </div>
      <span id="hero-entered" className="dept-hero-end" aria-hidden="true" />
      <span ref={cursor} className="dept-hero-cursor" aria-hidden="true" />
    </header>
  );
}

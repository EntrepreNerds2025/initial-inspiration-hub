import { useEffect, useRef } from "react";
import { manifestoMedia } from "./manifesto-media";
import "./manifesto.css";
import ProjectInquiry from "./ProjectInquiry";

const beats = [
  { text: "STORIES ARE EVERYWHERE.", start: 0.035, end: 0.19, subject: false },
  { text: "WE KNOW WHERE TO LOOK.", start: 0.21, end: 0.35, subject: false },
  { text: "PEOPLE.", start: 0.37, end: 0.47, subject: true },
  { text: "PERFORMANCE.", start: 0.49, end: 0.59, subject: true },
  { text: "PROCESS.", start: 0.61, end: 0.71, subject: true },
  { text: "THE MOMENTS IN BETWEEN.", start: 0.73, end: 0.92, subject: true },
];
const mediaStarts = [0, 0.36, 0.48, 0.6, 0.72];
const smooth = (start: number, end: number, progress: number) => {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export default function Manifesto() {
  const section = useRef<HTMLElement>(null);
  const timecode = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const stage = root.querySelector<HTMLElement>(".manifesto-stage");
    const inquiry = root.querySelector<HTMLElement>(".manifesto-inquiry");
    const statements = root.querySelectorAll<HTMLElement>(".manifesto-beat");
    const layers = root.querySelectorAll<HTMLElement>(".manifesto-media-layer");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let entered = false;
    let lastTimecode = "";

    const paint = () => {
      frame = 0;
      const bounds = root.getBoundingClientRect();
      const stageHeight = stage?.offsetHeight ?? window.innerHeight;
      const progress = Math.max(
        0,
        Math.min(1, -bounds.top / Math.max(1, root.offsetHeight - stageHeight)),
      );
      const active = bounds.top <= 1 && bounds.bottom >= 0 && !reduced.matches;
      if (stage) stage.inert = !active;
      const inquiryOpacity = smooth(0.07, 0.12, progress) * (1 - smooth(0.9, 0.96, progress));
      root.style.setProperty("--manifesto-inquiry", String(inquiryOpacity));
      if (inquiry) inquiry.inert = !active || inquiryOpacity < 0.1;
      root.style.setProperty("--manifesto-visible", active ? "1" : "0");
      root.style.setProperty("--manifesto-shade", String(smooth(0.01, 0.075, progress) * 0.38));
      root.style.setProperty("--manifesto-black", String(smooth(0.9, 1, progress)));
      root.style.setProperty(
        "--manifesto-meta",
        String(smooth(0.025, 0.07, progress) * (1 - smooth(0.92, 0.98, progress))),
      );
      root.style.setProperty(
        "--manifesto-document",
        String(smooth(0.355, 0.38, progress) * (1 - smooth(0.89, 0.94, progress))),
      );

      statements.forEach((element, index) => {
        const beat = beats[index];
        if (!beat) return;
        const opacity =
          smooth(beat.start, beat.start + 0.025, progress) *
          (1 - smooth(beat.end - 0.025, beat.end, progress));
        element.style.opacity = String(opacity);
        element.style.transform = `translateY(${(1 - smooth(beat.start, beat.start + 0.04, progress)) * 12}px)`;
      });

      layers.forEach((element, index) => {
        const start = mediaStarts[index] ?? 0;
        const configured = index === 0 || !!manifestoMedia[index]?.video;
        element.style.opacity = String(
          !configured ? 0 : index === 0 ? 1 : smooth(start, start + 0.04, progress),
        );
        const video = element.querySelector("video");
        if (!video) return;
        // Match the opening clip's playback position at the exact hero handoff.
        if (index === 0 && active && !entered) {
          const hero = document.querySelector<HTMLVideoElement>("#top video");
          if (hero && video.readyState >= 1) video.currentTime = hero.currentTime;
        }
        const nextIndex = manifestoMedia.findIndex(
          (media, candidate) => candidate > index && !!media.video,
        );
        const next = nextIndex < 0 ? 1 : (mediaStarts[nextIndex] ?? 1);
        const playing = active && progress >= start && progress <= next + 0.04 && !document.hidden;
        if (playing && video.paused) void video.play().catch(() => {});
        else if (!playing) video.pause();
      });
      entered = active;
      // Editorial 24 fps timecode tracks scroll, never an independent timer.
      const frames = Math.round(progress * 18 * 24);
      const code = `00:00:${String(Math.floor(frames / 24)).padStart(2, "0")}:${String(frames % 24).padStart(2, "0")}`;
      if (timecode.current && code !== lastTimecode) timecode.current.textContent = code;
      lastTimecode = code;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", schedule);
      layers.forEach((layer) => layer.querySelector("video")?.pause());
    };
  }, []);

  return (
    <section className="dept-manifesto" aria-label="The Dept. Collective manifesto">
      <section ref={section} className="manifesto-sequence" aria-label="How we see stories">
        <div className="manifesto-reading">
          <h2>
            STORIES ARE EVERYWHERE.
            <br />
            WE KNOW WHERE TO LOOK.
          </h2>
          <p>WE DOCUMENT</p>
          <ul>
            {beats
              .filter((beat) => beat.subject)
              .map((beat) => (
                <li key={beat.text}>{beat.text}</li>
              ))}
          </ul>
        </div>
        <div className="manifesto-stage">
          <div className="manifesto-visual" aria-hidden="true">
            {manifestoMedia.map((media, index) => (
              <div
                key={media.id}
                className="manifesto-media-layer"
                style={{ opacity: index === 0 ? 1 : 0 }}
              >
                <img src={media.poster} alt="" loading="lazy" />
                {media.video && (
                  <video
                    src={media.video}
                    poster={media.poster}
                    muted
                    loop
                    playsInline
                    preload={index === 0 ? "metadata" : "none"}
                    onLoadedMetadata={(event) => {
                      if (index !== 0) return;
                      const hero = document.querySelector<HTMLVideoElement>("#top video");
                      if (hero) event.currentTarget.currentTime = hero.currentTime;
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            ))}
            <div className="manifesto-shade" />
            <div className="manifesto-black" />
          </div>
          <div className="manifesto-words" aria-hidden="true">
            <span className="manifesto-document">WE DOCUMENT</span>
            {beats.map((beat) => (
              <p
                key={beat.text}
                className={`manifesto-beat ${beat.subject ? "manifesto-subject" : ""}`}
              >
                {beat.text === "THE MOMENTS IN BETWEEN." ? (
                  <>
                    THE MOMENTS
                    <br />
                    IN BETWEEN.
                  </>
                ) : (
                  beat.text
                )}
              </p>
            ))}
          </div>
          <div className="manifesto-metadata" aria-hidden="true">
            <span>DC / MOTION STUDY 001</span>
            <output ref={timecode}>00:00:00:00</output>
          </div>
          <div className="manifesto-inquiry" inert>
            <ProjectInquiry />
          </div>
        </div>
      </section>
      <div className="manifesto-closing">
        <div className="manifesto-project-invitation">
          <p>HAVE A PROJECT IN MIND?</p>
          <ProjectInquiry prominent />
        </div>
        <span className="manifesto-label">02 / THE DEPT.</span>
        <h2>
          WE DON&apos;T JUST
          <br />
          CAPTURE THINGS.
          <span>
            WE FIND
            <br />
            THE STORY.
          </span>
        </h2>
        <div className="manifesto-closing-bottom">
          <p>
            Dept. Collective is a visual storytelling studio built around observation, craft and
            human stories. We create films that don&apos;t just show what happened — they make you
            feel like you were there.
          </p>
          <span className="manifesto-label">DOCUMENTARY / FILM / LIVE / BRANDED / ORIGINAL</span>
        </div>
      </div>
    </section>
  );
}

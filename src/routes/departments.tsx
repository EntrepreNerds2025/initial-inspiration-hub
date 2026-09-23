import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/site/Navbar";
import ProjectInquiry from "@/components/site/ProjectInquiry";
import { departments, type Department } from "@/components/site/departments-data";
import "@/components/site/hero.css";
import "@/components/site/departments.css";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "The Departments | Dept. Collective" },
      {
        name: "description",
        content:
          "Different disciplines. One collective approach to storytelling. Discover The Scribe Dept., within Dept. Collective.",
      },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentEntry({ department }: { department: Department }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [prepared, setPrepared] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      const play = visible && !reduced.matches && !document.hidden;
      if (play) setPrepared(true);
      setActive(play);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = (entry?.intersectionRatio ?? 0) >= 0.25;
        update();
      },
      { threshold: [0, 0.25] },
    );
    observer.observe(element);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (active) void element.play().catch(() => {});
    else element.pause();
    return () => element.pause();
  }, [active, prepared]);
  return (
    <section className="department-entry" aria-labelledby={`department-${department.number}`}>
      <div className="department-entry-label">
        {department.number} / {department.name}
      </div>
      <div className="department-composition">
        <div className="department-copy">
          <h2 id={`department-${department.number}`}>
            {department.title[0]}
            <br />
            {department.title[1]}
          </h2>
          <p className="department-meta">{department.descriptor}</p>
          <p className="department-statement">
            {department.statement.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          {department.status === "published" ? (
            <a className="department-enter" href={department.route}>
              ENTER DEPARTMENT ↗
            </a>
          ) : (
            <>
              <button
                className="department-enter"
                disabled
                aria-describedby={`department-status-${department.number}`}
              >
                ENTER DEPARTMENT ↗
              </button>
              <p className="department-status" id={`department-status-${department.number}`}>
                The dedicated department page is not yet open.
              </p>
              <a className="department-archive-link" href="/#work">
                EXPLORE YOUR RESPONSE? IN THE ARCHIVE ↗
              </a>
            </>
          )}
        </div>
        <figure className="department-film">
          <div ref={frame} className="department-film-frame">
            <img
              src={department.media.poster}
              alt="A frame from Your Response?, The Scribe Dept. worship documentary series"
              loading="lazy"
            />
            {prepared && (
              <video
                ref={video}
                src={department.media.preview}
                poster={department.media.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <figcaption>{department.media.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
function DepartmentsPage() {
  return (
    <>
      <Navbar homePage={false} />
      <main className="departments-page" id="top">
        <header className="departments-hero">
          <p className="department-meta">DEPT. COLLECTIVE / DEPARTMENTS</p>
          <h1>
            THE
            <br />
            <span>DEPARTMENTS.</span>
          </h1>
          <p className="departments-intro">
            Different disciplines.
            <br />
            One collective approach to storytelling.
          </p>
        </header>
        <div
          className="department-lineage"
          aria-label="The Scribe Dept. is a department within Dept. Collective"
        >
          <span>DEPT. COLLECTIVE</span>
          <span aria-hidden="true">↓</span>
          <span>THE SCRIBE DEPT.</span>
        </div>
        {departments.map((department) => (
          <DepartmentEntry key={department.number} department={department} />
        ))}
        <footer className="departments-exit">
          <ProjectInquiry href="/#contact" />
          <a href="/#top">BACK TO THE COLLECTIVE ↗</a>
        </footer>
      </main>
    </>
  );
}

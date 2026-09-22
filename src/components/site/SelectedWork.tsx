import { useEffect, useRef, useState } from "react";
import { archiveProjects, type ArchiveFilm, type ArchiveProject } from "./archive-projects";
import "./archive.css";

function FilmPreview({
  film,
  title,
  onOpen,
}: {
  film: ArchiveFilm;
  title: string;
  onOpen: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const startPreview = (pointerType: string) => {
    // Actual mouse input also works on laptops/tablets whose primary input is touch.
    if (pointerType === "mouse" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setPreview(true);
  };
  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const stop = () => setPreview(false);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) stop();
    });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    observer.observe(element);
    document.addEventListener("visibilitychange", stop);
    reduced.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", stop);
      reduced.removeEventListener("change", stop);
    };
  }, []);
  return (
    <button
      ref={button}
      className="archive-film"
      style={{ aspectRatio: film.aspectRatio }}
      aria-label={`Open ${title} — ${film.label}`}
      onPointerEnter={(event) => startPreview(event.pointerType)}
      onPointerMove={(event) => startPreview(event.pointerType)}
      onPointerLeave={() => setPreview(false)}
      onClick={() => {
        setPreview(false);
        onOpen();
      }}
    >
      <img src={film.poster} alt="" loading="lazy" decoding="async" />
      {preview &&
        (film.source.type === "local" ? (
          <video
            src={film.source.preview}
            poster={film.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onError={() => setPreview(false)}
          />
        ) : (
          <iframe
            src={`https://player.vimeo.com/video/${film.source.id}?background=1&autoplay=1&loop=1&muted=1&playsinline=1`}
            title={`${title} silent preview`}
            allow="autoplay"
            tabIndex={-1}
            aria-hidden="true"
          />
        ))}
      <span className="archive-view" aria-hidden="true">
        VIEW ↗
      </span>
    </button>
  );
}

function ArchiveFile({
  project,
  initialFilm,
  onClose,
}: {
  project: ArchiveProject;
  initialFilm: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [filmIndex, setFilmIndex] = useState(initialFilm);
  const film = project.films[filmIndex]!;
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="archive-dialog"
      aria-labelledby="archive-file-title"
      onCancel={onClose}
    >
      <div className="archive-dialog-top">
        <span>{project.id} / OPEN FILE</span>
        <button autoFocus onClick={onClose} aria-label="Close archive film">
          CLOSE ×
        </button>
      </div>
      <h2 id="archive-file-title">{project.title}</h2>
      {project.films.length > 1 && (
        <div className="archive-film-picker" aria-label="Choose a short">
          {project.films.map((item, index) => (
            <button
              key={item.label}
              aria-pressed={index === filmIndex}
              onClick={() => setFilmIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div
        className={`archive-player ${project.films.length > 1 ? "archive-player-vertical" : ""}`}
      >
        {film.source.type === "local" ? (
          <video
            key={film.source.src}
            src={film.source.src}
            poster={film.poster}
            controls
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : (
          <iframe
            key={film.source.id}
            src={`https://player.vimeo.com/video/${film.source.id}?autoplay=1&title=0&byline=0&portrait=0`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={project.title}
          />
        )}
      </div>
    </dialog>
  );
}

export default function SelectedWork() {
  const [opened, setOpened] = useState<{ project: ArchiveProject; film: number } | null>(null);
  return (
    <section id="work" className="dept-archive" aria-labelledby="archive-heading">
      <header className="archive-heading">
        <p className="archive-meta">03 / SELECTED WORK</p>
        <h2 id="archive-heading">
          DEPT.
          <br />
          <span>ARCHIVE</span>
        </h2>
        <div className="archive-heading-bottom">
          <p className="archive-meta">FILMS / STORIES / OBSERVATIONS</p>
          <span className="archive-meta">
            INDEX / {String(archiveProjects.length).padStart(2, "0")} FILES
          </span>
        </div>
      </header>
      <div className="archive-index">
        {archiveProjects.map((project) => (
          <article
            key={project.id}
            className={`archive-entry archive-${project.layout}`}
            aria-labelledby={`title-${project.id}`}
          >
            <div className="archive-entry-top">
              <span className="archive-id">{project.id}</span>
              <span className="archive-meta">
                {project.status === "original"
                  ? project.department === "THE SCRIBE DEPT."
                    ? "A SCRIBE DEPT. ORIGINAL SERIES"
                    : "A DEPT. COLLECTIVE FILM"
                  : "SELECTED WORK"}
              </span>
            </div>
            <div className="archive-films">
              {project.films.map((film, index) => (
                <div className="archive-film-wrap" key={film.label}>
                  {project.films.length > 1 && (
                    <p className="archive-meta archive-short-label">{film.label}</p>
                  )}
                  <FilmPreview
                    film={film}
                    title={project.title}
                    onOpen={() => setOpened({ project, film: index })}
                  />
                </div>
              ))}
            </div>
            <div className="archive-caption">
              <div>
                <h3 id={`title-${project.id}`}>{project.title}</h3>
                <p className="archive-meta">
                  {[project.category, project.location, project.year].filter(Boolean).join(" / ")}
                </p>
                {(project.role || project.productionCredit) && (
                  <p className="archive-meta archive-credit">
                    {[project.role, project.productionCredit].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {project.caseStudyUrl ? (
                <a className="archive-open" href={project.caseStudyUrl}>
                  OPEN FILE ↗
                </a>
              ) : (
                <button
                  className="archive-open"
                  aria-label={`Open file: ${project.title}`}
                  onClick={() => setOpened({ project, film: 0 })}
                >
                  OPEN FILE ↗
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {opened && (
        <ArchiveFile
          project={opened.project}
          initialFilm={opened.film}
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  );
}

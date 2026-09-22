import { useEffect, useRef, useState } from "react";
import { archiveProjects, type ArchiveFilm, type ArchiveProject } from "./archive-projects";
import "./archive.css";
import { useArchivePlayback } from "./useArchivePlayback";

function FilmPreview({
  film,
  title,
  onOpen,
  active,
  delay,
}: {
  film: ArchiveFilm;
  title: string;
  onOpen: () => void;
  active: boolean;
  delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const playing = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const currentVideo = video.current;
    const command = (method: string, value?: number | boolean) =>
      iframe.current?.contentWindow?.postMessage({ method, value }, "https://player.vimeo.com");
    const sync = () => {
      if (video.current) {
        video.current.muted = true;
        if (playing.current) void video.current.play().catch(() => {});
        else video.current.pause();
      }
      command("setVolume", 0);
      command("setLoop", true);
      command(playing.current ? "play" : "pause");
    };
    const ready = (event: MessageEvent) => {
      if (
        event.origin !== "https://player.vimeo.com" ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      let data;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event === "ready") sync();
    };
    playing.current = false;
    sync();
    if (active && !mounted) setMounted(true);
    if (active && mounted)
      timer = setTimeout(() => {
        playing.current = true;
        sync();
      }, delay);
    window.addEventListener("message", ready);
    return () => {
      clearTimeout(timer);
      playing.current = false;
      currentVideo?.pause();
      command("pause");
      window.removeEventListener("message", ready);
    };
  }, [active, delay, mounted]);
  return (
    <button
      className="archive-film"
      style={{ aspectRatio: film.aspectRatio }}
      aria-label={`Open ${title} — ${film.label}`}
      onClick={onOpen}
    >
      <img src={film.poster} alt="" loading="lazy" decoding="async" />
      {mounted &&
        (film.source.type === "local" ? (
          <video
            ref={video}
            src={film.source.preview}
            poster={film.poster}
            muted
            loop
            playsInline
            preload="none"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <iframe
            ref={iframe}
            src={`https://player.vimeo.com/video/${film.source.id}?background=1&autoplay=0&loop=1&muted=1&playsinline=1&autopause=0`}
            title={`${title} silent preview`}
            allow="autoplay"
            tabIndex={-1}
            aria-hidden="true"
          />
        ))}
      <span className="archive-view" aria-hidden="true">
        OPEN ↗
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
            playsInline
            preload="metadata"
          />
        ) : (
          <iframe
            key={film.source.id}
            src={`https://player.vimeo.com/video/${film.source.id}?autoplay=0&title=0&byline=0&portrait=0`}
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
  const playback = useArchivePlayback(!!opened);
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
      <div className="archive-index" ref={playback.root}>
        {archiveProjects.map((project) => (
          <article
            key={project.id}
            data-project={project.id}
            className={`archive-entry archive-${project.layout}`}
            aria-labelledby={`title-${project.id}`}
          >
            <div className="archive-entry-top">
              <p className="archive-meta">
                <span className="archive-id">{project.id}</span> / {project.category}
              </p>
            </div>
            <div className="archive-films">
              {project.films.map((film, index) => (
                <div className="archive-film-wrap" key={film.label}>
                  {project.films.length > 1 && (
                    <p className="archive-meta archive-short-label">{film.label}</p>
                  )}
                  <FilmPreview
                    film={film}
                    active={playback.active.includes(project.id)}
                    delay={index * 650}
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
                  {[project.role || project.department || "SELECTED WORK", project.year]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                {(project.status === "original" || project.productionCredit) && (
                  <p className="archive-meta archive-credit">
                    {project.productionCredit ||
                      (project.department === "THE SCRIBE DEPT."
                        ? "A SCRIBE DEPT. ORIGINAL SERIES"
                        : "A DEPT. COLLECTIVE FILM")}
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

import { useRef, useState } from "react";
import type { ScribeContent } from "./content";

export default function FeaturedHero({ content }: { content: ScribeContent }) {
  const [watching, setWatching] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = () => {
    setWatching(false);
    video.current?.pause();
    dialog.current?.close();
    opener.current?.focus();
  };
  return (
    <section id="watch" className="scribe-feature" aria-labelledby="scribe-title">
      <picture className="scribe-feature-media">
        {content.heroMedia.portraitPoster && (
          <source media="(max-width: 767px)" srcSet={content.heroMedia.portraitPoster} />
        )}
        <img
          src={content.heroMedia.poster}
          alt={content.heroMedia.alt}
          style={{ objectPosition: content.heroMedia.position }}
          fetchPriority="high"
        />
      </picture>
      <div className="scribe-feature-copy">
        <p className="scribe-meta">{content.subtitle}</p>
        <h1 id="scribe-title">
          {content.titleLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className="scribe-meta">
          {content.contentType} / {content.category} {content.year && `/ ${content.year}`}
        </p>
        <p className="scribe-synopsis">{content.description}</p>
        <div className="scribe-actions">
          <button
            ref={opener}
            onClick={() => {
              setWatching(true);
              dialog.current?.showModal();
            }}
            className="scribe-watch"
          >
            <span aria-hidden="true">▶</span> WATCH SHORT
          </button>
          {content.seriesUrl ? (
            <a href={content.seriesUrl}>EXPLORE SERIES ↗</a>
          ) : (
            <span className="scribe-upcoming">
              <button disabled>EXPLORE SERIES ↗</button>
              <small>SERIES PAGE COMING SOON</small>
            </span>
          )}
        </div>
        <p className="scribe-meta scribe-film-credit">{content.watchLabel}</p>
      </div>
      <div className="scribe-feature-bottom">
        <span>NOW SHOWING / YOUR RESPONSE?</span>
        <span>OUR RESPONSE SHOULD BE WORSHIP.</span>
      </div>
      <dialog
        ref={dialog}
        className="scribe-player"
        aria-label={`${content.title} — ${content.watchLabel}`}
        onCancel={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="scribe-player-inner">
          <button className="scribe-player-close" onClick={close} autoFocus>
            CLOSE ×
          </button>
          <p className="scribe-meta">
            {content.title} / {content.watchLabel}
          </p>
          {watching &&
            (content.youtubeVideoId ? (
              <YouTubePlayer id={content.youtubeVideoId} title={content.title} />
            ) : (
              <video
                ref={video}
                src={content.localFilm}
                poster={content.thumbnail}
                controls
                playsInline
                preload="none"
              />
            ))}
        </div>
      </dialog>
    </section>
  );
}

function YouTubePlayer({ id, title }: { id: string; title: string }) {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`}
      title={title}
      allow="fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}

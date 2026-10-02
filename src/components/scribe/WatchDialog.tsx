import { useEffect, useRef } from "react";
import type { ScribeContent } from "./content";

export default function WatchDialog({
  film,
  films,
  onSelect,
  onClose,
}: {
  film: ScribeContent;
  films: ScribeContent[];
  onSelect: (film: ScribeContent) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const next =
    films.find((item) => film.relatedContent?.includes(item.id)) ??
    films[(films.findIndex((item) => item.id === film.id) + 1) % films.length];
  return (
    <dialog
      ref={dialog}
      className="scribe-player"
      aria-label={`${film.title} / ${film.watchLabel}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button className="scribe-player-close" onClick={onClose} autoFocus>
        CLOSE ×
      </button>
      <p className="scribe-meta">
        {film.title} / {film.watchLabel}
      </p>
      {film.youtubeVideoId ? (
        <iframe
          key={film.id}
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.youtubeVideoId)}`}
          title={film.watchLabel}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          key={film.id}
          src={film.localFilm}
          poster={film.thumbnail}
          controls
          playsInline
          preload="metadata"
        />
      )}
      {film.duration && <p className="scribe-meta">{film.duration}</p>}
      {film.credits?.map((credit) => (
        <p key={credit}>{credit}</p>
      ))}
      {next && next.id !== film.id && (
        <button className="scribe-watch-next" onClick={() => onSelect(next)}>
          WATCH NEXT ↗ <span>{next.watchLabel}</span>
        </button>
      )}
    </dialog>
  );
}

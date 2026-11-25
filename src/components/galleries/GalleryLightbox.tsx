import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { PhotoPreview } from "./types";
import { PhotoImage } from "./PhotoImage";
export function GalleryLightbox({
  photos,
  index,
  setIndex,
  download,
  message,
  busy,
}: {
  photos: PhotoPreview[];
  index: number | null;
  setIndex: (i: number | null) => void;
  download?: (photo: PhotoPreview) => void;
  message: string;
  busy: boolean;
}) {
  const active = index === null ? null : photos[index];
  const touch = useRef<{ x: number; y: number } | null>(null);
  const next = (delta: number) => {
    if (index !== null && photos.length) setIndex((index + delta + photos.length) % photos.length);
  };
  useEffect(() => {
    if (index === null) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((index + (e.key === "ArrowRight" ? 1 : -1) + photos.length) % photos.length);
      }
      if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        setIndex(photos.length - 1);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [index, photos.length, setIndex]);
  return (
    <Dialog.Root
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) setIndex(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dg-lightbox-overlay" />
        <Dialog.Content
          className="dg-lightbox"
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) touch.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const t = e.changedTouches[0],
              start = touch.current;
            touch.current = null;
            if (t && start) {
              const dx = t.clientX - start.x,
                dy = t.clientY - start.y;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) next(dx < 0 ? 1 : -1);
            }
          }}
        >
          <div className="dg-lightbox-top">
            <Dialog.Title>
              DEPT. GALLERIES{" "}
              <span>
                {index !== null ? String(index + 1).padStart(2, "0") : ""} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
            </Dialog.Title>
            <Dialog.Close className="dg-button" aria-label="Close photo">
              CLOSE ×
            </Dialog.Close>
          </div>
          <Dialog.Description className="dg-sr">
            Photo viewer. Use left and right arrow keys, swipe, or the previous and next buttons.
            Escape closes the viewer.
          </Dialog.Description>
          {active && (
            <div className="dg-lightbox-stage">
              <button
                className="dg-lightbox-arrow"
                aria-label="Previous photo"
                onClick={() => next(-1)}
                disabled={photos.length < 2}
              >
                ←
              </button>
              <figure>
                <PhotoImage key={active.id} photo={active} eager />
                <figcaption aria-live="polite">{active.alt}</figcaption>
              </figure>
              <button
                className="dg-lightbox-arrow"
                aria-label="Next photo"
                onClick={() => next(1)}
                disabled={photos.length < 2}
              >
                →
              </button>
            </div>
          )}
          <div className="dg-lightbox-bottom">
            <div>
              <p>THE DEPT COLLECTIVE / PHOTOGRAPHY</p>
              {active?.credit_url && (
                <a href={active.credit_url} target="_blank" rel="noreferrer">
                  Photographer & source ↗
                </a>
              )}
            </div>
            {active && download && (
              <button className="dg-button" disabled={busy} onClick={() => download(active)}>
                {busy ? "Preparing…" : "Download original ↓"}
              </button>
            )}
          </div>
          {message && (
            <p role="status" className="dg-lightbox-notice">
              {message}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

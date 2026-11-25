import { useEffect, useState } from "react";
import { GalleryShell, GalleryLoading, GalleryMessage } from "./GalleryShell";
import { galleryService, lockGallery, unlockGalleryLink } from "./service";
import type { GalleryAccess, GalleryView } from "./types";
import { PhotoImage } from "./PhotoImage";
import { GalleryLightbox } from "./GalleryLightbox";
import { PrivateGalleryAccess } from "./PrivateGalleryAccess";
export function GalleryCollection({
  gallery,
  privateAccess = false,
  onLock,
}: {
  gallery: GalleryView;
  privateAccess?: boolean;
  onLock?: () => void;
}) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <main className="dg-detail">
      <header className="dg-cover">
        {gallery.cover && <PhotoImage photo={gallery.cover} eager />}
        <div className="dg-cover-caption">
          <span className="dg-label">
            {privateAccess ? "PRIVATE COLLECTION" : gallery.category}
          </span>
          <h1>{gallery.title}</h1>
          <p>
            {String(gallery.photo_count ?? gallery.photos.length).padStart(2, "0")} PHOTOGRAPHS{" "}
            <span>SCROLL TO EXPLORE ↓</span>
          </p>
        </div>
      </header>
      <section className="dg-gallery-intro">
        <a href="/galleries" className="dg-text-link">
          ← All collections
        </a>
        <div>
          <p>{gallery.description}</p>
          <span className="dg-label">THE DEPT COLLECTIVE / PHOTOGRAPHY</span>
        </div>
      </section>
      <div className="dg-gallery-toolbar">
        <span className="dg-label">
          THE COLLECTION / {String(gallery.photo_count ?? gallery.photos.length).padStart(2, "0")}{" "}
          FRAMES
        </span>
        <div>
          {privateAccess && (
            <button className="dg-button" onClick={onLock}>
              Lock gallery
            </button>
          )}
          {gallery.has_download && (
            <a
              className="dg-button"
              href={`/api/galleries/${encodeURIComponent(gallery.slug)}?download=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Photos ↓
            </a>
          )}
        </div>
      </div>
      {!gallery.photos.length ? (
        <GalleryMessage title="A collection in the making.">
          <p>The photographs will appear here when they are ready.</p>
        </GalleryMessage>
      ) : (
        <div className="dg-photo-grid">
          {gallery.photos.map((p, i) => (
            <figure key={p.id}>
              <button
                className="dg-photo-button"
                onClick={() => setIndex(i)}
                aria-label={"Open photo " + (i + 1) + ": " + p.alt}
              >
                <PhotoImage photo={p} />
                <span className="dg-photo-open" aria-hidden="true">
                  OPEN ↗
                </span>
              </button>
              <figcaption>
                <span className="dg-label">FRAME / {String(i + 1).padStart(2, "0")}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <GalleryLightbox
        photos={gallery.photos}
        index={index}
        setIndex={setIndex}
        message=""
        busy={false}
      />
    </main>
  );
}
export function GalleryDetail({ slug }: { slug: string }) {
  const [access, setAccess] = useState<GalleryAccess | null>(null);

  const [error, setError] = useState(false);
  useEffect(() => {
    setAccess(null);

    setError(false);
    const c = new AbortController();
    const shareKey = new URLSearchParams(location.hash.slice(1)).get("access");
    const initial =
      shareKey && /^[a-f0-9]{64}$/.test(shareKey)
        ? unlockGalleryLink(slug, shareKey, c.signal)
        : galleryService.resolve(slug, c.signal);
    initial
      .then((result) => {
        if (c.signal.aborted) return;
        if (shareKey && result.state === "authorized")
          history.replaceState(history.state, "", location.pathname + location.search);
        setAccess(result);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    const recheck = () => {
      void galleryService
        .resolve(slug, c.signal)
        .then(setAccess)
        .catch(() => setAccess({ state: "locked" }));
    };
    const timer = setInterval(recheck, 30000);
    window.addEventListener("focus", recheck);
    return () => {
      c.abort();
      clearInterval(timer);
      window.removeEventListener("focus", recheck);
    };
  }, [slug]);
  return (
    <GalleryShell>
      {error ? (
        <GalleryMessage title="A moment, please.">
          <p>The gallery could not load. Refresh to try again.</p>
        </GalleryMessage>
      ) : !access ? (
        <GalleryLoading />
      ) : access.state === "not-found" ? (
        <GalleryMessage title="This collection isn’t here.">
          <p>The link may be incorrect, or the collection may not be published.</p>
        </GalleryMessage>
      ) : access.state === "public" ? (
        <GalleryCollection key={slug} gallery={access.gallery} />
      ) : access.state === "authorized" ? (
        <GalleryCollection
          key={slug}
          gallery={access.gallery}
          privateAccess
          onLock={() => {
            setAccess({ state: "locked" });
            void lockGallery(slug).catch(() => setError(true));
          }}
        />
      ) : (
        <PrivateGalleryAccess
          key={slug}
          slug={slug}
          initialExpired={access.state === "expired"}
          onUnlock={(gallery) => setAccess({ state: "authorized", gallery })}
        />
      )}
    </GalleryShell>
  );
}

import { useEffect, useState } from "react";
import { GalleryShell, GalleryLoading, GalleryMessage } from "./GalleryShell";
import { galleryService } from "./service";
import type { GalleryView } from "./types";
import { PhotoImage } from "./PhotoImage";
export function GalleryDirectory() {
  const [galleries, setGalleries] = useState<GalleryView[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("ALL");
  useEffect(() => {
    const c = new AbortController();
    const refresh = () =>
      galleryService
        .listPublic(c.signal)
        .then((list) => {
          setGalleries(list);
          setError(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setError(true);
            setGalleries(null);
          }
        });
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    return () => {
      c.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const shown = galleries?.filter((g) => filter === "ALL" || g.category.startsWith(filter));
  return (
    <GalleryShell>
      <main className="dg-directory">
        <header className="dg-directory-heading">
          <div className="dg-heading-top">
            <span className="dg-label">STILL IMAGES. LASTING STORIES.</span>
            <span className="dg-label">TORONTO / CANADA</span>
          </div>
          <h1>
            DEPT.
            <br />
            <span>GALLERIES</span>
          </h1>
          <div className="dg-heading-bottom">
            <p>A collection of moments, captured.</p>
            <span className="dg-label">PHOTOGRAPHY / SELECTED COLLECTIONS</span>
          </div>
        </header>
        <div className="dg-directory-tools">
          <div className="dg-filters" aria-label="Filter collections">
            {["ALL", ...new Set(galleries?.map((g) => g.category).filter(Boolean) || [])].map(
              (f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f}
                  {f === "ALL" && galleries
                    ? ` / ${String(galleries.length).padStart(2, "0")}`
                    : ""}
                </button>
              ),
            )}
          </div>
          <span className="dg-label">SELECTED COLLECTIONS</span>
        </div>
        {error ? (
          <GalleryMessage title="A moment, please.">
            <p>The gallery directory couldn’t load. Please refresh and try again.</p>
          </GalleryMessage>
        ) : !galleries ? (
          <GalleryLoading />
        ) : !shown?.length ? (
          <GalleryMessage title="The next collection is on its way.">
            <p>There are no public collections in this selection.</p>
            <button onClick={() => setFilter("ALL")}>View all collections</button>
          </GalleryMessage>
        ) : (
          <div className="dg-collection-grid">
            {shown.map((g, i) => (
              <a className="dg-collection-card" href={"/galleries/" + g.slug} key={g.id}>
                {g.cover && (
                  <div className="dg-collection-visual">
                    <PhotoImage photo={g.cover} eager={i === 0} />
                    <span className="dg-view-indicator">VIEW COLLECTION ↗</span>
                  </div>
                )}
                <div className="dg-collection-meta">
                  <span className="dg-label">{g.category}</span>
                  <span className="dg-label">
                    {String(g.photo_count ?? g.photos.length).padStart(2, "0")} PHOTOGRAPHS
                  </span>
                </div>
                <div className="dg-collection-title">
                  <h2>{g.title}</h2>
                  <span aria-hidden="true">↗</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </GalleryShell>
  );
}

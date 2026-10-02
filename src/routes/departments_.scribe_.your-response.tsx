import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ScribeHeader from "@/components/scribe/ScribeHeader";
import WatchDialog from "@/components/scribe/WatchDialog";
import { yourResponseSeries, type ScribeContent } from "@/components/scribe/content";
import "@/components/scribe/scribe.css";
import "@/components/scribe/series.css";

export const Route = createFileRoute("/departments_/scribe_/your-response")({
  head: () => ({ meta: [{ title: "Your Response? — The Films | The Scribe Dept." }] }),
  component: SeriesPage,
});
function SeriesPage() {
  const [selected, setSelected] = useState<ScribeContent | null>(null);
  return (
    <main className="scribe-page">
      <ScribeHeader />
      <header className="scribe-series-intro">
        <a className="scribe-meta" href="/departments/scribe">
          ← THE SCRIBE DEPT.
        </a>
        <p className="scribe-meta">A SCRIBE DEPT. ORIGINAL</p>
        <h1>{yourResponseSeries.title}</h1>
        <p className="scribe-series-theme">OUR RESPONSE SHOULD BE WORSHIP.</p>
        <p className="scribe-synopsis">{yourResponseSeries.description}</p>
      </header>
      <section className="scribe-series-films" aria-labelledby="films-heading">
        <div className="scribe-series-label">
          <h2 id="films-heading">THE FILMS</h2>
          <span>ORIGINAL SERIES / WORSHIP / 2026</span>
        </div>
        <div className="scribe-series-grid">
          {yourResponseSeries.films.map((film) => (
            <article key={film.id}>
              <button
                className="scribe-film-choice"
                onClick={() => setSelected(film)}
                aria-label={`Watch ${film.watchLabel}`}
              >
                <div className="scribe-series-poster">
                  <img
                    src={film.thumbnail}
                    alt={film.heroMedia.alt}
                    loading="lazy"
                    width={360}
                    height={640}
                  />
                </div>
                <div className="scribe-film-label">
                  <span>{film.watchLabel}</span>
                  <span>WATCH ↗</span>
                </div>
                {film.duration && <span className="scribe-meta">{film.duration}</span>}
              </button>
            </article>
          ))}
        </div>
      </section>
      {selected && (
        <WatchDialog
          film={selected}
          films={yourResponseSeries.films}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

import WatchDialog from "./WatchDialog";
import { yourResponseFilms } from "./content";
import { useState } from "react";
import type { ScribeContent } from "./content";

export default function FeaturedHero({ content }: { content: ScribeContent }) {
  const [selected, setSelected] = useState<ScribeContent | null>(null);
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
          <button onClick={() => setSelected(content)} className="scribe-watch">
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
      {selected && (
        <WatchDialog
          film={selected}
          films={yourResponseFilms}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

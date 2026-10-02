import { scribeNavigation } from "./content";
export default function ScribeHeader() {
  return (
    <header className="scribe-header">
      <a className="scribe-brand" href="/departments/scribe">
        THE SCRIBE DEPT.<small>A DEPARTMENT OF DEPT. COLLECTIVE</small>
      </a>
      <nav aria-label="Scribe navigation">
        {scribeNavigation.map((item) =>
          item.href ? (
            <a
              key={item.label}
              href={item.href === "#watch" ? "/departments/scribe#watch" : item.href}
            >
              {item.label}
            </a>
          ) : (
            <button key={item.label} disabled title={`${item.label} — coming soon`}>
              {item.label}
              <span className="sr-only"> — coming soon</span>
            </button>
          ),
        )}
      </nav>
      <a className="scribe-parent" href="/">
        DEPT. COLLECTIVE ↗
      </a>
    </header>
  );
}

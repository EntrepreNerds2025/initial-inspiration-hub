import { useState } from "react";
import { packageCategories, packageInquiryHref, packagePrice } from "./packages-data";

export default function PackageBrowser() {
  const [opened, setOpened] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  return (
    <div className="package-browser" id="explore-packages">
      {packageCategories.map((category) => {
        const expanded = opened === category.id;
        const selected =
          category.tiers.find((tier) => tier.inquiryKey === selections[category.id]) ??
          category.tiers[0]!;
        const panelId = `package-${category.id}-panel`;
        const controlId = `package-${category.id}-control`;
        const startingPrice = category.tiers[0]!.price;
        return (
          <section key={category.id} className={`package-entry ${expanded ? "package-open" : ""}`}>
            <h2>
              <button
                id={controlId}
                className="package-row"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpened(expanded ? null : category.id)}
              >
                <span className="package-number">{category.number}</span>
                <span className="package-name">{category.name}</span>
                <span className="package-row-price">
                  {startingPrice ? `FROM $${startingPrice.toLocaleString("en-CA")}` : "LET'S TALK"}
                </span>
                <span className="package-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={controlId}
              className="package-panel"
              inert={!expanded}
              aria-hidden={!expanded}
            >
              <div className="package-panel-clip">
                <div className="package-dossier">
                  {category.tiers.length > 1 && (
                    <div
                      className="package-tiers"
                      role="group"
                      aria-label={`${category.name} starting points`}
                    >
                      {category.tiers.map((tier) => (
                        <button
                          key={tier.inquiryKey}
                          aria-pressed={tier.inquiryKey === selected.inquiryKey}
                          onClick={() =>
                            setSelections((previous) => ({
                              ...previous,
                              [category.id]: tier.inquiryKey,
                            }))
                          }
                        >
                          <span>{tier.name}</span>
                          <small>
                            {tier.inquiryKey === selected.inquiryKey ? "SELECTED" : "SELECT"}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="package-detail-grid">
                    <div className="package-summary">
                      <p className="packages-meta">YOUR STARTING POINT</p>
                      <h3>{selected.name}</h3>
                      <p className="package-price">{packagePrice(selected)}</p>
                      {selected.tagline && <p className="package-tagline">{selected.tagline}</p>}
                      <p className="package-description">{selected.description}</p>
                      <a className="package-build" href={packageInquiryHref(selected.inquiryKey)}>
                        {selected.ctaLabel} <span aria-hidden="true">↗</span>
                      </a>
                      <p className="package-handoff">
                        Continue to our contact form to tell us about your project.
                      </p>
                    </div>
                    <div className="package-inclusions">
                      <p className="packages-meta">{selected.includesLabel ?? "INCLUDES"}</p>
                      <ul>
                        {selected.deliverables.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      {selected.notes?.map((note) => (
                        <p key={note} className="package-note">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

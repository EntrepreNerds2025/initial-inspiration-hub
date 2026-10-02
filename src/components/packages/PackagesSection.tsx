import PackageBrowser from "./PackageBrowser";
import "./packages.css";

export default function PackagesSection() {
  return (
    <section className="packages-page" id="packages" aria-labelledby="packages-heading">
      <header className="packages-intro">
        <p className="packages-meta">06 / PACKAGES / STARTING POINTS</p>
        <h2 id="packages-heading">
          EVERY PROJECT
          <br />
          STARTS SOMEWHERE.
        </h2>
        <div className="packages-intro-bottom">
          <p>
            Choose a starting point.
            <br />
            We'll shape the production around the story.
          </p>
        </div>
      </header>
      <PackageBrowser />
      <p className="packages-disclaimer">
        Starting prices are based on standard local productions. Final pricing is based on coverage,
        crew, equipment, location and deliverables.
      </p>
    </section>
  );
}

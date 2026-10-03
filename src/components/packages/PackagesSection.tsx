import PackageBrowser from "./PackageBrowser";
import "./packages.css";

export default function PackagesSection() {
  return (
    <section className="packages-page" id="packages" aria-labelledby="packages-heading">
      <header className="packages-intro">
        <p className="packages-meta">04 / THE COLLECTIVE</p>
        <h2 id="packages-heading">
          WHAT
          <br />
          WE DO.
        </h2>
      </header>
      <PackageBrowser />
      <p className="packages-disclaimer">
        Starting prices are based on standard local productions. Final pricing is based on coverage,
        crew, equipment, location and deliverables.
      </p>
    </section>
  );
}

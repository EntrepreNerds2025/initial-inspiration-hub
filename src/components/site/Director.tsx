import portrait from "@/assets/riann-portrait.jpg";
import "./collective.css";

// Replace the source to update the photograph; adjust the focal point only if needed.
const founderImage = { src: portrait, position: "50% 40%" };

export default function Director() {
  return (
    <section id="director" className="dept-collective" aria-labelledby="collective-heading">
      <header className="collective-intro">
        <p className="collective-meta">05 / THE COLLECTIVE</p>
        <h2 id="collective-heading">
          <span>BUILT TO</span>
          <span>TELL STORIES.</span>
        </h2>
      </header>
      <div className="collective-statement">
        <p className="collective-meta collective-studio-label">
          DEPT. COLLECTIVE
          <br />
          TORONTO / CANADA
        </p>
        <div className="collective-copy">
          <p>
            Dept. Collective is a Toronto-based visual storytelling studio built around
            collaboration.
          </p>
          <p>
            We bring together the right people, perspectives and disciplines for each story — from
            documentary and branded films to live productions and original work.
          </p>
          <div className="collective-belief">
            <p>The goal isn't simply to capture what happened.</p>
            <p>It's to find what makes it worth watching.</p>
          </div>
        </div>
      </div>
      <figure className="collective-founder">
        <div className="collective-photo">
          <img
            src={founderImage.src}
            alt="Riann Grant, founder of Dept. Collective, photographed outdoors"
            width={1200}
            height={1200}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: founderImage.position }}
          />
        </div>
        <figcaption>
          <p className="collective-meta">DC / FOUNDER</p>
          <h3>RIANN GRANT</h3>
          <p className="collective-meta">
            FOUNDER / FILMMAKER
            <br />
            TORONTO / CANADA
          </p>
        </figcaption>
      </figure>
      <div
        className="collective-principles"
        aria-label="Our approach: observe, collaborate, create"
      >
        <p>OBSERVE.</p>
        <p>COLLABORATE.</p>
        <p>CREATE.</p>
      </div>
    </section>
  );
}

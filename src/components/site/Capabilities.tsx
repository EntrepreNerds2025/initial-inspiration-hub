import { useState } from "react";
import ProjectInquiry from "./ProjectInquiry";
import "./capabilities.css";

type Service = {
  id: string;
  title: string;
  description: string;
  detail: string;
  media?: { src: string; poster: string };
};

const capabilities: Service[] = [
  {
    id: "documentary",
    title: "DOCUMENTARY & STORYTELLING",
    description:
      "Human-led films built around real people, experiences and stories. From short documentaries and profiles to original films, we find the moments that make the story worth watching.",
    detail: "SHORT DOCS / PROFILES / INTERVIEWS / ORIGINAL FILMS",
  },
  {
    id: "branded",
    title: "BRANDED FILMS & CREATIVE CONTENT",
    description:
      "Story-driven content created for brands, organizations and ideas. From a single social film to a larger creative concept, we create work designed to connect with the people you're trying to reach.",
    detail: "BRAND STORIES / SOCIAL CONTENT / CAMPAIGNS / CREATIVE FILMS",
  },
  {
    id: "live",
    title: "LIVE & EVENT PRODUCTION",
    description:
      "From conferences and conversations to concerts and live experiences, we capture events with intention. Whether you need polished multi-camera coverage, a complete event recording, or a story-driven highlight film, we build the production around the moment.",
    detail: "CONFERENCES / PANELS / PERFORMANCES / MULTI-CAMERA / EVENT FILMS / LIVE CAPTURE",
  },
  {
    id: "production",
    title: "CINEMATOGRAPHY & PRODUCTION",
    description:
      "Need the production without a full Dept. Collective creative? We can join an existing project to help bring the vision to screen through cinematography, camera operation and production support.",
    detail: "CINEMATOGRAPHY / CAMERA / DIRECTION / PRODUCTION SUPPORT",
  },
];

export default function Capabilities() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <section className="dept-capabilities" aria-labelledby="capabilities-heading">
      <header className="capabilities-heading">
        <p>04 / THE COLLECTIVE</p>
        <h2 id="capabilities-heading">
          WHAT
          <br />
          WE DO.
        </h2>
      </header>
      <ol className="capabilities-index">
        {capabilities.map((capability, index) => {
          const selected = active === capability.id;
          const controlId = `service-${capability.id}`;
          const panelId = `${controlId}-description`;
          return (
            <li
              key={capability.id}
              className={selected ? "capability-active" : ""}
              onPointerEnter={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  window.matchMedia("(min-width: 1000px) and (hover: hover) and (pointer: fine)")
                    .matches
                )
                  setActive(capability.id);
              }}
              onPointerLeave={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  !event.currentTarget.contains(document.activeElement)
                )
                  setActive((current) => (current === capability.id ? null : current));
              }}
            >
              <h3 className="capability-title">
                <button
                  id={controlId}
                  type="button"
                  className="capability-row"
                  aria-expanded={selected}
                  aria-controls={panelId}
                  onFocus={(event) => {
                    // Pointer focus must not pre-toggle a touch disclosure.
                    if (event.currentTarget.matches(":focus-visible")) setActive(capability.id);
                  }}
                  onClick={() =>
                    setActive((current) => (current === capability.id ? null : capability.id))
                  }
                >
                  <span className="capability-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="capability-name">{capability.title}</span>
                  <span className="capability-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                className="capability-disclosure"
                role="region"
                aria-labelledby={controlId}
                aria-hidden={!selected}
                inert={!selected}
              >
                <div className="capability-disclosure-clip">
                  <div className="capability-description">
                    <p>{capability.description}</p>
                    <p className="capability-detail">{capability.detail}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="capabilities-inquiry">
        <ProjectInquiry />
      </div>
    </section>
  );
}

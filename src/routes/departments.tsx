import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/site/Navbar";
import ProjectInquiry from "@/components/site/ProjectInquiry";
import { departments, type Department } from "@/components/site/departments-data";
import "@/components/site/hero.css";
import "@/components/site/departments.css";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "The Departments | Dept. Collective" },
      {
        name: "description",
        content:
          "Different disciplines. One collective approach to storytelling. Discover The Scribe Dept., within Dept. Collective.",
      },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentEntry({ department }: { department: Department }) {
  return (
    <section className="department-entry" aria-labelledby={`department-${department.number}`}>
      <div className="department-entry-label">
        {department.number} / {department.name}
      </div>
      <div className={`department-composition ${!department.media ? "department-text-only" : ""}`}>
        <div className="department-copy">
          <h2 id={`department-${department.number}`}>
            {department.title.map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
          <p className="department-meta">{department.descriptor}</p>
          <p className="department-statement">
            {department.statement.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          {department.status === "published" ? (
            <a className="department-enter" href={department.externalUrl ?? department.route}>
              ENTER DEPARTMENT ↗
            </a>
          ) : (
            <>
              <button
                className="department-enter"
                disabled
                aria-describedby={`department-status-${department.number}`}
              >
                ENTER DEPARTMENT ↗
              </button>
              <p className="department-status" id={`department-status-${department.number}`}>
                The dedicated department page is not yet open.
              </p>
              <a className="department-archive-link" href="/#work">
                EXPLORE YOUR RESPONSE? IN THE ARCHIVE ↗
              </a>
            </>
          )}
        </div>
        {department.media && (
          <figure className="department-film">
            <div className="department-film-frame">
              <img src={department.media.poster} alt={department.media.alt} loading="lazy" />
            </div>
            <figcaption>{department.media.caption}</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
function DepartmentsPage() {
  return (
    <>
      <Navbar homePage={false} />
      <main className="departments-page" id="top">
        <header className="departments-hero">
          <p className="department-meta">DEPT. COLLECTIVE / DEPARTMENTS</p>
          <h1>
            THE
            <br />
            <span>DEPARTMENTS.</span>
          </h1>
          <p className="departments-intro">
            Different disciplines.
            <br />
            One collective approach to storytelling.
          </p>
        </header>
        <div
          className="department-lineage"
          aria-label="The departments within the Dept. Collective ecosystem"
        >
          <span>DEPT. COLLECTIVE</span>
          <span aria-hidden="true">↓</span>
          <span>THE SCRIBE DEPT. / DEARLY</span>
        </div>
        {departments.map((department) => (
          <DepartmentEntry key={department.number} department={department} />
        ))}
        <footer className="departments-exit">
          <ProjectInquiry href="/#contact" />
          <a href="/#top">BACK TO THE COLLECTIVE ↗</a>
        </footer>
      </main>
    </>
  );
}

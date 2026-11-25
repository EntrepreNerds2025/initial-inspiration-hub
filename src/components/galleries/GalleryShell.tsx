import type { ReactNode } from "react";
import Navbar from "@/components/site/Navbar";
import "@/components/site/hero.css";
import "./galleries.css";
export function GalleryShell({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  return (
    <div className="dg">
      <Navbar homePage={false} />
      <div className="dg-brandline">
        <a href="/galleries">DEPT. / GALLERIES</a>
        <span>{admin ? "ADMINISTRATION" : "A COLLECTION BY THE DEPT COLLECTIVE"}</span>
      </div>
      {children}
      <footer className="dg-footer">
        <div>
          <a className="dg-footer-brand" href="/">
            dept. collective
          </a>
          <p>A collection of moments, captured.</p>
        </div>
        <div>
          <span className="dg-label">THE DEPT COLLECTIVE / PHOTOGRAPHY</span>
          <nav aria-label="Gallery navigation">
            <a href="/galleries">Public collections ↗</a>
            <a href="/admin/galleries">Gallery administration ↗</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
export function GalleryLoading() {
  return (
    <div className="dg-loading" role="status" aria-live="polite">
      <span className="dg-label">DEPT. GALLERIES</span>
      <div className="dg-skeleton" />
      <p>Bringing the collection into view…</p>
    </div>
  );
}
export function GalleryMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dg-message">
      <span className="dg-label">DEPT. / GALLERIES</span>
      <h1>{title}</h1>
      <div>{children}</div>
      <a href="/galleries" className="dg-text-link">
        Back to collections ↗
      </a>
    </section>
  );
}

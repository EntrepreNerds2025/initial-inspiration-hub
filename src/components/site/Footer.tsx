import { Instagram, Youtube } from "lucide-react";
import "./contact.css";

export default function Footer() {
  return (
    <footer className="dept-footer">
      <div className="dept-footer-top">
        <div>
          <a href="/#top" className="dept-footer-wordmark" aria-label="Dept. Collective home">
            dept.
            <br />
            collective
          </a>
          <p className="dept-footer-description">
            VISUAL STORYTELLING STUDIO
            <br />
            TORONTO / CANADA
          </p>
          <div className="dept-footer-socials">
            <a
              href="https://www.instagram.com/thedeptcollective/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dept. Collective on Instagram (opens in a new tab)"
            >
              <Instagram size={20} aria-hidden="true" />
            </a>
            <a
              href="https://www.youtube.com/@thedeptcollective"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dept. Collective on YouTube (opens in a new tab)"
            >
              <Youtube size={22} aria-hidden="true" />
            </a>
          </div>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/#work">ARCHIVE</a>
          <a href="/#packages">WHAT WE DO</a>
          <a href="/departments">DEPARTMENTS</a>
          <a href="/#director">ABOUT</a>
        </nav>
      </div>
      <div className="dept-footer-bottom">
        <span>© {new Date().getFullYear()} DEPT. COLLECTIVE</span>
        <a href="#top">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}

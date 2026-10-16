import { useEffect, useRef, useState } from "react";
import deptLogo from "@/assets/dept-logo-beige.png";

const links = [
  { label: "Work", href: "#work" },
  { label: "Departments", href: "/departments" },
  { label: "Packages", href: "#packages" },
  { label: "The Collective", href: "#director" },
  { label: "Contact", href: "#contact" },
  { label: "Screening Room", href: "/screening-room" },
];

export default function Navbar({ homePage = true }: { homePage?: boolean }) {
  const [pastHero, setPastHero] = useState(!homePage);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!homePage) {
        setPastHero(true);
        return;
      }
      const hero = document.getElementById("top");
      const stage = hero?.querySelector<HTMLElement>(".dept-hero-stage");
      const end = hero ? hero.offsetHeight - (stage?.offsetHeight ?? window.innerHeight) : 0;
      setPastHero(window.scrollY > Math.max(40, end));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && nav.current?.contains(document.activeElement)) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
    };
  }, [homePage]);

  return (
    <nav
      ref={nav}
      aria-label="Main navigation"
      className={`dept-nav ${pastHero ? "dept-nav-past" : ""} ${open ? "dept-nav-open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="dept-nav-bar">
        <a
          href={homePage ? "#top" : "/#top"}
          className="dept-nav-brand"
          aria-label="Dept. Collective home"
          onClick={() => setOpen(false)}
        >
          <img src={deptLogo} alt="" width={48} height={34} />
        </a>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="dept-main-links"
          onClick={() => setOpen(!open)}
        >
          {open ? "CLOSE −" : "MENU +"}
        </button>
        <ul id="dept-main-links" className="dept-nav-links">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={!homePage && link.href.startsWith("#") ? `/${link.href}` : link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

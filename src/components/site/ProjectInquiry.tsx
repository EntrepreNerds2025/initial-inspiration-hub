import "./project-inquiry.css";

export default function ProjectInquiry({ prominent = false }: { prominent?: boolean }) {
  return (
    <a
      className={`project-inquiry${prominent ? " project-inquiry-prominent" : ""}`}
      href="#contact"
    >
      START YOUR PROJECT <span aria-hidden="true">↗</span>
    </a>
  );
}

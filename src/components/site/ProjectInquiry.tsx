import "./project-inquiry.css";

export default function ProjectInquiry({
  prominent = false,
  href = "#contact",
}: {
  prominent?: boolean;
  href?: string;
}) {
  return (
    <a className={`project-inquiry${prominent ? " project-inquiry-prominent" : ""}`} href={href}>
      START YOUR PROJECT <span aria-hidden="true">↗</span>
    </a>
  );
}

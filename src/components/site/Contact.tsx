import { useEffect, useRef } from "react";
import { packageCategories } from "../packages/packages-data";
import "./contact.css";

const contactEmail = "hello@thedeptcollective.com";
const fieldClass = "contact-field";

export default function Contact() {
  const serviceRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const packageKey = new URLSearchParams(window.location.search).get("package");
    const category = packageCategories.find((item) =>
      item.tiers.some((tier) => tier.inquiryKey === packageKey),
    );
    // Prefill once on arrival via a package CTA; subsequent manual choices remain intact.
    if (category && serviceRef.current && !serviceRef.current.value) {
      serviceRef.current.value = category.inquiryLabel;
    }
  }, []);
  return (
    <section id="contact" className="dept-contact" aria-labelledby="contact-inquiry-heading">
      <div className="contact-inquiry" aria-labelledby="contact-inquiry-heading">
        <h2 id="contact-inquiry-heading">WANT TO TALK IT THROUGH?</h2>
        <p className="contact-inquiry-intro">Tell us a little about what you're thinking.</p>
        <form
          action={`https://formsubmit.co/${contactEmail}`}
          method="POST"
          className="contact-inquiry-form"
        >
          <input type="hidden" name="_subject" value="New inquiry — The Department Collective" />
          <input type="hidden" name="_template" value="table" />
          <input
            type="text"
            name="_honey"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <p className="mb-7 text-xs text-ink-dim">
            Fields marked <span className="text-accent">*</span> are required.
          </p>
          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="text-sm">
                Name <span className="text-accent">*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
                maxLength={120}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="text-sm">
                Email <span className="text-accent">*</span>
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-organization" className="text-sm">
                Organization
              </label>
              <input
                id="contact-organization"
                name="organization"
                autoComplete="organization"
                placeholder="Your organization (optional)"
                maxLength={200}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-service" className="text-sm">
                What are you interested in? <span className="text-accent">*</span>
              </label>
              <select
                ref={serviceRef}
                id="contact-service"
                name="service"
                required
                defaultValue=""
                className={fieldClass}
              >
                <option value="" disabled>
                  SELECT ONE
                </option>
                {packageCategories.map((category) => (
                  <option key={category.id} value={category.inquiryLabel}>
                    {category.inquiryLabel}
                  </option>
                ))}
                <option value="Not Sure Yet">Not Sure Yet</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className="text-sm">
                Message <span className="text-accent">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                maxLength={10000}
                placeholder="Tell us about your project or inquiry…"
                className={`${fieldClass} min-h-48 resize-y`}
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 bg-accent px-6 py-4 text-xs font-medium uppercase tracking-wide2 text-bg transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            START YOUR PROJECT <span aria-hidden="true">↗</span>
          </button>
          <p className="mt-4 text-xs leading-relaxed text-ink-dim">
            Your message is sent through FormSubmit. You may be asked to complete a spam check.
          </p>
        </form>
      </div>
      <dl className="contact-information">
        <div>
          <dt>GENERAL INQUIRIES</dt>
          <dd>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </dd>
        </div>
        <div>
          <dt>BASED IN</dt>
          <dd>TORONTO / CANADA</dd>
        </div>
        <div>
          <dt>AVAILABLE FOR</dt>
          <dd>PROJECTS / PRODUCTIONS / COLLABORATIONS</dd>
        </div>
      </dl>
    </section>
  );
}

import { ArrowUpRight, Mail, Send } from "lucide-react";

const contactEmail = "hello@thedeptcollective.com";
const fieldClass =
  "mt-3 w-full rounded-lg border border-line bg-bg px-4 py-4 text-base text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export default function Contact() {
  return (
    <section id="contact" className="border-t border-line py-24 md:py-36">
      <div className="wrap">
        <div className="mb-14 text-center md:mb-20">
          <span className="label text-accent">Contact</span>
          <h2
            className="mt-6 mb-7 uppercase font-thin"
            style={{
              fontSize: "clamp(44px, 8vw, 128px)",
              lineHeight: 1.05,
              letterSpacing: "0.05em",
              fontWeight: 100,
            }}
          >
            Let&apos;s make
            <br />
            something
          </h2>
          <p className="mx-auto max-w-[440px] text-sm leading-[1.8] text-ink-dim">
            For commissions, collaborations, and commercial inquiries, tell us what you&apos;re
            dreaming up.
          </p>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <form
            action={`https://formsubmit.co/${contactEmail}`}
            method="POST"
            className="rounded-2xl border border-line bg-bg-soft p-6 sm:p-10 lg:p-12"
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
                  id="contact-service"
                  name="service"
                  required
                  defaultValue=""
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>Commercial &amp; brand films</option>
                  <option>Creative direction</option>
                  <option>Film production</option>
                  <option>Editing &amp; post-production</option>
                  <option>Collaboration</option>
                  <option>Something else</option>
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
              Send message <Send size={18} aria-hidden="true" />
            </button>
            <p className="mt-4 text-xs leading-relaxed text-ink-dim">
              Your message is sent through FormSubmit. You may be asked to complete a spam check.
            </p>
          </form>

          <aside className="lg:py-8">
            <h3 className="text-2xl font-light sm:text-3xl">Prefer to reach out directly?</h3>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-7 inline-flex max-w-full items-start gap-4 text-base text-ink-dim transition-colors hover:text-accent sm:text-lg"
            >
              <Mail className="mt-0.5 shrink-0 text-accent" size={24} aria-hidden="true" />
              <span className="break-all">{contactEmail}</span>
            </a>
            <div className="mt-10 border-t border-line pt-10">
              <h3 className="text-2xl font-light sm:text-3xl">Want to talk it through?</h3>
              <p className="mt-5 max-w-sm text-sm leading-[1.8] text-ink-dim">
                Let&apos;s start with a conversation about your idea, your story, and what we can
                create together.
              </p>
              <a
                href={`mailto:${contactEmail}?subject=Let%27s%20book%20a%20project%20call`}
                className="mt-7 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm text-accent transition-colors hover:text-ink"
              >
                Arrange a call <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

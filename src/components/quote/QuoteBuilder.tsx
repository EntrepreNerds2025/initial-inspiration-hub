import { useEffect, useReducer, useRef } from "react";
import Navbar from "../site/Navbar";
import { packageCategories, packagePrice } from "../packages/packages-data";
import {
  findPackage,
  questions,
  stages,
  serviceLabel,
  validate,
  submission,
  sendProject,
  type Answers,
} from "./quote-model";
import "./quote.css";

type State = {
  screen: string;
  answers: Answers;
  confirmed: boolean;
  error: string;
  status: "idle" | "sending" | "success" | "error";
  editing: boolean;
};
type Action =
  | { type: "answer"; key: string; value: string | string[] }
  | { type: "screen"; screen: string; editing?: boolean }
  | { type: "service"; service: string }
  | { type: "change" }
  | { type: "error"; message: string }
  | { type: "status"; status: State["status"] };
function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "answer":
      return { ...s, answers: { ...s.answers, [a.key]: a.value }, error: "" };
    case "screen":
      return { ...s, screen: a.screen, error: "", editing: a.editing ?? s.editing };
    case "service": {
      if (s.answers["service"] === a.service) return s;
      const category = packageCategories.find((c) => c.id === a.service);
      const shared = Object.fromEntries(
        Object.entries(s.answers).filter(([key]) =>
          [
            "dateStatus",
            "eventDate",
            "location",
            "venue",
            "coverage",
            "budget",
            "deliveryTimeline",
            "name",
            "email",
            "phone",
            "organization",
            "preferredContact",
            "additionalNotes",
          ].includes(key),
        ),
      );
      return {
        ...s,
        confirmed: false,
        answers: {
          ...shared,
          service: a.service,
          package: category?.tiers.length === 1 ? category.tiers[0]!.inquiryKey : "",
        },
        error: "",
      };
    }
    case "change":
      return { ...s, confirmed: false, screen: "project", error: "" };
    case "error":
      return { ...s, error: a.message };
    case "status":
      return { ...s, status: a.status };
  }
}
export default function QuoteBuilder({ packageKey }: { packageKey: string }) {
  const initial = findPackage(packageKey);
  const [state, dispatch] = useReducer(reducer, {
    screen: "welcome",
    answers: {
      service: initial?.category.id ?? "",
      package: initial?.tier.inquiryKey ?? "",
      preferredContact: "Email",
    },
    confirmed: !!initial,
    error: "",
    status: "idle",
    editing: false,
  });
  const { answers: a } = state;
  const qs = questions(a, state.confirmed);
  const ids = ["welcome", "project", ...qs.map((q) => q.id), "review"];
  const q = qs.find((item) => item.id === state.screen);
  const stage = state.screen === "review" ? 5 : (q?.stage ?? 0);
  const selected = findPackage(String(a["package"] ?? ""));
  const heading = useRef<HTMLHeadingElement>(null);
  const honey = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const answer = (key: string, value: string | string[]) =>
    dispatch({ type: "answer", key, value });
  function go(screen: string, editing = state.editing) {
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${screen}`,
    );
    dispatch({ type: "screen", screen, editing });
  }
  useEffect(() => {
    const onPop = () =>
      dispatch({ type: "screen", screen: window.location.hash.slice(1) || "welcome" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const received = state.status === "success";
  useEffect(() => {
    if (state.screen === "welcome" && !received) return;
    const frame = requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      const target = heading.current?.closest(".quote-body") ?? heading.current;
      if (target)
        window.scrollTo({
          top: window.scrollY + target.getBoundingClientRect().top - 125,
          behavior: "instant",
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.screen, received]);
  // Stale browser-history entries can reference a question removed by a branch change.
  const screenValid = ids.includes(state.screen);
  useEffect(() => {
    if (!screenValid) dispatch({ type: "screen", screen: "project" });
  }, [screenValid]);
  function next() {
    if (state.screen === "welcome") {
      go("project");
      return;
    }
    if (state.screen === "project") {
      if (!a["service"]) {
        dispatch({
          type: "error",
          message: "Choose a starting point. Not sure yet is welcome, too.",
        });
        return;
      }
      go(qs[0]!.id);
      return;
    }
    if (q) {
      const error = validate(q, a);
      if (error) {
        dispatch({ type: "error", message: error });
        return;
      }
      go(ids[ids.indexOf(q.id) + 1]!);
    }
  }
  async function submit() {
    if (busy.current) return;
    const invalid = qs.find((item) => validate(item, a));
    if (invalid) {
      go(invalid.id, true);
      dispatch({ type: "error", message: validate(invalid, a) });
      return;
    }
    if (!a["service"]) {
      go("project");
      return;
    }
    busy.current = true;
    dispatch({ type: "status", status: "sending" });
    try {
      await sendProject(submission(a, state.confirmed), honey.current?.value ?? "");
      dispatch({ type: "status", status: "success" });
    } catch {
      dispatch({ type: "status", status: "error" });
    } finally {
      busy.current = false;
    }
  }
  const title =
    state.screen === "welcome"
      ? "LET’S BUILD\nTHE PROJECT."
      : state.screen === "project"
        ? state.confirmed
          ? "TELL US A\nLITTLE MORE."
          : "WHAT ARE\nWE MAKING?"
        : state.screen === "review"
          ? "LOOKS LIKE\nWE HAVE A STORY."
          : (q?.title ?? "");
  const startingPoint = selected && (
    <div className="quote-starting">
      <span>YOUR STARTING POINT</span>
      <p>
        {selected.category.inquiryLabel} / {selected.tier.name}
      </p>
      <p>{packagePrice(selected.tier)}</p>
      <small>Starting point only. Final scope and pricing are reviewed with you.</small>
    </div>
  );
  if (state.status === "success")
    return (
      <>
        <Navbar homePage={false} />
        <main className="quote">
          <p className="quote-meta">PROJECT RECEIVED / DC</p>
          <h1 ref={heading} tabIndex={-1}>
            WE’LL TAKE IT
            <br />
            FROM HERE.
          </h1>
          <p>
            Thanks for sending the details.
            <br />
            We’ll review the project and follow up with next steps.
          </p>
          <a className="quote-action" href="/">
            BACK TO DEPT. COLLECTIVE ↗
          </a>
        </main>
      </>
    );
  return (
    <>
      <Navbar homePage={false} />
      <main className="quote">
        <nav className="quote-progress" aria-label="Project progress">
          {stages.map((label, i) => (
            <span
              key={label}
              aria-current={stage === i ? "step" : undefined}
              className={stage === i ? "current" : ""}
            >
              <b>{String(i + 1).padStart(2, "0")}</b> {label}
            </span>
          ))}
        </nav>
        <div className="quote-body" key={state.screen}>
          <aside className="quote-meta">
            {state.screen === "welcome"
              ? "START A PROJECT / DC"
              : `${String(stage + 1).padStart(2, "0")} / 06 — ${stages[stage]}`}
          </aside>
          <section aria-labelledby="quote-heading">
            <h1 id="quote-heading" ref={heading} tabIndex={-1}>
              {title}
            </h1>
            {state.screen === "welcome" && (
              <>
                <p className="quote-intro">
                  Tell us what you’re making.
                  <br />
                  We’ll figure out what the production needs.
                </p>
                {startingPoint}
              </>
            )}
            {state.screen === "project" &&
              (state.confirmed ? (
                <>
                  {startingPoint}
                  <button
                    className="quote-text-button"
                    onClick={() => dispatch({ type: "change" })}
                  >
                    CHANGE STARTING POINT
                  </button>
                </>
              ) : (
                <fieldset className="quote-options">
                  <legend className="sr-only">What are we making?</legend>
                  {[
                    ...packageCategories.map((c) => ({
                      id: c.id,
                      label: c.id === "custom" ? "Custom Production" : c.inquiryLabel,
                    })),
                    { id: "unsure", label: "I'm Not Sure Yet" },
                  ].map((c) => (
                    <label key={c.id}>
                      <input
                        type="radio"
                        name="service"
                        checked={a["service"] === c.id}
                        onChange={() => dispatch({ type: "service", service: c.id })}
                      />
                      <span>{c.label}</span>
                      <span aria-hidden="true">↗</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            {q && (
              <>
                {q.hint && (
                  <p id="question-hint" className="quote-hint">
                    {q.hint}
                  </p>
                )}
                {q.id === "budget" && startingPoint}
                {q.id === "deliverables" && (
                  <p className="quote-hint">
                    Select what you have in mind. These are scope requests, not automatically
                    included deliverables.
                  </p>
                )}
                {(q.kind === "choice" || q.kind === "multi") && (
                  <fieldset
                    className="quote-options"
                    aria-describedby={
                      state.error ? "quote-error" : q.hint ? "question-hint" : undefined
                    }
                  >
                    <legend className="sr-only">
                      {q.title}
                      {q.kind === "multi" ? " (select all that apply)" : ""}
                    </legend>
                    {q.kind === "multi" && (
                      <p className="quote-hint">
                        Select all that apply. You can also continue without choosing.
                      </p>
                    )}
                    {q.options?.map((o) => (
                      <label key={o.value}>
                        <input
                          type={q.kind === "multi" ? "checkbox" : "radio"}
                          name={q.id}
                          checked={
                            q.kind === "multi"
                              ? Array.isArray(a[q.id]) && (a[q.id] as string[]).includes(o.value)
                              : a[q.id] === o.value
                          }
                          onChange={() => {
                            if (q.kind === "multi") {
                              const previous = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
                              answer(
                                q.id,
                                previous.includes(o.value)
                                  ? previous.filter((v) => v !== o.value)
                                  : [...previous, o.value],
                              );
                            } else answer(q.id, o.value);
                          }}
                        />
                        <span>
                          {o.label}
                          {o.detail && <small>{o.detail}</small>}
                        </span>
                        <span aria-hidden="true">{q.kind === "multi" ? "+" : "↗"}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {(q.kind === "text" || q.kind === "date" || q.kind === "textarea") && (
                  <div className="quote-input">
                    <label className="sr-only" htmlFor={q.id}>
                      {q.title}
                    </label>
                    {q.kind === "textarea" ? (
                      <textarea
                        id={q.id}
                        value={String(a[q.id] ?? "")}
                        maxLength={6000}
                        rows={5}
                        required={q.required}
                        aria-describedby={
                          state.error ? "quote-error" : q.hint ? "question-hint" : undefined
                        }
                        onChange={(e) => answer(q.id, e.target.value)}
                      />
                    ) : (
                      <input
                        id={q.id}
                        type={q.kind === "date" ? "date" : "text"}
                        value={String(a[q.id] ?? "")}
                        maxLength={250}
                        required={q.required}
                        aria-describedby={
                          state.error ? "quote-error" : q.hint ? "question-hint" : undefined
                        }
                        onChange={(e) => answer(q.id, e.target.value)}
                      />
                    )}
                  </div>
                )}
                {q.kind === "contact" && (
                  <div className="quote-contact">
                    {[
                      { key: "name", label: "NAME", type: "text", auto: "name", required: true },
                      {
                        key: "email",
                        label: "EMAIL",
                        type: "email",
                        auto: "email",
                        required: true,
                      },
                      {
                        key: "phone",
                        label: "PHONE — OPTIONAL",
                        type: "tel",
                        auto: "tel",
                        required: false,
                      },
                      {
                        key: "organization",
                        label: "COMPANY / ORGANIZATION — OPTIONAL",
                        type: "text",
                        auto: "organization",
                        required: false,
                      },
                    ].map((f) => (
                      <label key={f.key}>
                        {f.label}
                        <input
                          type={f.type}
                          name={f.key}
                          autoComplete={f.auto}
                          required={f.required}
                          value={String(a[f.key] ?? "")}
                          maxLength={254}
                          onChange={(e) => answer(f.key, e.target.value)}
                          aria-describedby={state.error ? "quote-error" : undefined}
                        />
                      </label>
                    ))}
                    <label>
                      PREFERRED CONTACT METHOD
                      <select
                        value={String(a["preferredContact"])}
                        onChange={(e) => answer("preferredContact", e.target.value)}
                      >
                        <option>Email</option>
                        <option>Phone</option>
                        <option>Either is fine</option>
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}
            {state.screen === "review" && (
              <div className="quote-review">
                {[0, 1, 2, 3, 4].map((group) => (
                  <section key={group}>
                    <header>
                      <h2>{stages[group]}</h2>
                      <button
                        onClick={() =>
                          go(
                            group === 0 ? "project" : qs.find((item) => item.stage === group)!.id,
                            true,
                          )
                        }
                      >
                        EDIT <span className="sr-only">{stages[group]}</span>
                      </button>
                    </header>
                    {group === 0 ? (
                      <>
                        <p>{serviceLabel(String(a["service"]))}</p>
                        {startingPoint}
                        <button
                          className="quote-text-button"
                          onClick={() => {
                            dispatch({ type: "change" });
                            go("project", true);
                          }}
                        >
                          CHANGE STARTING POINT
                        </button>
                      </>
                    ) : (
                      <dl>
                        {qs
                          .filter((item) => item.stage === group)
                          .map((item) =>
                            item.kind === "contact" ? (
                              ["name", "email", "phone", "organization", "preferredContact"]
                                .filter((key) => a[key])
                                .map((key) => (
                                  <div key={key}>
                                    <dt>
                                      {key === "preferredContact"
                                        ? "PREFERRED CONTACT"
                                        : key.toUpperCase()}
                                    </dt>
                                    <dd>{String(a[key])}</dd>
                                  </div>
                                ))
                            ) : a[item.id]?.length ? (
                              <div key={item.id}>
                                <dt>{item.title}</dt>
                                <dd>
                                  {item.id === "package"
                                    ? (findPackage(String(a[item.id]))?.tier.name ??
                                      "Help me choose")
                                    : Array.isArray(a[item.id])
                                      ? (a[item.id] as string[]).join(" / ")
                                      : a[item.id]}
                                </dd>
                              </div>
                            ) : null,
                          )}
                      </dl>
                    )}
                  </section>
                ))}
              </div>
            )}
            {state.error && (
              <p id="quote-error" role="alert" className="quote-error">
                {state.error}
              </p>
            )}
            {state.status === "error" && (
              <div role="alert" className="quote-error">
                <strong>SOMETHING DIDN’T GO THROUGH.</strong>
                <p>Your project details are still here. Please try again.</p>
              </div>
            )}
            <input
              ref={honey}
              className="quote-honey"
              name="_honey"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            {state.editing && q && (
              <button
                className="quote-text-button"
                onClick={() => {
                  const error = validate(q, a);
                  if (error) dispatch({ type: "error", message: error });
                  else go("review", false);
                }}
              >
                RETURN TO REVIEW ↗
              </button>
            )}
            <div className="quote-actions">
              {state.screen !== "welcome" && (
                <button
                  disabled={state.status === "sending"}
                  className="quote-text-button"
                  onClick={() => go(ids[Math.max(0, ids.indexOf(state.screen) - 1)]!)}
                >
                  ← BACK
                </button>
              )}
              {state.screen === "review" ? (
                <button
                  className="quote-action"
                  disabled={state.status === "sending"}
                  onClick={submit}
                >
                  {state.status === "sending"
                    ? "SENDING…"
                    : state.status === "error"
                      ? "TRY AGAIN ↗"
                      : "SEND PROJECT ↗"}
                </button>
              ) : (
                <button className="quote-action" onClick={next}>
                  {state.screen === "welcome" ? "LET’S START ↗" : "CONTINUE ↗"}
                </button>
              )}
            </div>
            {state.screen === "review" && (
              <p className="quote-hint">
                We’ll review the details and get back to you about next steps. Sent securely through
                FormSubmit.
              </p>
            )}
            <a className="quote-simple" href="/#contact">
              Rather talk it through? Send a simple inquiry ↗
            </a>
          </section>
        </div>
      </main>
    </>
  );
}

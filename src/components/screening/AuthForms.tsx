import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { configured, supabase } from "@/lib/screening/supabase";
import { screeningCallback, SCREENING_BASE } from "@/lib/screening/paths";
import { Brand } from "./App";
import deptLogo from "@/assets/dept-logo-beige.png";
import "./entrance.css";
import { heroVideo } from "@/components/site/hero-media";

function EntranceVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!window.matchMedia || !("IntersectionObserver" in window)) return;
    const video = ref.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const update = () => {
      if (reduced.matches || document.hidden || !visible) {
        video.pause();
        return;
      }
      if (!video.getAttribute("src")) video.src = heroVideo;
      void video.play().catch(() => {
        /* Keep the poster if autoplay is unavailable. */
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(video);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, []);
  return (
    <video
      ref={ref}
      className="entrance-video"
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      poster="/media/dept-hero-poster.jpg"
      aria-hidden="true"
    />
  );
}

export function Login({ error, setError }: { error: string; setError: (s: string) => void }) {
  const [busy, setBusy] = useState(false),
    [reset, setReset] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!supabase) {
      setError("The host needs to connect Supabase before sign-in is available.");
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      if (reset) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(
          String(form.get("email")),
          {
            redirectTo: screeningCallback(
              window.location.origin,
              new URLSearchParams(window.location.search).get("next") || SCREENING_BASE,
            ),
          },
        );
        if (err) throw err;
        setMessage("If this email has access, a password reset link is on its way.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
        if (err) throw err;
      }
    } catch (err) {
      setError(
        reset
          ? "We couldn’t send the reset link. Please try again in a moment."
          : err instanceof Error && /invalid login credentials/i.test(err.message)
            ? "That email or password doesn’t look right. Try again."
            : "We couldn’t open the room. Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login cinema-entrance">
      <div className="login-art">
        <EntranceVideo />
        <div className="film-grain" aria-hidden="true" />
        <a href="/" className="cinema-brand" aria-label="Dept. Collective home">
          <img src={deptLogo} width="42" height="32" alt="" />
          <span>
            the dept collective<small>SCREENING ROOM</small>
          </span>
        </a>
        <div className="login-story">
          <span className="eyebrow">PRIVATE SCREENING / EST. 2026</span>
          <p>
            Your seat
            <br />
            is waiting.
          </p>
          <span className="login-edition">Private screenings. Early cuts. Behind the scenes.</span>
        </div>
      </div>
      <section className="login-form" aria-labelledby="entrance-title">
        <span className="eyebrow">THE DEPT COLLECTIVE</span>
        <h1 id="entrance-title">
          {reset ? "Back to your stories." : "Welcome to the Screening Room"}
        </h1>
        <p className="muted">
          {reset
            ? "We’ll email you a link to reset your password."
            : "A private space for friends, family, collaborators, and the people who get to see it first."}
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          {!reset && (
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          <button className="primary full" disabled={busy || !configured}>
            {busy
              ? reset
                ? "Sending your link…"
                : "Opening the doors…"
              : reset
                ? "Send reset link"
                : "Enter the Screening Room"}
            <ArrowUpRight size={17} />
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setReset(!reset);
              setError("");
              setMessage("");
            }}
          >
            {reset ? "Back to sign in" : "Forgot password?"}
          </button>
        </form>
        {!configured && (
          <p className="setup-note">
            Setup in progress. Connect the Supabase project to open the room.
          </p>
        )}
        <div className="login-note">
          <LockKeyhole size={13} aria-hidden="true" />
          <p>The Dept Collective Screening Room is private and invitation-only.</p>
        </div>
        <footer className="entrance-footer">
          <span>The Dept Collective © {new Date().getFullYear()}</span>
          <span>Private Screening Room</span>
        </footer>
      </section>
    </main>
  );
}
export function PasswordSetup({ done }: { done: () => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="waiting">
      <Brand />
      <h1>Make yourself at home.</h1>
      <p>Set a password for your private screening room.</p>
      <form
        className="password-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const password = String(new FormData(e.currentTarget).get("password"));
          setError("");
          try {
            const { error: err } = await supabase!.auth.updateUser({ password });
            if (err) throw err;
            done();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to save your password. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          New password
          <input
            type="password"
            name="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save password & enter"}
        </button>
      </form>
    </main>
  );
}

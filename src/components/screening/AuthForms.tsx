import { useState, type FormEvent } from "react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { configured, supabase } from "@/lib/screening/supabase";
import { screeningCallback, SCREENING_BASE } from "@/lib/screening/paths";
import { Brand } from "./App";
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
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-art">
        <div className="film-grain" />
        <Brand />
        <div className="login-story">
          <span className="eyebrow">FOR A SELECT AUDIENCE. FOR YOU.</span>
          <h1>
            Some stories
            <br />
            belong closer
            <br />
            to home.
          </h1>
          <p>
            A private collection of films, works in progress,
            <br />
            and moments worth keeping.
          </p>
          <span className="login-edition">THE PRIVATE COLLECTION &nbsp; / &nbsp; EST. 2026</span>
        </div>
      </div>
      <section className="login-form">
        <a href="/" className="text-button">
          ← Dept. Collective
        </a>
        <span className="eyebrow">
          <LockKeyhole size={13} /> INVITATION ONLY
        </span>
        <h2>{reset ? "Back to your stories." : "Welcome to the room."}</h2>
        <p className="muted">
          {reset
            ? "We’ll email you a link to reset your password."
            : "Good films. Familiar faces. A seat saved for you."}
        </p>
        <form onSubmit={submit}>
          <label>
            Email address
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
            {busy ? "Please wait…" : reset ? "Send reset link" : "Sign in"}
            <ArrowUpRight size={17} />
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setReset(!reset);
              setError("");
              setMessage("");
            }}
          >
            {reset ? "Back to sign in" : "Forgot your password?"}
          </button>
        </form>
        {!configured && (
          <p className="setup-note">
            Setup in progress. Connect the Supabase project to open the room.
          </p>
        )}
        <div className="login-note">
          <span className="tiny-line" />
          <p>
            This is a private screening space.
            <br />
            Access is by personal invitation from your host.
          </p>
        </div>
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

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/screening/supabase";
import { GalleryLoading } from "./GalleryShell";
import { galleryError } from "./service";
export function GalleryAdminGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [allowed, setAllowed] = useState(false),
    [checking, setChecking] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) {
        setSession(next ? { ...next } : null);
        setAllowed(false);
        setChecking(!!next);
        setReady(true);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session);
          setReady(true);
          setChecking(!!data.session);
          if (error) setError("Please sign in again.");
        }
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setChecking(false);
          setError("Unable to restore your session.");
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session || !supabase) return;
    let alive = true;
    const check = async () => {
      try {
        const { data, error } = await supabase!.rpc("is_gallery_admin");
        if (alive) {
          setAllowed(data === true && !error);
          setError(
            error
              ? galleryError(error)
              : data === true
                ? ""
                : "This account is not an authorized gallery administrator.",
          );
          setChecking(false);
        }
      } catch {
        if (alive) {
          setAllowed(false);
          setChecking(false);
          setError("Unable to verify administrator access.");
        }
      }
    };
    void check();
    window.addEventListener("focus", check);
    const timer = setInterval(check, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [session]);
  async function logout() {
    setAllowed(false);
    setSession(null);
    try {
      await supabase?.auth.signOut({ scope: "local" });
    } catch {
      setError("Sign-out could not complete. Please retry.");
    }
  }
  if (!ready || checking) return <GalleryLoading />;
  if (session && allowed)
    return (
      <>
        <div className="dg-admin-session">
          <span>ADMINISTRATOR / {session.user.email}</span>
          <button className="dg-button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  return (
    <main className="dg-admin-entry">
      <p className="dg-label">DEPT. GALLERIES / ADMINISTRATION</p>
      <h1>
        Behind
        <br />
        the collection.
      </h1>
      <p>
        Sign in with your invited studio account. Administrator access is verified by the database.
      </p>
      {session ? (
        <button className="dg-button" onClick={() => void logout()}>
          Sign out / use another account
        </button>
      ) : (
        <form
          className="dg-admin-fields"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setBusy(true);
            setError("");
            const form = e.currentTarget;
            const data = new FormData(form);
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email: String(data.get("email")).trim(),
                password: String(data.get("password")),
              });
              if (error) setError("Sign-in unsuccessful. Check your email and password.");
              else form.reset();
            } catch {
              setError("Unable to sign in. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input type="email" name="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button className="dg-button dg-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in ↗"}
          </button>
          <a className="dg-text-link" href="/screening-room/login">
            Password help ↗
          </a>
        </form>
      )}
      {error && (
        <p role="alert" className="dg-form-error">
          {error}
        </p>
      )}
      <p className="dg-muted">
        No public administrator registration. Existing Screening Room accounts are preserved.
      </p>
    </main>
  );
}

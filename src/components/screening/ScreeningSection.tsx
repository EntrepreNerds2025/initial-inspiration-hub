import { useEffect, useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/screening/supabase";
import type { Profile } from "@/lib/screening/films";
import { safeScreeningNext, screeningLoginPath, SCREENING_BASE } from "@/lib/screening/paths";
import { Brand, ScreeningLibrary } from "./App";
import { Login, PasswordSetup } from "./AuthForms";
import "./screening.css";

export function ScreeningSection() {
  const location = useLocation();
  const router = useRouter();
  return (
    <div className="screening-scope">
      <ScreeningGate
        path={location.pathname}
        search={location.searchStr}
        go={(href, replace = false) => {
          void router.navigate({ href, replace });
        }}
      />
    </div>
  );
}
export function ScreeningGate({
  path,
  search,
  go,
}: {
  path: string;
  search: string;
  go: (path: string, replace?: boolean) => void;
}) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [profile, setProfile] = useState<Profile | null>(null),
    [checking, setChecking] = useState(true),
    [error, setError] = useState(""),
    [passwordFlow, setPasswordFlow] = useState(false);
  const login = path === `${SCREENING_BASE}/login`;
  const callback = path === `${SCREENING_BASE}/callback`;
  const next = safeScreeningNext(new URLSearchParams(search).get("next"));
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      setChecking(false);
      return;
    }
    let alive = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("error_description"))
      setError("This invitation or reset link is invalid or expired. Please request a fresh link.");
    if (["invite", "recovery"].includes(hash.get("type") || "")) setPasswordFlow(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, current) => {
      // No Supabase requests inside this synchronous callback (Auth holds a lock).
      if (!alive) return;
      if (event === "PASSWORD_RECOVERY") setPasswordFlow(true);
      setSession(current ? { ...current } : null);
      setProfile(null);
      setChecking(Boolean(current));
      setReady(true);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!alive) return;
        setSession(data.session);
        setReady(true);
        setChecking(Boolean(data.session));
        if (failure) setError("Unable to restore your session. Please sign in again.");
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setChecking(false);
          setError("Unable to connect. Please try again.");
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
    async function check() {
      try {
        const { data, error: failure } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", session!.user.id)
          .single();
        if (!alive) return;
        if (failure || !data?.is_active) {
          setProfile(null);
          setError(
            "Your invitation is not active, or the screening room setup is incomplete. Please contact your host.",
          );
        } else {
          setProfile(data);
          setError("");
        }
      } catch {
        if (alive) {
          setProfile(null);
          setError("Unable to verify membership. Please try signing in again.");
        }
      } finally {
        if (alive) setChecking(false);
      }
    }
    void check();
    const focus = () => {
      void check();
    };
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [session]);
  useEffect(() => {
    if (!ready) return;
    if (!session && !login && !callback) go(screeningLoginPath(path + search), true);
    else if (session && profile && login && !passwordFlow) go(next, true);
  }, [ready, session, profile, login, callback, path, search, next, passwordFlow, go]);
  async function logout() {
    // Clear private UI even if the network is unavailable.
    setProfile(null);
    setSession(null);
    setPasswordFlow(false);
    try {
      await supabase?.auth.signOut({ scope: "local" });
    } finally {
      go(`${SCREENING_BASE}/login`, true);
    }
  }
  if (!ready || checking)
    return (
      <main className="waiting">
        <Brand />
        <p>Checking your invitation…</p>
      </main>
    );
  if (!session)
    return login || callback ? (
      <Login
        error={
          error || (callback ? "Open a fresh invitation/reset link, or sign in to continue." : "")
        }
        setError={setError}
      />
    ) : (
      <main className="waiting">
        <Brand />
        <p>Taking you to sign in…</p>
      </main>
    );
  if (!profile)
    return (
      <main className="waiting">
        <Brand />
        <h1>Invitation required</h1>
        <p role="alert">{error}</p>
        <button onClick={() => void logout()}>Back to sign in</button>
        <a href="/">← Dept. Collective</a>
      </main>
    );
  if (passwordFlow || callback)
    return (
      <PasswordSetup
        done={() => {
          setPasswordFlow(false);
          go(next, true);
        }}
      />
    );
  if (login)
    return (
      <main className="waiting">
        <Brand />
        <p>Opening your screening room…</p>
      </main>
    );
  return (
    <ScreeningLibrary key={profile.id} profile={profile} path={path} go={go} logout={logout} />
  );
}

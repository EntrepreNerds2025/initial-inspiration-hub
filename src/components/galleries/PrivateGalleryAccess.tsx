import { useState, type FormEvent } from "react";
import logo from "@/assets/dept-logo-beige.png";
import { galleryService } from "./service";
import type { GalleryView } from "./types";
export function PrivateGalleryAccess({
  slug,
  initialExpired = false,
  onUnlock,
}: {
  slug: string;
  initialExpired?: boolean;
  onUnlock: (g: GalleryView) => void;
}) {
  const [state, setState] = useState<
    "idle" | "loading" | "invalid" | "expired" | "rate-limited" | "error"
  >(initialExpired ? "expired" : "idle");
  const [password, setPassword] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const result = await galleryService.unlock(slug, password);
      setPassword("");
      if (result.state === "unlocked") onUnlock(result.gallery);
      else setState(result.state);
    } catch {
      setState("error");
    }
  }
  return (
    <main className="dg-access">
      <div className="dg-access-mark">
        <img src={logo} alt="The Dept Collective" />
        <span className="dg-label">A PRIVATE VIEWING</span>
      </div>
      <div className="dg-access-copy">
        <p className="dg-label">DEPT. / GALLERIES</p>
        <h1>
          {state === "expired" ? (
            <>
              A moment,
              <br />
              now passed.
            </>
          ) : (
            <>
              Some moments
              <br />
              are just for you.
            </>
          )}
        </h1>
        <p>
          {state === "expired"
            ? "This gallery link has expired. Please contact the studio to arrange access."
            : "Enter your gallery password, or reopen the complete secure link shared by the studio."}
        </p>
        {state === "expired" ? (
          <a className="dg-button dg-primary" href="mailto:hello@thedeptcollective.com">
            Contact the studio ↗
          </a>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="dg-gallery-password">GALLERY PASSWORD</label>
            <input
              id="dg-gallery-password"
              type="password"
              required
              autoComplete="off"
              placeholder="Enter gallery password"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={state === "invalid"}
              aria-describedby="dg-access-feedback"
              disabled={state === "loading"}
            />
            <p id="dg-access-feedback" role="status">
              {state === "invalid"
                ? "That password didn’t open the gallery. Please try again."
                : state === "rate-limited"
                  ? "Too many attempts. Please wait 15 minutes before trying again."
                  : state === "error"
                    ? "Gallery access is temporarily unavailable. Please try again later."
                    : state === "loading"
                      ? "Verifying access…"
                      : ""}
            </p>
            <button
              className="dg-button dg-primary"
              disabled={state === "loading" || !password.trim()}
            >
              {state === "loading" ? "Opening…" : "Unlock gallery ↗"}
            </button>
          </form>
        )}
        <a href="/galleries" className="dg-text-link">
          ← Public collections
        </a>
      </div>
    </main>
  );
}

import { useEffect, useState, useRef, useCallback, type FormEvent } from "react";
import { SCREENING_BASE, screeningPage } from "@/lib/screening/paths";
import { ArrowLeft, ArrowUpRight, Film as FilmIcon, LogOut, Search, Play, X } from "lucide-react";
import { APP_NAME, configured, supabase } from "@/lib/screening/supabase";
import {
  type Film,
  type Profile,
  type Category,
  type Project,
  type Feedback,
  imageUrl,
  playerUrl,
  parseTimestamp,
  formatTime,
  safeImage,
} from "@/lib/screening/films";
import deptLogo from "@/assets/dept-logo-beige.png";
import { firstName, statusLabel, isBehindScenes, featuredFilm } from "@/lib/screening/presentation";
import { useMyList } from "./useMyList";
import { Admin } from "./Admin";
export function ScreeningLibrary({
  profile,
  path,
  go,
  logout,
}: {
  profile: Profile;
  path: string;
  go: (path: string) => void;
  logout: () => Promise<void>;
}) {
  const myList = useMyList(profile.id);
  const [error, setError] = useState("");
  const [films, setFilms] = useState<Film[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true),
    [playing, setPlaying] = useState(false),
    [query, setQuery] = useState("");
  const alive = useRef(true);
  const page = screeningPage(path);
  const filmId = page === "film" ? path.split("/").filter(Boolean).at(-1) : null;
  const selected =
    films.find((f) => f.id === filmId && (profile.role === "admin" || f.is_published)) ?? null;
  async function load() {
    if (!supabase) return;
    try {
      const results = await Promise.all([
        supabase.from("videos").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("projects").select("*"),
      ]);
      if (!alive.current) return;
      const failure = results.find((r) => r.error)?.error;
      if (failure) {
        setFilms([]);
        setCategories([]);
        setProjects([]);
        setError("The collection could not be loaded. Please contact your host if this continues.");
        return;
      }
      setFilms(results[0].data || []);
      setCategories(results[1].data || []);
      setProjects(results[2].data || []);
      setError("");
    } catch {
      if (alive.current) setError("Unable to reach the collection. Please try again.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [profile.role]);
  function navigate(next: string) {
    setPlaying(false);
    setQuery("");
    go(next === "home" ? SCREENING_BASE : `${SCREENING_BASE}/${next}`);
  }
  function open(f: Film, play = false) {
    setPlaying(play);
    go(`${SCREENING_BASE}/films/${encodeURIComponent(f.id)}`);
  }
  const admin = profile.role === "admin";
  const visible = films.filter((f) => admin || f.is_published);
  const searched = visible.filter((f) =>
    [
      f.title,
      f.description,
      categories.find((c) => c.id === f.category_id)?.name,
      projects.find((p) => p.id === f.project_id)?.title,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const featured = featuredFilm(visible);
  return (
    <div className="screening-app">
      <header className="navigation">
        <a
          className="cinema-brand"
          href={SCREENING_BASE}
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <img src={deptLogo} width="48" height="34" alt="" />
          <span>
            the dept collective<small>SCREENING ROOM</small>
          </span>
        </a>
        <nav aria-label="Screening navigation">
          {(
            [
              ["home", "Screening Room"],
              ["my-list", "My List"],
              ["collections", "Collections"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button aria-label="Search films" onClick={() => navigate("search")}>
            <Search size={18} />
          </button>
          <details className="account-menu">
            <summary>
              <span className="avatar">
                {firstName(profile.display_name).slice(0, 1).toUpperCase()}
              </span>
              <span>{firstName(profile.display_name)}</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div>
              {admin && <button onClick={() => navigate("admin")}>Admin</button>}
              <a href="/">Public studio ↗</a>
              <button onClick={logout}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      {myList.error && (
        <p role="status" className="notice">
          {myList.error}
        </p>
      )}
      {error && (
        <div className="notice" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <Empty title="Opening the collection…" text="" />
      ) : page === "admin" && !admin ? (
        <Empty
          title="Administrator access required"
          text="Your invitation provides viewer access. Return to the collection to watch films."
        />
      ) : page === "missing" || (page === "film" && !selected) ? (
        <Empty
          title="This screening has apparently been cancelled."
          text="This page may not exist or may not be shared with your account."
        />
      ) : page === "admin" && admin ? (
        <Admin
          films={films}
          projects={projects}
          categories={categories}
          currentUser={profile.id}
          refresh={load}
        />
      ) : selected ? (
        <Detail
          saved={myList.ids.includes(selected.id)}
          toggleList={() => myList.toggle(selected.id)}
          film={selected}
          films={visible}
          categories={categories}
          projects={projects}
          profile={profile}
          playing={playing}
          setPlaying={setPlaying}
          open={open}
          back={() => {
            navigate("home");
          }}
        />
      ) : (
        <>
          {page === "home" && (
            <div className="cinema-greeting">
              <span>Welcome back, {firstName(profile.display_name)}.</span>
              <span>Grab a seat.</span>
            </div>
          )}
          {page === "home" && featured && (
            <section className="cinema-hero" aria-label="Now screening">
              <img
                className="cinema-hero-image"
                src={safeImage(featured.backdrop_url || imageUrl(featured))}
                alt=""
                fetchPriority="high"
              />
              <div className="cinema-hero-copy">
                <span className="eyebrow">NOW SCREENING</span>
                <h1>{featured.title}</h1>
                <p>{featured.short_description || featured.description}</p>
                <div className="metadata">
                  <span>{featured.year}</span>
                  <span>{featured.runtime} min</span>
                  <span>{statusLabel(featured)}</span>
                </div>
                <div className="button-row">
                  <button className="primary" onClick={() => open(featured, true)}>
                    <Play size={16} fill="currentColor" /> Watch
                  </button>
                  <button
                    className="secondary"
                    aria-pressed={myList.ids.includes(featured.id)}
                    onClick={() => myList.toggle(featured.id)}
                  >
                    {myList.ids.includes(featured.id) ? "✓ My List" : "+ My List"}
                  </button>
                  <button className="cinema-info" onClick={() => open(featured)}>
                    More info ↗
                  </button>
                </div>
              </div>
              <span className="cinema-edition">THE PRIVATE COLLECTION / 01</span>
            </section>
          )}
          <main className={page === "home" ? "library" : "library inner-page"}>
            {page === "home" ? (
              <>
                {!featured && (
                  <div className="cinema-welcome">
                    <span className="eyebrow">THE DEPT COLLECTIVE / AFTER HOURS</span>
                    <h1>
                      The Screening
                      <br />
                      Room.
                    </h1>
                    <p>
                      {admin
                        ? "Your private cinema is ready. Add a film in Admin to set the first screening."
                        : "A seat saved for you. Your host is preparing the first screening."}
                    </p>
                  </div>
                )}
                <Shelf
                  title="Now Showing"
                  subtitle="The finished stuff. Safe for public consumption. Mostly."
                  films={visible.filter((f) => !f.is_draft && !isBehindScenes(f, categories))}
                  open={open}
                  empty="The next screening is on its way."
                />
                <Shelf
                  title="In the Cutting Room"
                  subtitle="Rough cuts, experiments, and things you probably weren't supposed to see yet."
                  films={visible.filter((f) => f.is_draft && !isBehindScenes(f, categories))}
                  open={open}
                  empty="The cutting room is suspiciously clean right now."
                />
                <Shelf
                  title="Behind the Scenes"
                  subtitle="The cameras, the chaos, and everything around the final frame."
                  films={visible.filter((f) => isBehindScenes(f, categories))}
                  open={open}
                  empty="A little more of the process, coming soon."
                />
                {projects.map((p) => (
                  <Shelf
                    key={p.id}
                    title={p.title}
                    subtitle={p.description}
                    films={visible.filter((f) => f.project_id === p.id)}
                    open={open}
                  />
                ))}
              </>
            ) : (
              <>
                <span className="eyebrow">THE PRIVATE COLLECTION</span>
                <h1 className="page-title">
                  {page === "my-list"
                    ? "My List"
                    : page === "collections"
                      ? "Collections"
                      : page === "drafts"
                        ? "In the Cutting Room"
                        : page === "search"
                          ? "Find a story."
                          : "Now Showing"}
                </h1>
                {page === "my-list" && <p className="muted">Saved for later, on this device.</p>}
                {page === "search" && (
                  <label className="search-box">
                    <Search size={20} />
                    <input
                      aria-label="Search the collection"
                      autoFocus
                      placeholder="Search films, projects, categories…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button aria-label="Clear search" onClick={() => setQuery("")}>
                        <X size={16} />
                      </button>
                    )}
                  </label>
                )}
                {page === "collections" ? (
                  <>
                    {categories.map((c) => (
                      <Shelf
                        key={c.id}
                        title={c.name}
                        films={visible.filter((f) => f.category_id === c.id)}
                        open={open}
                      />
                    ))}
                    {projects.map((p) => (
                      <Shelf
                        key={p.id}
                        title={p.title}
                        subtitle={p.description}
                        films={visible.filter((f) => f.project_id === p.id)}
                        open={open}
                      />
                    ))}
                    {!visible.some((f) => f.category_id || f.project_id) && (
                      <Empty
                        title="A collection is taking shape."
                        text="Your host will gather the films here."
                      />
                    )}
                  </>
                ) : (
                  (() => {
                    const items =
                      page === "search"
                        ? searched
                        : page === "my-list"
                          ? visible.filter((f) => myList.ids.includes(f.id))
                          : visible.filter((f) => f.is_draft === (page === "drafts"));
                    return (
                      <>
                        <div className="film-grid">
                          {items.map((f) => (
                            <FilmCard key={f.id} film={f} open={open} />
                          ))}
                        </div>
                        {!items.length && (
                          <Empty
                            title={
                              page === "my-list"
                                ? "Nothing here yet. Your extremely prestigious watchlist awaits."
                                : "No films here yet."
                            }
                            text={
                              page === "search"
                                ? "Try another title, project, or category."
                                : "Pick a screening when you’re ready."
                            }
                          />
                        )}
                      </>
                    );
                  })()
                )}
              </>
            )}
          </main>
        </>
      )}
      <footer className="cinema-footer">
        <a href="/">
          THE DEPT COLLECTIVE<small>Screening Room</small>
        </a>
        <p>Made for the people who get to see it before everybody else.</p>
        <small>
          Private screenings only. Please don't redistribute anything without permission.
        </small>
      </footer>
    </div>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        S<span>R</span>
      </span>
      <span>{APP_NAME}</span>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <FilmIcon size={26} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function FilmCard({ film: f, open }: { film: Film; open: (f: Film) => void }) {
  return (
    <button className="film-card" onClick={() => open(f)}>
      <div className="film-image">
        <img loading="lazy" src={safeImage(imageUrl(f))} alt="" />
        <span className="badge">{statusLabel(f)}</span>
        <span className="card-play">
          <Play size={18} fill="currentColor" />
        </span>
        <span className="card-runtime">{f.runtime} MIN</span>
      </div>
      <div className="card-title">
        <h3>{f.title}</h3>
        <ArrowUpRight size={15} />
      </div>
      <p>
        {f.year}
        <span>·</span>
        {f.version_name || f.content_type.replace("_", " ")}
      </p>
    </button>
  );
}
function Shelf({
  title,
  subtitle,
  films,
  open,
  empty,
}: {
  empty?: string;
  title: string;
  subtitle?: string;
  films: Film[];
  open: (f: Film) => void;
}) {
  if (!films.length && !empty) return null;
  return (
    <section className="shelf">
      <div className="shelf-header">
        <div>
          <h2>
            {title}
            <span>{films.length.toString().padStart(2, "0")}</span>
          </h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="shelf-hint">SCROLL TO EXPLORE →</span>
      </div>
      {!films.length && <p className="shelf-empty">{empty}</p>}
      <div
        className="film-row"
        tabIndex={films.length ? 0 : undefined}
        aria-label={`${title} films`}
      >
        {films.map((f) => (
          <FilmCard film={f} open={open} key={f.id} />
        ))}
      </div>
    </section>
  );
}
function Detail({
  saved,
  toggleList,
  film: f,
  films,
  categories,
  projects,
  profile,
  playing,
  setPlaying,
  open,
  back,
}: {
  saved: boolean;
  toggleList: () => void;
  film: Film;
  films: Film[];
  categories: Category[];
  projects: Project[];
  profile: Profile;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  open: (f: Film, p?: boolean) => void;
  back: () => void;
}) {
  const [start, setStart] = useState(0);
  const versions = f.project_id
    ? films
        .filter((v) => v.project_id === f.project_id)
        .sort((a, b) => a.version_number - b.version_number)
    : [];
  const src = playerUrl(f, start);
  useEffect(() => setStart(0), [f.id]);
  return (
    <main className="detail">
      <button className="back-button" onClick={back}>
        <ArrowLeft size={16} /> Back to collection
      </button>
      {playing ? (
        <div className="player">
          {src ? (
            <iframe
              key={`${f.id}-${start}`}
              src={src}
              title={f.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <Empty
              title="Playback unavailable"
              text="The host needs to configure a supported video provider."
            />
          )}
        </div>
      ) : (
        <div
          className="detail-backdrop"
          style={{
            backgroundImage: `linear-gradient(0deg,#0b0c0b,transparent),url("${safeImage(f.backdrop_url || imageUrl(f))}")`,
          }}
        >
          <button className="large-play" aria-label="Play film" onClick={() => setPlaying(true)}>
            <Play size={28} fill="currentColor" />
          </button>
        </div>
      )}
      <div className="detail-info">
        <div>
          <span className="eyebrow">
            {projects.find((p) => p.id === f.project_id)?.title || "THE PRIVATE COLLECTION"}
          </span>
          <h1>{f.title}</h1>
          <div className="metadata">
            <span>{f.year}</span>
            <span>{f.runtime} min</span>
            <span>{categories.find((c) => c.id === f.category_id)?.name || f.content_type}</span>
            <span className="badge">{statusLabel(f)}</span>
            <span>{f.is_published ? "INVITED VIEWERS" : "ADMIN ONLY"}</span>
          </div>
          <p className="description">{f.description}</p>
          <button className="secondary" aria-pressed={saved} onClick={toggleList}>
            {saved ? "✓ My List" : "+ My List"}
          </button>
          {!playing && (
            <button className="primary" onClick={() => setPlaying(true)}>
              <Play size={15} fill="currentColor" /> Play film
            </button>
          )}
        </div>
        <aside>
          <span className="eyebrow">THE DETAILS</span>
          <dl>
            <dt>Created by</dt>
            <dd>{f.creator || "Our collection"}</dd>
            <dt>Added to the archive</dt>
            <dd>
              {new Date(f.created_at).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
            <dt>Version</dt>
            <dd>{f.version_name}</dd>
          </dl>
        </aside>
      </div>
      {f.creator_note && (
        <section className="creator-note">
          <span className="eyebrow">A NOTE FROM RIANN</span>
          <p>{f.creator_note}</p>
        </section>
      )}
      {versions.length > 1 && (
        <section className="versions">
          <span className="eyebrow">PROJECT VERSIONS</span>
          <div>
            {versions.map((v) => (
              <button
                className={v.id === f.id ? "selected" : ""}
                onClick={() => open(v, playing)}
                key={v.id}
              >
                <span>{v.version_number.toString().padStart(2, "0")}</span>
                {v.version_name}
                {v.id === f.id && <small>SELECTED</small>}
              </button>
            ))}
          </div>
        </section>
      )}
      {(f.is_draft || f.creator_note !== undefined) && (
        <Comments
          key={f.id}
          film={f}
          profile={profile}
          seek={(s) => {
            setStart(s);
            setPlaying(true);
          }}
        />
      )}
      <Shelf
        title="More From This Series"
        films={versions.filter((v) => v.id !== f.id)}
        open={open}
      />
      <Shelf
        title="More Like This"
        films={films
          .filter(
            (v) =>
              v.id !== f.id &&
              (!f.project_id || v.project_id !== f.project_id) &&
              (f.category_id ? v.category_id === f.category_id : v.content_type === f.content_type),
          )
          .slice(0, 10)}
        open={open}
      />
      <p className="provider-note">
        Playback provided by YouTube. Unlisted links may be shared by anyone who has them.
      </p>
    </main>
  );
}
function Comments({
  film,
  profile,
  seek,
}: {
  film: Film;
  profile: Profile;
  seek: (s: number) => void;
}) {
  const [comments, setComments] = useState<Feedback[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data, error: err } = await supabase!
        .from("feedback")
        .select("*")
        .eq("video_id", film.id)
        .order("created_at");
      if (err) setError(err.message);
      else setComments(data || []);
    } catch {
      setError("Unable to load feedback. Please try again.");
    }
  }, [film.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const fields = new FormData(form);
      const timestamp = parseTimestamp(String(fields.get("timestamp")));
      const { error: err } = await supabase!.from("feedback").insert({
        video_id: film.id,
        user_id: profile.id,
        comment: String(fields.get("comment")).trim(),
        timestamp_seconds: timestamp,
      });
      if (err) throw err;
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save feedback.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="comments">
      <span className="eyebrow">A CONVERSATION IN THE MAKING</span>
      <h2>Leave a note for Riann.</h2>
      <p className="muted">
        A thought, a detail, a moment that stayed with you. Leave a note for the creator.
      </p>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="comment">
          Your feedback
        </label>
        <textarea
          id="comment"
          name="comment"
          required
          maxLength={4000}
          placeholder="Share your thoughts, feedback, or just hype it up..."
        />
        <div className="comment-actions">
          <label>
            At{" "}
            <input
              name="timestamp"
              placeholder="02:14"
              aria-label="Optional video timestamp"
              pattern="[0-9]{1,3}:[0-5][0-9]"
            />{" "}
            <span className="muted">(optional)</span>
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Posting…" : "Leave feedback"}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {comments.length === 0 && <p className="muted">Start the conversation. No feedback yet.</p>}
      {comments.map((c) => (
        <article className="comment" key={c.id}>
          <div>
            <span className="avatar" aria-hidden="true">
              {firstName(c.author_name).slice(0, 1).toUpperCase()}
            </span>
            <strong>{firstName(c.author_name)}</strong>
            <time>{new Date(c.created_at).toLocaleString()}</time>
            {(profile.role === "admin" || c.user_id === profile.id) && (
              <button
                onClick={async () => {
                  if (!window.confirm("Delete this feedback?")) return;
                  const { error: err } = await supabase!.from("feedback").delete().eq("id", c.id);
                  if (err) setError(err.message);
                  else void load();
                }}
              >
                Delete
              </button>
            )}
          </div>
          <p>
            {c.timestamp_seconds !== null && (
              <button className="timestamp" onClick={() => seek(c.timestamp_seconds!)}>
                {formatTime(c.timestamp_seconds)}
              </button>
            )}
            {c.comment}
          </p>
        </article>
      ))}
    </section>
  );
}

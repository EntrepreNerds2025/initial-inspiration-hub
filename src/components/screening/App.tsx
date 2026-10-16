import { useEffect, useState, useRef, useCallback, type FormEvent } from "react";
import { SCREENING_BASE, screeningPage } from "@/lib/screening/paths";
import {
  ArrowLeft,
  ArrowUpRight,
  Film as FilmIcon,
  LockKeyhole,
  LogOut,
  Search,
  Play,
  X,
} from "lucide-react";
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
  const featured =
    visible.find((f) => f.is_featured) || visible.find((f) => !f.is_draft) || visible[0];
  return (
    <div className="screening-app">
      <header className="navigation">
        <a
          className="brand"
          href={SCREENING_BASE}
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-mark">
            S<span>R</span>
          </span>
          <span>{APP_NAME}</span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["home", "Home"],
              ["screening", "Screening room"],
              ["drafts", "Draft room"],
            ] as const
          ).map(([key, label]) => (
            <button
              className={page === key && !selected ? "active" : ""}
              onClick={() => navigate(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button aria-label="Search films" onClick={() => navigate("search")}>
            <Search size={18} />
          </button>
          {admin && (
            <button onClick={() => navigate("admin")} className={page === "admin" ? "active" : ""}>
              Admin
            </button>
          )}
          <button
            className="profile"
            title={`${profile.email} · Sign out`}
            aria-label="Sign out"
            onClick={logout}
          >
            {profile.display_name.slice(0, 1).toUpperCase()}
            <LogOut size={13} />
          </button>
        </div>
      </header>
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
          title="Film or page unavailable"
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
          {page === "home" && featured && (
            <section
              className="hero"
              style={{
                backgroundImage: `linear-gradient(90deg,rgba(9,10,9,.9) 0%,rgba(9,10,9,.12) 75%),linear-gradient(0deg,#0b0c0b 0%,transparent 45%),url("${safeImage(featured.backdrop_url || imageUrl(featured))}")`,
              }}
            >
              <div className="hero-content">
                <div className="eyebrow">
                  <span className="tiny-line" /> A PRIVATE COLLECTION · FEATURED FILM
                </div>
                <h1>{featured.title}</h1>
                <div className="metadata">
                  <span>{featured.year}</span>
                  <span>{featured.runtime} min</span>
                  <span>
                    {categories.find((c) => c.id === featured.category_id)?.name ||
                      featured.content_type.replace("_", " ")}
                  </span>
                  {featured.is_draft && (
                    <span className="badge">{featured.status.replace("_", " ")}</span>
                  )}
                </div>
                <p>{featured.short_description}</p>
                <div className="button-row">
                  <button className="primary" onClick={() => open(featured, true)}>
                    <Play size={15} fill="currentColor" /> Watch now
                  </button>
                  <button className="secondary" onClick={() => open(featured)}>
                    Explore film <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-caption">
                  IN GOOD COMPANY.
                  <br />
                  <span>Stories are better when shared.</span>
                </div>
              </div>
              <div className="hero-index">
                <span>01</span> / PRIVATE SCREENING
              </div>
            </section>
          )}
          <main className={page === "home" ? "library" : "library inner-page"}>
            {page === "home" ? (
              <>
                <div className="collection-heading">
                  <div>
                    <span className="eyebrow">CURATED FOR OUR CIRCLE</span>
                    <h2>A few stories worth sharing.</h2>
                  </div>
                  <span className="private-label">
                    <LockKeyhole size={13} /> INVITATION ONLY
                  </span>
                </div>
                <Shelf
                  title="Recently added"
                  subtitle="The latest additions to our collection"
                  films={visible.slice(0, 12)}
                  open={open}
                />
                <Shelf
                  title="The Screening Room"
                  subtitle="Finished films. Ready for an audience."
                  films={visible.filter((f) => !f.is_draft)}
                  open={open}
                />
                <Shelf
                  title="Inside the Draft Room"
                  subtitle="A first look. A fresh perspective. A work in progress."
                  films={visible.filter((f) => f.is_draft)}
                  open={open}
                />
                {categories.map((c) => (
                  <Shelf
                    key={c.id}
                    title={c.name}
                    films={visible.filter((f) => f.category_id === c.id)}
                    open={open}
                  />
                ))}
              </>
            ) : (
              <>
                <span className="eyebrow">YOUR PRIVATE COLLECTION</span>
                <h1 className="page-title">
                  {page === "drafts"
                    ? "The Draft Room"
                    : page === "search"
                      ? "Find a story."
                      : "The Screening Room"}
                </h1>
                <p className="muted">
                  {page === "drafts"
                    ? "Unfinished stories, shared with a trusted few. Your perspective is part of the process."
                    : page === "screening"
                      ? "The finished collection. Settle in and stay a while."
                      : "Search films, projects, categories, and descriptions."}
                </p>
                {page === "search" && (
                  <label className="search-box">
                    <Search size={20} />
                    <input
                      autoFocus
                      placeholder="What are you looking for?"
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
                <div className="film-grid">
                  {(page === "search"
                    ? searched
                    : visible.filter((f) => f.is_draft === (page === "drafts"))
                  ).map((f) => (
                    <FilmCard film={f} open={open} key={f.id} />
                  ))}
                </div>
                {(page === "search"
                  ? searched
                  : visible.filter((f) => f.is_draft === (page === "drafts"))
                ).length === 0 && (
                  <Empty
                    title="No films here yet."
                    text={
                      page === "search"
                        ? "Try another title, project, or category."
                        : "Your host will add something special soon."
                    }
                  />
                )}
              </>
            )}
            {visible.length === 0 && page === "home" && (
              <Empty
                title="The room is ready."
                text={
                  admin
                    ? "Add your first film in Admin to begin your collection."
                    : "Your host is preparing the first screening."
                }
              />
            )}
          </main>
        </>
      )}
      <footer>
        <a href="/">← Dept. Collective</a>
        <Brand />
        <p>A private space for the stories that matter.</p>
        <span>
          <LockKeyhole size={12} /> FOR FRIENDS & FAMILY
        </span>
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
        {f.is_draft && <span className="badge">{f.status.replace("_", " ")}</span>}
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
}: {
  title: string;
  subtitle?: string;
  films: Film[];
  open: (f: Film) => void;
}) {
  if (!films.length) return null;
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
      <div className="film-row">
        {films.map((f) => (
          <FilmCard film={f} open={open} key={f.id} />
        ))}
      </div>
    </section>
  );
}
function Detail({
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
            <span className="badge">{f.status.replace("_", " ")}</span>
          </div>
          <p className="description">{f.description}</p>
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
      {f.is_draft && playing && (
        <Comments key={f.id} film={f} profile={profile} seek={(s) => setStart(s)} />
      )}
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
      <h2>Your perspective matters.</h2>
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
          placeholder="What did you think?"
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
            <strong>{c.author_name}</strong>
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

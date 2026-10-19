import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/screening/supabase";
import {
  type Film,
  type Project,
  type Category,
  type Profile,
  type Feedback,
  youtubeId,
  imageUrl,
} from "@/lib/screening/films";
type Props = {
  films: Film[];
  projects: Project[];
  categories: Category[];
  currentUser: string;
  refresh: () => Promise<void>;
};
export function Admin({ films, projects, categories, currentUser, refresh }: Props) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  async function loadFeedback() {
    const { data, error: failure } = await supabase!
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (failure) setError(failure.message);
    else setFeedback(data || []);
  }
  const [tab, setTab] = useState("films"),
    [editing, setEditing] = useState<Film | null | undefined>(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]),
    [projectEdit, setProjectEdit] = useState<Project | null>(null),
    [categoryEdit, setCategoryEdit] = useState<Category | null>(null);
  async function loadUsers() {
    const { data, error: err } = await supabase!.from("profiles").select("*").order("created_at");
    if (err) setError(err.message);
    else setUsers(data || []);
  }
  useEffect(() => {
    if (tab === "users") void loadUsers();
    if (tab === "feedback") void loadFeedback();
  }, [tab]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteFilm(f: Film) {
    if (!window.confirm(`Delete “${f.title}” and its feedback? This cannot be undone.`)) return;
    await action(async () => {
      const { error: err } = await supabase!.from("videos").delete().eq("id", f.id);
      if (err) throw err;
      setMessage("Film deleted.");
    });
  }
  return (
    <main className="admin inner-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">BEHIND THE SCENES</span>
          <h1 className="page-title">The collection desk.</h1>
          <p className="muted">A little care for the stories you share.</p>
        </div>
        {tab === "films" && (
          <button className="primary" onClick={() => setEditing(null)}>
            <Plus size={17} /> Add film
          </button>
        )}
      </div>
      <div className="admin-tabs">
        {["films", "projects", "categories", "users", "feedback"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {tab === "feedback" && (
        <section aria-label="Feedback management">
          <h2>Draft feedback</h2>
          {!feedback.length && <p className="muted">No feedback yet.</p>}
          {feedback.map((note) => (
            <article className="comment" key={note.id}>
              <div>
                <strong>{note.author_name}</strong>
                <time>{new Date(note.created_at).toLocaleString()}</time>
              </div>
              <a href={`/screening-room/films/${encodeURIComponent(note.video_id)}`}>
                {films.find((f) => f.id === note.video_id)?.title || "View film"} ↗
              </a>
              {note.timestamp_seconds !== null && (
                <p>
                  At {Math.floor(note.timestamp_seconds / 60)}:
                  {String(note.timestamp_seconds % 60).padStart(2, "0")}
                </p>
              )}
              <p>{note.comment}</p>
              <button
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Delete this feedback?")) return;
                  void action(async () => {
                    const { error: failure } = await supabase!
                      .from("feedback")
                      .delete()
                      .eq("id", note.id);
                    if (failure) throw failure;
                    await loadFeedback();
                  });
                }}
              >
                Delete feedback
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "films" && (
        <>
          <div className="admin-filters">
            <input
              aria-label="Filter film titles"
              placeholder="Search the collection…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All films</option>
              <option value="draft">Drafts</option>
              <option value="final">Finished films</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Film",
                    "Project / Version",
                    "Category",
                    "Status",
                    "Published",
                    "Added",
                    "Actions",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {films
                  .filter(
                    (f) =>
                      f.title.toLowerCase().includes(search.toLowerCase()) &&
                      (filter === "all" ||
                        (filter === "draft" && f.is_draft) ||
                        (filter === "final" && !f.is_draft) ||
                        (filter === "unpublished" && !f.is_published)),
                  )
                  .map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="table-film">
                          <img src={imageUrl(f)} alt="" />
                          <span>
                            {f.title}
                            <small>
                              {f.year} · {f.runtime} min
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        {projects.find((p) => p.id === f.project_id)?.title || "Standalone"}
                        <small>{f.version_name}</small>
                      </td>
                      <td>{categories.find((c) => c.id === f.category_id)?.name || "—"}</td>
                      <td>
                        <span className="badge">{f.status.replace("_", " ")}</span>
                        <small>{f.is_draft ? "Draft room" : "Screening room"}</small>
                      </td>
                      <td>{f.is_published ? "Live" : "Hidden"}</td>
                      <td>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="table-actions">
                          <button aria-label={`Edit ${f.title}`} onClick={() => setEditing(f)}>
                            <Pencil size={16} />
                          </button>
                          <button
                            disabled={busy}
                            aria-label={`Delete ${f.title}`}
                            onClick={() => void deleteFilm(f)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {films.length === 0 && (
              <div className="empty">
                <h2>Your first film starts here.</h2>
                <p>Add a YouTube link and make it part of the collection.</p>
              </div>
            )}
          </div>
        </>
      )}
      {tab === "projects" && (
        <>
          <form
            className="inline-form"
            key={projectEdit?.id || "new-project"}
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              void action(async () => {
                const payload = {
                  title: String(fd.get("title")).trim(),
                  description: String(fd.get("description")),
                };
                const { error: err } = projectEdit
                  ? await supabase!.from("projects").update(payload).eq("id", projectEdit.id)
                  : await supabase!.from("projects").insert(payload);
                if (err) throw err;
                form.reset();
                setProjectEdit(null);
                setMessage("Project saved.");
              });
            }}
          >
            <label>
              Project title
              <input name="title" required maxLength={200} defaultValue={projectEdit?.title} />
            </label>
            <label>
              Description
              <input name="description" defaultValue={projectEdit?.description} />
            </label>
            <button className="primary" disabled={busy}>
              {projectEdit ? "Save project" : "Add project"}
            </button>
            {projectEdit && (
              <button type="button" onClick={() => setProjectEdit(null)}>
                Cancel
              </button>
            )}
          </form>
          <div className="management-list">
            {projects.map((p) => (
              <article key={p.id}>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <small>{films.filter((f) => f.project_id === p.id).length} versions</small>
                </div>
                <button onClick={() => setProjectEdit(p)}>Edit</button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this project? Films will become standalone."))
                      void action(async () => {
                        const { error: err } = await supabase!
                          .from("projects")
                          .delete()
                          .eq("id", p.id);
                        if (err) throw err;
                      });
                  }}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "categories" && (
        <>
          <form
            className="inline-form"
            key={categoryEdit?.id || "new-category"}
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              void action(async () => {
                const name = String(fd.get("name")).trim();
                const payload = {
                  name,
                  slug: name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                  sort_order: Number(fd.get("sort_order")),
                };
                const { error: err } = categoryEdit
                  ? await supabase!.from("categories").update(payload).eq("id", categoryEdit.id)
                  : await supabase!.from("categories").insert(payload);
                if (err) throw err;
                form.reset();
                setCategoryEdit(null);
                setMessage("Category saved.");
              });
            }}
          >
            <label>
              Name
              <input name="name" required defaultValue={categoryEdit?.name} />
            </label>
            <label>
              Display order
              <input type="number" name="sort_order" defaultValue={categoryEdit?.sort_order || 0} />
            </label>
            <button className="primary" disabled={busy}>
              {categoryEdit ? "Save category" : "Add category"}
            </button>
            {categoryEdit && (
              <button type="button" onClick={() => setCategoryEdit(null)}>
                Cancel
              </button>
            )}
          </form>
          <div className="management-list">
            {categories.map((c) => (
              <article key={c.id}>
                <div>
                  <h3>{c.name}</h3>
                  <small>Order {c.sort_order}</small>
                </div>
                <button onClick={() => setCategoryEdit(c)}>Edit</button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this category? Films will be kept."))
                      void action(async () => {
                        const { error: err } = await supabase!
                          .from("categories")
                          .delete()
                          .eq("id", c.id);
                        if (err) throw err;
                      });
                  }}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "users" && (
        <>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = String(new FormData(form).get("email"));
              void action(async () => {
                const { data, error: err } = await supabase!.functions.invoke(
                  "screening-invite-user",
                  {
                    body: { email },
                  },
                );
                if (err || data?.error)
                  throw new Error(data?.error || err?.message || "Invitation failed");
                setMessage(`Invitation sent to ${email}.`);
                form.reset();
                await loadUsers();
              });
            }}
          >
            <label>
              Invite a viewer
              <input name="email" type="email" required placeholder="friend@example.com" />
            </label>
            <button className="primary" disabled={busy}>
              Send invitation <ArrowUpRight size={16} />
            </button>
          </form>
          <p className="muted">
            Invitations require the deployed invite-user Edge Function. Admin roles are assigned
            securely through the database.
          </p>
          <button type="button" onClick={() => setShowRemoved(!showRemoved)}>
            {showRemoved ? "Hide removed users" : "Show removed users"}
          </button>
          <div className="management-list">
            {users
              .filter((u) => showRemoved || !u.is_archived)
              .map((u) => (
                <article key={u.id}>
                  <div>
                    <h3>{u.display_name}</h3>
                    <p>{u.email}</p>
                    <small>
                      {u.role} ·{" "}
                      {u.is_archived
                        ? "Removed from list · Access revoked"
                        : u.is_active
                          ? "Active"
                          : "Access revoked"}
                    </small>
                  </div>
                  {u.id !== currentUser && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `${u.is_active ? "Revoke" : "Restore"} access for ${u.email}?`,
                          )
                        )
                          return;
                        void action(async () => {
                          const { error: err } = await supabase!
                            .from("profiles")
                            .update({
                              is_active: !u.is_active,
                              ...(u.is_archived ? { is_archived: false } : {}),
                            })
                            .eq("id", u.id);
                          if (err) throw err;
                          await loadUsers();
                        });
                      }}
                    >
                      {u.is_active ? "Revoke access" : "Restore access"}
                    </button>
                  )}
                  {u.id !== currentUser && !u.is_active && u.is_archived !== undefined && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          !u.is_archived &&
                          !window.confirm(
                            `Remove ${u.email} from the list? Access stays revoked and feedback is kept. You can find them under Show removed users.`,
                          )
                        )
                          return;
                        void action(async () => {
                          const { data, error: err } = await supabase!
                            .from("profiles")
                            .update({ is_archived: !u.is_archived })
                            .eq("id", u.id)
                            .eq("is_active", false)
                            .select("id");
                          if (err) throw err;
                          if (!data?.length)
                            throw new Error(
                              "This user’s access changed. Refresh the list and try again.",
                            );
                          await loadUsers();
                          setMessage(
                            u.is_archived
                              ? "User returned to the list. Access remains revoked."
                              : "User removed from the list. Feedback preserved.",
                          );
                        });
                      }}
                    >
                      {u.is_archived ? "Return to list" : "Remove from list"}
                    </button>
                  )}
                </article>
              ))}
          </div>
        </>
      )}
      {editing !== undefined && (
        <FilmEditor
          film={editing}
          projects={projects}
          categories={categories}
          close={() => setEditing(undefined)}
          saved={async () => {
            setEditing(undefined);
            await refresh();
            setMessage("Film saved.");
          }}
        />
      )}
    </main>
  );
}
function FilmEditor({
  film,
  projects,
  categories,
  close,
  saved,
}: {
  film: Film | null;
  projects: Project[];
  categories: Category[];
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [url, setUrl] = useState(film?.youtube_url || "");
  const id = youtubeId(url);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!id) {
      setError("Enter a valid YouTube video URL.");
      return;
    }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title")).trim();
    const payload = {
      title,
      slug: String(fd.get("slug")).trim(),
      short_description: String(fd.get("short_description")),
      description: String(fd.get("description")),
      youtube_url: url,
      youtube_video_id: id,
      provider: "youtube",
      provider_video_id: id,
      thumbnail_url:
        String(fd.get("thumbnail_url")) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      backdrop_url: String(fd.get("backdrop_url")),
      year: Number(fd.get("year")),
      runtime: Number(fd.get("runtime")),
      category_id: fd.get("category_id") || null,
      content_type: String(fd.get("content_type")),
      project_id: fd.get("project_id") || null,
      version_name: String(fd.get("version_name")),
      version_number: Number(fd.get("version_number")),
      status: String(fd.get("status")),
      creator: String(fd.get("creator")),
      ...(fd.get("display_status")
        ? { display_status: String(fd.get("display_status")) }
        : film?.display_status !== undefined
          ? { display_status: "" }
          : {}),
      ...(fd.get("creator_note")
        ? { creator_note: String(fd.get("creator_note")) }
        : film?.creator_note !== undefined
          ? { creator_note: "" }
          : {}),
      is_draft: fd.get("is_draft") === "on",
      is_featured: fd.get("is_featured") === "on",
      is_published: fd.get("is_published") === "on",
    };
    try {
      const { error: err } = film
        ? await supabase!.from("videos").update(payload).eq("id", film.id)
        : await supabase!.from("videos").insert(payload);
      if (err) throw err;
      await saved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save film");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-shade">
      <section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="editor-header">
          <h2 id="editor-title">{film ? "Edit film" : "Add to the collection"}</h2>
          <button aria-label="Close editor" onClick={close}>
            <X size={22} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Title
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={film?.title}
                onChange={(e) => {
                  if (!film) {
                    const slug = e.currentTarget.form?.elements.namedItem(
                      "slug",
                    ) as HTMLInputElement;
                    slug.value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "");
                  }
                }}
              />
            </label>
            <label>
              Slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={film?.slug}
              />
            </label>
            <label className="span-two">
              Short description
              <input
                name="short_description"
                maxLength={300}
                defaultValue={film?.short_description}
              />
            </label>
            <label className="span-two">
              Full description
              <textarea name="description" defaultValue={film?.description} />
            </label>
            <label>
              A note from Riann
              <textarea
                name="creator_note"
                maxLength={4000}
                defaultValue={film?.creator_note || ""}
                placeholder="What should your viewers know before they watch?"
              />
              <small>
                Requires the creator-notes database migration. Leave blank until it is applied.
              </small>
            </label>
            <label className="span-two">
              YouTube URL
              <input
                type="url"
                name="youtube_url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtu.be/…"
              />
              <small>
                {id
                  ? `Video ID: ${id} · Automatic thumbnail ready`
                  : "Paste a watch, share, shorts, or embed URL."}
              </small>
            </label>
            {id && (
              <img
                className="thumbnail-preview"
                src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                alt="Automatic YouTube thumbnail preview"
              />
            )}
            <label>
              Thumbnail URL
              <input
                type="url"
                name="thumbnail_url"
                defaultValue={film?.thumbnail_url}
                placeholder="Automatic from YouTube"
              />
            </label>
            <label>
              Backdrop URL
              <input type="url" name="backdrop_url" defaultValue={film?.backdrop_url} />
            </label>
            <label>
              Year
              <input
                type="number"
                name="year"
                min={1888}
                max={2200}
                required
                defaultValue={film?.year || new Date().getFullYear()}
              />
            </label>
            <label>
              Runtime (minutes)
              <input
                type="number"
                name="runtime"
                min={0}
                required
                defaultValue={film?.runtime || 0}
              />
            </label>
            <label>
              Category
              <select name="category_id" defaultValue={film?.category_id || ""}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Content type
              <select name="content_type" defaultValue={film?.content_type || "documentary"}>
                {["documentary", "family", "event", "short_film", "creative", "other"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select name="project_id" defaultValue={film?.project_id || ""}>
                <option value="">Standalone film</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Creator
              <input name="creator" defaultValue={film?.creator} />
            </label>
            <label>
              Version name
              <input name="version_name" required defaultValue={film?.version_name || "Final"} />
            </label>
            <label>
              Version number
              <input
                type="number"
                name="version_number"
                min={1}
                required
                defaultValue={film?.version_number || 1}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={film?.status || "draft"}>
                {["draft", "rough_cut", "fine_cut", "private_preview", "final"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Screening label (optional)
            <select name="display_status" defaultValue={film?.display_status || ""}>
              <option value="">Use existing production status</option>
              {[
                "FINAL",
                "ROUGH CUT",
                "WIP",
                "FIRST CUT",
                "IN EDIT",
                "EXPERIMENT",
                "UNRELEASED",
                "ARCHIVE",
                "NEEDS FEEDBACK",
              ].map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
            <small>
              Requires the creator-notes migration; existing production status remains unchanged.
            </small>
          </label>
          <div className="toggles">
            {[
              ["is_draft", "Draft room"],
              ["is_featured", "Featured"],
              ["is_published", "Published to viewers"],
            ].map(([name, label]) => (
              <label key={name}>
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={Boolean(film?.[name as keyof Film])}
                />
                {label}
              </label>
            ))}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save film"}
            </button>
            <button type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

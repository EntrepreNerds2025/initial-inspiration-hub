import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GalleryShell, GalleryLoading } from "./GalleryShell";
import { GalleryCollection } from "./GalleryDetail";
import type { GalleryView } from "./types";
import { adminMedia, galleryAdminService, type ManagedGallery } from "./service";
import { GalleryAdminEditor } from "./GalleryAdminEditor";
import { GalleryAdminGate } from "./GalleryAdminGate";
import { GalleryEmail } from "./GalleryEmail";
import { GalleryUpload } from "./GalleryUpload";
export function GalleryAdmin() {
  return (
    <GalleryShell admin>
      <GalleryAdminGate>
        <Workspace />
      </GalleryAdminGate>
    </GalleryShell>
  );
}
function Workspace() {
  const [galleries, setGalleries] = useState<ManagedGallery[]>([]),
    [selected, setSelected] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all"),
    [editor, setEditor] = useState<ManagedGallery | null>(null),
    [deleting, setDeleting] = useState<ManagedGallery | null>(null),
    [photoDelete, setPhotoDelete] = useState<string | null>(null),
    [uploading, setUploading] = useState(false),
    [drag, setDrag] = useState("");
  const [mediaReady, setMediaReady] = useState<boolean | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [replaceId, setReplaceId] = useState<string | undefined>();
  const [preview, setPreview] = useState<GalleryView | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const active = galleries.find((g) => g.id === selected);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = () =>
      void adminMedia("preview", { slug: active.slug })
        .then((result) => {
          if (alive && result.gallery) {
            setMediaReady(true);
            setPreviews(
              Object.fromEntries(
                result.gallery.photos.map((p: { id: string; preview_url: string }) => [
                  p.id,
                  p.preview_url,
                ]),
              ),
            );
            setPreview((old) => (old?.id === active.id ? result.gallery : old));
          }
        })
        .catch(() => {
          if (alive) {
            setMediaReady(false);
            setPreviews({});
            setPreview(null);
          }
        });
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [active]);
  async function refresh() {
    const list = await galleryAdminService.list();
    setGalleries(list);
    setSelected((old) => (list.some((g) => g.id === old) ? old : list[0]?.id || ""));
  }
  useEffect(() => {
    let alive = true;
    galleryAdminService
      .list()
      .then((list) => {
        if (alive) {
          setGalleries(list);
          setSelected(list[0]?.id || "");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  function create() {
    setEditor({
      id: crypto.randomUUID(),
      slug: "untitled-collection-" + Date.now(),
      title: "Untitled collection",
      description: "",
      category: "PHOTOGRAPHY",
      cover_photo_id: null,
      visibility: "private",
      status: "draft",
      created_at: new Date().toISOString(),
      expires_at: null,
      sort_order: galleries.length,
      revision: 0,
      photos: [],
      passwordConfigured: false,
    });
  }
  async function reorder(from: string, to: string) {
    if (!active || busy) return;
    const ids = active.photos.map((p) => p.id);
    const a = ids.indexOf(from),
      b = ids.indexOf(to);
    if (a < 0 || b < 0 || a === b) return;
    ids.splice(b, 0, ids.splice(a, 1)[0]!);
    await run(() => galleryAdminService.reorder(active, ids), "Photo order saved.");
  }
  const size = (g: ManagedGallery) =>
    g.photos.reduce((sum, p) => sum + Number(p.preview_file_size || 0), 0);
  if (loading) return <GalleryLoading />;
  return (
    <main className="dg-admin">
      <div className="dg-admin-banner">
        <p>PRIVATE PREVIEWS / UGREEN ORIGINAL DELIVERY</p>
        <button disabled={busy} onClick={() => void run(refresh, "Collections refreshed.")}>
          Refresh ↺
        </button>
      </div>
      <header className="dg-admin-heading">
        <div>
          <span className="dg-label">DEPT. / COLLECTION MANAGEMENT</span>
          <h1>The collections.</h1>
        </div>
        <button className="dg-button dg-primary" disabled={busy} onClick={create}>
          + Create gallery
        </button>
      </header>
      <div className="dg-admin-stats">
        <div>
          <strong>{galleries.length.toString().padStart(2, "0")}</strong>
          <span>GALLERIES</span>
        </div>
        <div>
          <strong>{galleries.reduce((n, g) => n + g.photos.length, 0)}</strong>
          <span>PHOTO RECORDS</span>
        </div>
        <div>
          <strong>{(galleries.reduce((n, g) => n + size(g), 0) / 1048576).toFixed(2)} MB</strong>
          <span>SAVED PREVIEW SIZES</span>
        </div>
      </div>
      <p className="dg-estimate-note">
        Saved preview sizes only; originals stay on your NAS. Pending uploads and cleanup can
        temporarily use additional storage. Gallery upload budget: 900 MB; account-wide usage is
        available in Supabase.
      </p>
      {mediaReady === false && (
        <p role="status" className="dg-notice">
          Preview storage setup is awaiting approval. Your existing gallery is preserved; new
          preview uploads and download-link saves need the Phase 3 migration and media service
          before they can work.
        </p>
      )}
      {notice && (
        <p role="status" className="dg-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="dg-form-error">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="dg-admin-workspace">
        <aside className="dg-admin-sidebar">
          <label>
            Show collections
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All collections</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="draft">Drafts</option>
            </select>
          </label>
          <div className="dg-admin-list">
            {galleries
              .filter((g) => filter === "all" || g.visibility === filter || g.status === filter)
              .map((g) => (
                <button
                  key={g.id}
                  aria-pressed={selected === g.id}
                  onClick={() => setSelected(g.id)}
                >
                  <span className="dg-label">
                    {g.visibility} /{" "}
                    {g.expires_at && Date.parse(g.expires_at) <= Date.now() ? "expired" : g.status}
                  </span>
                  <strong>{g.title}</strong>
                  <small>{g.photos.length} photographs</small>
                </button>
              ))}
          </div>
        </aside>
        {active ? (
          <section className="dg-admin-detail">
            <div className="dg-admin-detail-head">
              <span className="dg-label">
                {active.visibility} / {active.status}
              </span>
              <h2>{active.title}</h2>
              <p>{active.description || "No description added."}</p>
              <p className="dg-label">
                {active.photos.length} PHOTOS · {(size(active) / 1048576).toFixed(2)} MB · EXPIRES{" "}
                {active.expires_at ? new Date(active.expires_at).toLocaleString() : "NEVER"}
              </p>
            </div>
            <div className="dg-admin-actions">
              <button
                className="dg-button"
                onClick={() =>
                  void run(async () => {
                    const result = await adminMedia("preview", { slug: active.slug });
                    if (result.gallery) setPreview(result.gallery);
                  }, "Admin preview opened.")
                }
              >
                Preview gallery
              </button>
              <button
                className="dg-button"
                onClick={() =>
                  void run(
                    () => adminMedia("cleanup"),
                    "Unused preview cleanup completed. Originals were not touched.",
                  )
                }
              >
                Clean unused previews
              </button>
              <button className="dg-button" onClick={() => setEditor(active)}>
                Edit gallery
              </button>
              <button
                className="dg-button"
                onClick={() => {
                  setReplaceId(undefined);
                  setUploading(true);
                }}
              >
                Upload JPEG previews
              </button>
              <button
                className="dg-button"
                onClick={() =>
                  void run(
                    () =>
                      galleryAdminService.save({
                        ...active,
                        status: active.status === "published" ? "draft" : "published",
                      }),
                    "Publication status saved.",
                  )
                }
              >
                {active.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                className="dg-button"
                onClick={async () => {
                  const link =
                    location.origin +
                    "/galleries/" +
                    active.slug +
                    (active.visibility === "private" &&
                    active.passwordRequired === false &&
                    active.shareKey
                      ? "#access=" + active.shareKey
                      : "");
                  try {
                    await navigator.clipboard.writeText(link);
                    setNotice(
                      "Gallery link copied." +
                        (active.status !== "published" ? " This gallery is not published." : ""),
                    );
                  } catch {
                    setNotice("Gallery link: " + link);
                  }
                }}
              >
                Copy gallery link
              </button>
              <button className="dg-button" onClick={() => setDeleting(active)}>
                Delete gallery
              </button>
            </div>
            <GalleryEmail key={active.id} gallery={active} />
            <div className="dg-admin-photo-heading">
              <p className="dg-label">PHOTO SEQUENCE / DRAG OR USE ARROW BUTTONS</p>
              <span className="dg-label">
                COVER {active.cover_photo_id ? "SELECTED" : "NOT SET"}
              </span>
            </div>
            {!active.photos.length ? (
              <div className="dg-admin-empty">
                <h3>Make room for the moments.</h3>
                <p>
                  Add optimized JPEG previews to this collection. Your full-resolution originals
                  stay on your NAS.
                </p>
                <button
                  className="dg-button"
                  onClick={() => {
                    setReplaceId(undefined);
                    setUploading(true);
                  }}
                >
                  Add photographs ↗
                </button>
              </div>
            ) : (
              <div className="dg-admin-photos">
                {active.photos.map((p, i) => (
                  <article
                    key={p.id}
                    draggable={!busy}
                    onDragStart={() => setDrag(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void reorder(drag, p.id);
                      setDrag("");
                    }}
                  >
                    {previews[p.id] ? (
                      <img
                        src={previews[p.id]}
                        alt={p.filename}
                        loading="lazy"
                        style={{ width: "100%", aspectRatio: "4/3", objectFit: "contain" }}
                      />
                    ) : (
                      <div className="dg-upload-placeholder">
                        Preview unavailable — check storage setup.
                      </div>
                    )}
                    <div>
                      <span>
                        {i + 1} / {p.filename}
                      </span>
                      <button
                        aria-pressed={active.cover_photo_id === p.id}
                        onClick={() =>
                          void run(
                            () => galleryAdminService.save({ ...active, cover_photo_id: p.id }),
                            "Cover photo saved.",
                          )
                        }
                      >
                        {active.cover_photo_id === p.id ? "COVER ✓" : "SET COVER"}
                      </button>
                    </div>
                    <div className="dg-sequence-controls">
                      <button
                        disabled={i === 0 || busy}
                        aria-label={"Move " + p.filename + " earlier"}
                        onClick={() => void reorder(p.id, active.photos[i - 1]!.id)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={i === active.photos.length - 1 || busy}
                        aria-label={"Move " + p.filename + " later"}
                        onClick={() => void reorder(p.id, active.photos[i + 1]!.id)}
                      >
                        ↓
                      </button>
                      <span>
                        {p.width} × {p.height} /{" "}
                        {(Number(p.preview_file_size || 0) / 1048576).toFixed(2)} MB
                      </span>
                      <button
                        onClick={() => {
                          setReplaceId(p.id);
                          setUploading(true);
                        }}
                      >
                        Replace preview
                      </button>
                      <small>
                        Original: {(p.original_file_size / 1048576).toFixed(2)} MB · preview:{" "}
                        {((p.preview_file_size || 0) / 1048576).toFixed(2)} MB
                      </small>
                      <button onClick={() => setPhotoDelete(p.id)}>Delete photo</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="dg-admin-empty">
            <h2>No collection selected.</h2>
            <p>Create your first gallery to get started.</p>
            <button className="dg-button" onClick={create}>
              + Create gallery
            </button>
          </section>
        )}
      </fieldset>
      {editor && (
        <GalleryAdminEditor
          key={editor.id}
          gallery={editor}
          onClose={() => setEditor(null)}
          slugExists={(slug) => galleries.some((g) => g.id !== editor.id && g.slug === slug)}
          onSave={async (g, password) => {
            await galleryAdminService.save(g, password);
            await refresh();
            setSelected(g.id);
            setNotice("Gallery saved to the database.");
          }}
        />
      )}
      <Dialog.Root
        open={!!deleting || !!photoDelete}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleting(null);
            setPhotoDelete(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dg-editor-overlay" />
          <Dialog.Content className="dg dg-small-dialog">
            <Dialog.Title>
              {deleting ? "Delete this gallery?" : "Delete this photo record?"}
            </Dialog.Title>
            <Dialog.Description>
              {deleting
                ? `“${deleting.title}” and its photo records will be removed permanently.`
                : "The photo metadata will be removed and any cover selection cleared. Its preview is queued for cleanup. Your NAS original is untouched."}{" "}
              This cannot be undone.
            </Dialog.Description>
            <div className="dg-admin-actions">
              <Dialog.Close className="dg-button" disabled={busy}>
                Cancel
              </Dialog.Close>
              <button
                className="dg-button dg-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (deleting) await galleryAdminService.delete(deleting);
                    else if (active && photoDelete)
                      await galleryAdminService.deletePhoto(active, photoDelete);
                    setDeleting(null);
                    setPhotoDelete(null);
                  }, "Deleted from the database.")
                }
              >
                {busy ? "Deleting…" : "Confirm deletion"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={uploading}
        onOpenChange={(open) => {
          if (!uploadBusy) setUploading(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dg-editor-overlay" />
          <Dialog.Content className="dg dg-small-dialog">
            <Dialog.Title>Bring the frames together.</Dialog.Title>
            <Dialog.Description>
              Optimized JPEG previews only. Keep full-resolution photographs on your NAS.
            </Dialog.Description>
            {active && (
              <GalleryUpload
                galleryId={active.id}
                {...(replaceId ? { replaceId } : {})}
                onSaved={refresh}
                onBusy={setUploadBusy}
              />
            )}
            <Dialog.Close className="dg-button" disabled={uploadBusy}>
              Close
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dg-editor-overlay" />
          <Dialog.Content className="dg dg-admin-preview">
            <Dialog.Title>Administrator preview</Dialog.Title>
            <Dialog.Description>
              Only you can preview unpublished collections. Client access still requires publication
              and authorization.
            </Dialog.Description>
            <Dialog.Close className="dg-button">Close preview ×</Dialog.Close>
            {preview && <GalleryCollection gallery={{ ...preview, has_download: false }} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

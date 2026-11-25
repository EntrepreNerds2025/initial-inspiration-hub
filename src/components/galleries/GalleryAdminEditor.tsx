import { validDeliveryUrl } from "../../../supabase/functions/_shared/gallery-validation";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Gallery } from "./types";
import type { ManagedGallery } from "./service";
export function GalleryAdminEditor({
  gallery,
  onSave,
  onClose,
  slugExists,
}: {
  gallery: ManagedGallery;
  onSave: (g: ManagedGallery, password?: string) => Promise<void>;
  onClose: () => void;
  slugExists: (slug: string) => boolean;
}) {
  const [draft, setDraft] = useState(gallery);
  const [error, setError] = useState("");
  const password = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dg-editor-overlay" />
        <Dialog.Content className="dg dg-editor">
          <header>
            <div>
              <p className="dg-label">COLLECTION MANAGEMENT</p>
              <Dialog.Title>Edit the collection.</Dialog.Title>
              <Dialog.Description>
                Changes are saved securely to your gallery database.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dg-button" aria-label="Close gallery editor">
              ×
            </Dialog.Close>
          </header>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const slug = draft.slug.trim();
              if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
                setError("Use lowercase letters, numbers and single hyphens in the gallery link.");
                return;
              }
              if (slugExists(slug)) {
                setError("Another collection already uses that link.");
                return;
              }
              if (draft.expires_at && !Number.isFinite(Date.parse(draft.expires_at))) {
                setError("Enter a valid expiration date.");
                return;
              }
              if (
                !validDeliveryUrl(draft.download_url) ||
                (draft.downloads_enabled && !draft.download_url)
              ) {
                setError("Enter a valid UGREEN share-download link before enabling downloads.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await onSave(
                  { ...draft, slug, title: draft.title.trim() },
                  password.current?.value || undefined,
                );
                if (password.current) password.current.value = "";
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to save. Please retry.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy} className="dg-admin-fields">
              <label>
                Gallery title
                <input
                  required
                  value={draft.title}
                  maxLength={120}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              <label>
                Gallery link / slug
                <input
                  required
                  value={draft.slug}
                  maxLength={100}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                />
              </label>
              <label className="dg-full">
                Description
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <label>
                Category
                <input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
              </label>
              <label>
                Visibility
                <select
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft({ ...draft, visibility: e.target.value as Gallery["visibility"] })
                  }
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label>
                Publication status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as Gallery["status"] })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label>
                Expiration date
                <input
                  type="date"
                  value={draft.expires_at?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expires_at: e.target.value ? e.target.value + "T23:59:59Z" : null,
                    })
                  }
                />
              </label>
              {draft.visibility === "private" && (
                <label className="dg-full">
                  {draft.passwordConfigured ? "Change gallery password" : "Set gallery password"}
                  <input
                    ref={password}
                    type="password"
                    autoComplete="off"
                    placeholder="12–72 bytes; leave blank to keep unchanged"
                    minLength={12}
                    maxLength={72}
                  />
                  <small>
                    Hashed on the server. Changing it revokes existing gallery access sessions.
                  </small>
                </label>
              )}
              <label className="dg-full">
                UGREEN download share link (optional)
                <input
                  type="url"
                  value={draft.download_url || ""}
                  maxLength={2048}
                  placeholder="https://ug.link/…/filemgr/share-download/?id=…"
                  onChange={(e) => setDraft({ ...draft, download_url: e.target.value.trim() })}
                />
                <small>
                  Use a UGREEN file-sharing link. Never enter a NAS login password or home-network
                  address.
                </small>
              </label>
              <label className="dg-full">
                <span>
                  <input
                    type="checkbox"
                    checked={draft.downloads_enabled || false}
                    onChange={(e) => setDraft({ ...draft, downloads_enabled: e.target.checked })}
                  />{" "}
                  Enable Download Photos
                </span>
                <small>
                  UGREEN permissions, password and expiry are separate. Expiring this gallery cannot
                  revoke a share link already received.
                </small>
              </label>
              <div className="dg-full dg-admin-actions">
                {draft.download_url && validDeliveryUrl(draft.download_url) && (
                  <a
                    className="dg-button"
                    href={draft.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Test UGREEN link ↗
                  </a>
                )}
                <button
                  type="button"
                  className="dg-button"
                  onClick={() => setDraft({ ...draft, download_url: "", downloads_enabled: false })}
                >
                  Remove download link
                </button>
                <small>Save gallery to persist link changes.</small>
              </div>
              <label className="dg-full">
                Cover photo
                <select
                  value={draft.cover_photo_id || ""}
                  onChange={(e) => setDraft({ ...draft, cover_photo_id: e.target.value || null })}
                >
                  <option value="">No cover selected</option>
                  {draft.photos.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.filename}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="dg-form-error">
                {error}
              </p>
            )}
            <div className="dg-admin-actions">
              <button type="button" className="dg-button" disabled={busy} onClick={onClose}>
                Cancel
              </button>
              <button className="dg-button dg-primary" disabled={busy || !draft.title.trim()}>
                {busy ? "Saving…" : "Save gallery ↗"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

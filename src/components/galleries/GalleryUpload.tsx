import { useState } from "react";
import { optimizeGalleryPhoto } from "@/lib/galleries/optimize";
import { uploadPreview } from "./service";
type Item = {
  id: string;
  file: File;
  percent: number;
  status: string;
  done: boolean;
  preview?: Blob;
};
export function GalleryUpload({
  galleryId,
  replaceId,
  onSaved,
  onBusy,
}: {
  galleryId: string;
  replaceId?: string;
  onSaved: () => Promise<void>;
  onBusy?: (busy: boolean) => void;
}) {
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [over, setOver] = useState(false),
    [edge, setEdge] = useState(2048);
  const update = (id: string, patch: Partial<Item>) =>
    setItems((old) => old.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  function select(files: FileList | null) {
    if (busy || !files) return;
    setItems(
      Array.from(files)
        .slice(0, replaceId ? 1 : 100)
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          percent: 0,
          status: "Ready to prepare",
          done: false,
        })),
    );
  }
  async function start() {
    setNotice("");
    setBusy(true);
    onBusy?.(true);
    try {
      for (const item of items.filter((item) => !item.done)) {
        try {
          update(item.id, { status: "Preparing optimized preview…" });
          const preview = item.preview || (await optimizeGalleryPhoto(item.file, edge));
          update(item.id, { preview, status: "Uploading preview…" });
          await uploadPreview(
            galleryId,
            item.id,
            item.file,
            preview,
            (value) => update(item.id, { percent: value }),
            replaceId,
          );
          update(item.id, { done: true, status: "Saved — original remains on your device." });
        } catch (error) {
          update(item.id, {
            status: error instanceof Error ? error.message : "Upload failed. Retry.",
            percent: 0,
          });
        }
      }
      try {
        await onSaved();
      } catch {
        setNotice(
          "Uploads finished, but the gallery list could not refresh. Reload before making further changes.",
        );
      }
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div>
      {notice && <p role="alert">{notice}</p>}
      <div
        className="dg-upload-placeholder"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          select(e.dataTransfer.files);
        }}
        style={{ outline: over ? "1px solid currentColor" : undefined }}
      >
        <span aria-hidden="true">↑</span>
        <p>Drag JPEG photographs here or select files.</p>
        <label className="dg-button">
          Select photos
          <input
            type="file"
            accept="image/jpeg,.jpg,.jpeg"
            multiple={!replaceId}
            disabled={busy}
            onChange={(e) => {
              select(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <small>
          Only optimized previews upload to Supabase. Full-resolution delivery stays on your UGREEN
          share.
        </small>
      </div>
      <label>
        Preview size{" "}
        <select
          value={edge}
          disabled={busy || items.some((i) => !!i.preview)}
          onChange={(e) => setEdge(Number(e.target.value))}
        >
          <option value={2048}>2048 px</option>
          <option value={1600}>1600 px / smaller files</option>
        </select>
      </label>
      <ul className="dg-upload-queue">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.file.name}</strong> · {(item.file.size / 1048576).toFixed(2)} MB original
            {item.preview && ` / ${(item.preview.size / 1048576).toFixed(2)} MB preview`}
            <progress value={item.percent} max={100} aria-label={item.file.name + " upload"} />
            <p role="status">{item.status}</p>
          </li>
        ))}
      </ul>
      <button
        className="dg-button dg-primary"
        disabled={busy || !items.some((i) => !i.done)}
        onClick={() => void start()}
      >
        {busy ? "Saving previews…" : "Upload / retry remaining"}
      </button>
    </div>
  );
}

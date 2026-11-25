import { useEffect, useState } from "react";
import type { PhotoPreview } from "./types";
export function PhotoImage({
  photo,
  eager = false,
  thumbnail = false,
}: {
  photo: PhotoPreview;
  eager?: boolean;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [photo.preview_url]);
  return (
    <div
      className={"dg-photo " + (loaded ? "is-loaded" : "")}
      style={{ aspectRatio: `${photo.width}/${photo.height}` }}
    >
      {failed ? (
        <div
          className="dg-image-fallback"
          role="img"
          aria-label={photo.alt + " (preview unavailable)"}
        >
          <span>PREVIEW UNAVAILABLE</span>
        </div>
      ) : (
        <img
          src={thumbnail && photo.thumbnail_url ? photo.thumbnail_url : photo.preview_url}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

import {
  jpegDimensions,
  ORIGINAL_MAX_BYTES,
  PREVIEW_MAX_BYTES,
} from "../../../supabase/functions/_shared/gallery-validation";
/** Originals remain on this device. Only the stripped, resized canvas JPEG is uploaded. */
export async function optimizeGalleryPhoto(file: File, longestEdge = 2048): Promise<Blob> {
  if (file.type !== "image/jpeg" || !/\.jpe?g$/i.test(file.name))
    throw new Error("Choose JPEG photographs (.jpg or .jpeg).");
  if (!file.size || file.size > ORIGINAL_MAX_BYTES) throw new Error("Choose a JPEG under 80 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = jpegDimensions(bytes);
  if (dimensions.width * dimensions.height > 60000000)
    throw new Error("Export this photograph below 60 megapixels first.");
  const image = await createImageBitmap(file, { imageOrientation: "from-image" });
  const edge = Math.min(2048, Math.max(1600, longestEdge));
  const ratio = Math.min(1, edge / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare previews. Try a current browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.84, 0.74, 0.64, 0.54]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= PREVIEW_MAX_BYTES) return blob;
    }
    throw new Error("Preview is still too large. Export a smaller JPEG and retry.");
  } finally {
    image.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

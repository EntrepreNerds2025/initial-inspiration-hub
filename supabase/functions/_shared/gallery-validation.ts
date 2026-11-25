export const PREVIEW_MAX_BYTES = 2 * 1024 * 1024;
export const ORIGINAL_MAX_BYTES = 80 * 1024 * 1024;
export function validDeliveryUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.length > 2048) return false;
  return (
    /^https:\/\/(ug\.link|www\.ug\.link)\/[a-zA-Z0-9_-]+\/filemgr\/share-download\/\?id=[a-f0-9]{32}$/.test(
      value,
    ) ||
    /^https:\/\/dept-hq\.us25\.ug\.link\/filemgr\/share-download\/\?id=[a-f0-9]{32}$/.test(value)
  );
}
/** Read JPEG dimensions before allocating decoded pixels. Decoder still validates the image. */
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error("Choose a valid JPEG photograph.");
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 255) throw new Error("Invalid JPEG structure.");
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    if (marker === 1 || (marker! >= 208 && marker! <= 215)) continue;
    const length = bytes[offset]! * 256 + bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) throw new Error("Incomplete JPEG.");
    if (marker === 192 || marker === 193 || marker === 194) {
      if (length < 8) throw new Error("Invalid JPEG frame.");
      const height = bytes[offset + 3]! * 256 + bytes[offset + 4]!;
      const width = bytes[offset + 5]! * 256 + bytes[offset + 6]!;
      if (!width || !height) throw new Error("Invalid JPEG dimensions.");
      return { width, height };
    }
    offset += length;
  }
  throw new Error("Unsupported or incomplete JPEG.");
}
export function validatePreview(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > PREVIEW_MAX_BYTES)
    throw new Error("Preview must be under 2 MB.");
  const dimensions = jpegDimensions(bytes);
  if (Math.max(dimensions.width, dimensions.height) > 2048)
    throw new Error("Preview must be at most 2048 pixels.");
  if (bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217)
    throw new Error("Incomplete JPEG.");
  return dimensions;
}

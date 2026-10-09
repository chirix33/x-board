export const TEXT_MAX_BYTES = 100 * 1024;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const CLIP_TTL_MS = 24 * 60 * 60 * 1000;
export const CLIP_LIST_LIMIT = 50;
export const DISPLAY_TEXT_WORD_LIMIT = 250;
export const UPLOAD_URL_TTL_SECONDS = 60;
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;
export const POLL_INTERVAL_MS = 1000;

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateDisplayText(
  text: string,
  maxWords = DISPLAY_TEXT_WORD_LIMIT,
) {
  const words = [...text.matchAll(/\S+/g)];
  if (words.length <= maxWords) return text;
  const last = words[maxWords - 1];
  const end = (last.index ?? 0) + last[0].length;
  return `${text.slice(0, end)}...`;
}

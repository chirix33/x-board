const SHARE_CACHE = "x-board-share";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
  file: File | null;
};

let reading: Promise<SharePayload | null> | null = null;

export function takeSharePayload() {
  if (!reading) reading = readAndClear();
  return reading;
}

export function textFromShare(payload: SharePayload) {
  const parts = [payload.title, payload.text, payload.url]
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(parts)].join("\n");
}

async function readAndClear(): Promise<SharePayload | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(SHARE_CACHE);
  const metaResponse = await cache.match(shareUrl("/share-meta"));
  if (!metaResponse) return null;
  const meta = (await metaResponse.json()) as {
    title?: string;
    text?: string;
    url?: string;
    fileType?: string;
    fileName?: string;
  };
  const fileResponse = await cache.match(shareUrl("/share-file"));
  await cache.delete(shareUrl("/share-meta"));
  await cache.delete(shareUrl("/share-file"));
  const file = fileResponse
    ? new File([await fileResponse.blob()], meta.fileName || "share", {
        type: meta.fileType || fileResponse.headers.get("Content-Type") || "",
      })
    : null;
  return {
    title: meta.title ?? "",
    text: meta.text ?? "",
    url: meta.url ?? "",
    file,
  };
}

function shareUrl(path: string) {
  return new URL(path, window.location.origin).href;
}

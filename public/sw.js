const SHARE_CACHE = "x-board-share";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share") return;
  event.respondWith(storeShare(event.request));
});

async function storeShare(request) {
  const form = await request.formData();
  const file = form.get("media");
  const hasFile = isFile(file);
  const meta = {
    title: stringField(form.get("title")),
    text: stringField(form.get("text")),
    url: stringField(form.get("url")),
    fileType: hasFile ? file.type : "",
    fileName: hasFile && "name" in file ? String(file.name) : "",
  };
  const cache = await caches.open(SHARE_CACHE);
  await cache.put(
    shareUrl("/share-meta"),
    new Response(JSON.stringify(meta), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  if (hasFile) {
    await cache.put(
      shareUrl("/share-file"),
      new Response(file, {
        headers: { "Content-Type": file.type || "application/octet-stream" },
      }),
    );
  } else {
    await cache.delete(shareUrl("/share-file"));
  }
  return Response.redirect(shareUrl("/share"), 303);
}

function shareUrl(path) {
  return new URL(path, self.location.origin).href;
}

function stringField(value) {
  return typeof value === "string" ? value : "";
}

function isFile(value) {
  return typeof value !== "string" && value instanceof Blob && value.size > 0;
}

import { validateText, type Draft } from "@/lib/clipboard";

type Sendable =
  | { kind: "text"; text: string }
  | { kind: "image"; file: File };

export async function sendDraft(draft: Sendable | Draft) {
  const id = crypto.randomUUID();

  if (draft.kind === "text") {
    const invalid = validateText(draft.text);
    if (invalid) return invalid;
    const response = await fetch("/api/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind: "text", text: draft.text }),
    });
    if (!response.ok) return await readError(response);
    return null;
  }

  const urlResponse = await fetch("/api/clips/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: draft.file.type,
      byteSize: draft.file.size,
    }),
  });
  if (!urlResponse.ok) return await readError(urlResponse);

  const { objectKey, uploadUrl } = (await urlResponse.json()) as {
    objectKey: string;
    uploadUrl: string;
  };
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": draft.file.type },
    body: draft.file,
  });
  if (!uploaded.ok) return "Could not upload the image";

  const confirm = await fetch("/api/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      kind: "image",
      objectKey,
      contentType: draft.file.type,
      byteSize: draft.file.size,
    }),
  });
  if (!confirm.ok) return await readError(confirm);
  return null;
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

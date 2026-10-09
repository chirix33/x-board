import { IMAGE_MAX_BYTES, TEXT_MAX_BYTES, formatBytes, isAllowedImageType } from "@/lib/constants";

export type Draft =
  | { kind: "text"; text: string }
  | { kind: "image"; file: File; previewUrl: string };

export const IMAGE_TYPE_ERROR = "IMAGE_TYPE";

export function validateText(text: string) {
  const trimmed = text;
  if (!trimmed) return "Paste some text first";
  const bytes = new TextEncoder().encode(trimmed).byteLength;
  if (bytes > TEXT_MAX_BYTES) {
    return `Text is ${formatBytes(bytes)}; the limit is ${formatBytes(TEXT_MAX_BYTES)}`;
  }
  return null;
}

export function validateImage(file: File) {
  if (!isAllowedImageType(file.type)) {
    return IMAGE_TYPE_ERROR;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `Image is ${formatBytes(file.size)}; the limit is ${formatBytes(IMAGE_MAX_BYTES)}`;
  }
  return null;
}

export async function blobToPng(blob: Blob) {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the image");
  }
  context.drawImage(bitmap, 0, 0);
  const png = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!png) {
    throw new Error("Could not prepare the image");
  }
  return png;
}

async function normalizeImageFile(file: File): Promise<File | { error: string }> {
  if (isAllowedImageType(file.type)) {
    if (file.size > IMAGE_MAX_BYTES) {
      return {
        error: `Image is ${formatBytes(file.size)}; the limit is ${formatBytes(IMAGE_MAX_BYTES)}`,
      };
    }
    return file;
  }

  if (file.type && !file.type.startsWith("image/")) {
    return { error: IMAGE_TYPE_ERROR };
  }

  try {
    const png = await blobToPng(file);
    if (png.size > IMAGE_MAX_BYTES) {
      return {
        error: `Image is ${formatBytes(png.size)}; the limit is ${formatBytes(IMAGE_MAX_BYTES)}`,
      };
    }
    return new File([png], "paste.png", { type: "image/png" });
  } catch {
    return { error: IMAGE_TYPE_ERROR };
  }
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export async function copyImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load the image");
  }
  const blob = await blobToPng(await response.blob());
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

export async function draftFromClipboardData(
  data: DataTransfer | null,
): Promise<Draft | { error: string } | null> {
  if (!data) return null;

  const imageItem = [...data.items].find((item) => item.type.startsWith("image/"));
  if (imageItem) {
    const file = imageItem.getAsFile();
    if (!file) return { error: "Could not read that image" };
    const normalized = await normalizeImageFile(file);
    if ("error" in normalized) return normalized;
    return { kind: "image", file: normalized, previewUrl: URL.createObjectURL(normalized) };
  }

  if (data.files.length > 0) {
    const file = data.files[0];
    if (file.type.startsWith("image/") || !file.type) {
      const normalized = await normalizeImageFile(file);
      if ("error" in normalized) return normalized;
      return { kind: "image", file: normalized, previewUrl: URL.createObjectURL(normalized) };
    }
  }

  const text = data.getData("text/plain");
  if (text) {
    const error = validateText(text);
    if (error) return { error };
    return { kind: "text", text };
  }

  return null;
}

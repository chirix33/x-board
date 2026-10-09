import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { createUploadUrl } from "@/lib/r2";
import { IMAGE_MAX_BYTES, isAllowedImageType } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const contentType = typeof payload.contentType === "string" ? payload.contentType : "";
  const byteSize = typeof payload.byteSize === "number" ? payload.byteSize : Number.NaN;

  if (!isAllowedImageType(contentType)) {
    return NextResponse.json({ error: "Use PNG, JPEG, WebP, or GIF" }, { status: 400 });
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large" }, { status: 413 });
  }

  const id = crypto.randomUUID();
  const ext =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "png";
  const objectKey = `clips/${session.user.id}/${id}.${ext}`;
  const uploadUrl = await createUploadUrl(objectKey, contentType);

  return NextResponse.json({ objectKey, uploadUrl });
}

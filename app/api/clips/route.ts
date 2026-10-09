import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { clipExpiry, listClips } from "@/lib/clips";
import { getDb } from "@/lib/db";
import { clips } from "@/lib/db/schema";
import { objectExists } from "@/lib/r2";
import {
  IMAGE_MAX_BYTES,
  TEXT_MAX_BYTES,
  isAllowedImageType,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const result = await listClips(after);
  return NextResponse.json(result);
}

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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid clip" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const id = typeof payload.id === "string" ? payload.id : "";
  const kind = payload.kind;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "A valid clip id is required" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, id)).limit(1);
  if (existing) {
    return NextResponse.json({ id: existing.id, deduped: true });
  }

  if (kind === "text") {
    const text = typeof payload.text === "string" ? payload.text : "";
    if (!text.trim()) {
      return NextResponse.json({ error: "Paste some text first" }, { status: 400 });
    }
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > TEXT_MAX_BYTES) {
      return NextResponse.json(
        { error: `Text is ${bytes} bytes; the limit is ${TEXT_MAX_BYTES} bytes` },
        { status: 413 },
      );
    }

    await db.insert(clips).values({
      id,
      kind: "text",
      textBody: text,
      createdBy: session.user.id,
      expiresAt: clipExpiry(),
    });

    return NextResponse.json({ id }, { status: 201 });
  }

  if (kind === "image") {
    const objectKey = typeof payload.objectKey === "string" ? payload.objectKey : "";
    const contentType = typeof payload.contentType === "string" ? payload.contentType : "";
    const byteSize = typeof payload.byteSize === "number" ? payload.byteSize : Number.NaN;
    const prefix = `clips/${session.user.id}/`;

    if (!objectKey.startsWith(prefix)) {
      return NextResponse.json({ error: "That upload does not belong to this session" }, { status: 400 });
    }
    if (!isAllowedImageType(contentType)) {
      return NextResponse.json({ error: "Use PNG, JPEG, WebP, or GIF" }, { status: 400 });
    }
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }
    if (!(await objectExists(objectKey))) {
      return NextResponse.json({ error: "Upload the image before sending" }, { status: 400 });
    }

    await db.insert(clips).values({
      id,
      kind: "image",
      objectKey,
      contentType,
      byteSize,
      createdBy: session.user.id,
      expiresAt: clipExpiry(),
    });

    return NextResponse.json({ id }, { status: 201 });
  }

  return NextResponse.json({ error: "Clip must be text or image" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { clips } from "@/lib/db/schema";
import { getObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "A valid clip id is required" }, { status: 400 });
  }

  const db = getDb();
  const [clip] = await db
    .select({
      kind: clips.kind,
      objectKey: clips.objectKey,
      contentType: clips.contentType,
    })
    .from(clips)
    .where(and(eq(clips.id, id), gt(clips.expiresAt, new Date())))
    .limit(1);

  if (!clip || clip.kind !== "image" || !clip.objectKey) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const object = await getObject(clip.objectKey);
    if (!object.Body) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": clip.contentType ?? object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not load the image" }, { status: 502 });
  }
}

import { and, desc, eq, gt, lt } from "drizzle-orm";
import { clips, user, type Clip } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { deleteObject, createDownloadUrl } from "@/lib/r2";
import { CLIP_LIST_LIMIT, CLIP_TTL_MS } from "@/lib/constants";

export type ClipDto = {
  id: string;
  kind: "text" | "image";
  text: string | null;
  imageUrl: string | null;
  contentType: string | null;
  createdAt: string;
  createdByEmail: string;
  expiresAt: string;
};

async function pruneExpired() {
  const db = getDb();
  const expired = await db
    .select({ id: clips.id, objectKey: clips.objectKey })
    .from(clips)
    .where(lt(clips.expiresAt, new Date()));

  if (expired.length === 0) return;

  for (const row of expired) {
    if (row.objectKey) {
      try {
        await deleteObject(row.objectKey);
      } catch {
        // Keep going so a missing object cannot block expiry.
      }
    }
  }

  await db.delete(clips).where(lt(clips.expiresAt, new Date()));
}

async function toDto(row: Clip & { createdByEmail: string }): Promise<ClipDto> {
  return {
    id: row.id,
    kind: row.kind,
    text: row.textBody,
    imageUrl:
      row.kind === "image" && row.objectKey
        ? await createDownloadUrl(row.objectKey)
        : null,
    contentType: row.contentType,
    createdAt: row.createdAt.toISOString(),
    createdByEmail: row.createdByEmail,
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function listClips(afterId?: string) {
  await pruneExpired();
  const db = getDb();

  if (afterId) {
    const [anchor] = await db
      .select()
      .from(clips)
      .where(eq(clips.id, afterId))
      .limit(1);

    if (!anchor) {
      return { clips: await listLatest(), replace: true };
    }

    const rows = await db
      .select({
        clip: clips,
        createdByEmail: user.email,
      })
      .from(clips)
      .innerJoin(user, eq(clips.createdBy, user.id))
      .where(
        and(gt(clips.createdAt, anchor.createdAt), gt(clips.expiresAt, new Date())),
      )
      .orderBy(desc(clips.createdAt), desc(clips.id))
      .limit(CLIP_LIST_LIMIT);

    return {
      clips: await Promise.all(
        rows.map(({ clip, createdByEmail }) => toDto({ ...clip, createdByEmail })),
      ),
      replace: false,
    };
  }

  return { clips: await listLatest(), replace: true };
}

async function listLatest() {
  const db = getDb();
  const rows = await db
    .select({
      clip: clips,
      createdByEmail: user.email,
    })
    .from(clips)
    .innerJoin(user, eq(clips.createdBy, user.id))
    .where(gt(clips.expiresAt, new Date()))
    .orderBy(desc(clips.createdAt), desc(clips.id))
    .limit(CLIP_LIST_LIMIT);

  return Promise.all(
    rows.map(({ clip, createdByEmail }) => toDto({ ...clip, createdByEmail })),
  );
}

export function clipExpiry() {
  return new Date(Date.now() + CLIP_TTL_MS);
}

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { createUserIfMissing } from "@/scripts/create-user";
import { getDb } from "@/lib/db";
import { account, signupInvites, user } from "@/lib/db/schema";

export type InviteStatus = "unknown" | "expired" | "exhausted" | "valid";

export type RegisterFailure = Exclude<InviteStatus, "valid"> | "exists" | "invalid";

export type RegisterResult = { ok: true } | { ok: false; status: RegisterFailure };

export function createSignupToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSignupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getInviteStatus(token: string): Promise<InviteStatus> {
  const row = await findInvite(token);
  if (!row) return "unknown";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  if (row.useCount >= row.maxUses) return "exhausted";
  return "valid";
}

export async function registerWithInvite(
  token: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  const status = await getInviteStatus(token);
  if (status !== "valid") return { ok: false, status };

  let created: boolean;
  try {
    created = (await createUserIfMissing(email, password)).created;
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, status: "exists" };
    const message = error instanceof Error ? error.message : "";
    if (message === "Enter a valid email address" || message === "Password must be at least 8 characters") {
      return { ok: false, status: "invalid" };
    }
    throw error;
  }

  if (!created) return { ok: false, status: "exists" };

  const claimed = await claimInviteUse(token);
  if (claimed) return { ok: true };

  await deleteUserByEmail(email.trim().toLowerCase());
  const after = await getInviteStatus(token);
  if (after === "expired" || after === "unknown") return { ok: false, status: after };
  return { ok: false, status: "exhausted" };
}

async function findInvite(token: string) {
  if (!token || token.length > 128) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(signupInvites)
    .where(eq(signupInvites.tokenHash, hashSignupToken(token)))
    .limit(1);
  return row ?? null;
}

async function claimInviteUse(token: string) {
  const db = getDb();
  const claimed = await db
    .update(signupInvites)
    .set({ useCount: sql`${signupInvites.useCount} + 1` })
    .where(
      and(
        eq(signupInvites.tokenHash, hashSignupToken(token)),
        sql`${signupInvites.useCount} < ${signupInvites.maxUses}`,
        gt(signupInvites.expiresAt, new Date()),
      ),
    )
    .returning({ id: signupInvites.id });
  return claimed.length > 0;
}

async function deleteUserByEmail(email: string) {
  const db = getDb();
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  if (!existing) return;
  await db.delete(account).where(eq(account.userId, existing.id));
  await db.delete(user).where(eq(user.id, existing.id));
}

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && (current as { code?: string }).code === "23505") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

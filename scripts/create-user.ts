import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "../lib/db";
import { account, session, user } from "../lib/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateCredentials(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Enter a valid email address");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  return { email: normalized, password };
}

async function findUserByEmail(email: string) {
  const db = getDb();
  const [existing] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  return existing ?? null;
}

export async function createUserIfMissing(email: string, password: string) {
  const credentials = validateCredentials(email, password);
  const db = getDb();
  const existing = await findUserByEmail(credentials.email);

  if (existing) {
    return { created: false, email: existing.email };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const hashed = await hashPassword(credentials.password);

  await db.insert(user).values({
    id,
    name: credentials.email.split("@")[0] ?? credentials.email,
    email: credentials.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true, email: credentials.email };
}

export async function updateUserPassword(email: string, password: string) {
  const credentials = validateCredentials(email, password);
  const db = getDb();
  const existing = await findUserByEmail(credentials.email);

  if (!existing) {
    throw new Error(`No account exists for ${credentials.email}`);
  }

  const now = new Date();
  const hashed = await hashPassword(credentials.password);
  const updated = await db
    .update(account)
    .set({
      password: hashed,
      updatedAt: now,
    })
    .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
    .returning({ id: account.id });

  if (updated.length === 0) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: existing.id,
      providerId: "credential",
      userId: existing.id,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.update(user).set({ updatedAt: now }).where(eq(user.id, existing.id));
  await db.delete(session).where(eq(session.userId, existing.id));

  return { email: existing.email };
}

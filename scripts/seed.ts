import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "../lib/db";
import { account, user } from "../lib/db/schema";

config({ path: ".env.local" });
config();

type SeedUser = { email: string; password: string };

function collectSeeds(): SeedUser[] {
  const seeds: SeedUser[] = [];
  const first = process.env.SEED_EMAIL;
  const firstPassword = process.env.SEED_PASSWORD;
  const second = process.env.SEED_EMAIL_2;
  const secondPassword = process.env.SEED_PASSWORD_2;

  if (first && firstPassword) {
    seeds.push({ email: first, password: firstPassword });
  }
  if (second && secondPassword) {
    seeds.push({ email: second, password: secondPassword });
  }
  return seeds;
}

async function seedUser({ email, password }: SeedUser) {
  const db = getDb();
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing) {
    console.log(`User already exists: ${email}`);
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const hashed = await hashPassword(password);

  await db.insert(user).values({
    id,
    name: email.split("@")[0] ?? email,
    email,
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

  console.log(`Created user: ${email}`);
}

async function main() {
  const seeds = collectSeeds();
  if (seeds.length === 0) {
    throw new Error("Set SEED_EMAIL and SEED_PASSWORD in .env.local");
  }
  for (const seed of seeds) {
    await seedUser(seed);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

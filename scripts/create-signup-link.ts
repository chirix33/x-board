import { config } from "dotenv";
import { getDb } from "../lib/db";
import { signupInvites } from "../lib/db/schema";
import { createSignupToken, hashSignupToken } from "../lib/invites";

config({ path: ".env.local" });
config();

async function main() {
  const hours = Number(process.argv[2]);
  const maxUses = Number(process.argv[3]);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Usage: npm run signup:link -- <hours> <maxUses>");
  }
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    throw new Error("Max uses must be a whole number of at least 1");
  }

  const token = createSignupToken();
  const now = new Date();
  await getDb().insert(signupInvites).values({
    id: crypto.randomUUID(),
    tokenHash: hashSignupToken(token),
    expiresAt: new Date(now.getTime() + hours * 60 * 60 * 1000),
    maxUses,
    useCount: 0,
    createdAt: now,
  });

  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`${base}/sign-up?token=${token}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

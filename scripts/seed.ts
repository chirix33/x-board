import { config } from "dotenv";
import { createUserIfMissing } from "./create-user";

config({ path: ".env.local" });
config();

type SeedUser = { email: string; password: string };

function collectSeeds(): SeedUser[] {
  const seeds: SeedUser[] = [];
  const pairs: Array<[string | undefined, string | undefined]> = [
    [process.env.SEED_EMAIL, process.env.SEED_PASSWORD],
    [process.env.SEED_EMAIL_2, process.env.SEED_PASSWORD_2],
  ];

  for (const [email, password] of pairs) {
    if (email && password) {
      seeds.push({ email, password });
    }
  }
  return seeds;
}

async function main() {
  const seeds = collectSeeds();
  if (seeds.length === 0) {
    throw new Error("Set SEED_EMAIL and SEED_PASSWORD in .env.local");
  }
  for (const seed of seeds) {
    const result = await createUserIfMissing(seed.email, seed.password);
    if (result.created) {
      console.log(`Created user: ${result.email}`);
    } else {
      console.log(`User already exists: ${result.email}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

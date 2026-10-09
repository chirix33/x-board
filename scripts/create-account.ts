import { config } from "dotenv";
import { createUserIfMissing } from "./create-user";

config({ path: ".env.local" });
config();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    throw new Error("Usage: create-account.sh <email> <password>");
  }

  const result = await createUserIfMissing(email, password);
  if (result.created) {
    console.log(`Created account: ${result.email}`);
  } else {
    console.log(`Account already exists: ${result.email}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

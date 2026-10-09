import { config } from "dotenv";
import { updateUserPassword } from "./create-user";

config({ path: ".env.local" });
config();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    throw new Error("Usage: update-password.sh <email> <new-password>");
  }

  const result = await updateUserPassword(email, password);
  console.log(`Updated password for ${result.email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

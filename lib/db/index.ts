import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "../env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = drizzle({ client: neon(getDatabaseUrl()), schema });
  }
  return dbInstance;
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";

export const auth = betterAuth({
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
    expiresIn: 60 * 60 * 24 * 7,
  },
  plugins: [nextCookies()],
});

# X Board

Shared clipboard for two machines. Sign in, paste text or an image, send, and copy it on the other computer.

Live: [https://x-board-alpha.vercel.app](https://x-board-alpha.vercel.app)

Accounts are seeded. There is no public register page. Every signed-in user sees the same board. Clips expire after 24 hours.

## Setup

1. Copy `.env.example` to `.env.local` and fill it in.
2. Create a Neon Postgres database (Vercel Marketplace: `npx vercel integration add neon`) and put the pooled connection string in `DATABASE_URL`. Use `DATABASE_URL_UNPOOLED` for `npm run db:push`.
3. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the site origin (`http://localhost:3000` locally, the Vercel URL in production).
4. Enable R2 in the [Cloudflare dashboard](https://dash.cloudflare.com), create a bucket, and create an S3 API token with Object Read & Write. Set `R2_ENDPOINT` to `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
5. In the R2 bucket CORS settings, allow `GET`, `PUT`, and `HEAD` from `http://localhost:3000` and your Vercel origin (for example `https://x-board-alpha.vercel.app`). A starting policy is in `scripts/r2-cors.json`.
6. Push the schema and seed two users:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000, sign in, then open the same URL on the other machine.

Seed emails come from `SEED_EMAIL` and `SEED_EMAIL_2` in `.env.local`. Change those passwords before sharing the board.

## Scripts

- `npm run dev` — local app
- `npm run db:push` — apply Drizzle schema to Neon
- `npm run db:seed` — create the two accounts from `SEED_EMAIL` / `SEED_PASSWORD`
- `npm run build` — production build

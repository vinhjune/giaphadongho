# Deployment Guide

Step-by-step instructions for local development and production deployment on Cloudflare.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org or `nvm install 20` |
| npm | ≥ 10 (bundled with Node 20) | — |
| Wrangler CLI | installed via `npm install` | or `npm i -g wrangler` |
| Cloudflare account | free tier | https://dash.cloudflare.com/sign-up |

---

## Part 1 — Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd giaphadongho
npm install
```

### 2. Apply local D1 database migrations

Wrangler creates a local SQLite file the first time you run migrations.

```bash
npm run db:migrate:local
```

### 3. Create a local admin user

The app has no registration flow — users are created by inserting directly into the DB.

```bash
# Generates and prints the INSERT SQL
npx tsx packages/api/src/db/create-user.ts --username admin --password changeme --role editor

# Copy the printed SQL and run it against the local DB:
npx wrangler d1 execute giapha-db --local --command "INSERT INTO users ..."
```

Replace the placeholder command with the full INSERT printed by the script.

### 4. Set the JWT secret (local)

Create a `.dev.vars` file at the repo root (git-ignored):

```bash
# .dev.vars
JWT_SECRET=any-random-string-at-least-32-chars
```

### 5. Start the Worker (API)

```bash
npm run dev
# → Worker runs at http://localhost:8787
```

### 6. Start the frontend dev server

Open a **second terminal**:

```bash
cd packages/frontend
npm run dev
# → Vite dev server at http://localhost:5173
# → /api/* requests are proxied to :8787 automatically
```

### 7. Open the app

- Frontend (hot-reload): http://localhost:5173
- Direct Worker: http://localhost:8787

Log in with the credentials you created in step 3.

---

## Part 2 — First-Time Cloudflare Provisioning

Run these once when setting up production resources. Skip if the worker is already deployed.

### 1. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 2. Create the D1 database

```bash
npx wrangler d1 create giapha-db
```

Copy the `database_id` from the output and paste it into `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "giapha_db",
    "database_name": "giapha-db",
    "database_id": "<paste-id-here>",
    "migrations_dir": "packages/api/migrations"
  }
]
```

### 3. Create the KV namespace (sessions + rate-limit)

```bash
npx wrangler kv namespace create SESSIONS
```

Copy the `id` and paste it into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "SESSIONS",
    "id": "<paste-id-here>"
  }
]
```

### 4. Create the R2 bucket (avatars)

```bash
npx wrangler r2 bucket create giapha-avatars
```

No ID needed — the bucket name in `wrangler.jsonc` is already set to `giapha-avatars`.

### 5. Set the JWT secret (production)

```bash
npx wrangler secret put JWT_SECRET
# → enter a long random string when prompted
```

Generate a suitable secret with:

```bash
openssl rand -hex 32
```

---

## Part 3 — Deploy to Production

### 1. Apply migrations to remote D1

```bash
npm run db:migrate:prod
```

### 2. Create the first production admin user

```bash
npx tsx packages/api/src/db/create-user.ts --username admin --password <strong-password> --role editor

# Copy the printed SQL and run it against the remote DB:
npx wrangler d1 execute giapha-db --remote --command "INSERT INTO users ..."
```

### 3. Build and deploy

```bash
npm run deploy
# Runs: npm run build (Vite) then wrangler deploy
```

Wrangler uploads the compiled frontend assets alongside the Worker. The app is served from a single Cloudflare Workers URL (e.g. `https://giapha.<your-subdomain>.workers.dev`).

---

## Database Operations

### Run an arbitrary SQL command

```bash
# Local
npx wrangler d1 execute giapha-db --local --command "SELECT * FROM users"

# Remote
npx wrangler d1 execute giapha-db --remote --command "SELECT * FROM users"
```

### Generate a new migration after schema changes

```bash
npm run db:generate
# Outputs a new SQL file in packages/api/migrations/
```

Then apply it:

```bash
npm run db:migrate:local   # local
npm run db:migrate:prod    # production
```

### Backup the remote database

```bash
npm run db:backup
# Saves a timestamped SQL dump to backups/backup-<timestamp>.sql
```

---

## Environment Variables Reference

| Variable | Where set | Description |
|---|---|---|
| `JWT_SECRET` | `.dev.vars` (local) / `wrangler secret` (prod) | Signs and verifies JWT tokens. Min 32 chars. |

All other configuration (D1, KV, R2 bindings) lives in `wrangler.jsonc`.

---

## Troubleshooting

**"Missing script: dev"** — Run `npm install` first; Wrangler is a dev dependency.

**"No database_id found"** — Paste the ID from `wrangler d1 create` into `wrangler.jsonc`.

**"JWT_SECRET is not set"** — Create `.dev.vars` at the repo root with `JWT_SECRET=...`.

**Login fails after deploy** — Run `npm run db:migrate:prod` and re-create the user with `--remote`.

**R2 avatar upload fails locally** — Local Wrangler emulates R2; ensure you're on Wrangler ≥ 3.x.

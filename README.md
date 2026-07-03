# Gia Phả Dòng Họ

Vietnamese family genealogy app running on Cloudflare's free tier. Families can record members, visualize lineage, track events (giỗ chạp, thanh minh, tảo mộ), and manage a public landing page — all without a traditional server or database bill.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| API | Hono.js |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | Cloudflare D1 (SQLite via Drizzle ORM) |
| Sessions | Cloudflare KV |
| File Storage | Cloudflare R2 (avatars) |
| Auth | JWT (jose) + PBKDF2 password hashing |

## Quick Start (Local Development)

See [docs/deployment-guide.md](docs/deployment-guide.md) for full setup instructions.

```bash
# 1. Install dependencies
npm install

# 2. Apply local DB migrations
npm run db:migrate:local

# 3. Start the Worker (API) in one terminal
npm run dev

# 4. Start the frontend dev server in another terminal
cd packages/frontend && npm run dev
```

- API + Worker: http://localhost:8787
- Frontend (hot-reload): http://localhost:5173 (proxies `/api` to :8787)

## Project Structure

```
.
├── packages/
│   ├── api/          # Cloudflare Worker — Hono routes, auth, D1, R2
│   ├── frontend/     # React + Vite SPA
│   └── shared/       # Drizzle schema + shared TypeScript types
├── scripts/
│   └── backup-d1.sh  # DB backup helper
└── wrangler.jsonc    # Cloudflare Workers config
```

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Worker locally (port 8787) |
| `npm run build` | Build frontend for production |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run db:migrate:local` | Apply migrations to local D1 |
| `npm run db:migrate:prod` | Apply migrations to remote D1 |
| `npm run db:backup` | Export remote DB to `backups/` |
| `npm run typecheck` | TypeScript check across all packages |
| `npm run lint` | ESLint across all packages |
| `npm test` | Run Vitest tests |

## User Roles

| Role | Access |
|---|---|
| `guest` (unauthenticated) | Public landing page, tree, list — limited person fields |
| `viewer` | All person fields including contact info and death dates |
| `editor` | Full CRUD: persons, families, events, landing content, avatars |

## Documentation

- [Deployment Guide](docs/deployment-guide.md) — local dev setup, first-time provisioning, production deploy
- [System Architecture](docs/system-architecture.md) — data flow, bindings, security model
- [Code Standards](docs/code-standards.md) — conventions, patterns, contribution guidelines
- [Codebase Summary](docs/codebase-summary.md) — module breakdown and file map
- [Project Roadmap](docs/project-roadmap.md) — phases, status, planned features

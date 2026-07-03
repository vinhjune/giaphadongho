# System Architecture

## Overview

The app is a full-stack Cloudflare Workers application. The Worker serves both the API and the compiled frontend SPA from a single origin, eliminating CORS complexity.

```
Browser
  │
  ├── GET / (static assets)  ──→  Cloudflare Assets (packages/frontend/dist)
  │
  └── /api/*  ──────────────────→  Hono Worker (packages/api/src/index.ts)
                                        │
                                        ├── D1 (SQLite)       ← persons, families, events, settings, users
                                        ├── KV                ← sessions (auth) + rate-limit counters
                                        └── R2                ← avatar images
```

## Monorepo Packages

| Package | Role |
|---|---|
| `packages/shared` | Drizzle schema + TypeScript types shared by API and frontend |
| `packages/api` | Cloudflare Worker — HTTP handlers, auth, DB access, R2 |
| `packages/frontend` | React SPA — served as static assets by the Worker |

## Cloudflare Bindings

| Binding | Type | Purpose |
|---|---|---|
| `giapha_db` | D1Database | Primary database (SQLite) |
| `SESSIONS` | KVNamespace | Session tokens + rate-limit sliding window |
| `giapha_avatars` | R2Bucket | Avatar image storage |
| `JWT_SECRET` | Secret (string) | HMAC-SHA256 key for signing JWTs |

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | none | Liveness check |
| POST | `/api/auth/login` | none | Issue JWT + session |
| POST | `/api/auth/logout` | viewer+ | Invalidate session in KV |
| GET | `/api/auth/me` | viewer+ | Current user info |
| GET | `/api/public/landing` | none | Landing page data (settings + events) |
| GET | `/api/persons` | none* | Person list (public fields for guests) |
| GET | `/api/persons/graph/data` | none* | Tree nodes + edges |
| GET | `/api/persons/:id` | none* | Single person |
| POST | `/api/editor/persons` | editor | Create person |
| PUT | `/api/editor/persons/:id` | editor | Update person |
| DELETE | `/api/editor/persons/:id` | editor | Delete person |
| POST | `/api/editor/persons/:id/avatar` | editor | Upload avatar to R2 |
| GET | `/api/editor/families` | editor | List families with children |
| POST | `/api/editor/families` | editor | Create family |
| PUT | `/api/editor/families/:id` | editor | Update family |
| DELETE | `/api/editor/families/:id` | editor | Delete family |
| POST | `/api/editor/families/:fid/members/:pid` | editor | Add child to family |
| DELETE | `/api/editor/families/:fid/members/:pid` | editor | Remove child from family |
| GET | `/api/avatars/:key` | none | Serve R2 avatar (public) |

*Guest receives `PersonPublic` (no contact/death info); authenticated users receive `PersonFull`.

## Authentication Flow

```
1. POST /api/auth/login
   → verify username + PBKDF2(100k) hash
   → generate UUID sessionId
   → sign JWT { sub, username, role, sessionId } (7-day TTL, HMAC-SHA256)
   → KV.put("sessions:{userId}:{sessionId}", "1", TTL=7d)
   → return { token, role, username }

2. Subsequent requests
   → client sends Authorization: Bearer <token>
   → Worker verifies JWT signature + expiry
   → Worker checks KV sessions:{userId}:{sessionId} exists (allows forced logout)
   → attaches { id, username, role, sessionId } to context

3. POST /api/auth/logout
   → KV.delete("sessions:{userId}:{sessionId}")
```

## Data Model

```
users               persons
  id (PK)             id (PK)
  username            name
  password_hash       gender | nickname | bio
  role (editor|viewer) address | email | phone  ← viewer/editor only
  is_active           birth_year/month/day + is_lunar
                      death_year/month/day + is_lunar ← viewer/editor only
                      is_alive
                      avatar_key (R2 key)

families                        family_members
  id (PK)                         family_id (FK → families)
  parent1_id (FK → persons)       person_id (FK → persons, UNIQUE)
  parent2_id (FK → persons)
  order_p1 | order_p2             ← marriage order per parent
  married_year/month/day
  status (active|divorced|widowed)

events                          settings
  id (PK)                         key (PK)
  title                           value
  date_text | year/month/day      updated_at
  is_lunar | is_recurring
```

## Security Model

- **Password storage**: PBKDF2-SHA256 (100k iterations) via SubtleCrypto — no Node.js dep
- **Session revocation**: KV entries deleted on logout; tokens are short-lived (7d)
- **Rate limiting**: 120 req/60s per IP via KV sliding window on all `/api/*` routes
- **Security headers**: CSP, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Role enforcement**: `requireAuth` middleware on viewer routes, `requireEditor` on mutation routes
- **No CORS surface**: API and frontend share the same Worker origin

## Frontend Architecture

```
packages/frontend/src/
├── App.tsx                 # BrowserRouter + AuthProvider + Routes
├── contexts/AuthContext    # JWT storage (localStorage), role state
├── pages/
│   ├── LandingPage         # Public: family name, intro, events
│   ├── TreePage            # @xyflow/react genealogy graph
│   ├── ListPage            # AG Grid member table
│   ├── EditorPage          # Person + family CRUD (editor only)
│   └── ContentEditorPage   # Landing page content editor (editor only)
├── components/
│   ├── tree/               # FamilyNode, PersonNode (React Flow nodes)
│   ├── editor/             # PersonForm, FamilyPanel, EventsManager, AvatarUpload
│   └── landing/            # EventCard, EventList, FamilyHero
└── lib/genealogy-layout.ts # Dagre auto-layout for tree nodes
```

## Local Development Setup

In local dev, two processes run side by side:

- **Wrangler** (`npm run dev`) — Worker at `:8787`, emulates D1/KV/R2 locally
- **Vite** (`cd packages/frontend && npm run dev`) — SPA at `:5173`, proxies `/api/*` to `:8787`

The Vite proxy means the frontend talks to the local Worker exactly as in production.

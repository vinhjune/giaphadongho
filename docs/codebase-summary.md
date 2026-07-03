# Codebase Summary

## Repository Layout

```
giaphadongho/
├── packages/
│   ├── api/                        Cloudflare Worker — backend
│   │   ├── src/
│   │   │   ├── index.ts            Worker entry point (Hono app)
│   │   │   ├── types.ts            HonoEnv + Bindings type
│   │   │   ├── lib/
│   │   │   │   └── auth.ts         PBKDF2 hash/verify, JWT sign/verify
│   │   │   ├── middleware/
│   │   │   │   ├── require-auth.ts attachUser, requireAuth, requireEditor
│   │   │   │   └── security.ts     securityHeaders, rateLimit
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         POST /login, POST /logout, GET /me
│   │   │   │   ├── public.ts       GET /api/public/landing
│   │   │   │   ├── persons.ts      GET persons list + graph data + single
│   │   │   │   ├── editor.ts       Full CRUD — persons, families, avatars
│   │   │   │   └── content.ts      GET/PUT landing page settings
│   │   │   └── db/
│   │   │       ├── create-user.ts  CLI script — generate INSERT SQL for new users
│   │   │       └── seed.sql        Sample seed data
│   │   ├── migrations/             Drizzle SQL migration files
│   │   └── drizzle.config.ts       Drizzle Kit config
│   │
│   ├── frontend/                   React SPA
│   │   ├── src/
│   │   │   ├── main.tsx            React entry (ReactDOM.createRoot)
│   │   │   ├── App.tsx             Router + AuthProvider
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.tsx JWT storage, login/logout actions, role state
│   │   │   ├── pages/
│   │   │   │   ├── LandingPage.tsx Public home — family info + events
│   │   │   │   ├── TreePage.tsx    Genealogy tree (@xyflow/react + dagre layout)
│   │   │   │   ├── ListPage.tsx    Member list (AG Grid Community)
│   │   │   │   ├── EditorPage.tsx  Person + family management (editor role)
│   │   │   │   ├── ContentEditorPage.tsx  Landing page content editor
│   │   │   │   ├── LoginPage.tsx   Auth form
│   │   │   │   └── NotFoundPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── tree/
│   │   │   │   │   ├── PersonNode.tsx  React Flow node for a person
│   │   │   │   │   └── FamilyNode.tsx  React Flow node for a couple/family
│   │   │   │   ├── editor/
│   │   │   │   │   ├── PersonForm.tsx      Full person create/edit form
│   │   │   │   │   ├── FamilyPanel.tsx     Family create/edit + child assignment
│   │   │   │   │   ├── EventsManager.tsx   Event CRUD (giỗ chạp, etc.)
│   │   │   │   │   └── AvatarUpload.tsx    File picker + multipart POST to R2
│   │   │   │   ├── landing/
│   │   │   │   │   ├── FamilyHero.tsx      Hero banner with family name + intro
│   │   │   │   │   ├── EventList.tsx       Upcoming events section
│   │   │   │   │   └── EventCard.tsx       Single event display
│   │   │   │   ├── layout/
│   │   │   │   │   └── AppNav.tsx          Navigation bar
│   │   │   │   ├── PersonSearch.tsx        Autocomplete person picker
│   │   │   │   ├── ProtectedRoute.tsx      Role-gated route wrapper
│   │   │   │   └── ErrorBoundary.tsx       React error boundary
│   │   │   └── lib/
│   │   │       └── genealogy-layout.ts     Dagre auto-layout for tree graph
│   │   ├── vite.config.ts          Vite config + /api proxy to :8787
│   │   └── tailwind.config.js
│   │
│   └── shared/                     Shared types + schema (no runtime deps)
│       └── src/
│           ├── schema.ts           Drizzle table definitions (users, persons, families, events, settings)
│           ├── types.ts            PersonPublic, PersonFull, Family, FamilyEvent, LandingData, GraphNode
│           ├── date-utils.ts       Lunar ↔ Gregorian helpers
│           └── index.ts            Re-exports
│
├── scripts/
│   └── backup-d1.sh                Export D1 to timestamped SQL file
├── wrangler.jsonc                  Worker name, entry, assets dir, D1/KV/R2 bindings
└── package.json                    Root workspace + npm scripts
```

## Dependency Summary

### API (`packages/api`)

| Package | Purpose |
|---|---|
| `hono` | HTTP framework for Cloudflare Workers |
| `drizzle-orm` | Type-safe SQLite query builder for D1 |
| `jose` | JWT sign/verify using Web Crypto API |
| `zod` | Runtime input validation |
| `@cloudflare/workers-types` | TypeScript types for Workers bindings |
| `drizzle-kit` | Schema migration generator |
| `wrangler` | Local dev server + deploy CLI |

### Frontend (`packages/frontend`)

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `@tanstack/react-query` | Server state management + data fetching |
| `@xyflow/react` | Interactive genealogy tree graph |
| `dagre` | Auto-layout algorithm for tree positioning |
| `ag-grid-community` + `ag-grid-react` | Member list table |
| `tailwindcss` | Utility CSS |
| `vite` | Build tool + dev server |

### Shared (`packages/shared`)

| Package | Purpose |
|---|---|
| `drizzle-orm` | Table schema definitions |
| `lunar-javascript` | Lunar calendar conversion |

## File Count by Area (source only)

| Area | Files |
|---|---|
| API routes | 5 |
| API middleware | 2 |
| API lib + db | 3 |
| Frontend pages | 7 |
| Frontend components | 11 |
| Frontend lib/context | 3 |
| Shared | 5 |
| Config files | 6 |
| Scripts | 1 |
| Migrations | 1 |

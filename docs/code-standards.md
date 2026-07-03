# Code Standards

## General Principles

Follow **YAGNI → KISS → DRY** in that order. Add abstractions only when they remove real, present complexity. Prefer editing existing files over creating new ones.

## Language & Runtime

- **TypeScript** everywhere — strict mode enabled in all three packages
- **ESM modules** for frontend; Worker entry is loaded directly by Wrangler
- Target Cloudflare Workers runtime — no Node.js built-ins in `packages/api/src` (use `node:crypto` only in CLI scripts)
- Web Crypto API (`crypto.subtle`) for hashing and signing — runs within Workers CPU budget

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files (all packages) | kebab-case | `require-auth.ts`, `genealogy-layout.ts` |
| TypeScript types | PascalCase | `PersonPublic`, `HonoEnv` |
| React components | PascalCase | `FamilyNode.tsx`, `PersonForm.tsx` |
| Functions / variables | camelCase | `attachUser`, `toPublic` |
| DB columns (Drizzle) | camelCase in schema, snake_case in SQL | `birthYear` → `birth_year` |
| KV keys | colon-separated namespaces | `sessions:{userId}:{sessionId}`, `rl:{ip}:{window}` |

## API Conventions

- All routes live under `/api/*`
- Public endpoints (no auth): `/api/health`, `/api/public/*`, `GET /api/persons*`
- Viewer-gated: `/api/auth/*` (logout, me)
- Editor-gated: `/api/editor/*` (CRUD mutations)
- Use Zod for request body validation at auth boundaries; trust internal types elsewhere
- Return `{ error: string }` with appropriate HTTP status on failure; `{ ok: true }` or the created resource on success
- `GET /api/persons` returns `PersonPublic[]` for guests and `PersonFull[]` for authenticated users — do not send sensitive fields to guests

## Authentication

- Never log or expose JWT payloads or raw passwords
- Password changes must rehash with PBKDF2 (same iteration count: 100,000)
- Use constant-time XOR comparison for hash verification — never `===` on raw hex strings
- Sessions are KV entries; always delete the session key on logout

## Database (Drizzle + D1)

- Schema lives in `packages/shared/src/schema.ts` — the single source of truth for both API and migrations
- Run `npm run db:generate` after any schema change to create a migration file
- Never write raw SQL in route files — use Drizzle query builder
- Migrations are one-way; do not edit existing migration files after they have been applied

## Frontend Patterns

- Auth state lives in `AuthContext` — do not duplicate JWT parsing elsewhere
- Role checks via `ProtectedRoute` component at the route level; also enforce on the API side
- Fetch data with TanStack Query; invalidate query cache after mutations (`queryClient.invalidateQueries`)
- Tree layout is computed with Dagre in `lib/genealogy-layout.ts` — keep layout logic out of components
- Avatar URLs are constructed from the `/api/avatars/:key` endpoint — do not access R2 directly from the browser

## Error Handling

- API: return structured JSON errors with correct HTTP status codes; do not throw unhandled rejections
- Frontend: `ErrorBoundary` wraps the app for render-time crashes; query errors surface via TanStack Query `isError` state
- Do not add error handling for impossible branches — trust the type system and framework contracts

## Security

- Never commit `.dev.vars`, `JWT_SECRET`, or any credential
- Do not bypass CSP or add `unsafe-eval`
- Rate limiting is applied at the `/api/*` level — do not remove it from `index.ts`
- Validate user-supplied input at API boundaries (Zod schemas); trust internal data flow

## Comments

Write comments only when the **why** is non-obvious: hidden constraints, subtle invariants, or workarounds. Do not describe what the code does — use clear names instead.

```typescript
// Good: explains non-obvious constraint
// Constant-time comparison via XOR to prevent timing attacks
if (actualHex.length !== expectedHex.length) return false

// Bad: restates what the code already says
// compare passwords
if (actualHex !== expectedHex) return false
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add avatar upload to R2
fix: correct KV key TTL for rate limiter
chore: update wrangler to 3.91
```

Do not include AI tool references, plan IDs, or phase numbers in commit messages.

## Quality Gates

Before pushing:

```bash
npm run typecheck   # TypeScript across all three packages
npm run lint        # ESLint
npm test            # Vitest
```

Never hide failing tests, lint errors, or type errors.

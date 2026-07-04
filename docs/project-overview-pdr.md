# Project Overview — Gia Phả Dòng Họ

## What It Is

Gia Phả Dòng Họ ("Family Genealogy") is a self-hosted Vietnamese family genealogy application. It allows a family to record members, visualize lineage as an interactive tree, track traditional events (giỗ chạp, thanh minh, tảo mộ), and maintain a public-facing landing page — all running on Cloudflare's free tier with no monthly server cost.

## Goals

1. **Record family history** — names, birth/death dates (Gregorian and lunar calendar), relationships across generations
2. **Visualize lineage** — interactive genealogy tree with auto-layout, showing parent-child and marriage connections
3. **Track cultural events** — recurring and one-off events with lunar date support
4. **Control access** — public visitors see limited info; authenticated viewers see full profiles; editors can manage all content
5. **Keep costs at zero** — runs entirely on Cloudflare free tier (Workers, D1, KV, R2)

## User Roles

| Role | How to access | Capabilities |
|---|---|---|
| Guest | No login | Public landing page, tree view, member list (limited fields) |
| Viewer | Login with `viewer` account | All guest features + full person profiles (contact info, death dates) |
| Editor | Login with `editor` account | All viewer features + create/edit/delete persons, families, events, landing content, avatar uploads |

## Features

### Public (guest access)
- Landing page with family name, introduction text, founded year, and upcoming events
- Interactive genealogy tree (zoom, pan, node details on click)
- Member list with search and sorting

### Authenticated (viewer+)
- Full person profiles including address, email, phone, death information

### Editor only
- Create, edit, delete family members
- Manage family units (parental couples + children assignment)
- Upload and manage member avatars (stored in R2)
- Manage family events with lunar calendar support
- Edit landing page content (family name, intro, founded year)
- Export all genealogy data (persons + families) as unified CSV file
- Import CSV file to bulk-create or update members and families atomically

## Technical Constraints

- **Cloudflare free tier limits**: 100,000 Worker requests/day, 5 GB D1 storage, 1 GB R2 free
- **No traditional server**: all compute is edge Workers; no persistent processes
- **Single origin**: API and frontend share the same Workers URL — no CORS needed
- **SQLite via D1**: no PostgreSQL or MySQL; use D1-compatible SQL patterns
- **Web Crypto only**: no `bcrypt` or Node.js crypto in Worker code — use SubtleCrypto PBKDF2

## Non-Goals (current scope)

- Public registration — accounts are created by admins via CLI
- Email notifications
- Multi-family / multi-tenant support
- Mobile app (web-only)
- GEDCOM or proprietary genealogy format import/export (CSV format is implemented; cross-tool interop not prioritized)

## Stack Decision Rationale

| Decision | Reason |
|---|---|
| Cloudflare Workers | Free tier, global edge, no cold starts for low-traffic sites |
| Hono.js | Tiny HTTP framework native to Workers; no Node.js deps |
| D1 (SQLite) | Free tier, Drizzle ORM support, sufficient for family-scale data |
| KV for sessions | Fast, cheap, supports TTL-based expiry |
| R2 for avatars | Free egress, simple presigned-URL-free access via Worker |
| React + Vite | Fast build, familiar ecosystem, small bundle |
| JWT + KV session | Stateless token with server-side revocation capability |

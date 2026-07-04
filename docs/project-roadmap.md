# Project Roadmap

## Completed Phases

| Phase | Title | Status |
|---|---|---|
| 1 | Project setup — monorepo, Wrangler, shared package | Done |
| 2 | Database schema — persons, families, events, settings | Done |
| 3 | Authentication — PBKDF2, JWT, KV sessions | Done |
| 4 | Public API — landing data, persons (role-aware), graph data | Done |
| 5 | Genealogy tree and member list views | Done |
| 6 | Editor — member management with AG Grid | Done |
| 7 | Landing page content editor | Done |
| 8 | Security hardening — headers, rate limiting, input validation, error boundary | Done |
| 9 | CSV export/import — unified 33-column format, atomic batch operations | Done |

## Potential Next Steps

The items below are not committed — they represent commonly requested enhancements for family genealogy apps.

### Near-term

- **Lunar calendar display on tree/list** — show birth and death dates in both Gregorian and lunar format using `shared/date-utils.ts`
- **Person search / filter** — global search across name, nickname, generation
- **Generation / branch tagging** — allow labeling a person's generation (đời thứ N) for filtering
- **Print / export view** — CSS print stylesheet or PDF export of the tree

### Medium-term

- **Multiple admin accounts with invite flow** — currently users are created by manual SQL; a simple invite-by-email flow would help non-technical admins
- **Endogamy warnings** — the graph data endpoint already detects endogamy (`hasEndogamy`); surface this in the UI
- **Audit log** — record who created or edited each person/family entry

### Long-term

- **GEDCOM export** — standard genealogy file format for cross-tool compatibility
- **Multi-language UI** — currently Vietnamese-first; English strings for diaspora members
- **R2 image optimization** — resize/compress avatars on upload using `@cloudflare/images` or a Worker transform

## Known Limitations

- **No full-text search** — D1 does not support FTS5 by default; workarounds require loading the full person list
- **Tree layout for large families** — Dagre handles hundreds of nodes but may become slow above ~500 members; layout caching would help
- **Single database region** — D1 is region-pinned; latency is slightly higher for users far from the Worker's home region

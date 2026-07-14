/**
 * One-time backfill for the ngoai_toc / thu_tu_doi columns added in migration
 * 0004_persons_ngoai_toc_thu_tu_doi.sql.
 *
 * ngoaiToc algorithm (confirmed with the family historian on 2026-07-14):
 * - A person is blood ("trong họ", ngoaiToc=false) if their father (family.parent1Id,
 *   resolved via family_members) is himself trong họ, propagated recursively
 *   (patrilineal — blood status follows the father, not the mother).
 * - A person with no recorded parents at all is trong họ ONLY if their id is in
 *   FOUNDER_IDS below (the branch's đời-1 ancestor); otherwise they are ngoại tộc
 *   (a married-in spouse, since we have no ancestry data for them).
 *
 * FOUNDER_IDS was derived by finding families where BOTH parents have no recorded
 * ancestry (the đời-1 candidates), then resolving 2 ambiguous branches by hand:
 *  - p-1.4: mẹ "Hoàng Thị Thủ" (full name, carries clan surname) chosen over
 *    cha "p-1.4A xx" (unnamed) as the blood founder.
 *  - p-1.5 (Cụ Đội Chấn / "(Cụ Đội Chấn)"): looks like a duplicated placeholder
 *    record, not a real couple — both sides left as ngoại tộc.
 *  - f-1.2a.2a.1b.2A.a (Vũ Viết Ngoạn + Vũ Thị Na): both untracked but nested deep
 *    in the tree — a data gap, not a real đời-1 founder — both left as ngoại tộc.
 *
 * thuTuDoi algorithm (revised 2026-07-14 — applies to EVERYONE, not just trong họ):
 * - Founders (FOUNDER_IDS) = đời 1.
 * - A person who is someone's recorded child (has a father/mother link) takes
 *   min(resolved parent đời) + 1 — this covers cháu ngoại too (their trong-họ
 *   parent's đời anchors them even though ngoaiToc=true).
 * - A person with no recorded parent (married-in spouse) takes their spouse's
 *   resolved đời (families.parent1Id/parent2Id, first marriage found) — same
 *   generation as whoever they married.
 * - Stays null only when neither path resolves (e.g. 2 people married to each
 *   other with no ancestry on either side — a genuine data gap, not inferable).
 *
 * Usage:
 *   npx wrangler d1 execute giapha-db --local --json \
 *     --command "SELECT id FROM persons" > /tmp/all-persons.json
 *   npx wrangler d1 execute giapha-db --local --json \
 *     --command "SELECT fm.person_id as personId, f.parent1_id as fatherId, f.parent2_id as motherId FROM family_members fm JOIN families f ON f.id = fm.family_id" \
 *     > /tmp/parent-links.json
 *   npx wrangler d1 execute giapha-db --local --json \
 *     --command "SELECT parent1_id as p1, parent2_id as p2 FROM families" > /tmp/couples.json
 *   npx tsx packages/api/src/db/backfill-ngoai-toc.ts /tmp/all-persons.json /tmp/parent-links.json /tmp/couples.json \
 *     > packages/api/src/db/backfill-ngoai-toc.sql
 *   npx wrangler d1 execute giapha-db --local --file=packages/api/src/db/backfill-ngoai-toc.sql
 *   # after testing locally:
 *   npx wrangler d1 execute giapha-db --remote --file=packages/api/src/db/backfill-ngoai-toc.sql
 */
import { readFileSync } from 'node:fs'

const FOUNDER_IDS = new Set([
  'p-1.1',   // Hoàng Văn Truyền (Cụ Cả)
  'p-1.2',   // Hoàng Như Khuê (Cụ Tổng Cầu, Cụ Tổng)
  'p-1.3',   // Hoàng Khắc Cẩn (Cụ Chánh Già)
  'p-1.4',   // Hoàng Thị Thủ — chosen over unnamed husband "p-1.4A xx"
  'p-1.6A',  // xx (default rule: father role = founder)
  'p-1.7A',  // xx (default rule: father role = founder)
])

type ParentLink = { personId: string; fatherId: string | null; motherId: string | null }
type Couple = { p1: string | null; p2: string | null }
type Result = { ngoaiToc: boolean; thuTuDoi: number | null }

const [personsPath, linksPath, couplesPath] = process.argv.slice(2)
if (!personsPath || !linksPath || !couplesPath) {
  console.error('Usage: backfill-ngoai-toc.ts <all-persons.json> <parent-links.json> <couples.json>')
  process.exit(1)
}

const allPersons = (JSON.parse(readFileSync(personsPath, 'utf-8'))[0].results as { id: string }[]).map(r => r.id)
const links = JSON.parse(readFileSync(linksPath, 'utf-8'))[0].results as ParentLink[]
const couples = JSON.parse(readFileSync(couplesPath, 'utf-8'))[0].results as Couple[]

const parentByChild = new Map<string, ParentLink>()
for (const link of links) parentByChild.set(link.personId, link)

// First marriage found per person, used as the đời anchor for married-in spouses.
const spouseOf = new Map<string, string>()
for (const c of couples) {
  if (!c.p1 || !c.p2) continue
  if (!spouseOf.has(c.p1)) spouseOf.set(c.p1, c.p2)
  if (!spouseOf.has(c.p2)) spouseOf.set(c.p2, c.p1)
}

const ngoaiTocMemo = new Map<string, boolean>()
const ngoaiTocInProgress = new Set<string>()

function resolveNgoaiToc(personId: string): boolean {
  const cached = ngoaiTocMemo.get(personId)
  if (cached !== undefined) return cached
  if (ngoaiTocInProgress.has(personId)) return true // cycle guard
  ngoaiTocInProgress.add(personId)

  let result: boolean
  if (FOUNDER_IDS.has(personId)) {
    result = false
  } else {
    const link = parentByChild.get(personId)
    result = !link || !link.fatherId || resolveNgoaiToc(link.fatherId)
  }

  ngoaiTocInProgress.delete(personId)
  ngoaiTocMemo.set(personId, result)
  return result
}

const doiMemo = new Map<string, number | null>()
const doiInProgress = new Set<string>()

function resolveDoi(personId: string): number | null {
  if (doiMemo.has(personId)) return doiMemo.get(personId)!
  if (doiInProgress.has(personId)) return null // cycle guard (e.g. 2 spouses, neither anchored)
  doiInProgress.add(personId)

  let result: number | null
  if (FOUNDER_IDS.has(personId)) {
    result = 1
  } else {
    const link = parentByChild.get(personId)
    if (link) {
      const parentDois = [link.fatherId, link.motherId]
        .filter((id): id is string => !!id)
        .map(resolveDoi)
        .filter((d): d is number => d != null)
      result = parentDois.length > 0 ? Math.min(...parentDois) + 1 : null
    } else {
      const spouseId = spouseOf.get(personId)
      result = spouseId ? resolveDoi(spouseId) : null
    }
  }

  doiInProgress.delete(personId)
  doiMemo.set(personId, result)
  return result
}

const rows = allPersons.map(id => ({ id, ngoaiToc: resolveNgoaiToc(id), thuTuDoi: resolveDoi(id) }))

const sql = rows
  .map(r => `UPDATE persons SET ngoai_toc = ${r.ngoaiToc ? 1 : 0}, thu_tu_doi = ${r.thuTuDoi ?? 'NULL'} WHERE id = '${r.id.replace(/'/g, "''")}';`)
  .join('\n')

console.log(sql)

const ngoaiTocCount = rows.filter(r => r.ngoaiToc).length
const byGeneration = new Map<number, number>()
for (const r of rows) if (r.thuTuDoi != null) byGeneration.set(r.thuTuDoi, (byGeneration.get(r.thuTuDoi) ?? 0) + 1)
console.error(`-- ${rows.length} persons: ${ngoaiTocCount} ngoại tộc, ${rows.length - ngoaiTocCount} trong họ`)
console.error(`-- generations: ${[...byGeneration.entries()].sort((a, b) => a[0] - b[0]).map(([g, n]) => `đời ${g}=${n}`).join(', ')}`)

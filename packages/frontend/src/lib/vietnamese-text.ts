const COMBINING_MARKS_RE = /[̀-ͯ]/g

/** Normalize for diacritic-insensitive matching: NFD → strip marks → đ/Đ→d → lowercase → trim. */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** Case- and diacritic-insensitive substring match on name and nickname. Empty query → []. */
export function filterPersonsByName<P extends { name: string; nickname: string | null }>(
  query: string,
  persons: P[],
  limit = 8,
): P[] {
  const q = normalizeVietnamese(query)
  if (!q) return []

  const results: P[] = []
  for (const p of persons) {
    if (results.length >= limit) break
    const normalizedName = normalizeVietnamese(p.name)
    const normalizedNick = p.nickname ? normalizeVietnamese(p.nickname) : null
    if (normalizedName.includes(q) || (normalizedNick?.includes(q) ?? false)) {
      results.push(p)
    }
  }
  return results
}

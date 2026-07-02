import Lunar from 'lunar-javascript'

export type PartialDate = {
  year?: number | null
  month?: number | null
  day?: number | null
  isLunar?: boolean | null
}

/** Format a partial date to Vietnamese display string */
export function formatDate({ year, month, day, isLunar }: PartialDate): string {
  if (!year) return 'Không rõ'
  const suffix = isLunar ? ' (âm lịch)' : ''
  if (!month) return `${year}${suffix}`
  if (!day) return `tháng ${month}/${year}${suffix}`
  return `${day}/${month}/${year}${suffix}`
}

/** Convert a lunar date to a solar Date for sorting/comparison */
export function lunarToSolar(year: number, month: number, day: number): Date {
  const lunar = Lunar.fromYmd(year, month, day)
  const solar = lunar.getSolar()
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
}

/** Return a sortable solar year for a partial date (fallback to year as-is for solar or partial lunar) */
export function sortableYear({ year, isLunar, month, day }: PartialDate): number {
  if (!year) return 9999
  if (!isLunar || !month || !day) return year
  try {
    return lunarToSolar(year, month, day).getFullYear()
  } catch {
    return year
  }
}

/** Format an event date for display on the landing page */
export function formatEventDate(event: {
  dateText?: string | null
  year?: number | null
  month?: number | null
  day?: number | null
  isLunar?: boolean | null
  isRecurring?: boolean | null
}): string {
  if (event.dateText) return event.dateText
  const base = formatDate({ year: event.year ?? undefined, month: event.month ?? undefined, day: event.day ?? undefined, isLunar: event.isLunar ?? false })
  if (event.isRecurring && !event.year) {
    // Recurring without a fixed year: show month/day + recurrence note
    const parts = []
    if (event.month) {
      parts.push(`Tháng ${event.month}`)
      if (event.day) parts.push(` ngày ${event.day}`)
      if (event.isLunar) parts.push(' âm lịch')
      parts.push(' (hằng năm)')
      return parts.join('')
    }
  }
  return base
}

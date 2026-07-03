import type { ChangeEvent } from 'react'

// Lunar month names in Vietnamese (1=Giêng … 12=Chạp)
const MONTH_OPTS = [
  [1, 'Giêng'], [2, 'Hai'], [3, 'Ba'], [4, 'Tư'],
  [5, 'Năm'], [6, 'Sáu'], [7, 'Bảy'], [8, 'Tám'],
  [9, 'Chín'], [10, 'Mười'], [11, 'Mười Một'], [12, 'Chạp'],
] as const

type Props = {
  day:     number | null
  month:   number | null
  year:    number | null
  onDay:   (v: number | null) => void
  onMonth: (v: number | null) => void
  onYear:  (v: number | null) => void
}

const cls = 'mt-0.5 w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

/** Day | Month | Year inputs with Vietnamese month names and basic range validation. */
export default function DatePartInputs({ day, month, year, onDay, onMonth, onYear }: Props) {
  function handleDay(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value
    if (!s) return onDay(null)
    const n = parseInt(s, 10)
    if (isNaN(n) || n < 1) return onDay(null)
    onDay(Math.min(31, n))
  }

  function handleYear(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value
    if (!s) return onYear(null)
    const n = parseInt(s, 10)
    if (isNaN(n) || n < 1000 || n > 2100) return onYear(null)
    onYear(n)
  }

  return (
    <>
      {/* Ngày */}
      <label className="block">
        <span className="text-xs text-stone-500">Ngày</span>
        <input
          type="number" min={1} max={31} step={1}
          value={day ?? ''} onChange={handleDay}
          placeholder="D"
          className={cls}
        />
      </label>

      {/* Tháng — select hỗ trợ cả chọn lẫn gõ phím số/tên tháng âm lịch */}
      <label className="block">
        <span className="text-xs text-stone-500">Tháng</span>
        <select
          value={month ?? ''}
          onChange={e => onMonth(e.target.value ? parseInt(e.target.value, 10) : null)}
          className={cls}
        >
          <option value="">— Chọn —</option>
          {MONTH_OPTS.map(([v, name]) => (
            <option key={v} value={v}>{v} – {name}</option>
          ))}
        </select>
      </label>

      {/* Năm */}
      <label className="block">
        <span className="text-xs text-stone-500">Năm</span>
        <input
          type="number" min={1000} max={2100} step={1}
          value={year ?? ''} onChange={handleYear}
          placeholder="YYYY"
          className={cls}
        />
      </label>
    </>
  )
}

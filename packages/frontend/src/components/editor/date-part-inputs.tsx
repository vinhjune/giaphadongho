import type { ChangeEvent } from 'react'

const LUNAR_NAMES = ['Giêng','Hai','Ba','Tư','Năm','Sáu','Bảy','Tám','Chín','Mười','Mười Một','Chạp']

type Props = {
  day:     number | null
  month:   number | null
  year:    number | null
  onDay:   (v: number | null) => void
  onMonth: (v: number | null) => void
  onYear:  (v: number | null) => void
  /** true → tháng hiển thị tên âm lịch (Giêng–Chạp); false (default) → số 1–12 */
  lunar?:  boolean
}

const cls = 'mt-0.5 w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

/** Day | Month | Year inputs with range validation.
 *  lunar=false → month options 1–12 (dương lịch)
 *  lunar=true  → month options Giêng–Chạp (âm lịch)
 */
export default function DatePartInputs({ day, month, year, onDay, onMonth, onYear, lunar = false }: Props) {
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

      {/* Tháng */}
      <label className="block">
        <span className="text-xs text-stone-500">Tháng</span>
        <select
          value={month ?? ''}
          onChange={e => onMonth(e.target.value ? parseInt(e.target.value, 10) : null)}
          className={cls}
        >
          <option value="">— Chọn —</option>
          {LUNAR_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {lunar ? name : String(i + 1)}
            </option>
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

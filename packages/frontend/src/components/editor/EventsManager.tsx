import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { FamilyEvent } from '@giapha/shared/types'

type Props = { events: FamilyEvent[]; onChange: (events: FamilyEvent[]) => void }

type EventDraft = Pick<FamilyEvent, 'title' | 'description' | 'dateText' | 'year' | 'month' | 'day' | 'isLunar' | 'isRecurring'>

const BLANK: EventDraft = { title: '', description: null, dateText: null, year: null, month: null, day: null, isLunar: false, isRecurring: true }

export default function EventsManager({ events, onChange }: Props) {
  const { token } = useAuth()
  const [draft, setDraft] = useState<EventDraft>(BLANK)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setDraft(d => ({ ...d, [k]: v }))

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) { setError('Tên sự kiện là bắt buộc'); return }
    setError(null); setSaving(true)
    try {
      const res = await fetch('/api/content/events', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      const { id } = (await res.json()) as { id: string }
      onChange([...events, { ...draft, id }])
      setDraft(BLANK)
    } catch {
      setError('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/content/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onChange(events.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-stone-700">Sự kiện dòng họ</h3>

      <div className="space-y-2">
        {events.map(ev => (
          <div key={ev.id} className="flex items-start justify-between bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            <div>
              <p className="font-medium text-stone-800 text-sm">{ev.title}</p>
              <p className="text-xs text-stone-400">
                {ev.dateText ?? [ev.year, ev.month, ev.day].filter(Boolean).join('/')}
                {ev.isRecurring ? ' · Hằng năm' : ''}
              </p>
            </div>
            <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-2">Xóa</button>
          </div>
        ))}
        {!events.length && <p className="text-sm text-stone-400">Chưa có sự kiện nào.</p>}
      </div>

      <form onSubmit={handleAdd} className="border border-stone-200 rounded-xl p-4 space-y-3 bg-white">
        <p className="text-sm font-medium text-stone-700">Thêm sự kiện mới</p>
        <input
          placeholder="Tên sự kiện *"
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          placeholder="Ngày hiển thị (vd: Rằm tháng 7)"
          value={draft.dateText ?? ''}
          onChange={e => set('dateText', e.target.value || null)}
          className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="grid grid-cols-3 gap-2">
          {(['year', 'month', 'day'] as const).map(f => (
            <input key={f} type="number" placeholder={{ year: 'Năm', month: 'Tháng', day: 'Ngày' }[f]}
              value={draft[f] ?? ''}
              onChange={e => set(f, e.target.value ? Number(e.target.value) : null)}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.isRecurring} onChange={e => set('isRecurring', e.target.checked)} />
          Sự kiện hằng năm
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-1.5 transition-colors">
          {saving ? 'Đang lưu…' : 'Thêm sự kiện'}
        </button>
      </form>
    </div>
  )
}

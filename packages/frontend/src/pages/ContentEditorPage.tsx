import { useEffect, useState, type FormEvent } from 'react'
import AppNav from '../components/layout/AppNav'
import EventsManager from '../components/editor/EventsManager'
import { useAuth } from '../contexts/AuthContext'
import type { FamilyEvent } from '@giapha/shared/types'

type Settings = { family_name?: string; intro_text?: string; founded_year?: string }

export default function ContentEditorPage() {
  const { token } = useAuth()
  const [settings, setSettings]   = useState<Settings>({})
  const [events, setEvents]       = useState<FamilyEvent[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch('/api/content/settings', { headers: authHeaders }).then(r => r.json()) as Promise<Settings>,
      fetch('/api/content/events',   { headers: authHeaders }).then(r => r.json()) as Promise<FamilyEvent[]>,
    ]).then(([s, e]) => {
      setSettings(s)
      setEvents(e)
      setLoading(false)
    })
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/content/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <div className="flex items-center justify-center h-[80vh] text-stone-400">Đang tải…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-stone-800">Nội dung trang chủ</h1>

        {/* Family intro section */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="font-semibold text-stone-700">Giới thiệu dòng họ</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block">
              <span className="text-xs text-stone-500">Tên dòng họ</span>
              <input
                value={settings.family_name ?? ''}
                onChange={e => setSettings(s => ({ ...s, family_name: e.target.value }))}
                className="mt-0.5 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">Năm thành lập</span>
              <input
                value={settings.founded_year ?? ''}
                onChange={e => setSettings(s => ({ ...s, founded_year: e.target.value }))}
                className="mt-0.5 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">Lời giới thiệu</span>
              <textarea
                value={settings.intro_text ?? ''}
                onChange={e => setSettings(s => ({ ...s, intro_text: e.target.value }))}
                rows={5}
                className="mt-0.5 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </label>
            {error  && <p className="text-red-600 text-sm">{error}</p>}
            {saved  && <p className="text-green-600 text-sm">Đã lưu thành công!</p>}
            <button type="submit" disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors">
              {saving ? 'Đang lưu…' : 'Lưu giới thiệu'}
            </button>
          </form>
        </section>

        {/* Events section */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <EventsManager events={events} onChange={setEvents} />
        </section>
      </main>
    </div>
  )
}

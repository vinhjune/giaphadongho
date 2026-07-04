import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Family } from '@giapha/shared/types'
import type { PersonFull } from '@giapha/shared/types'

type Props = { persons: PersonFull[] }

export default function FamilyPanel({ persons }: Props) {
  const { token } = useAuth()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  async function loadFamilies() {
    const res = await fetch('/api/editor/families', { headers: { Authorization: `Bearer ${token}` } })
    const data = (await res.json()) as Family[]
    setFamilies(data)
    setLoading(false)
  }

  useEffect(() => { loadFamilies() }, [])

  async function createFamily() {
    const res = await fetch('/api/editor/families', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    })
    const { id } = (await res.json()) as { id: string }
    setFamilies(f => [...f, { id, parent1Id: null, parent2Id: null, orderP1: 1, orderP2: 1, status: null, notes: null, children: [] }])
  }

  async function setParent(familyId: string, slot: 'parent1Id' | 'parent2Id', personId: string | null) {
    await fetch(`/api/editor/families/${familyId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ [slot]: personId }),
    })
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, [slot]: personId } : f))
  }

  async function addChild(familyId: string, personId: string) {
    await fetch(`/api/editor/families/${familyId}/members/${personId}`, { method: 'POST', headers: authHeaders })
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, children: [...f.children, personId] } : f))
  }

  async function removeChild(familyId: string, personId: string) {
    await fetch(`/api/editor/families/${familyId}/members/${personId}`, { method: 'DELETE', headers: authHeaders })
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, children: f.children.filter(c => c !== personId) } : f))
  }

  async function deleteFamily(id: string) {
    if (!confirm('Xóa gia đình này?')) return
    await fetch(`/api/editor/families/${id}`, { method: 'DELETE', headers: authHeaders })
    setFamilies(fs => fs.filter(f => f.id !== id))
  }

  const nameOf = (id: string | null) => id ? (persons.find(p => p.id === id)?.name ?? id) : '—'
  const available = (familyId: string) => {
    const family = families.find(f => f.id === familyId)
    return persons.filter(p => p.id !== family?.parent1Id && p.id !== family?.parent2Id && !family?.children.includes(p.id))
  }

  if (loading) return <p className="text-stone-400 text-sm p-4">Đang tải…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">Gia đình ({families.length})</h2>
        <button onClick={createFamily}
          className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
          + Thêm gia đình
        </button>
      </div>

      {families.map(f => (
        <div key={f.id} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">{f.id.slice(0, 8)}…</span>
            <button onClick={() => deleteFamily(f.id)} className="text-xs text-red-500 hover:text-red-700">Xóa</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['parent1Id', 'parent2Id'] as const).map((slot, i) => (
              <div key={slot}>
                <label className="text-xs text-stone-500">Cha/Mẹ {i + 1}</label>
                <select
                  value={f[slot] ?? ''}
                  onChange={e => setParent(f.id, slot, e.target.value || null)}
                  className="mt-0.5 w-full border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— Chọn —</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-stone-500">Con cái ({f.children.length})</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {f.children.map(cid => (
                <span key={cid} className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-0.5 rounded-full">
                  {nameOf(cid)}
                  <button onClick={() => removeChild(f.id, cid)} className="text-stone-400 hover:text-red-500 leading-none">×</button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={e => { if (e.target.value) addChild(f.id, e.target.value) }}
              className="mt-1 w-full border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">+ Thêm con…</option>
              {available(f.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}

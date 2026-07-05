import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Family, ChildMember } from '@giapha/shared/types'
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
    const { id, orderP1, orderP2 } = (await res.json()) as { id: string; orderP1: number; orderP2: number }
    setFamilies(f => [...f, { id, parent1Id: null, parent2Id: null, orderP1, orderP2, status: null, notes: null, children: [] }])
  }

  async function setParent(familyId: string, slot: 'parent1Id' | 'parent2Id', personId: string | null) {
    const res = await fetch(`/api/editor/families/${familyId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ [slot]: personId }),
    })
    const data = await res.json() as { ok: boolean; orderP1?: number; orderP2?: number }
    setFamilies(fs => fs.map(f => {
      if (f.id !== familyId) return f
      const update: Partial<Family> = { [slot]: personId }
      if (data.orderP1 !== undefined) update.orderP1 = data.orderP1
      if (data.orderP2 !== undefined) update.orderP2 = data.orderP2
      return { ...f, ...update }
    }))
  }

  async function setOrder(familyId: string, slot: 'orderP1' | 'orderP2', order: number) {
    await fetch(`/api/editor/families/${familyId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ [slot]: order }),
    })
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, [slot]: order } : f))
  }

  async function addChild(familyId: string, personId: string) {
    await fetch(`/api/editor/families/${familyId}/members/${personId}`, { method: 'POST', headers: authHeaders })
    setFamilies(fs => fs.map(f => f.id === familyId
      ? { ...f, children: [...f.children, { personId, childOrder: null }] }
      : f
    ))
  }

  async function removeChild(familyId: string, personId: string) {
    await fetch(`/api/editor/families/${familyId}/members/${personId}`, { method: 'DELETE', headers: authHeaders })
    setFamilies(fs => fs.map(f => f.id === familyId
      ? { ...f, children: f.children.filter(c => c.personId !== personId) }
      : f
    ))
  }

  async function setChildOrder(familyId: string, personId: string, childOrder: number | null) {
    await fetch(`/api/editor/families/${familyId}/members/${personId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ childOrder }),
    })
    setFamilies(fs => fs.map(f => f.id === familyId
      ? { ...f, children: f.children.map(c => c.personId === personId ? { ...c, childOrder } : c) }
      : f
    ))
  }

  async function deleteFamily(id: string) {
    if (!confirm('Xóa gia đình này?')) return
    await fetch(`/api/editor/families/${id}`, { method: 'DELETE', headers: authHeaders })
    setFamilies(fs => fs.filter(f => f.id !== id))
  }

  const nameOf = (id: string | null) => id ? (persons.find(p => p.id === id)?.name ?? id) : '—'

  // Count how many families a person is a parent in
  const familyCountForPerson = (personId: string | null): number => {
    if (!personId) return 0
    return families.filter(f => f.parent1Id === personId || f.parent2Id === personId).length
  }

  const available = (familyId: string) => {
    const family = families.find(f => f.id === familyId)
    return persons.filter(p =>
      p.id !== family?.parent1Id &&
      p.id !== family?.parent2Id &&
      !family?.children.some(c => c.personId === p.id)
    )
  }

  // Sort children: explicit childOrder asc (nulls last), then birthYear asc
  const sortedChildren = (children: ChildMember[]): ChildMember[] =>
    [...children].sort((a, b) => {
      if (a.childOrder !== null && b.childOrder === null) return -1
      if (a.childOrder === null && b.childOrder !== null) return 1
      if (a.childOrder !== null && b.childOrder !== null) return a.childOrder - b.childOrder
      const ay = persons.find(p => p.id === a.personId)?.birthYear ?? Infinity
      const by = persons.find(p => p.id === b.personId)?.birthYear ?? Infinity
      return ay - by
    })

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
                <label className="text-xs text-stone-500 flex items-center gap-1 flex-wrap">
                  {i === 0 ? 'Cha' : 'Mẹ'}
                  {f[slot] && familyCountForPerson(f[slot]) > 1 && (
                    <span className="text-amber-600 font-medium flex items-center gap-0.5">
                      ({i === 0 ? 'chồng' : 'vợ'} thứ
                      <input
                        type="number" min={1}
                        value={i === 0 ? f.orderP1 : f.orderP2}
                        onChange={e => setOrder(f.id, i === 0 ? 'orderP1' : 'orderP2', parseInt(e.target.value) || 1)}
                        className="w-8 text-center border border-amber-300 rounded px-0.5 ml-0.5"
                      />)
                    </span>
                  )}
                </label>
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
              {sortedChildren(f.children).map(child => (
                <span key={child.personId}
                  className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-0.5 rounded-full">
                  {nameOf(child.personId)}
                  <input
                    type="number" min={1}
                    defaultValue={child.childOrder ?? ''}
                    placeholder="thứ"
                    title="Thứ tự con"
                    onBlur={e => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null
                      if (val !== child.childOrder) setChildOrder(f.id, child.personId, val)
                    }}
                    className="w-8 text-center border border-stone-200 rounded px-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button onClick={() => removeChild(f.id, child.personId)} className="text-stone-400 hover:text-red-500 leading-none">×</button>
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

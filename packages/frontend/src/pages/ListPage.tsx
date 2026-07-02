import { useEffect, useState, useMemo } from 'react'
import AppNav from '../components/layout/AppNav'
import PersonSearch from '../components/PersonSearch'
import type { PersonPublic } from '@giapha/shared/types'

function PersonRow({ person }: { person: PersonPublic }) {
  const initials = person.name.split(' ').slice(-2).map(s => s[0]).join('').toUpperCase()

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 hover:shadow-sm transition-shadow">
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt={person.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
          ${person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}
        >
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-800">{person.name}</p>
        <p className="text-xs text-stone-400">
          {person.birthYear ? `${person.birthYear}` : ''}
          {!person.isAlive && person.birthYear ? ' · Đã mất' : ''}
          {person.nickname ? ` · "${person.nickname}"` : ''}
        </p>
      </div>
      {!person.isAlive && (
        <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full shrink-0">Đã mất</span>
      )}
    </div>
  )
}

export default function ListPage() {
  const [persons, setPersons] = useState<PersonPublic[]>([])
  const [query, setQuery]     = useState('')
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch('/api/persons')
      .then(r => r.json())
      .then(d => setPersons(d as PersonPublic[]))
      .catch(() => setError(true))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return persons
    const q = query.toLowerCase()
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nickname?.toLowerCase().includes(q) ?? false)
    )
  }, [persons, query])

  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-stone-800">Danh sách thành viên</h1>
          <span className="text-sm text-stone-400">{filtered.length} người</span>
        </div>
        <div className="mb-4">
          <PersonSearch query={query} onChange={setQuery} />
        </div>
        {error ? (
          <p className="text-center text-stone-500 py-12">Không thể tải danh sách.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => <PersonRow key={p.id} person={p} />)}
            {filtered.length === 0 && (
              <p className="text-center text-stone-400 py-12">Không tìm thấy kết quả.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

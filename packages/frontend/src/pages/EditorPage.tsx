import { useEffect, useState, type FormEvent } from 'react'
import AppNav from '../components/layout/AppNav'
import PersonsTable from '../components/editor/PersonsTable'
import { useAuth } from '../contexts/AuthContext'
import type { PersonFull } from '@giapha/shared/types'

type Tab = 'persons' | 'users'

type UserRow = {
  id: string
  username: string
  role: 'editor' | 'viewer'
  isActive: boolean
  personId: string | null
  personName: string | null
  createdAt: string
}

export default function EditorPage() {
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('persons')

  const authHeaders = { Authorization: `Bearer ${token}` }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <AppNav />
      <div className="border-b border-stone-200 bg-white px-4 flex items-center gap-1">
        {(['persons', 'users'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === t ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t === 'persons' ? 'Thành viên' : 'Tài khoản'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'persons' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <PersonsTable />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <UsersPanel authHeaders={authHeaders} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Users Panel ───────────────────────────────────────────────────────────────

function UsersPanel({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [users, setUsers]     = useState<UserRow[]>([])
  const [persons, setPersons] = useState<PersonFull[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)

  async function loadUsers() {
    const res = await fetch('/api/editor/users', { headers: authHeaders })
    const data = (await res.json()) as UserRow[]
    setUsers(data)
  }

  useEffect(() => {
    Promise.all([
      loadUsers(),
      fetch('/api/persons', { headers: authHeaders })
        .then(r => r.json() as Promise<PersonFull[]>)
        .then(setPersons),
    ]).finally(() => setLoading(false))
  }, [])

  const unlinkedPersons = persons.filter(p => !users.some(u => u.personId === p.id))

  async function handleLinkChange(userId: string, personId: string | null) {
    await fetch(`/api/editor/users/${userId}/person`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    })
    await loadUsers()
  }

  if (loading) return <p className="text-stone-500 text-sm">Đang tải…</p>

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">Quản lý tài khoản</h2>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Tạo tài khoản
        </button>
      </div>

      {showCreateForm && (
        <CreateUserForm
          persons={unlinkedPersons}
          authHeaders={authHeaders}
          onCreated={async () => { await loadUsers(); setShowCreateForm(false) }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Tên đăng nhập</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Vai trò</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Liên kết thành viên</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium text-stone-800">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'editor' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
                    {u.role === 'editor' ? 'Editor' : 'Viewer'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingUser?.id === u.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={u.personId ?? ''}
                        onChange={async e => {
                          await handleLinkChange(u.id, e.target.value || null)
                          setEditingUser(null)
                        }}
                        className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">— Bỏ liên kết —</option>
                        {persons
                          .filter(p => !users.some(user => user.personId === p.id && user.id !== u.id))
                          .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        }
                      </select>
                      <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-stone-600 text-xs">Hủy</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-amber-700 hover:underline"
                    >
                      {u.personName ?? '— Chưa liên kết —'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-stone-400 text-sm px-4 py-6 text-center">Chưa có tài khoản nào</p>
        )}
      </div>

      {/* Quick-create user per person */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="font-medium text-stone-700 mb-3 text-sm">Tạo nhanh tài khoản cho thành viên</h3>
        {unlinkedPersons.length === 0 ? (
          <p className="text-stone-400 text-sm">Tất cả thành viên đều đã có tài khoản</p>
        ) : (
          <div className="space-y-2">
            {unlinkedPersons.slice(0, 10).map(p => (
              <QuickCreateRow
                key={p.id}
                person={p}
                authHeaders={authHeaders}
                onCreated={loadUsers}
              />
            ))}
            {unlinkedPersons.length > 10 && (
              <p className="text-stone-400 text-xs">… và {unlinkedPersons.length - 10} thành viên khác (dùng form "Tạo tài khoản" ở trên)</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickCreateRow({
  person,
  authHeaders,
  onCreated,
}: {
  person: PersonFull
  authHeaders: Record<string, string>
  onCreated: () => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  async function handleCreate() {
    if (!username.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`/api/editor/persons/${person.id}/user`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Lỗi'); return }
      setDone(true)
      await onCreated()
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setCreating(false)
    }
  }

  if (done) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-700 w-40 truncate">{person.name}</span>
      <input
        type="text"
        placeholder="Tên đăng nhập"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <button
        onClick={handleCreate}
        disabled={creating || !username.trim()}
        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-2 py-1 rounded transition-colors"
      >
        {creating ? '…' : 'Tạo'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

function CreateUserForm({
  persons,
  authHeaders,
  onCreated,
  onCancel,
}: {
  persons: PersonFull[]
  authHeaders: Record<string, string>
  onCreated: () => Promise<void>
  onCancel: () => void
}) {
  const [username, setUsername] = useState('')
  const [role, setRole]         = useState<'viewer' | 'editor'>('viewer')
  const [personId, setPersonId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/editor/users', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), role, personId: personId || undefined }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Lỗi'); return }
      await onCreated()
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-stone-800 text-sm">Tạo tài khoản mới</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Tên đăng nhập</label>
          <input
            type="text"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-xs text-stone-400 mt-0.5">Mật khẩu mặc định = tên đăng nhập</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Vai trò</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
            className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Liên kết thành viên (tuỳ chọn)</label>
        <select
          value={personId}
          onChange={e => setPersonId(e.target.value)}
          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">— Chưa liên kết —</option>
          {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5">
          Hủy
        </button>
      </div>
    </form>
  )
}

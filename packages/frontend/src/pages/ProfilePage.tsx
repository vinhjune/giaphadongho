import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppNav from '../components/layout/AppNav'
import AvatarUpload from '../components/editor/AvatarUpload'
import DatePartInputs from '../components/editor/date-part-inputs'
import { useAuth } from '../contexts/AuthContext'
import type { PersonFull } from '@giapha/shared/types'

type ProfileData = {
  id: string
  username: string
  role: 'editor' | 'viewer'
  personId: string | null
  person: PersonFull | null
}

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const authHeaders = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/profile', { headers: authHeaders })
      .then(r => r.json())
      .then(data => setProfile(data as ProfileData))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen bg-stone-50"><AppNav /><div className="p-8 text-stone-500">Đang tải…</div></div>
  if (!profile) return null

  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Hồ sơ cá nhân</h1>

        {!profile.personId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
            Tài khoản chưa được liên kết với thành viên trong gia phả. Liên hệ quản trị viên để được gán.
          </div>
        )}

        {/* ── Personal Info ── */}
        {profile.person && (
          <PersonInfoSection
            person={profile.person}
            token={token!}
            onSaved={updated => setProfile(p => p ? { ...p, person: updated } : p)}
          />
        )}

        {/* ── Change Username ── */}
        <UsernameSection
          currentUsername={profile.username}
          token={token!}
          onChanged={(newUsername, newToken) => {
            updateUser({ username: newUsername, token: newToken })
            navigate('/')
          }}
        />

        {/* ── Change Password ── */}
        <PasswordSection token={token!} />
      </div>
    </div>
  )
}

// ── Person Info Section ────────────────────────────────────────────────────────

function PersonInfoSection({
  person,
  token,
  onSaved,
}: {
  person: PersonFull
  token: string
  onSaved: (updated: PersonFull) => void
}) {
  const [form, setForm] = useState({
    name:         person.name,
    gender:       person.gender ?? '',
    nickname:     person.nickname ?? '',
    bio:          person.bio ?? '',
    address:      person.address ?? '',
    email:        person.email ?? '',
    phone:        person.phone ?? '',
    birthYear:    person.birthYear ?? null as number | null,
    birthMonth:   person.birthMonth ?? null as number | null,
    birthDay:     person.birthDay ?? null as number | null,
    birthIsLunar: person.birthIsLunar,
    isAlive:      person.isAlive,
    notes:        person.notes ?? '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(person.avatarUrl)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const body = {
        name:         form.name.trim(),
        gender:       form.gender || null,
        nickname:     form.nickname || null,
        bio:          form.bio || null,
        address:      form.address || null,
        email:        form.email || null,
        phone:        form.phone || null,
        birthYear:    form.birthYear,
        birthMonth:   form.birthMonth,
        birthDay:     form.birthDay,
        birthIsLunar: form.birthIsLunar,
        isAlive:      form.isAlive,
        notes:        form.notes || null,
      }
      const res = await fetch('/api/profile/person', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setMsg({ ok: false, text: d.error ?? 'Lỗi khi lưu' })
        return
      }
      const updated = (await res.json()) as PersonFull
      onSaved(updated)
      setMsg({ ok: true, text: 'Đã lưu thông tin' })
    } catch {
      setMsg({ ok: false, text: 'Lỗi kết nối' })
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  )

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Thông tin cá nhân</h2>
      <div className="flex justify-center mb-4">
        <AvatarUpload
          uploadUrl="/api/profile/avatar"
          currentUrl={avatarUrl}
          onUploaded={url => setAvatarUrl(url)}
        />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('Họ và tên', 'name')}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Giới tính</label>
          <select
            value={form.gender}
            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— Chọn —</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
        {field('Tên thường gọi', 'nickname')}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Tiểu sử</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={3}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {field('Địa chỉ', 'address')}
        {field('Email', 'email', 'email')}
        {field('Số điện thoại', 'phone', 'tel')}
        <div className="grid grid-cols-3 gap-3">
          <DatePartInputs
            day={form.birthDay} month={form.birthMonth} year={form.birthYear}
            onDay={v => setForm(f => ({ ...f, birthDay: v }))}
            onMonth={v => setForm(f => ({ ...f, birthMonth: v }))}
            onYear={v => setForm(f => ({ ...f, birthYear: v }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={form.birthIsLunar} onChange={e => setForm(f => ({ ...f, birthIsLunar: e.target.checked }))} />
          Ngày sinh âm lịch
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={form.isAlive} onChange={e => setForm(f => ({ ...f, isAlive: e.target.checked }))} />
          Còn sống
        </label>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Ghi chú</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors text-sm"
        >
          {saving ? 'Đang lưu…' : 'Lưu thông tin'}
        </button>
      </form>
    </section>
  )
}

// ── Username Section ───────────────────────────────────────────────────────────

function UsernameSection({
  currentUsername,
  token,
  onChanged,
}: {
  currentUsername: string
  token: string
  onChanged: (newUsername: string, newToken: string) => void
}) {
  const [newUsername, setNewUsername] = useState('')
  const [password, setPassword]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/profile/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newUsername: newUsername.trim(), password }),
      })
      const data = (await res.json()) as { ok?: boolean; token?: string; username?: string; error?: string }
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Lỗi khi đổi tên đăng nhập' }); return }
      setMsg({ ok: true, text: 'Đã đổi tên đăng nhập. Đang chuyển về trang chủ…' })
      setTimeout(() => onChanged(data.username!, data.token!), 1500)
    } catch {
      setMsg({ ok: false, text: 'Lỗi kết nối' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-1">Đổi tên đăng nhập</h2>
      <p className="text-sm text-stone-500 mb-4">Hiện tại: <strong>{currentUsername}</strong></p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Tên đăng nhập mới</label>
          <input
            type="text"
            required
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu xác nhận</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors text-sm"
        >
          {saving ? 'Đang xử lý…' : 'Đổi tên đăng nhập'}
        </button>
      </form>
    </section>
  )
}

// ── Password Section ───────────────────────────────────────────────────────────

function PasswordSection({ token }: { token: string }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving]                   = useState(false)
  const [msg, setMsg]                         = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setMsg({ ok: false, text: 'Mật khẩu mới không khớp' }); return }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Lỗi khi đổi mật khẩu' }); return }
      setMsg({ ok: true, text: 'Đã đổi mật khẩu thành công' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setMsg({ ok: false, text: 'Lỗi kết nối' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Đổi mật khẩu</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors text-sm"
        >
          {saving ? 'Đang xử lý…' : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  )
}

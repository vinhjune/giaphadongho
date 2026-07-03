import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AvatarUpload from './AvatarUpload'
import DatePartInputs from './date-part-inputs'
import type { PersonFull } from '@giapha/shared/types'

type Props = {
  person: PersonFull | null        // null = create mode
  onSaved: (person: PersonFull) => void
  onCancel: () => void
}

const BLANK: Partial<PersonFull> = {
  name: '', gender: null, nickname: null, bio: null,
  address: null, email: null, phone: null,
  birthYear: null, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: true,
  isAlive: true, notes: null, avatarUrl: null,
}

export default function PersonForm({ person, onSaved, onCancel }: Props) {
  const { token } = useAuth()
  const [form, setForm] = useState<Partial<PersonFull>>(person ?? BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof PersonFull>(k: K, v: PersonFull[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Tên là bắt buộc'); return }
    setError(null); setSaving(true)
    try {
      const url = person ? `/api/editor/persons/${person.id}` : '/api/editor/persons'
      const method = person ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = person
        ? { ...person, ...form }
        : { ...form, id: ((await res.json()) as { id: string }).id } as PersonFull
      onSaved(saved as PersonFull)
    } catch {
      setError('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const Input = ({ label, field, type = 'text' }: { label: string; field: keyof PersonFull; type?: string }) => (
    <label className="block">
      <span className="text-xs text-stone-500">{label}</span>
      <input
        type={type}
        value={(form[field] as string | number) ?? ''}
        onChange={e => set(field, (type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value || null) as PersonFull[typeof field])}
        className="mt-0.5 w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </label>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center">
        {person ? (
          <AvatarUpload
            personId={person.id}
            currentUrl={form.avatarUrl ?? null}
            onUploaded={url => set('avatarUrl', url)}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400">
            Lưu trước
          </div>
        )}
      </div>

      <Input label="Tên đầy đủ *" field="name" />
      <Input label="Tên thường gọi" field="nickname" />

      <label className="block">
        <span className="text-xs text-stone-500">Giới tính</span>
        <select
          value={form.gender ?? ''}
          onChange={e => set('gender', (e.target.value || null) as PersonFull['gender'])}
          className="mt-0.5 w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">— Chọn —</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <DatePartInputs
          lunar={false}
          day={form.birthDay ?? null} month={form.birthMonth ?? null} year={form.birthYear ?? null}
          onDay={v => set('birthDay', v)} onMonth={v => set('birthMonth', v)} onYear={v => set('birthYear', v)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isAlive ?? true} onChange={e => set('isAlive', e.target.checked)} className="rounded" />
        Còn sống
      </label>

      {!form.isAlive && (
        <div className="grid grid-cols-3 gap-2">
          <DatePartInputs
            lunar={true}
            day={form.deathDay ?? null} month={form.deathMonth ?? null} year={form.deathYear ?? null}
            onDay={v => set('deathDay', v)} onMonth={v => set('deathMonth', v)} onYear={v => set('deathYear', v)}
          />
        </div>
      )}

      <Input label="Địa chỉ" field="address" />
      <Input label="Email" field="email" type="email" />
      <Input label="Điện thoại" field="phone" type="tel" />

      <label className="block">
        <span className="text-xs text-stone-500">Tiểu sử</span>
        <textarea
          value={form.bio ?? ''}
          onChange={e => set('bio', e.target.value || null)}
          rows={3}
          className="mt-0.5 w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2 transition-colors">
          {saving ? 'Đang lưu…' : person ? 'Cập nhật' : 'Tạo mới'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-semibold rounded-lg py-2 transition-colors">
          Hủy
        </button>
      </div>
    </form>
  )
}

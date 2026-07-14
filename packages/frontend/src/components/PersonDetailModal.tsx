import { useEffect, useState } from 'react'
import type { PersonFull } from '@giapha/shared/types'

const LUNAR_MONTH_NAMES = ['Giêng','Hai','Ba','Tư','Năm','Sáu','Bảy','Tám','Chín','Mười','Mười Một','Chạp']

function formatDate(year: number | null, month: number | null, day: number | null, isLunar: boolean): string {
  if (!year && !month && !day) return '—'
  const parts: string[] = []
  if (day) parts.push(String(day))
  if (month) parts.push(isLunar ? (LUNAR_MONTH_NAMES[month - 1] ?? String(month)) : String(month))
  if (year) parts.push(String(year))
  return parts.join('/') + (isLunar ? ' (ÂL)' : '')
}

const GENDER_LABELS: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }

type Props = { personId: string | null; onClose: () => void }

export default function PersonDetailModal({ personId, onClose }: Props) {
  const [person, setPerson] = useState<PersonFull | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!personId) { setPerson(null); return }
    setLoading(true)
    fetch(`/api/persons/${personId}`)
      .then(r => r.json())
      .then(d => setPerson(d as PersonFull))
      .finally(() => setLoading(false))
  }, [personId])

  if (!personId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
        >×</button>
        {loading && <p className="text-stone-400 text-sm py-8 text-center">Đang tải…</p>}
        {!loading && person && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt={person.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0
                  ${person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {person.name.split(' ').slice(-2).map((s: string) => s[0]).join('').toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-stone-800">{person.name}</h2>
                {person.nickname && <p className="text-sm text-stone-500">"{person.nickname}"</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${person.isAlive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                  {person.isAlive ? 'Còn sống' : 'Đã mất'}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {person.gender && <><dt className="text-stone-500">Giới tính</dt><dd className="text-stone-800">{GENDER_LABELS[person.gender] ?? person.gender}</dd></>}
              {person.thuTuDoi != null && <><dt className="text-stone-500">Đời</dt><dd className="text-stone-800">{person.thuTuDoi}</dd></>}
              {person.ngoaiToc && <><dt className="text-stone-500">Ngoại tộc</dt><dd className="text-stone-800">Có</dd></>}
              <dt className="text-stone-500">Ngày sinh</dt>
              <dd className="text-stone-800">{formatDate(person.birthYear, person.birthMonth, person.birthDay, person.birthIsLunar)}</dd>
              {!person.isAlive && (
                <><dt className="text-stone-500">Ngày mất</dt>
                <dd className="text-stone-800">{formatDate(person.deathYear ?? null, person.deathMonth ?? null, person.deathDay ?? null, person.deathIsLunar ?? false)}</dd></>
              )}
              {person.address && <><dt className="text-stone-500">Địa chỉ</dt><dd className="text-stone-800">{person.address}</dd></>}
              {person.phone && <><dt className="text-stone-500">Điện thoại</dt><dd className="text-stone-800">{person.phone}</dd></>}
              {person.email && <><dt className="text-stone-500">Email</dt><dd className="text-stone-800">{person.email}</dd></>}
            </dl>
            {person.bio && (
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Tiểu sử</p>
                <p className="text-sm text-stone-700 leading-relaxed">{person.bio}</p>
              </div>
            )}
            {person.notes && (
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Ghi chú</p>
                <p className="text-sm text-stone-700">{person.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

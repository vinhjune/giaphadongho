import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppNav from '../components/layout/AppNav'
import FamilyHero from '../components/landing/FamilyHero'
import EventList from '../components/landing/EventList'
import type { LandingData } from '@giapha/shared/types'

export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/public/landing')
      .then(r => r.json())
      .then(d => setData(d as LandingData))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        Không thể tải dữ liệu. Vui lòng thử lại.
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Đang tải…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav familyName={data.familyName} />
      <FamilyHero familyName={data.familyName} introText={data.introText} foundedYear={data.foundedYear} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Sự kiện dòng họ</h2>
          <div className="flex gap-2">
            <Link to="/list" className="text-sm text-amber-700 hover:underline">Danh sách thành viên →</Link>
            <span className="text-stone-300">|</span>
            <Link to="/tree" className="text-sm text-amber-700 hover:underline">Cây gia phả →</Link>
          </div>
        </div>
        <EventList events={data.events} />
      </main>
    </div>
  )
}

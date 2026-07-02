import type { FamilyEvent } from '@giapha/shared/types'
import EventCard from './EventCard'

export default function EventList({ events }: { events: FamilyEvent[] }) {
  if (!events.length) {
    return <p className="text-center text-stone-400 py-8">Chưa có sự kiện sắp tới</p>
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map(e => <EventCard key={e.id} event={e} />)}
    </div>
  )
}

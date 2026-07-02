import type { FamilyEvent } from '@giapha/shared/types'
import { formatEventDate } from '@giapha/shared/date-utils'

export default function EventCard({ event }: { event: FamilyEvent }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-stone-800">{event.title}</h3>
        {event.isRecurring && (
          <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Hằng năm</span>
        )}
      </div>
      <p className="text-sm text-amber-700 font-medium mb-2">{formatEventDate(event)}</p>
      {event.description && (
        <p className="text-sm text-stone-500 line-clamp-2">{event.description}</p>
      )}
    </div>
  )
}

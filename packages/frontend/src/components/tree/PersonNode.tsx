import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { PersonPublic, PersonFull } from '@giapha/shared/types'

type Props = { data: PersonPublic | PersonFull }

function PersonNode({ data }: Props) {
  const initials = data.name.split(' ').slice(-2).map(s => s[0]).join('').toUpperCase()

  return (
    <div
      className={`w-max rounded-xl border shadow-sm px-3 py-2 text-sm select-none
        ${data.isAlive ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-300'}`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      <div className="flex items-center gap-2">
        {data.avatarUrl ? (
          <img src={data.avatarUrl} alt={data.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
            ${data.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-stone-800 whitespace-nowrap leading-tight">{data.name}</p>
          {data.birthYear && (
            <p className="text-xs text-stone-400">
              {data.birthYear}
              {'deathYear' in data && !data.isAlive && data.deathYear ? `–${data.deathYear}` : ''}
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  )
}

export default memo(PersonNode)

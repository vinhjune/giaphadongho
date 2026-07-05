import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

export type FamilyNodeData = {
  id: string
  dimmed?: boolean
  orderP1?: number
  parent1FamilyCount?: number
}

function FamilyNode({ data }: { data?: FamilyNodeData }) {
  const showOrder = (data?.orderP1 ?? 1) > 1

  return (
    <div className={`relative flex flex-col items-center ${data?.dimmed ? 'opacity-30' : ''}`}>
      <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600">
        <Handle type="target" position={Position.Top} className="!w-1 !h-1 !opacity-0" />
        <Handle type="source" position={Position.Bottom} className="!w-1 !h-1 !opacity-0" />
      </div>
      {showOrder && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-1">
          vợ thứ {data!.orderP1}
        </span>
      )}
    </div>
  )
}

export default memo(FamilyNode)

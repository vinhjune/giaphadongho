import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

function FamilyNode() {
  return (
    <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600">
      <Handle type="target" position={Position.Top} className="!w-1 !h-1 !opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!w-1 !h-1 !opacity-0" />
    </div>
  )
}

export default memo(FamilyNode)

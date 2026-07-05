type Props = {
  focusName: string
  ancestorDepth: number
  descendantDepth: number
  onAncestorChange: (d: number) => void
  onDescendantChange: (d: number) => void
  onClear: () => void
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-stone-500 w-20">{label}</span>
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="w-4 text-center font-medium text-stone-800">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= 9}
        className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  )
}

export default function GenerationControlsPanel({
  focusName,
  ancestorDepth,
  descendantDepth,
  onAncestorChange,
  onDescendantChange,
  onClear,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-3 flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-700 truncate">{focusName}</span>
        <button
          onClick={onClear}
          className="text-xs text-stone-400 hover:text-stone-600 shrink-0"
        >
          Bỏ chọn
        </button>
      </div>
      <Stepper label="Đời trên" value={ancestorDepth} onChange={onAncestorChange} />
      <Stepper label="Đời dưới" value={descendantDepth} onChange={onDescendantChange} />
    </div>
  )
}

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ICellEditorParams } from 'ag-grid-community'
import type { PersonWithParents } from '@giapha/shared/types'

type Params = ICellEditorParams & {
  persons: PersonWithParents[]
  selfId: string | null
}

const ParentCellEditor = forwardRef<unknown, Params>((params, ref) => {
  const { persons, selfId, value: initialValue, stopEditing } = params

  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState<string | null>(initialValue ?? null)
  const [open, setOpen]         = useState(true)
  const inputRef                = useRef<HTMLInputElement>(null)
  // Ref so getValue() sees the latest value even before React re-renders
  const selectedRef             = useRef<string | null>(initialValue ?? null)

  useImperativeHandle(ref, () => ({
    getValue: () => selectedRef.current,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd:    () => false,
  }))

  useEffect(() => {
    inputRef.current?.focus()
    // Populate input with current value's display text
    if (initialValue) {
      const p = persons.find(p => p.id === initialValue)
      if (p) setQuery(`${p.name}${p.birthYear ? ` (${p.birthYear})` : ''}`)
    }
  }, [])

  const matches = query.trim()
    ? persons
        .filter(p =>
          p.id !== selfId &&
          p.name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
    : []

  function choose(p: PersonWithParents) {
    selectedRef.current = p.id
    setSelected(p.id)
    setQuery(`${p.name}${p.birthYear ? ` (${p.birthYear})` : ''}`)
    setOpen(false)
    stopEditing()
  }

  function clear() {
    selectedRef.current = null
    setSelected(null)
    setQuery('')
    setOpen(false)
    stopEditing()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setSelected(initialValue ?? null); stopEditing() }
    if (e.key === 'Enter' && matches.length === 1) choose(matches[0])
  }

  return (
    <div className="relative" style={{ minWidth: 200 }}>
      <div className="flex items-center border border-amber-400 rounded bg-white">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 text-sm outline-none"
          placeholder="Tìm theo tên…"
        />
        {selected && (
          <button onClick={clear} className="px-1 text-stone-400 hover:text-red-500 text-xs leading-none">×</button>
        )}
      </div>

      {open && matches.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-stone-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {matches.map(p => (
            <li
              key={p.id}
              onMouseDown={e => { e.preventDefault(); choose(p) }}
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-amber-50 text-stone-800"
            >
              {p.name}{p.birthYear ? <span className="text-stone-400 ml-1">({p.birthYear})</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

ParentCellEditor.displayName = 'ParentCellEditor'
export default ParentCellEditor

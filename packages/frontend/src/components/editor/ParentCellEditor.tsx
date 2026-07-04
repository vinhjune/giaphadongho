import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ICellEditorParams } from 'ag-grid-community'
import type { PersonWithParents } from '@giapha/shared/types'

type Params = ICellEditorParams & {
  persons: PersonWithParents[]
  selfId: string | null
  // AG Grid React 36 CellEditorComponentProxy injects this to track the committed value
  onValueChange?: (value: string | null) => void
}

const ParentCellEditor = forwardRef<unknown, Params>((params, ref) => {
  const { persons, selfId, value: initialValue, stopEditing, onValueChange } = params

  const [query, setQuery]           = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(initialValue ?? null)
  const [highlightIndex, setHighlight] = useState(-1)
  const selectedRef                 = useRef<string | null>(initialValue ?? null)
  const inputRef                    = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    getValue:            () => selectedRef.current,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd:    () => false,
  }))

  useEffect(() => {
    inputRef.current?.focus()
    if (initialValue) {
      const p = persons.find(p => p.id === initialValue)
      if (p) setQuery(label(p))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset keyboard highlight when query changes
  useEffect(() => { setHighlight(-1) }, [query])

  const matches = query.trim()
    ? persons
        .filter(p => p.id !== selfId && p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
    : []

  function label(p: PersonWithParents) {
    return `${p.name}${p.birthYear ? ` (${p.birthYear})` : ''}`
  }

  function choose(p: PersonWithParents) {
    selectedRef.current = p.id
    onValueChange?.(p.id)
    stopEditing()
    setSelectedId(p.id)
    setQuery(label(p))
    setHighlight(-1)
  }

  function clear() {
    selectedRef.current = null
    onValueChange?.(null)
    stopEditing()
    setSelectedId(null)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      selectedRef.current = initialValue ?? null
      stopEditing()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(i => (i < matches.length - 1 ? i + 1 : i))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(i => (i > 0 ? i - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = highlightIndex >= 0
        ? matches[highlightIndex]
        : matches.length === 1 ? matches[0] : null
      if (target) choose(target)
    }
  }

  const showList = matches.length > 0
  const listId = 'parent-cell-suggestions'

  return (
    <div style={{ minWidth: 220, background: 'white', border: '1px solid #f59e0b', borderRadius: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, padding: '4px 8px', fontSize: 14, outline: 'none', background: 'transparent' }}
          placeholder="Tìm theo tên…"
        />
        {selectedId && (
          <button
            aria-label="×"
            onMouseDown={e => { e.preventDefault(); clear() }}
            style={{ padding: '0 6px', color: '#a8a29e', fontSize: 12 }}
          >×</button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            borderTop: '1px solid #e7e5e4',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={e => { e.preventDefault(); choose(p) }}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                cursor: 'pointer',
                background: i === highlightIndex ? '#fffbeb' : 'white',
                color: '#292524',
              }}
            >
              {p.name}
              {p.birthYear
                ? <span style={{ color: '#a8a29e', marginLeft: 4 }}>({p.birthYear})</span>
                : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

ParentCellEditor.displayName = 'ParentCellEditor'
export default ParentCellEditor

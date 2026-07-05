import { useState, useRef, useCallback } from 'react'
import type { PersonPublic } from '@giapha/shared/types'
import { filterPersonsByName } from '../../lib/vietnamese-text'

type Props = {
  persons: PersonPublic[]
  onSelect: (id: string) => void
}

export default function TreeSearchPanel({ persons, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = query.trim() ? filterPersonsByName(query, persons) : []
  const isOpen = query.trim().length > 0

  const commit = useCallback(
    (id: string) => {
      onSelect(id)
      setQuery('')
      setActiveIndex(0)
    },
    [onSelect],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) commit(results[activeIndex].id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setQuery('')
      setActiveIndex(0)
    }
  }

  return (
    <div className="relative w-56">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        value={query}
        placeholder="Tìm thành viên…"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        onChange={e => {
          setQuery(e.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg z-50 max-h-72 overflow-auto"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-400 select-none">Không tìm thấy</li>
          ) : (
            results.map((person, idx) => (
              <li
                key={person.id}
                role="option"
                aria-selected={idx === activeIndex}
                className={`px-3 py-2 text-sm cursor-pointer select-none ${idx === activeIndex ? 'bg-amber-50 text-amber-900' : 'hover:bg-stone-50'}`}
                onMouseDown={e => {
                  e.preventDefault() // keep input focused
                  commit(person.id)
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="font-medium">{person.name}</span>
                {(person.birthYear || person.nickname) && (
                  <span className="ml-1.5 text-stone-400">
                    {[person.birthYear, person.nickname].filter(Boolean).join(' · ')}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

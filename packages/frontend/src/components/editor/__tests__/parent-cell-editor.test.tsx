import { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ParentCellEditor from '../ParentCellEditor'
import type { PersonWithParents } from '@giapha/shared/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePerson(id: string, name: string, birthYear?: number): PersonWithParents {
  return {
    id,
    name,
    gender: 'male',
    nickname: null,
    avatarUrl: null,
    birthYear: birthYear ?? null,
    birthMonth: null,
    birthDay: null,
    birthIsLunar: false,
    isAlive: true,
    notes: null,
    bio: null,
    address: null,
    email: null,
    phone: null,
    deathYear: null,
    deathMonth: null,
    deathDay: null,
    deathIsLunar: false,
    fatherId: null,
    motherId: null,
    childOrder: null,
    spouseOrders: [],
  }
}

const PERSONS: PersonWithParents[] = [
  makePerson('p1', 'Nguyễn Văn An', 1940),
  makePerson('p2', 'Nguyễn Văn Bình', 1960),
  makePerson('p3', 'Trần Thị Cúc', 1965),
]

// ── Helpers ───────────────────────────────────────────────────────────────────

interface EditorApi {
  getValue: () => string | null
}

function renderEditor(overrides: Record<string, unknown> = {}) {
  const stopEditing = vi.fn()
  const ref = createRef<EditorApi>()

  render(
    <ParentCellEditor
      ref={ref}
      persons={PERSONS}
      selfId={null}
      value={null}
      stopEditing={stopEditing}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(overrides as any)}
    />
  )

  return { stopEditing, ref }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ParentCellEditor', () => {
  describe('rendering', () => {
    it('renders the search input', () => {
      renderEditor()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('shows no suggestions initially (empty query)', () => {
      renderEditor()
      expect(screen.queryByRole('option')).toBeNull()
    })

    it('populates input with initial value name', () => {
      renderEditor({ value: 'p1' })
      expect(screen.getByRole('combobox')).toHaveValue('Nguyễn Văn An (1940)')
    })
  })

  describe('filtering', () => {
    it('shows matching suggestions when typing', async () => {
      const user = userEvent.setup()
      renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
      expect(screen.getByText('Nguyễn Văn Bình')).toBeInTheDocument()
      expect(screen.queryByText('Trần Thị Cúc')).toBeNull()
    })

    it('excludes self from suggestions', async () => {
      const user = userEvent.setup()
      renderEditor({ selfId: 'p1' })
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      expect(screen.queryByText('Nguyễn Văn An')).toBeNull()
      expect(screen.getByText('Nguyễn Văn Bình')).toBeInTheDocument()
    })
  })

  describe('click selection', () => {
    it('clicking a suggestion sets getValue to that person id', async () => {
      const user = userEvent.setup()
      const { stopEditing, ref } = renderEditor()
      await user.type(screen.getByRole('combobox'), 'Trần')
      // Only 1 match: p3
      fireEvent.mouseDown(screen.getByRole('option'), { bubbles: true })
      expect(ref.current!.getValue()).toBe('p3')
      expect(stopEditing).toHaveBeenCalled()
    })

    it('clicking a suggestion closes the dropdown', async () => {
      const user = userEvent.setup()
      renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      const [firstOption] = screen.getAllByRole('option')
      fireEvent.mouseDown(firstOption, { bubbles: true })
      expect(screen.queryByRole('option')).toBeNull()
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown moves highlight to first suggestion', async () => {
      const user = userEvent.setup()
      renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      await user.keyboard('{ArrowDown}')
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[1]).toHaveAttribute('aria-selected', 'false')
    })

    it('ArrowDown then ArrowDown moves to second suggestion', async () => {
      const user = userEvent.setup()
      renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      await user.keyboard('{ArrowDown}{ArrowDown}')
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'false')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
    })

    it('ArrowUp does not go below index 0', async () => {
      const user = userEvent.setup()
      renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      await user.keyboard('{ArrowDown}{ArrowUp}')
      // Both ArrowDown then ArrowUp → back to index 0
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('Enter selects highlighted suggestion (multiple matches)', async () => {
      const user = userEvent.setup()
      const { stopEditing, ref } = renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      // p1 = Nguyễn Văn An, p2 = Nguyễn Văn Bình — 2 matches
      await user.keyboard('{ArrowDown}') // highlight p1
      await user.keyboard('{Enter}')
      expect(ref.current!.getValue()).toBe('p1')
      expect(stopEditing).toHaveBeenCalled()
    })

    it('Enter selects single match even without arrow navigation', async () => {
      const user = userEvent.setup()
      const { stopEditing, ref } = renderEditor()
      await user.type(screen.getByRole('combobox'), 'Trần Thị Cúc')
      await user.keyboard('{Enter}')
      expect(ref.current!.getValue()).toBe('p3')
      expect(stopEditing).toHaveBeenCalled()
    })

    it('Enter does nothing when multiple matches and none highlighted', async () => {
      const user = userEvent.setup()
      const { stopEditing } = renderEditor()
      await user.type(screen.getByRole('combobox'), 'Nguyễn')
      await user.keyboard('{Enter}')
      expect(stopEditing).not.toHaveBeenCalled()
    })

    it('Escape cancels and restores original value', async () => {
      const user = userEvent.setup()
      const { stopEditing, ref } = renderEditor({ value: 'p1' })
      const input = screen.getByRole('combobox')
      await user.clear(input)
      await user.type(input, 'Bình')
      await user.keyboard('{Escape}')
      expect(ref.current!.getValue()).toBe('p1')
      expect(stopEditing).toHaveBeenCalled()
    })
  })

  describe('clear button', () => {
    it('shows clear button when a value is selected', () => {
      renderEditor({ value: 'p1' })
      expect(screen.getByRole('button', { name: /×/ })).toBeInTheDocument()
    })

    it('clear button resets selection', async () => {
      const user = userEvent.setup()
      const { stopEditing, ref } = renderEditor({ value: 'p1' })
      await user.click(screen.getByRole('button', { name: /×/ }))
      expect(ref.current!.getValue()).toBeNull()
      expect(stopEditing).toHaveBeenCalled()
    })
  })
})

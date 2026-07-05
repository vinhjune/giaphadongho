import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TreeSearchPanel from '../TreeSearchPanel'
import type { PersonPublic } from '@giapha/shared/types'

const makePersons = (): PersonPublic[] => [
  { id: '1', name: 'Nguyễn Văn Đức', gender: 'male', nickname: null, avatarUrl: null, birthYear: 1950, birthMonth: null, birthDay: null, birthIsLunar: false, isAlive: false, notes: null },
  { id: '2', name: 'Nguyễn Văn An', gender: 'male', nickname: 'An', avatarUrl: null, birthYear: 1980, birthMonth: null, birthDay: null, birthIsLunar: false, isAlive: true, notes: null },
  { id: '3', name: 'Trần Thị Hoa', gender: 'female', nickname: null, avatarUrl: null, birthYear: null, birthMonth: null, birthDay: null, birthIsLunar: false, isAlive: true, notes: null },
  { id: '4', name: 'Lê Đình Phúc', gender: 'male', nickname: 'Phúc', avatarUrl: null, birthYear: 1970, birthMonth: null, birthDay: null, birthIsLunar: false, isAlive: true, notes: null },
]

describe('TreeSearchPanel', () => {
  it('renders input with Vietnamese placeholder', () => {
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    expect(screen.getByPlaceholderText('Tìm thành viên…')).toBeTruthy()
  })

  it('shows no dropdown when query is empty', () => {
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows dropdown with matching results on input', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nguyen')
    expect(screen.getByRole('listbox')).toBeTruthy()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  it('matches diacritic-insensitively — "duc" finds "Đức"', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'duc')
    const options = screen.getAllByRole('option')
    expect(options.some(o => o.textContent?.includes('Đức'))).toBe(true)
  })

  it('shows birthYear in option when available', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'duc')
    expect(screen.getByRole('listbox').textContent).toContain('1950')
  })

  it('shows nickname in option when available', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'nguyen van an')
    expect(screen.getByRole('listbox').textContent).toContain('An')
  })

  it('shows "Không tìm thấy" when no match', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    await user.type(screen.getByRole('combobox'), 'xyz')
    expect(screen.getByText('Không tìm thấy')).toBeTruthy()
  })

  it('calls onSelect with correct id when option clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={onSelect} />)
    await user.type(screen.getByRole('combobox'), 'duc')
    const option = screen.getAllByRole('option')[0]
    await user.click(option)
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('closes dropdown and clears input on Escape', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'duc')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('selects with Enter on first highlighted option', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={onSelect} />)
    await user.type(screen.getByRole('combobox'), 'duc')
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('ArrowDown + Enter selects second option', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={onSelect} />)
    await user.type(screen.getByRole('combobox'), 'nguyen')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('2')
  })

  it('clears input and closes dropdown after selection', async () => {
    const user = userEvent.setup()
    render(<TreeSearchPanel persons={makePersons()} onSelect={vi.fn()} />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'duc')
    await user.keyboard('{Enter}')
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

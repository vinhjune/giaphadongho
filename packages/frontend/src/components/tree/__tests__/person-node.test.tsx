import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import PersonNode, { type PersonNodeData } from '../PersonNode'
import type { PersonPublic } from '@giapha/shared/types'

const basePerson: PersonPublic = {
  id: '1',
  name: 'Nguyễn Văn Đức',
  gender: 'male',
  nickname: null,
  avatarUrl: null,
  birthYear: 1950,
  birthMonth: null,
  birthDay: null,
  birthIsLunar: false,
  isAlive: false,
  notes: null,
}

function wrap(data: PersonNodeData) {
  return render(
    <ReactFlowProvider>
      <PersonNode data={data} />
    </ReactFlowProvider>,
  )
}

describe('PersonNode', () => {
  it('renders name', () => {
    const { getByText } = wrap(basePerson)
    expect(getByText('Nguyễn Văn Đức')).toBeTruthy()
  })

  it('applies dimmed classes when dimmed=true', () => {
    const { container } = wrap({ ...basePerson, dimmed: true })
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/opacity-30/)
    expect(root.className).toMatch(/grayscale/)
  })

  it('does not apply dimmed classes by default', () => {
    const { container } = wrap(basePerson)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/opacity-30/)
    expect(root.className).not.toMatch(/grayscale/)
  })

  it('applies focus ring when isFocus=true', () => {
    const { container } = wrap({ ...basePerson, isFocus: true })
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/ring-2/)
    expect(root.className).toMatch(/ring-amber-500/)
  })

  it('does not apply focus ring by default', () => {
    const { container } = wrap(basePerson)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/ring-2/)
  })

  it('does not show collapse chevron when hasChildren=false', () => {
    const { queryByTitle } = wrap({ ...basePerson, hasChildren: false, onToggleCollapse: vi.fn() })
    expect(queryByTitle('collapse')).toBeNull()
  })

  it('shows collapse chevron when hasChildren=true', () => {
    const { getByTitle } = wrap({ ...basePerson, hasChildren: true, onToggleCollapse: vi.fn() })
    expect(getByTitle('collapse')).toBeTruthy()
  })

  it('calls onToggleCollapse when chevron is clicked', () => {
    const onToggle = vi.fn()
    const { getByTitle } = wrap({ ...basePerson, hasChildren: true, onToggleCollapse: onToggle })
    fireEvent.click(getByTitle('collapse'))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('chevron click does not bubble to node double-click handler', () => {
    const onToggle = vi.fn()
    const onDoubleClick = vi.fn()
    const { getByTitle } = render(
      <ReactFlowProvider>
        <div onDoubleClick={onDoubleClick}>
          <PersonNode data={{ ...basePerson, hasChildren: true, onToggleCollapse: onToggle }} />
        </div>
      </ReactFlowProvider>,
    )
    fireEvent.click(getByTitle('collapse'))
    expect(onDoubleClick).not.toHaveBeenCalled()
  })

  it('shows collapsed badge with hidden count when isCollapsed + hiddenCount > 0', () => {
    const { getByText } = wrap({
      ...basePerson,
      hasChildren: true,
      isCollapsed: true,
      hiddenCount: 5,
      onToggleCollapse: vi.fn(),
    })
    expect(getByText(/▸.*5/)).toBeTruthy()
  })

  it('does not show badge when not collapsed', () => {
    const { queryByText } = wrap({
      ...basePerson,
      hasChildren: true,
      hiddenCount: 5,
      onToggleCollapse: vi.fn(),
    })
    expect(queryByText(/▸/)).toBeNull()
  })

  it('shows con thu N badge when childOrder is set', () => {
    const { getByText } = wrap({ ...basePerson, childOrder: 2 })
    expect(getByText(/con thứ 2/)).toBeTruthy()
  })

  it('does not show con thu badge when childOrder is null', () => {
    const { queryByText } = wrap({ ...basePerson, childOrder: null })
    expect(queryByText(/con thứ/)).toBeNull()
  })

  it('does not show con thu badge when childOrder is undefined', () => {
    const { queryByText } = wrap(basePerson)
    expect(queryByText(/con thứ/)).toBeNull()
  })
})

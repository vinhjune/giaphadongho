import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GenerationControlsPanel from '../GenerationControlsPanel'

function setup(overrides?: Partial<Parameters<typeof GenerationControlsPanel>[0]>) {
  const props = {
    focusName: 'Nguyễn Văn Đức',
    ancestorDepth: 2,
    descendantDepth: 2,
    onAncestorChange: vi.fn(),
    onDescendantChange: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
  render(<GenerationControlsPanel {...props} />)
  return props
}

describe('GenerationControlsPanel', () => {
  it('displays the focus person name', () => {
    setup()
    expect(screen.getByText('Nguyễn Văn Đức')).toBeTruthy()
  })

  it('displays current ancestor and descendant depth values', () => {
    setup({ ancestorDepth: 3, descendantDepth: 1 })
    const counts = screen.getAllByText(/^[0-9]$/)
    expect(counts.map(c => c.textContent)).toContain('3')
    expect(counts.map(c => c.textContent)).toContain('1')
  })

  it('calls onAncestorChange(+1) when ancestor + is clicked', async () => {
    const user = userEvent.setup()
    const props = setup({ ancestorDepth: 2 })
    const plusButtons = screen.getAllByText('+')
    await user.click(plusButtons[0])
    expect(props.onAncestorChange).toHaveBeenCalledWith(3)
  })

  it('calls onAncestorChange(-1) when ancestor − is clicked', async () => {
    const user = userEvent.setup()
    const props = setup({ ancestorDepth: 2 })
    const minusButtons = screen.getAllByText('−')
    await user.click(minusButtons[0])
    expect(props.onAncestorChange).toHaveBeenCalledWith(1)
  })

  it('calls onDescendantChange(+1) when descendant + is clicked', async () => {
    const user = userEvent.setup()
    const props = setup({ descendantDepth: 2 })
    const plusButtons = screen.getAllByText('+')
    await user.click(plusButtons[1])
    expect(props.onDescendantChange).toHaveBeenCalledWith(3)
  })

  it('calls onDescendantChange(-1) when descendant − is clicked', async () => {
    const user = userEvent.setup()
    const props = setup({ descendantDepth: 2 })
    const minusButtons = screen.getAllByText('−')
    await user.click(minusButtons[1])
    expect(props.onDescendantChange).toHaveBeenCalledWith(1)
  })

  it('disables ancestor − button at depth 0', () => {
    setup({ ancestorDepth: 0 })
    const minusButtons = screen.getAllByText('−')
    expect((minusButtons[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables ancestor + button at depth 9', () => {
    setup({ ancestorDepth: 9 })
    const plusButtons = screen.getAllByText('+')
    expect((plusButtons[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables descendant − button at depth 0', () => {
    setup({ descendantDepth: 0 })
    const minusButtons = screen.getAllByText('−')
    expect((minusButtons[1] as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables descendant + button at depth 9', () => {
    setup({ descendantDepth: 9 })
    const plusButtons = screen.getAllByText('+')
    expect((plusButtons[1] as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls onClear when Bỏ chọn is clicked', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByText('Bỏ chọn'))
    expect(props.onClear).toHaveBeenCalledOnce()
  })
})

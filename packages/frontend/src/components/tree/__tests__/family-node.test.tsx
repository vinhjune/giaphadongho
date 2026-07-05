import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import FamilyNode, { type FamilyNodeData } from '../FamilyNode'

function wrap(data: FamilyNodeData) {
  return render(
    <ReactFlowProvider>
      <FamilyNode data={data} />
    </ReactFlowProvider>,
  )
}

describe('FamilyNode', () => {
  it('renders without crashing', () => {
    const { container } = wrap({ id: 'f1' })
    expect(container.firstChild).toBeTruthy()
  })

  it('applies opacity when dimmed', () => {
    const { container } = wrap({ id: 'f1', dimmed: true })
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/opacity-30/)
  })

  it('shows vo thu N badge when orderP1 > 1', () => {
    const { getByText } = wrap({ id: 'f1', orderP1: 2 })
    expect(getByText(/vợ thứ 2/)).toBeTruthy()
  })

  it('does not show vo thu badge when orderP1 is 1', () => {
    const { queryByText } = wrap({ id: 'f1', orderP1: 1 })
    expect(queryByText(/vợ thứ/)).toBeNull()
  })

  it('does not show vo thu badge when orderP1 is undefined', () => {
    const { queryByText } = wrap({ id: 'f1' })
    expect(queryByText(/vợ thứ/)).toBeNull()
  })
})

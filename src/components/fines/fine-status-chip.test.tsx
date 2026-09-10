import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FineStatusChip } from './fine-status-chip'

const cases = [
  ['PENDING', 'Pending'],
  ['DISPUTED', 'Disputed'],
  ['PAID', 'Paid'],
  ['CANCELLED', 'Cancelled'],
] as const

describe('FineStatusChip', () => {
  it.each(cases)('renders %s as %s', (status, label) => {
    render(<FineStatusChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

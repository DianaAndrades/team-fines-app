import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import TeamHomePage from './page'

describe('team home page', () => {
  it('renders the team dashboard entry point', () => {
    render(<TeamHomePage />)

    expect(screen.getByRole('heading', { name: /team dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/fines, payments and deadlines/i)).toBeInTheDocument()
  })
})

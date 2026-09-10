import { beforeEach, describe, expect, it, vi } from 'vitest'

const createTeam = vi.fn()
const revalidatePath = vi.fn()
const redirect = vi.fn()

vi.mock('./service', () => ({
  createTeam,
}))

vi.mock('next/cache', () => ({
  revalidatePath,
}))

vi.mock('next/navigation', () => ({
  redirect,
}))

import { createTeamAction } from './actions'

describe('createTeamAction', () => {
  beforeEach(() => {
    createTeam.mockReset()
    revalidatePath.mockReset()
    redirect.mockReset()
    createTeam.mockResolvedValue('team-123')
  })

  it('returns field errors for invalid input without creating a team', async () => {
    const formData = new FormData()
    formData.set('name', ' ')
    formData.set('currencyCode', 'EURO')
    formData.set('seasonName', '')

    const result = await createTeamAction(undefined, formData)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.name).toBeDefined()
      expect(result.fieldErrors.currencyCode).toBeDefined()
      expect(result.fieldErrors.seasonName).toBeDefined()
    }
    expect(createTeam).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('creates a valid team, revalidates the root and redirects to the team route', async () => {
    const formData = new FormData()
    formData.set('name', 'FC Example')
    formData.set('currencyCode', 'EUR')
    formData.set('seasonName', '2026/27')

    await createTeamAction(undefined, formData)

    expect(createTeam).toHaveBeenCalledWith({
      name: 'FC Example',
      currencyCode: 'EUR',
      seasonName: '2026/27',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(redirect).toHaveBeenCalledWith('/t/team-123')
  })
})

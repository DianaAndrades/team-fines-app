import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createTeam, setLastActiveTeam, revalidatePath, redirect } = vi.hoisted(() => ({
  createTeam: vi.fn(),
  setLastActiveTeam: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('./service', () => ({
  createTeam,
  setLastActiveTeam,
}))

vi.mock('next/cache', () => ({
  revalidatePath,
}))

vi.mock('next/navigation', () => ({
  redirect,
}))

import { createTeamAction, switchTeamAction } from './actions'

describe('team actions', () => {
  beforeEach(() => {
    createTeam.mockReset()
    setLastActiveTeam.mockReset()
    revalidatePath.mockReset()
    redirect.mockReset()
    createTeam.mockResolvedValue('team-123')
    setLastActiveTeam.mockResolvedValue(undefined)
  })

  it('returns field errors for invalid team input without creating a team', async () => {
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

  it('persists the selected team and redirects to its canonical route', async () => {
    await switchTeamAction('team-456')

    expect(setLastActiveTeam).toHaveBeenCalledWith('team-456')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(redirect).toHaveBeenCalledWith('/t/team-456')
  })
})

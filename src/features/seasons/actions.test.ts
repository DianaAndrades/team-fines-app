import { beforeEach, describe, expect, it, vi } from 'vitest'

const { startNewSeason, revalidatePath, redirect } = vi.hoisted(() => ({
  startNewSeason: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('./rollover', () => ({
  startNewSeason,
}))

vi.mock('next/cache', () => ({
  revalidatePath,
}))

vi.mock('next/navigation', () => ({
  redirect,
}))

import { startNewSeasonAction } from './actions'

describe('season actions', () => {
  beforeEach(() => {
    startNewSeason.mockReset()
    revalidatePath.mockReset()
    redirect.mockReset()
    startNewSeason.mockResolvedValue('season-new')
  })

  it('rejects invalid rollover input before calling the database', async () => {
    const formData = new FormData()
    formData.set('teamId', '')
    formData.set('name', ' ')

    const result = await startNewSeasonAction(undefined, formData)

    expect(result?.ok).toBe(false)
    if (result && !result.ok) {
      expect(result.fieldErrors.teamId).toBeDefined()
      expect(result.fieldErrors.name).toBeDefined()
    }
    expect(startNewSeason).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('maps rollover toggles, refreshes the team layout and redirects to seasons', async () => {
    const formData = new FormData()
    formData.set('teamId', 'team-123')
    formData.set('name', '2027/28')
    formData.set('copyPlayers', 'on')
    formData.set('copyRules', 'on')
    formData.set('carryUnpaidFines', 'on')

    await startNewSeasonAction(undefined, formData)

    expect(startNewSeason).toHaveBeenCalledWith({
      teamId: 'team-123',
      name: '2027/28',
      copyPlayers: true,
      copyCoaches: false,
      copyRules: true,
      carryUnpaidFines: true,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/t/team-123', 'layout')
    expect(redirect).toHaveBeenCalledWith('/t/team-123/seasons')
  })
})

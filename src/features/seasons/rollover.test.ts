import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { startNewSeason } from './rollover'

describe('season rollover service', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('starts a new season through the transactional rollover RPC', async () => {
    rpc.mockResolvedValueOnce({ data: 'season-new', error: null })

    await expect(
      startNewSeason({
        teamId: 'team-123',
        name: '2027/28',
        copyPlayers: true,
        copyCoaches: true,
        copyRules: true,
        carryUnpaidFines: true,
      }),
    ).resolves.toBe('season-new')

    expect(rpc).toHaveBeenCalledWith('start_new_season', {
      p_team_id: 'team-123',
      p_name: '2027/28',
      p_copy_players: true,
      p_copy_coaches: true,
      p_copy_rules: true,
      p_carry_unpaid_fines: true,
    })
  })

  it('fails closed when the rollover RPC rejects the operation', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'OWNER_REQUIRED' } })

    await expect(
      startNewSeason({
        teamId: 'team-123',
        name: '2027/28',
        copyPlayers: true,
        copyCoaches: false,
        copyRules: true,
        carryUnpaidFines: true,
      }),
    ).rejects.toThrow('Could not start a new season.')
  })

  it('rejects an invalid season id returned by the database', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })

    await expect(
      startNewSeason({
        teamId: 'team-123',
        name: '2027/28',
        copyPlayers: false,
        copyCoaches: false,
        copyRules: false,
        carryUnpaidFines: false,
      }),
    ).rejects.toThrow('Season rollover returned an invalid id.')
  })
})

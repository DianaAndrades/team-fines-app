import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { createTeam, listMyTeams, setLastActiveTeam } from './service'

describe('team service', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('creates the team through the atomic Supabase RPC and returns its id', async () => {
    rpc.mockResolvedValueOnce({ data: 'team-123', error: null })

    await expect(
      createTeam({
        name: 'FC Example',
        currencyCode: 'EUR',
        seasonName: '2026/27',
      }),
    ).resolves.toBe('team-123')

    expect(rpc).toHaveBeenCalledWith('create_team_with_owner', {
      p_name: 'FC Example',
      p_currency_code: 'EUR',
      p_season_name: '2026/27',
    })
  })

  it('lists only the teams returned by the authenticated team RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          team_id: 'team-1',
          team_name: 'FC Example',
          currency_code: 'EUR',
          role: 'OWNER',
        },
        {
          team_id: 'team-2',
          team_name: 'Sunday XI',
          currency_code: 'GBP',
          role: 'PLAYER',
        },
      ],
      error: null,
    })

    await expect(listMyTeams()).resolves.toEqual([
      {
        id: 'team-1',
        name: 'FC Example',
        currencyCode: 'EUR',
        role: 'OWNER',
      },
      {
        id: 'team-2',
        name: 'Sunday XI',
        currencyCode: 'GBP',
        role: 'PLAYER',
      },
    ])

    expect(rpc).toHaveBeenCalledWith('list_my_teams')
  })

  it('persists the active team through a membership-checking RPC', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })

    await expect(setLastActiveTeam('team-123')).resolves.toBeUndefined()

    expect(rpc).toHaveBeenCalledWith('set_last_active_team', {
      p_team_id: 'team-123',
    })
  })
})

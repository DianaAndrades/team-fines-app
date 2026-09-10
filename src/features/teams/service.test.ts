import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ eq, maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc, from })),
}))

import {
  createTeam,
  getLastActiveTeamId,
  getTeamMemberIdForUser,
  getTeamMembership,
  listMyTeams,
  setLastActiveTeam,
} from './service'

describe('team service', () => {
  beforeEach(() => {
    rpc.mockReset()
    from.mockClear()
    select.mockClear()
    eq.mockClear()
    maybeSingle.mockReset()
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

  it('reads the last active team from the authenticated profile', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { last_active_team_id: 'team-2' },
      error: null,
    })

    await expect(getLastActiveTeamId('user-123')).resolves.toBe('team-2')

    expect(from).toHaveBeenCalledWith('profiles')
    expect(select).toHaveBeenCalledWith('last_active_team_id')
    expect(eq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('returns the current role when the user belongs to a team', async () => {
    rpc.mockResolvedValueOnce({ data: 'COACH', error: null })

    await expect(getTeamMembership('team-456')).resolves.toBe('COACH')

    expect(rpc).toHaveBeenCalledWith('team_role_for', {
      p_team_id: 'team-456',
    })
  })

  it('returns the active team member id for a user in a team', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { id: 'member-123' }, error: null })

    await expect(getTeamMemberIdForUser('team-456', 'user-123')).resolves.toBe('member-123')

    expect(from).toHaveBeenCalledWith('team_members')
    expect(select).toHaveBeenCalledWith('id')
    expect(eq).toHaveBeenCalledWith('team_id', 'team-456')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(eq).toHaveBeenCalledWith('status', 'ACTIVE')
  })
})

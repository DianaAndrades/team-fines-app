import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { createTeam } from './service'

describe('createTeam', () => {
  beforeEach(() => {
    rpc.mockReset()
    rpc.mockResolvedValue({ data: 'team-123', error: null })
  })

  it('creates the team through the atomic Supabase RPC and returns its id', async () => {
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
})

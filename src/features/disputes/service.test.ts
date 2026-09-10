import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { listOpenDisputes } from './service'

describe('dispute service', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('maps the staff dispute queue without converting money to floats', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          fine_id: '54000000-0000-0000-0000-000000000001',
          team_id: '51000000-0000-0000-0000-000000000001',
          player_name: 'Alex Player',
          fine_reason: 'Late to training',
          dispute_reason: 'The session started later',
          current_amount_minor: '1000',
          remaining_seconds: '345600',
          disputed_at: '2026-09-10T10:00:00Z',
        },
      ],
      error: null,
    })

    await expect(
      listOpenDisputes('51000000-0000-0000-0000-000000000001'),
    ).resolves.toEqual([
      {
        fineId: '54000000-0000-0000-0000-000000000001',
        teamId: '51000000-0000-0000-0000-000000000001',
        playerName: 'Alex Player',
        fineReason: 'Late to training',
        disputeReason: 'The session started later',
        currentAmountMinor: '1000',
        remainingSeconds: 345600,
        disputedAt: '2026-09-10T10:00:00Z',
      },
    ])

    expect(rpc).toHaveBeenCalledWith('list_open_disputes', {
      p_team_id: '51000000-0000-0000-0000-000000000001',
    })
  })
})

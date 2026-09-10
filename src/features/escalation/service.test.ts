import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, createAdminClient } = vi.hoisted(() => ({
  rpc: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))

import { processDueFines } from './service'

describe('escalation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAdminClient.mockReturnValue({ rpc })
  })

  it('runs the protected escalation RPC at the supplied UTC instant', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          fines_inspected: 3,
          doublings_applied: 6,
          catchup_events: 3,
        },
      ],
      error: null,
    })

    await expect(
      processDueFines(new Date('2026-09-10T12:00:00.000Z'), 200),
    ).resolves.toEqual({
      finesInspected: 3,
      doublingsApplied: 6,
      catchupEvents: 3,
    })

    expect(createAdminClient).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('process_due_fines', {
      p_now: '2026-09-10T12:00:00.000Z',
      p_limit: 200,
    })
  })

  it('fails closed when the database processor errors', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    await expect(
      processDueFines(new Date('2026-09-10T12:00:00.000Z')),
    ).rejects.toThrow('Could not process due fines.')
  })

  it('rejects an invalid processing instant before touching Supabase', async () => {
    await expect(processDueFines(new Date('invalid'))).rejects.toThrow(
      'Invalid escalation processing time.',
    )

    expect(createAdminClient).not.toHaveBeenCalled()
  })
})

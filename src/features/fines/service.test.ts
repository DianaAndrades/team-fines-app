import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import {
  adjustFine,
  cancelFine,
  createCustomFine,
  createRuleFine,
  getFine,
  listActivePlayers,
  listFineEvents,
  listTeamFines,
  markFinePaid,
} from './service'

describe('fine service', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('creates a rule-based fine through the transactional RPC', async () => {
    rpc.mockResolvedValueOnce({ data: 'fine-1', error: null })

    await expect(
      createRuleFine({
        teamId: '11111111-1111-4111-8111-111111111111',
        playerTeamMemberId: '22222222-2222-4222-8222-222222222222',
        ruleId: '33333333-3333-4333-8333-333333333333',
      }),
    ).resolves.toBe('fine-1')

    expect(rpc).toHaveBeenCalledWith('create_fine', {
      p_team_id: '11111111-1111-4111-8111-111111111111',
      p_player_team_member_id: '22222222-2222-4222-8222-222222222222',
      p_rule_id: '33333333-3333-4333-8333-333333333333',
      p_custom_reason: null,
      p_custom_amount_minor: null,
    })
  })

  it('creates a custom fine without floating-point conversion', async () => {
    rpc.mockResolvedValueOnce({ data: 'fine-2', error: null })

    await expect(
      createCustomFine({
        teamId: '11111111-1111-4111-8111-111111111111',
        playerTeamMemberId: '22222222-2222-4222-8222-222222222222',
        reason: 'Forgot the kit',
        amountMinor: '1250',
      }),
    ).resolves.toBe('fine-2')

    expect(rpc).toHaveBeenCalledWith('create_fine', {
      p_team_id: '11111111-1111-4111-8111-111111111111',
      p_player_team_member_id: '22222222-2222-4222-8222-222222222222',
      p_rule_id: null,
      p_custom_reason: 'Forgot the kit',
      p_custom_amount_minor: '1250',
    })
  })

  it('marks a fine paid through the locked transition RPC', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    const fineId = '44444444-4444-4444-8444-444444444443'

    await expect(markFinePaid(fineId)).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('mark_fine_paid', { p_fine_id: fineId })
  })

  it('adjusts a fine amount with its audit reason', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    const fineId = '44444444-4444-4444-8444-444444444444'

    await expect(
      adjustFine({
        fineId,
        newAmountMinor: '900',
        reason: 'Corrected by coach',
      }),
    ).resolves.toBeUndefined()

    expect(rpc).toHaveBeenCalledWith('adjust_fine_amount', {
      p_fine_id: fineId,
      p_new_amount_minor: '900',
      p_reason: 'Corrected by coach',
    })
  })

  it('cancels a fine with its audit reason', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    const fineId = '44444444-4444-4444-8444-444444444445'

    await expect(
      cancelFine({ fineId, reason: 'Training cancelled' }),
    ).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('cancel_fine', {
      p_fine_id: fineId,
      p_reason: 'Training cancelled',
    })
  })

  it('maps the team fine board without converting money to floating point', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          fine_id: '44444444-4444-4444-8444-444444444446',
          team_id: '11111111-1111-4111-8111-111111111111',
          player_team_member_id: '22222222-2222-4222-8222-222222222222',
          player_name: 'Alex Player',
          reason: 'Late to training',
          original_amount_minor: '500',
          current_amount_minor: '1000',
          status: 'PENDING',
          created_at: '2026-09-10T10:00:00Z',
          next_doubling_at: '2026-09-17T10:00:00Z',
        },
      ],
      error: null,
    })

    await expect(
      listTeamFines('11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual([
      {
        id: '44444444-4444-4444-8444-444444444446',
        teamId: '11111111-1111-4111-8111-111111111111',
        playerTeamMemberId: '22222222-2222-4222-8222-222222222222',
        playerName: 'Alex Player',
        reason: 'Late to training',
        originalAmountMinor: '500',
        currentAmountMinor: '1000',
        status: 'PENDING',
        createdAt: '2026-09-10T10:00:00Z',
        nextDoublingAt: '2026-09-17T10:00:00Z',
      },
    ])
    expect(rpc).toHaveBeenCalledWith('list_team_fines', {
      p_team_id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('returns one fine detail from the read RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          fine_id: '44444444-4444-4444-8444-444444444446',
          team_id: '11111111-1111-4111-8111-111111111111',
          player_team_member_id: '22222222-2222-4222-8222-222222222222',
          player_name: 'Alex Player',
          reason: 'Late to training',
          original_amount_minor: '500',
          current_amount_minor: '500',
          status: 'PENDING',
          created_at: '2026-09-10T10:00:00Z',
          next_doubling_at: '2026-09-17T10:00:00Z',
        },
      ],
      error: null,
    })

    await expect(getFine('44444444-4444-4444-8444-444444444446')).resolves.toMatchObject({
      id: '44444444-4444-4444-8444-444444444446',
      playerName: 'Alex Player',
      currentAmountMinor: '500',
    })
  })

  it('maps ordered audit events for a fine', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          event_id: '55555555-5555-4555-8555-555555555555',
          type: 'CREATED',
          actor_user_id: '66666666-6666-4666-8666-666666666666',
          previous_amount_minor: null,
          new_amount_minor: '500',
          scheduled_at: null,
          metadata: {},
          created_at: '2026-09-10T10:00:00Z',
        },
      ],
      error: null,
    })

    await expect(
      listFineEvents('44444444-4444-4444-8444-444444444446'),
    ).resolves.toEqual([
      {
        id: '55555555-5555-4555-8555-555555555555',
        type: 'CREATED',
        actorUserId: '66666666-6666-4666-8666-666666666666',
        previousAmountMinor: null,
        newAmountMinor: '500',
        scheduledAt: null,
        metadata: {},
        createdAt: '2026-09-10T10:00:00Z',
      },
    ])
  })

  it('lists only active players from the active season', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          team_member_id: '22222222-2222-4222-8222-222222222222',
          player_name: 'Alex Player',
        },
      ],
      error: null,
    })

    await expect(
      listActivePlayers('11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual([
      {
        teamMemberId: '22222222-2222-4222-8222-222222222222',
        name: 'Alex Player',
      },
    ])
  })
})

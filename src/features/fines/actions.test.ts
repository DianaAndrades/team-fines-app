import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createRuleFine,
  createCustomFine,
  markFinePaid,
  adjustFine,
  cancelFine,
  openFineDispute,
  acceptFineDispute,
  rejectFineDispute,
  revalidatePath,
  redirect,
} = vi.hoisted(() => ({
  createRuleFine: vi.fn(),
  createCustomFine: vi.fn(),
  markFinePaid: vi.fn(),
  adjustFine: vi.fn(),
  cancelFine: vi.fn(),
  openFineDispute: vi.fn(),
  acceptFineDispute: vi.fn(),
  rejectFineDispute: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('./service', () => ({
  createRuleFine,
  createCustomFine,
  markFinePaid,
  adjustFine,
  cancelFine,
  openFineDispute,
  acceptFineDispute,
  rejectFineDispute,
}))

import {
  acceptFineDisputeAction,
  adjustFineAction,
  cancelFineAction,
  createCustomFineAction,
  createRuleFineAction,
  markFinePaidAction,
  openFineDisputeAction,
  rejectFineDisputeAction,
} from './actions'

const teamId = '11111111-1111-4111-8111-111111111111'
const playerId = '22222222-2222-4222-8222-222222222222'
const ruleId = '33333333-3333-4333-8333-333333333333'
const fineId = '44444444-4444-4444-8444-444444444444'

describe('fine server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a rule fine and redirects to its detail page', async () => {
    createRuleFine.mockResolvedValueOnce(fineId)
    const formData = new FormData()
    formData.set('playerTeamMemberId', playerId)
    formData.set('ruleId', ruleId)

    await createRuleFineAction(teamId, formData)

    expect(createRuleFine).toHaveBeenCalledWith({ teamId, playerTeamMemberId: playerId, ruleId })
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines`)
    expect(redirect).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
  })

  it('creates a custom fine using integer minor units', async () => {
    createCustomFine.mockResolvedValueOnce(fineId)
    const formData = new FormData()
    formData.set('playerTeamMemberId', playerId)
    formData.set('reason', 'Forgot the kit')
    formData.set('amountMinor', '1250')

    await createCustomFineAction(teamId, formData)

    expect(createCustomFine).toHaveBeenCalledWith({
      teamId,
      playerTeamMemberId: playerId,
      reason: 'Forgot the kit',
      amountMinor: '1250',
    })
    expect(redirect).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
  })

  it('revalidates board and detail after marking paid', async () => {
    markFinePaid.mockResolvedValueOnce(undefined)

    await markFinePaidAction(teamId, fineId, new FormData())

    expect(markFinePaid).toHaveBeenCalledWith(fineId)
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines`)
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
  })

  it('passes adjustment amount and reason to the service', async () => {
    adjustFine.mockResolvedValueOnce(undefined)
    const formData = new FormData()
    formData.set('newAmountMinor', '900')
    formData.set('reason', 'Corrected by coach')

    await adjustFineAction(teamId, fineId, formData)

    expect(adjustFine).toHaveBeenCalledWith({
      fineId,
      newAmountMinor: '900',
      reason: 'Corrected by coach',
    })
  })

  it('passes cancellation reason to the service', async () => {
    cancelFine.mockResolvedValueOnce(undefined)
    const formData = new FormData()
    formData.set('reason', 'Training cancelled')

    await cancelFineAction(teamId, fineId, formData)

    expect(cancelFine).toHaveBeenCalledWith({ fineId, reason: 'Training cancelled' })
  })

  it('opens a dispute with a validated reason and revalidates the fine', async () => {
    openFineDispute.mockResolvedValueOnce(undefined)
    const formData = new FormData()
    formData.set('reason', '  Training started later than scheduled  ')

    await openFineDisputeAction(teamId, fineId, formData)

    expect(openFineDispute).toHaveBeenCalledWith({
      fineId,
      reason: 'Training started later than scheduled',
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines`)
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
  })

  it('accepts a dispute with the staff resolution reason and refreshes the queue', async () => {
    acceptFineDispute.mockResolvedValueOnce(undefined)
    const formData = new FormData()
    formData.set('reason', 'Player evidence accepted')

    await acceptFineDisputeAction(teamId, fineId, formData)

    expect(acceptFineDispute).toHaveBeenCalledWith({
      fineId,
      reason: 'Player evidence accepted',
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/disputes`)
  })

  it('rejects a dispute with the staff resolution reason and refreshes the queue', async () => {
    rejectFineDispute.mockResolvedValueOnce(undefined)
    const formData = new FormData()
    formData.set('reason', 'Attendance log confirms the fine')

    await rejectFineDisputeAction(teamId, fineId, formData)

    expect(rejectFineDispute).toHaveBeenCalledWith({
      fineId,
      reason: 'Attendance log confirms the fine',
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/fines/${fineId}`)
    expect(revalidatePath).toHaveBeenCalledWith(`/t/${teamId}/disputes`)
  })
})

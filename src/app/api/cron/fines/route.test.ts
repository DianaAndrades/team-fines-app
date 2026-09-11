import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { processDueFines, processDueReminders, drainEmailOutbox } = vi.hoisted(() => ({
  processDueFines: vi.fn(),
  processDueReminders: vi.fn(),
  drainEmailOutbox: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret-for-tests',
  },
}))

vi.mock('@/features/escalation/service', () => ({ processDueFines }))
vi.mock('@/features/notifications/service', () => ({ processDueReminders }))
vi.mock('@/features/notifications/email', () => ({ drainEmailOutbox }))

import { GET, runtime } from './route'

const fixedNow = new Date('2026-09-11T16:00:00.000Z')

function request(authorization?: string) {
  return new NextRequest('http://localhost:3000/api/cron/fines', {
    headers: authorization ? { authorization } : undefined,
  })
}

describe('GET /api/cron/fines', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
    vi.clearAllMocks()

    processDueFines.mockResolvedValue({
      finesInspected: 2,
      doublingsApplied: 2,
      catchupEvents: 1,
    })
    processDueReminders.mockResolvedValue({ remindersCreated: 1 })
    drainEmailOutbox.mockResolvedValue({ sent: 3, failed: 0, skipped: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs on the Node.js runtime', () => {
    expect(runtime).toBe('nodejs')
  })

  it('returns 401 when Authorization is missing', async () => {
    const response = await GET(request())

    expect(response.status).toBe(401)
    await expect(response.text()).resolves.toBe('Unauthorized')
    expect(processDueFines).not.toHaveBeenCalled()
    expect(processDueReminders).not.toHaveBeenCalled()
    expect(drainEmailOutbox).not.toHaveBeenCalled()
  })

  it('returns 401 when the Bearer secret is wrong', async () => {
    const response = await GET(request('Bearer wrong-secret'))

    expect(response.status).toBe(401)
    expect(processDueFines).not.toHaveBeenCalled()
    expect(processDueReminders).not.toHaveBeenCalled()
    expect(drainEmailOutbox).not.toHaveBeenCalled()
  })

  it('runs all scheduled processors with the valid secret', async () => {
    const response = await GET(request('Bearer cron-secret-for-tests'))

    expect(response.status).toBe(200)
    expect(processDueFines).toHaveBeenCalledWith(fixedNow, 200)
    expect(processDueReminders).toHaveBeenCalledWith(fixedNow, 500)
    expect(drainEmailOutbox).toHaveBeenCalledWith(100)

    const body = await response.json()
    expect(body).toMatchObject({
      ok: true,
      startedAt: fixedNow.toISOString(),
      escalation: {
        finesInspected: 2,
        doublingsApplied: 2,
        catchupEvents: 1,
      },
      reminders: { remindersCreated: 1 },
      email: { sent: 3, failed: 0, skipped: 0 },
    })
    expect(body.runId).toEqual(expect.any(String))
  })
})

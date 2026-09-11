import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClient,
  createAdminClient,
  from,
  select,
  order,
  limitQuery,
  update,
  eq,
  isNull,
  rpc,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limitQuery: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processDueReminders,
} from './service'

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    select.mockReturnValue({ order })
    order.mockReturnValue({ limit: limitQuery })
    update.mockReturnValue({ eq, is: isNull })
    from.mockReturnValue({ select, update })
    createClient.mockResolvedValue({ from })
    createAdminClient.mockReturnValue({ rpc })
  })

  it('lists the current user notifications newest first and maps database fields', async () => {
    limitQuery.mockResolvedValueOnce({
      data: [
        {
          id: 'notification-1',
          team_id: 'team-1',
          fine_id: 'fine-1',
          type: 'FINE_DOUBLED',
          title: 'Fine doubled',
          body: 'Late to training',
          read_at: null,
          created_at: '2026-09-11T10:00:00.000Z',
        },
      ],
      error: null,
    })

    await expect(listNotifications()).resolves.toEqual([
      {
        id: 'notification-1',
        teamId: 'team-1',
        fineId: 'fine-1',
        type: 'FINE_DOUBLED',
        title: 'Fine doubled',
        body: 'Late to training',
        readAt: null,
        createdAt: '2026-09-11T10:00:00.000Z',
      },
    ])

    expect(from).toHaveBeenCalledWith('notifications')
    expect(select).toHaveBeenCalledWith(
      'id,team_id,fine_id,type,title,body,read_at,created_at',
    )
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limitQuery).toHaveBeenCalledWith(50)
  })

  it('marks one notification read through the authenticated client', async () => {
    eq.mockResolvedValueOnce({ error: null })

    await expect(markNotificationRead('notification-1')).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('notifications')
    expect(update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(eq).toHaveBeenCalledWith('id', 'notification-1')
  })

  it('marks every unread visible notification read', async () => {
    isNull.mockResolvedValueOnce({ error: null })

    await expect(markAllNotificationsRead()).resolves.toBeUndefined()

    expect(update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(isNull).toHaveBeenCalledWith('read_at', null)
  })

  it('processes due reminders only through the admin client', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ reminders_created: 3 }],
      error: null,
    })

    await expect(
      processDueReminders(new Date('2026-09-11T12:00:00.000Z'), 500),
    ).resolves.toEqual({ remindersCreated: 3 })

    expect(createAdminClient).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('process_due_reminders', {
      p_now: '2026-09-11T12:00:00.000Z',
      p_limit: 500,
    })
  })

  it('rejects an invalid reminder processing time before touching Supabase', async () => {
    await expect(processDueReminders(new Date('invalid'))).rejects.toThrow(
      'Invalid reminder processing time.',
    )

    expect(createAdminClient).not.toHaveBeenCalled()
  })
})

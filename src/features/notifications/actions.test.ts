import { beforeEach, describe, expect, it, vi } from 'vitest'

const { markNotificationRead, markAllNotificationsRead, revalidatePath } = vi.hoisted(() => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('./service', () => ({ markNotificationRead, markAllNotificationsRead }))

import { markAllNotificationsReadAction, markNotificationReadAction } from './actions'

describe('notification server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks one notification read and refreshes the team notification center', async () => {
    markNotificationRead.mockResolvedValueOnce(undefined)

    await markNotificationReadAction('team-1', 'notification-1', new FormData())

    expect(markNotificationRead).toHaveBeenCalledWith('notification-1')
    expect(revalidatePath).toHaveBeenCalledWith('/t/team-1/notifications')
  })

  it('marks all visible notifications read and refreshes the notification center', async () => {
    markAllNotificationsRead.mockResolvedValueOnce(undefined)

    await markAllNotificationsReadAction('team-1', new FormData())

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/t/team-1/notifications')
  })
})

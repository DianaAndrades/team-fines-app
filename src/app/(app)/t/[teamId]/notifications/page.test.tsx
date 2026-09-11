import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listNotifications } = vi.hoisted(() => ({
  listNotifications: vi.fn(),
}))

vi.mock('@/features/notifications/service', () => ({ listNotifications }))
vi.mock('@/features/notifications/actions', () => ({
  markNotificationReadAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(),
}))

import NotificationsPage from './page'

describe('NotificationsPage', () => {
  beforeEach(() => {
    listNotifications.mockReset()
  })

  it('shows unread and read notifications with fine links and read controls', async () => {
    listNotifications.mockResolvedValue([
      {
        id: 'notification-1',
        teamId: 'team-1',
        fineId: 'fine-1',
        type: 'NEW_FINE',
        title: 'New fine',
        body: 'Late to training',
        readAt: null,
        createdAt: '2026-09-11T10:00:00.000Z',
      },
      {
        id: 'notification-2',
        teamId: 'team-1',
        fineId: 'fine-2',
        type: 'FINE_PAID',
        title: 'Fine paid',
        body: 'Forgot the bibs',
        readAt: '2026-09-11T11:30:00.000Z',
        createdAt: '2026-09-11T11:00:00.000Z',
      },
    ])

    render(
      await NotificationsPage({
        params: Promise.resolve({ teamId: 'team-1' }),
      }),
    )

    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New fine', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('Fine paid')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /view fine/i })[0]).toHaveAttribute(
      'href',
      '/t/team-1/fines/fine-1',
    )
  })

  it('shows an empty state when there are no notifications', async () => {
    listNotifications.mockResolvedValue([])

    render(
      await NotificationsPage({
        params: Promise.resolve({ teamId: 'team-1' }),
      }),
    )

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark all as read/i })).not.toBeInTheDocument()
  })
})

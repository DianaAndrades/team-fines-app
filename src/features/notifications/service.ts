import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'NEW_FINE'
  | 'DOUBLING_REMINDER'
  | 'FINE_DOUBLED'
  | 'DISPUTE_RESOLVED'
  | 'FINE_PAID'
  | 'TEAM_INVITATION'

export type NotificationItem = {
  id: string
  teamId: string
  fineId: string | null
  type: NotificationType
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

type NotificationRow = {
  id: string
  team_id: string
  fine_id: string | null
  type: NotificationType
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export async function listNotifications(limit = 50): Promise<NotificationItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id,team_id,fine_id,type,title,body,read_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error('Could not load notifications.')
  }

  return ((data ?? []) as NotificationRow[]).map((notification) => ({
    id: notification.id,
    teamId: notification.team_id,
    fineId: notification.fine_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    readAt: notification.read_at,
    createdAt: notification.created_at,
  }))
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    throw new Error('Could not mark notification read.')
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) {
    throw new Error('Could not mark notifications read.')
  }
}

export async function processDueReminders(
  now: Date,
  limit = 500,
): Promise<{ remindersCreated: number }> {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid reminder processing time.')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('process_due_reminders', {
    p_now: now.toISOString(),
    p_limit: limit,
  })

  if (error) {
    throw new Error('Could not process due reminders.')
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result || typeof result.reminders_created !== 'number') {
    throw new Error('Reminder processing returned an invalid result.')
  }

  return { remindersCreated: result.reminders_created }
}

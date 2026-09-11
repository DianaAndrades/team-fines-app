'use server'

import { revalidatePath } from 'next/cache'

import { markAllNotificationsRead, markNotificationRead } from './service'

export async function markNotificationReadAction(
  teamId: string,
  notificationId: string,
  formData: FormData,
): Promise<void> {
  void formData
  await markNotificationRead(notificationId)
  revalidatePath(`/t/${teamId}/notifications`)
}

export async function markAllNotificationsReadAction(
  teamId: string,
  formData: FormData,
): Promise<void> {
  void formData
  await markAllNotificationsRead()
  revalidatePath(`/t/${teamId}/notifications`)
}

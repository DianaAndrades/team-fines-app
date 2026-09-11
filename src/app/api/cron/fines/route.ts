import type { NextRequest } from 'next/server'

import { processDueFines } from '@/features/escalation/service'
import { drainEmailOutbox } from '@/features/notifications/email'
import { processDueReminders } from '@/features/notifications/service'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (
    !env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = new Date()
  const escalation = await processDueFines(startedAt, 200)
  const reminders = await processDueReminders(startedAt, 500)
  const email = await drainEmailOutbox(100)

  return Response.json({
    ok: true,
    runId: crypto.randomUUID(),
    startedAt: startedAt.toISOString(),
    escalation,
    reminders,
    email,
  })
}

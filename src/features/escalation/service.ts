import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type EscalationResult = {
  finesInspected: number
  doublingsApplied: number
  catchupEvents: number
}

export async function processDueFines(
  now: Date,
  limit = 200,
): Promise<EscalationResult> {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid escalation processing time.')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('process_due_fines', {
    p_now: now.toISOString(),
    p_limit: limit,
  })

  if (error) {
    throw new Error('Could not process due fines.')
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    throw new Error('Escalation processor returned an invalid result.')
  }

  const finesInspected = Number(row.fines_inspected)
  const doublingsApplied = Number(row.doublings_applied)
  const catchupEvents = Number(row.catchup_events)

  if (
    !Number.isInteger(finesInspected) ||
    !Number.isInteger(doublingsApplied) ||
    !Number.isInteger(catchupEvents) ||
    finesInspected < 0 ||
    doublingsApplied < 0 ||
    catchupEvents < 0
  ) {
    throw new Error('Escalation processor returned an invalid result.')
  }

  return {
    finesInspected,
    doublingsApplied,
    catchupEvents,
  }
}

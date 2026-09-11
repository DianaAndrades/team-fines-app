import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Vercel cron configuration', () => {
  it('runs the fines cron once per hour', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }

    expect(config.crons).toContainEqual({
      path: '/api/cron/fines',
      schedule: '0 * * * *',
    })
  })
})

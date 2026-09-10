import { describe, expect, it } from 'vitest'
import { parseEnv } from './env-schema'

describe('parseEnv', () => {
  it('rejects a missing Supabase URL', () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('accepts the minimum public configuration', () => {
    expect(
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      }),
    ).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    })
  })
})

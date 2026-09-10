'use server'

import { z } from 'zod'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ email: z.string().trim().email() })

export type MagicLinkResult =
  | { ok: true }
  | { ok: false; error: string }

export async function requestMagicLink(input: { email: string }): Promise<MagicLinkResult> {
  const parsed = schema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { ok: false, error: 'Could not send sign-in link.' }
  }

  return { ok: true }
}

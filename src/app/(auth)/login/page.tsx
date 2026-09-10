import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/features/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-border bg-card/90 p-7 shadow-2xl shadow-black/30 backdrop-blur sm:p-9">
        <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Team Fines</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground">Sign in without a password.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enter your email and we will send you a secure magic link.
        </p>

        <div className="mt-8">
          <LoginForm />
        </div>
      </section>
    </main>
  )
}

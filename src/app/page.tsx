import { ShieldCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-border bg-card/80 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
        <div className="mb-10 inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Team Fines</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-6xl">
          Rules stay clear. Fines stay impossible to forget.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          A mobile-first workspace for football teams to assign fines, track deadlines and keep every change auditable.
        </p>
      </section>
    </main>
  )
}

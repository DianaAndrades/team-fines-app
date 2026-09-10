import type { ReactNode } from 'react'

import type { MyTeam } from '@/features/teams/service'
import { TeamSwitcher } from './team-switcher'

type AppShellProps = {
  teams: MyTeam[]
  activeTeamId: string | null
  children: ReactNode
}

export function AppShell({ teams, activeTeamId, children }: AppShellProps) {
  if (teams.length === 0) {
    return (
      <main className="min-h-screen bg-[#0B0D10] px-6 py-12 text-[#F5F7FA]">
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-[#22C55E]">
            Team Fines
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Create your team</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[#8B949E]">
            Set up your squad, choose its currency and start managing fines from one place.
          </p>
          <div className="mt-8">
            <a
              href="/teams/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22C55E] px-5 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90"
            >
              Create team
            </a>
          </div>
        </section>
      </main>
    )
  }

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0]

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F5F7FA]">
      <header className="border-b border-[#252A31] bg-[#15181D] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">Team Fines</p>
          <div className="w-full max-w-xs">
            <TeamSwitcher teams={teams} activeTeamId={activeTeam.id} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[#252A31] p-4 md:block">
          <nav aria-label="Team navigation" className="space-y-1 text-sm">
            <a className="block rounded-lg px-3 py-2 hover:bg-[#1B1F25]" href={`/t/${activeTeam.id}`}>
              Home
            </a>
            <a className="block rounded-lg px-3 py-2 hover:bg-[#1B1F25]" href={`/t/${activeTeam.id}/fines`}>
              Fines
            </a>
            <a className="block rounded-lg px-3 py-2 hover:bg-[#1B1F25]" href={`/t/${activeTeam.id}/rules`}>
              Rules
            </a>
            <a className="block rounded-lg px-3 py-2 hover:bg-[#1B1F25]" href={`/t/${activeTeam.id}/team`}>
              Team
            </a>
          </nav>
        </aside>

        <main className="min-w-0 p-5 md:p-8">{children}</main>
      </div>
    </div>
  )
}

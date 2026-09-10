import type { ReactNode } from 'react'

import type { MyTeam } from '@/features/teams/service'
import { TeamSwitcher } from './team-switcher'

type AppShellProps = {
  teams: MyTeam[]
  activeTeamId: string | null
  children: ReactNode
}

type NavLink = {
  label: string
  href: string
}

function primaryLinks(teamId: string): NavLink[] {
  return [
    { label: 'Home', href: `/t/${teamId}` },
    { label: 'Fines', href: `/t/${teamId}/fines` },
    { label: 'Rules', href: `/t/${teamId}/rules` },
    { label: 'Team', href: `/t/${teamId}/team` },
  ]
}

function secondaryLinks(teamId: string): NavLink[] {
  return [
    { label: 'Notifications', href: `/t/${teamId}/notifications` },
    { label: 'Seasons', href: `/t/${teamId}/seasons` },
    { label: 'Settings', href: `/t/${teamId}/settings` },
  ]
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
  const mainLinks = primaryLinks(activeTeam.id)
  const extraLinks = secondaryLinks(activeTeam.id)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0D10] text-[#F5F7FA]">
      <header className="border-b border-[#252A31] bg-[#15181D] px-3 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">Team Fines</p>
          <div className="w-full sm:max-w-xs">
            <TeamSwitcher teams={teams} activeTeamId={activeTeam.id} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-81px)] border-r border-[#252A31] p-4 md:block">
          <nav aria-label="Desktop team navigation" className="space-y-1 text-sm">
            {mainLinks.map((link) => (
              <a
                key={link.href}
                className="block rounded-lg px-3 py-2 hover:bg-[#1B1F25]"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            <div className="my-3 border-t border-[#252A31]" />
            {extraLinks.map((link) => (
              <a
                key={link.href}
                className="block rounded-lg px-3 py-2 text-[#8B949E] hover:bg-[#1B1F25] hover:text-[#F5F7FA]"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 p-4 pb-28 sm:p-5 sm:pb-28 md:p-8 md:pb-8">{children}</main>
      </div>

      <nav
        aria-label="Mobile team navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#252A31] bg-[#15181D]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mainLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-h-12 min-w-0 items-center justify-center rounded-lg px-1 text-center text-xs font-medium text-[#8B949E] hover:bg-[#1B1F25] hover:text-[#F5F7FA]"
            >
              {link.label}
            </a>
          ))}

          <details className="group relative min-w-0">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-lg px-1 text-center text-xs font-medium text-[#8B949E] hover:bg-[#1B1F25] hover:text-[#F5F7FA]">
              More
            </summary>
            <div className="absolute bottom-[calc(100%+0.5rem)] right-0 w-44 overflow-hidden rounded-xl border border-[#252A31] bg-[#15181D] p-2 shadow-2xl">
              {extraLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-[#F5F7FA] hover:bg-[#1B1F25]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </details>
        </div>
      </nav>
    </div>
  )
}

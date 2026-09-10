import { switchTeamAction } from '@/features/teams/actions'
import type { MyTeam } from '@/features/teams/service'

type TeamSwitcherProps = {
  teams: MyTeam[]
  activeTeamId: string
}

export function TeamSwitcher({ teams, activeTeamId }: TeamSwitcherProps) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0]
  const otherTeams = teams.filter((team) => team.id !== activeTeam.id)

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-[#252A31] bg-[#15181D] px-4 py-3 hover:bg-[#1B1F25]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#F5F7FA]">{activeTeam.name}</p>
          <p className="mt-0.5 text-xs font-medium text-[#8B949E]">{activeTeam.role}</p>
        </div>
        <span aria-hidden="true" className="text-sm text-[#8B949E]">
          ▾
        </span>
      </summary>

      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-64 overflow-hidden rounded-xl border border-[#252A31] bg-[#15181D] p-2 shadow-2xl">
        {otherTeams.map((team) => (
          <form key={team.id} action={switchTeamAction.bind(null, team.id)}>
            <button
              type="submit"
              aria-label={`Switch to ${team.name}`}
              className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left hover:bg-[#1B1F25]"
            >
              <span className="min-w-0 truncate text-sm font-medium text-[#F5F7FA]">
                {team.name}
              </span>
              <span className="shrink-0 text-xs font-medium text-[#8B949E]">{team.role}</span>
            </button>
          </form>
        ))}

        {otherTeams.length > 0 ? <div className="my-2 border-t border-[#252A31]" /> : null}

        <a
          href="/teams/new"
          className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#22C55E] hover:bg-[#1B1F25]"
        >
          + Create team
        </a>
      </div>
    </details>
  )
}

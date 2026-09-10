import { notFound } from 'next/navigation'

import { AddFineFlow } from '@/components/fines/add-fine-flow'
import { listActivePlayers } from '@/features/fines/service'
import { listRules } from '@/features/rules/service'
import { getActiveSeason } from '@/features/seasons/service'
import { getTeamMembership, listMyTeams } from '@/features/teams/service'

export default async function NewFinePage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const role = await getTeamMembership(teamId)

  if (role !== 'OWNER' && role !== 'COACH') {
    notFound()
  }

  const [season, players, teams] = await Promise.all([
    getActiveSeason(teamId),
    listActivePlayers(teamId),
    listMyTeams(),
  ])
  const team = teams.find((item) => item.id === teamId)

  if (!team) {
    notFound()
  }

  const rules = await listRules(teamId, season.id, false)

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <a
          href={`/t/${teamId}/fines`}
          className="text-sm font-medium text-[#8B949E] hover:text-[#F5F7FA]"
        >
          ← Fines
        </a>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-[#8B949E]">
          {season.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F5F7FA]">Add fine</h1>
        <p className="mt-2 text-sm text-[#8B949E]">
          Pick the player and reason, then confirm the exact amount and first doubling deadline.
        </p>
      </div>

      <AddFineFlow
        teamId={teamId}
        currencyCode={team.currencyCode}
        reviewStartedAt={new Date().toISOString()}
        players={players}
        rules={rules}
      />
    </section>
  )
}

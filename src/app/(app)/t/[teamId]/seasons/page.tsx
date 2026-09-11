import { RolloverForm } from '@/components/seasons/rollover-form'
import { listTeamSeasons } from '@/features/seasons/service'
import { getTeamMembership } from '@/features/teams/service'

export default async function SeasonsPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const [seasons, membership] = await Promise.all([
    listTeamSeasons(teamId),
    getTeamMembership(teamId),
  ])
  const currentSeason = seasons.find((season) => season.isActive)
  const previousSeasons = seasons.filter((season) => !season.isActive)

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#F5F7FA]">Seasons</h1>

      <section
        data-testid="current-season"
        className="space-y-2 rounded-2xl border border-[#252A31] bg-[#15181D] p-5"
      >
        <h2 className="text-sm font-medium text-[#22C55E]">Current season</h2>
        {currentSeason ? (
          <>
            <p className="text-xl font-semibold text-[#F5F7FA]">{currentSeason.name}</p>
            <p className="text-sm text-[#8B949E]">
              {currentSeason.carriedDebtCount} carried fines
            </p>
          </>
        ) : (
          <p className="text-sm text-[#8B949E]">No active season is available.</p>
        )}
      </section>

      {membership === 'OWNER' && currentSeason ? (
        <RolloverForm teamId={teamId} currentSeasonName={currentSeason.name} />
      ) : null}

      <section data-testid="season-history" className="space-y-3">
        <h2 className="text-lg font-semibold text-[#F5F7FA]">Season history</h2>
        {previousSeasons.map((season) => (
          <article
            key={season.id}
            className="space-y-1 rounded-2xl border border-[#252A31] bg-[#15181D] p-4"
          >
            <h3 className="font-medium text-[#F5F7FA]">{season.name}</h3>
            <p className="text-sm text-[#8B949E]">{season.carriedDebtCount} carried fines</p>
          </article>
        ))}
      </section>
    </main>
  )
}

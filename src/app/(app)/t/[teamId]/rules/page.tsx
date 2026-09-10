import { getActiveSeason } from '@/features/seasons/service'
import {
  createRuleAction,
  setRuleActiveAction,
  updateRuleAction,
} from '@/features/rules/actions'
import { listRules } from '@/features/rules/service'
import { getTeamMembership, listMyTeams } from '@/features/teams/service'

const HUNDRED = BigInt(100)

function formatMinorUnits(currencyCode: string, amountMinor: string) {
  const amount = BigInt(amountMinor)
  const major = amount / HUNDRED
  const minor = (amount % HUNDRED).toString().padStart(2, '0')
  return `${currencyCode} ${major}.${minor}`
}

export default async function RulesPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const [membership, teams, season] = await Promise.all([
    getTeamMembership(teamId),
    listMyTeams(),
    getActiveSeason(teamId),
  ])

  const team = teams.find((candidate) => candidate.id === teamId)
  const isStaff = membership === 'OWNER' || membership === 'COACH'

  if (!team || !season) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#F5F7FA]">Rules</h1>
        <p className="text-sm text-[#8B949E]">No active season is available.</p>
      </main>
    )
  }

  const rules = await listRules(teamId, season.id, isStaff)
  const createAction = createRuleAction.bind(null, teamId, season.id)

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[#8B949E]">{season.name}</p>
          <h1 className="text-2xl font-semibold text-[#F5F7FA]">Rules</h1>
        </div>
        <p className="text-sm text-[#8B949E]">
          {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
        </p>
      </header>

      {isStaff ? (
        <details className="rounded-2xl border border-[#252A31] bg-[#15181D] p-4">
          <summary className="cursor-pointer list-none font-medium text-[#22C55E]">
            + Add rule
          </summary>
          <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-[#8B949E]">
              <span>Title</span>
              <input
                name="title"
                required
                maxLength={120}
                className="w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-[#F5F7FA]"
              />
            </label>
            <label className="space-y-1 text-sm text-[#8B949E]">
              <span>Amount in cents</span>
              <input
                name="defaultAmountMinor"
                type="number"
                min="1"
                step="1"
                required
                className="w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-[#F5F7FA]"
              />
            </label>
            <label className="space-y-1 text-sm text-[#8B949E] sm:col-span-2">
              <span>Description</span>
              <textarea
                name="description"
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-[#F5F7FA]"
              />
            </label>
            <button
              type="submit"
              className="w-fit rounded-xl bg-[#22C55E] px-4 py-2 font-medium text-[#0B0D10]"
            >
              Save rule
            </button>
          </form>
        </details>
      ) : null}

      <section className="grid gap-3">
        {rules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#252A31] p-6 text-sm text-[#8B949E]">
            No rules yet.
          </div>
        ) : (
          rules.map((rule) => {
            const updateAction = updateRuleAction.bind(
              null,
              rule.id,
              teamId,
              season.id,
            )
            const toggleAction = setRuleActiveAction.bind(
              null,
              teamId,
              rule.id,
              !rule.isActive,
            )

            return (
              <article
                key={rule.id}
                className="rounded-2xl border border-[#252A31] bg-[#15181D] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-[#F5F7FA]">{rule.title}</h2>
                      {!rule.isActive ? (
                        <span className="rounded-full bg-[#252A31] px-2 py-0.5 text-xs text-[#8B949E]">
                          Inactive
                        </span>
                      ) : null}
                    </div>
                    {rule.description ? (
                      <p className="text-sm text-[#8B949E]">{rule.description}</p>
                    ) : null}
                  </div>
                  <strong className="whitespace-nowrap text-lg text-[#F5F7FA]">
                    {formatMinorUnits(team.currencyCode, rule.defaultAmountMinor)}
                  </strong>
                </div>

                {isStaff ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <details className="rounded-xl border border-[#252A31] px-3 py-2 text-sm text-[#F5F7FA]">
                      <summary className="cursor-pointer list-none">Edit</summary>
                      <form action={updateAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          aria-label={`Title for ${rule.title}`}
                          name="title"
                          defaultValue={rule.title}
                          required
                          maxLength={120}
                          className="rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 py-2"
                        />
                        <input
                          aria-label={`Amount for ${rule.title}`}
                          name="defaultAmountMinor"
                          type="number"
                          min="1"
                          step="1"
                          defaultValue={rule.defaultAmountMinor}
                          required
                          className="rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 py-2"
                        />
                        <textarea
                          aria-label={`Description for ${rule.title}`}
                          name="description"
                          defaultValue={rule.description ?? ''}
                          maxLength={500}
                          className="rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 py-2 sm:col-span-2"
                        />
                        <button
                          type="submit"
                          className="w-fit rounded-lg bg-[#22C55E] px-3 py-2 font-medium text-[#0B0D10]"
                        >
                          Save changes
                        </button>
                      </form>
                    </details>
                    <form action={toggleAction}>
                      <button
                        type="submit"
                        aria-label={`${rule.isActive ? 'Disable' : 'Enable'} ${rule.title}`}
                        className="rounded-xl border border-[#252A31] px-3 py-2 text-sm text-[#F5F7FA]"
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

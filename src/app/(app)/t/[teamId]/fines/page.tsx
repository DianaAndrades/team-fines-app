import { FineCard } from '@/components/fines/fine-card'
import {
  applyFineBoard,
  type FineFilter,
  type FineSort,
} from '@/features/fines/board'
import { listTeamFines } from '@/features/fines/service'
import { getTeamMembership, listMyTeams } from '@/features/teams/service'

const FILTERS: Array<{ value: FineFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DUE_SOON', label: 'Due soon' },
  { value: 'PAID', label: 'Paid' },
  { value: 'DISPUTED', label: 'Disputed' },
]

const SORTS: Array<{ value: FineSort; label: string }> = [
  { value: 'NEWEST', label: 'Newest' },
  { value: 'HIGHEST', label: 'Highest amount' },
  { value: 'CLOSEST_DEADLINE', label: 'Closest deadline' },
  { value: 'PLAYER', label: 'Player' },
]

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseFilter(value: string | string[] | undefined): FineFilter {
  const candidate = firstValue(value)
  return FILTERS.some((filter) => filter.value === candidate)
    ? (candidate as FineFilter)
    : 'ALL'
}

function parseSort(value: string | string[] | undefined): FineSort {
  const candidate = firstValue(value)
  return SORTS.some((sort) => sort.value === candidate)
    ? (candidate as FineSort)
    : 'NEWEST'
}

function filterHref(teamId: string, filter: FineFilter, sort: FineSort) {
  const params = new URLSearchParams()
  if (filter !== 'ALL') params.set('filter', filter)
  if (sort !== 'NEWEST') params.set('sort', sort)
  const query = params.toString()
  return `/t/${teamId}/fines${query ? `?${query}` : ''}`
}

export default async function FinesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ teamId }, query] = await Promise.all([params, searchParams])
  const [fines, role, teams] = await Promise.all([
    listTeamFines(teamId),
    getTeamMembership(teamId),
    listMyTeams(),
  ])

  const team = teams.find((item) => item.id === teamId)
  if (!team) throw new Error('Team not found.')

  const filter = parseFilter(query.filter)
  const sort = parseSort(query.sort)
  const visibleFines = applyFineBoard(fines, { filter, sort, now: new Date() })
  const isStaff = role === 'OWNER' || role === 'COACH'

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B949E]">
            Team ledger
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F5F7FA]">Fines</h1>
          <p className="mt-2 text-sm text-[#8B949E]">
            Every fine, deadline and status for {team.name}.
          </p>
        </div>

        {isStaff ? (
          <a
            href={`/t/${teamId}/fines/new`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-[#0B0D10] transition-opacity hover:opacity-90"
          >
            Add fine
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Fine filters" className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => {
              const active = item.value === filter
              return (
                <a
                  key={item.value}
                  href={filterHref(teamId, item.value, sort)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    active
                      ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#F5F7FA]'
                      : 'border-[#252A31] text-[#8B949E] hover:text-[#F5F7FA]'
                  }`}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>

          <form method="get" className="flex items-center gap-2">
            {filter !== 'ALL' ? <input type="hidden" name="filter" value={filter} /> : null}
            <label htmlFor="fine-sort" className="text-sm text-[#8B949E]">
              Sort fines
            </label>
            <select
              id="fine-sort"
              name="sort"
              defaultValue={sort}
              className="min-h-10 rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 text-sm text-[#F5F7FA] outline-none focus:border-[#22C55E]"
            >
              {SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-10 rounded-lg border border-[#252A31] px-3 text-sm font-medium text-[#F5F7FA] hover:bg-[#1B1F25]"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {visibleFines.length > 0 ? (
        <div className="grid gap-3">
          {visibleFines.map((fine) => (
            <a
              key={fine.id}
              href={`/t/${teamId}/fines/${fine.id}`}
              className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
            >
              <FineCard fine={fine} currencyCode={team.currencyCode} />
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#252A31] bg-[#15181D] px-5 py-12 text-center">
          <p className="font-medium text-[#F5F7FA]">No fines here</p>
          <p className="mt-2 text-sm text-[#8B949E]">
            Try another filter{isStaff ? ' or add the first fine.' : '.'}
          </p>
        </div>
      )}
    </section>
  )
}

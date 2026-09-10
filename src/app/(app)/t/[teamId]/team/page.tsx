import { InviteMemberForm } from '@/components/invite-member-form'
import { getTeamMembership } from '@/features/teams/service'

type TeamPageProps = {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params
  const role = await getTeamMembership(teamId)
  const canInvite = role === 'OWNER' || role === 'COACH'

  return (
    <section className="space-y-8">
      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#22C55E]">
          Squad management
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#F5F7FA]">Team</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B949E]">
          Manage who can join this team. Invitations expire automatically after seven days.
        </p>
      </div>

      {canInvite ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InviteMemberForm teamId={teamId} role="PLAYER" />
          <InviteMemberForm teamId={teamId} role="COACH" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5 text-sm text-[#8B949E]">
          Only team staff can invite new members.
        </div>
      )}
    </section>
  )
}

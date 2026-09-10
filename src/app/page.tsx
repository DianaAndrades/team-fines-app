import { redirect } from 'next/navigation'

import { listMyPendingInvitations } from '@/features/invitations/service'
import {
  getLastActiveTeamId,
  listMyTeams,
  setLastActiveTeam,
} from '@/features/teams/service'
import { requireUser } from '@/lib/auth/current-user'

export default async function HomePage() {
  const user = await requireUser()
  const teams = await listMyTeams()

  if (teams.length === 0) {
    const invitations = await listMyPendingInvitations()

    if (invitations.length > 0) {
      redirect('/invitations')
    }

    redirect('/teams/new')
  }

  const lastActiveTeamId = await getLastActiveTeamId(user.id)
  const activeTeam = teams.find((team) => team.id === lastActiveTeamId) ?? teams[0]

  if (activeTeam.id !== lastActiveTeamId) {
    await setLastActiveTeam(activeTeam.id)
  }

  redirect(`/t/${activeTeam.id}`)
}

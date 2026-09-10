import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import {
  getTeamMembership,
  listMyTeams,
  setLastActiveTeam,
} from '@/features/teams/service'

type TeamLayoutProps = {
  children: ReactNode
  params: Promise<{ teamId: string }>
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { teamId } = await params
  const membership = await getTeamMembership(teamId)

  if (!membership) {
    notFound()
  }

  const teams = await listMyTeams()

  if (!teams.some((team) => team.id === teamId)) {
    notFound()
  }

  await setLastActiveTeam(teamId)

  return (
    <AppShell teams={teams} activeTeamId={teamId}>
      {children}
    </AppShell>
  )
}

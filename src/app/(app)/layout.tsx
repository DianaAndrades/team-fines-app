import type { ReactNode } from 'react'

import { requireUser } from '@/lib/auth/current-user'

type AppLayoutProps = {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  await requireUser()

  return children
}

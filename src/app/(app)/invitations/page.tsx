import { acceptInvitationAction } from '@/features/invitations/actions'
import { listMyPendingInvitations } from '@/features/invitations/service'

export default async function InvitationsPage() {
  const invitations = await listMyPendingInvitations()

  return (
    <main className="min-h-screen bg-[#0B0D10] px-6 py-12 text-[#F5F7FA]">
      <section className="mx-auto w-full max-w-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-[#22C55E]">
          Team Fines
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Team invitations</h1>
        <p className="mt-4 text-base leading-7 text-[#8B949E]">
          Join a squad that has invited this email address.
        </p>

        {invitations.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[#252A31] bg-[#15181D] p-6">
            <p className="font-medium">No pending invitations</p>
            <p className="mt-2 text-sm leading-6 text-[#8B949E]">
              There is nothing waiting for this account right now.
            </p>
            <a
              href="/teams/new"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#252A31] px-4 py-2.5 text-sm font-semibold hover:bg-[#1B1F25]"
            >
              Create a team instead
            </a>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {invitations.map((invitation) => {
              const acceptAction = acceptInvitationAction.bind(null, invitation.id)

              return (
                <article
                  key={invitation.id}
                  className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{invitation.teamName}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#8B949E]">
                        <span className="rounded-full bg-[#1B1F25] px-2.5 py-1 font-medium text-[#F5F7FA]">
                          {invitation.role}
                        </span>
                        <span>
                          Expires{' '}
                          <time dateTime={invitation.expiresAt}>
                            {new Date(invitation.expiresAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </time>
                        </span>
                      </div>
                    </div>

                    <form action={acceptAction}>
                      <button
                        type="submit"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#22C55E] px-5 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 sm:w-auto"
                      >
                        Join team
                      </button>
                    </form>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

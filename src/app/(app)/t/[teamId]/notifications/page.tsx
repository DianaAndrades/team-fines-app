import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/features/notifications/actions'
import { listNotifications, type NotificationType } from '@/features/notifications/service'

const typeLabels: Record<NotificationType, string> = {
  NEW_FINE: 'New fine',
  DOUBLING_REMINDER: 'Deadline reminder',
  FINE_DOUBLED: 'Fine doubled',
  DISPUTE_RESOLVED: 'Dispute resolved',
  FINE_PAID: 'Payment',
  TEAM_INVITATION: 'Team invitation',
}

function formatCreatedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const notifications = await listNotifications()
  const unreadCount = notifications.filter((notification) => notification.readAt === null).length
  const markAll = markAllNotificationsReadAction.bind(null, teamId)

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22C55E]">
            Inbox
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F5F7FA]">
            Notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B949E]">
            Fine updates, approaching deadlines and dispute decisions appear here.
          </p>
        </div>

        {unreadCount > 0 ? (
          <form action={markAll}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-[#252A31] bg-[#15181D] px-4 text-sm font-semibold text-[#F5F7FA] hover:bg-[#1B1F25]"
            >
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-6">
          <p className="font-medium text-[#F5F7FA]">You&apos;re all caught up</p>
          <p className="mt-1 text-sm leading-6 text-[#8B949E]">
            New fine activity and reminders will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const unread = notification.readAt === null
            const markRead = markNotificationReadAction.bind(
              null,
              teamId,
              notification.id,
            )

            return (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 sm:p-6 ${
                  unread
                    ? 'border-[#22C55E]/30 bg-[#15181D]'
                    : 'border-[#252A31] bg-[#15181D]/70'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#8B949E]">
                        {typeLabels[notification.type]}
                      </span>
                      {unread ? (
                        <span className="rounded-full bg-[#22C55E]/15 px-2 py-1 text-xs font-semibold text-[#86EFAC]">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-[#F5F7FA]">
                      {notification.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#8B949E]">
                      {notification.body}
                    </p>
                  </div>

                  <time
                    dateTime={notification.createdAt}
                    className="shrink-0 text-xs text-[#8B949E]"
                  >
                    {formatCreatedAt(notification.createdAt)} UTC
                  </time>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {notification.fineId ? (
                    <a
                      href={`/t/${notification.teamId}/fines/${notification.fineId}`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-[#22C55E] hover:underline"
                    >
                      View fine
                    </a>
                  ) : null}

                  {unread ? (
                    <form action={markRead}>
                      <button
                        type="submit"
                        className="min-h-11 rounded-lg border border-[#252A31] px-3 text-sm font-semibold text-[#F5F7FA] hover:bg-[#1B1F25]"
                      >
                        Mark as read
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

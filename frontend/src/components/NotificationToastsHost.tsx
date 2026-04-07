import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fetchNotifications, markNotificationRead, type NotificationDto } from '../api/fleet'

/** Вне компонента: не дублировать тосты при React StrictMode (двойной mount). */
const globallyShownNotificationToastIds = new Set<string>()

function useDocumentNotificationsToasts(
  token: string | null,
  canFetchAuthed: boolean,
  onAfterRead?: () => void,
) {
  const queryClient = useQueryClient()
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([])

  const authedPollOk = Boolean(token) && canFetchAuthed

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', token],
    queryFn: () => fetchNotifications(token!),
    enabled: authedPollOk,
    staleTime: 15_000,
    refetchInterval: authedPollOk ? 15_000 : false,
  })

  const scheduleRemove = useCallback((id: string) => {
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 6000)
  }, [])

  useEffect(() => {
    if (!authedPollOk || !token) return
    /* Показ тоста при первом появлении непрочитанного уведомления (логика перенесена с шапки). */
    /* eslint-disable react-hooks/set-state-in-effect */
    for (const n of notifications as NotificationDto[]) {
      if (n.read) continue
      if (globallyShownNotificationToastIds.has(n.id)) continue
      globallyShownNotificationToastIds.add(n.id)
      setToasts((prev) => [...prev, { id: n.id, title: n.title, body: n.body }])
      scheduleRemove(n.id)
      void markNotificationRead(token, n.id).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications', token] })
        onAfterRead?.()
      })
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [notifications, authedPollOk, token, queryClient, scheduleRemove, onAfterRead])

  return toasts
}

type NotificationToastsHostProps = {
  /** На полноэкранной карте шапки нет — тосты ближе к верху */
  mapLayout?: boolean
}

export default function NotificationToastsHost({ mapLayout = false }: NotificationToastsHostProps) {
  const { token, isAccessTokenValid, refreshProfile } = useAuth()
  const toasts = useDocumentNotificationsToasts(token, isAccessTokenValid, refreshProfile)

  const topClass = mapLayout
    ? 'top-[max(0.75rem,env(safe-area-inset-top,0px))]'
    : 'top-[calc(env(safe-area-inset-top,0px)+4.25rem)] sm:top-[calc(env(safe-area-inset-top,0px)+5.25rem)]'

  return (
    <div
      className={`fixed right-3 sm:right-4 ${topClass} z-[100] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col gap-2 pointer-events-none`}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="eco-toast-in pointer-events-auto rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
          {t.body ? (
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-snug">{t.body}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

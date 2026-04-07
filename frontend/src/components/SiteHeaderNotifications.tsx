import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fetchNotifications, markNotificationRead, type NotificationDto } from '../api/fleet'

const RETENTION_DAYS = 7

function typeLabelRu(type: string): string {
  switch (type) {
    case 'carsiki_earned':
      return 'CARSIKI'
    case 'trip_completed':
    case 'rental_completed':
      return 'Поездка'
    case 'wallet_deposit':
    case 'deposit':
      return 'Кошелёк'
    case 'reservation_expired':
      return 'Бронь'
    case 'support_reply':
      return 'Поддержка'
    default:
      return type || 'Событие'
  }
}

function formatNotifTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type SiteHeaderNotificationsProps = {
  /** Закрыть другие выпадающие панели шапки перед открытием списка уведомлений */
  onOpenPanel: () => void
  /** Если открыто меню аккаунта — сворачиваем уведомления */
  accountMenuOpen: boolean
}

export default function SiteHeaderNotifications({ onOpenPanel, accountMenuOpen }: SiteHeaderNotificationsProps) {
  const { token, isAccessTokenValid } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const enabled = Boolean(token) && isAccessTokenValid

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['notifications', token],
    queryFn: () => fetchNotifications(token!, { take: 80, retentionDays: RETENTION_DAYS }),
    enabled,
    staleTime: 15_000,
    refetchInterval: 45_000,
  })

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const markReadMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications', token] }),
  })

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next) onOpenPanel()
      return next
    })
  }, [onOpenPanel])

  useEffect(() => {
    if (accountMenuOpen) setOpen(false)
  }, [accountMenuOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onRowClick = useCallback(
    (n: NotificationDto) => {
      if (!token || n.read) return
      markReadMut.mutate(n.id)
    },
    [token, markReadMut]
  )

  if (!enabled) return null

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className={`relative inline-flex text-neutral-400 hover:bg-white/5 p-2 rounded-full transition-all duration-300 ${
          open ? 'text-[#D4FF00] bg-white/10' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Уведомления"
        onClick={toggle}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#D4FF00] text-[#0a0a0a] text-[10px] font-bold leading-[1.125rem] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={`fixed md:absolute left-3 right-3 md:left-auto md:right-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] md:top-[calc(100%+0.5rem)] z-[120] w-auto md:w-[min(100vw-2rem,24rem)] origin-top md:origin-top-right transition-[opacity,transform] duration-200 ease-out ${
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0 md:scale-95'
        }`}
      >
        <div className="rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(70dvh,28rem)]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <span className="font-display font-bold text-sm text-white">Уведомления</span>
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              храним {RETENTION_DAYS} дн.
            </span>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
            {isLoading ? (
              <p className="p-4 text-sm text-neutral-500">Загрузка…</p>
            ) : isError ? (
              <p className="p-4 text-sm text-amber-400/90">Не удалось загрузить</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">За последние {RETENTION_DAYS} дней уведомлений нет</p>
            ) : (
              <ul className="divide-y divide-white/10" role="list">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
        n.read ? 'opacity-80' : 'bg-[#D4FF00]/5'
      }`}
                      onClick={() => onRowClick(n)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-white leading-snug">{n.title}</span>
                        {!n.read ? (
                          <span className="shrink-0 size-2 rounded-full bg-[#D4FF00] mt-1.5" aria-hidden />
                        ) : null}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-neutral-600 mt-2">
                        {formatNotifTime(n.createdAt)} · {typeLabelRu(n.type)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-white/10 p-2 shrink-0">
            <Link
              to="/dashboard#notifications"
              className="block text-center py-2.5 text-sm font-semibold text-[#D4FF00] hover:bg-white/5 rounded-xl transition-colors"
              onClick={() => setOpen(false)}
            >
              Личный кабинет
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

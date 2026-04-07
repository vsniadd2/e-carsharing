import { Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fetchNotifications, markNotificationRead, type NotificationDto } from '../api/fleet'

const NAV_LINKS = [
  { to: '/map', label: 'Карта' },
  { to: '/tariffs', label: 'Тарифы' },
  { to: '/rewards', label: 'Награды' },
  { to: '/support', label: 'Поддержка' },
] as const

const ACCOUNT_LINKS = [
  { to: '/dashboard', label: 'Профиль и кошелёк', icon: 'person' as const },
  { to: '/dashboard#history', label: 'История поездок', icon: 'history' as const },
  { to: '/dashboard#wallet', label: 'Пополнение', icon: 'account_balance_wallet' as const },
  { to: '/dashboard#settings', label: 'Настройки', icon: 'settings' as const },
  { to: '/rewards', label: 'Награды CARSIKI', icon: 'loyalty' as const },
] as const

function formatCarsiki(amount: number | undefined): string {
  const n = Math.round(Number(amount ?? 0))
  return n.toLocaleString('ru-RU')
}

function AccountBurgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-5 w-6 flex-col items-center justify-center" aria-hidden>
      <span
        className={`h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-out origin-center ${
          open ? 'translate-y-[7px] rotate-45' : ''
        }`}
      />
      <span
        className={`my-1.5 h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ease-out ${
          open ? 'opacity-0 scale-x-0' : 'opacity-100'
        }`}
      />
      <span
        className={`h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-out origin-center ${
          open ? '-translate-y-[7px] -rotate-45' : ''
        }`}
      />
    </span>
  )
}

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
  }, [notifications, authedPollOk, token, queryClient, scheduleRemove, onAfterRead])

  return toasts
}

export default function SiteHeader() {
  const { user, logout, token, isAccessTokenValid, refreshProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountWrapRef = useRef<HTMLDivElement>(null)
  const toasts = useDocumentNotificationsToasts(token, isAccessTokenValid, refreshProfile)

  useEffect(() => {
    if (!open && !accountMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setAccountMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, accountMenuOpen])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!accountMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [accountMenuOpen])

  const close = () => setOpen(false)
  const closeAccount = () => setAccountMenuOpen(false)

  const carsiki = user?.carsiki ?? 0

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-black/90 backdrop-blur-lg shrink-0 pt-[env(safe-area-inset-top,0px)]">
        <div className="layout-shell flex h-16 sm:h-20 items-center gap-2 sm:gap-4">
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 focus:outline-none focus-visible:ring-0"
          >
            <div className="flex items-center justify-center size-9 sm:size-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">electric_scooter</span>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white truncate">
              EcoRide
            </span>
          </Link>

          <nav
            className="hidden md:flex flex-1 justify-center items-center gap-5 lg:gap-7 min-w-0 px-2"
            aria-label="Основная навигация"
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm lg:text-base font-medium py-2.5 touch-manipulation text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto md:ml-0">
            {user ? (
              <>
                <div
                  className="flex items-center gap-1 rounded-2xl border border-amber-500/35 bg-amber-500/10 dark:bg-amber-400/15 px-2 py-1 sm:px-2.5 sm:py-1.5 text-amber-900 dark:text-amber-100"
                  title="CARSIKI — кэшбэк за поездки"
                >
                  <span
                    className="material-symbols-outlined text-[18px] sm:text-[20px] text-amber-600 dark:text-amber-300 shrink-0"
                    aria-hidden
                  >
                    savings
                  </span>
                  <span className="text-xs sm:text-sm font-semibold tabular-nums leading-none whitespace-nowrap">
                    {formatCarsiki(carsiki)}
                  </span>
                  <span className="hidden min-[400px]:inline text-[10px] font-bold uppercase tracking-wide text-amber-700/80 dark:text-amber-200/80 leading-none">
                    CK
                  </span>
                </div>
                <div className="relative hidden sm:block" ref={accountWrapRef}>
                  <button
                    type="button"
                    className="flex items-center justify-center size-11 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="true"
                    aria-label={accountMenuOpen ? 'Закрыть меню аккаунта' : 'Меню аккаунта'}
                    onClick={() => setAccountMenuOpen((v) => !v)}
                  >
                    <AccountBurgerIcon open={accountMenuOpen} />
                  </button>
                  <div
                    className={`absolute right-0 top-[calc(100%+0.5rem)] w-[min(100vw-1.5rem,17rem)] origin-top-right transition-[opacity,transform] duration-200 ease-out ${
                      accountMenuOpen
                        ? 'pointer-events-auto scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0'
                    }`}
                  >
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Аккаунт</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {user.name || user.email}
                        </p>
                      </div>
                      <nav className="py-1" aria-label="Аккаунт">
                        {ACCOUNT_LINKS.map(({ to, label, icon }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={closeAccount}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-slate-400 shrink-0">
                              {icon}
                            </span>
                            {label}
                          </Link>
                        ))}
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          onClick={() => {
                            logout()
                            closeAccount()
                            close()
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
                          Выйти
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-1 rounded-2xl overflow-hidden focus-within:ring-0">
                <Link
                  to="/register"
                  className="px-4 lg:px-6 py-3 sm:py-3.5 text-sm lg:text-base font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors rounded-l-xl focus:outline-none focus-visible:ring-0"
                >
                  Регистрация
                </Link>
                <Link
                  to="/login"
                  className="px-4 lg:px-6 py-3 sm:py-3.5 text-sm lg:text-base font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors rounded-r-xl focus:outline-none focus-visible:ring-0"
                >
                  Войти
                </Link>
              </div>
            )}

            <button
              type="button"
              className="md:hidden flex items-center justify-center size-10 rounded-2xl text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="material-symbols-outlined text-[26px]">{open ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {open && (
          <div
            id="site-mobile-nav"
            className="md:hidden fixed inset-0 z-40"
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 motion-safe:transition-opacity motion-safe:duration-200"
              aria-label="Закрыть меню"
              onClick={close}
            />
            <nav
              className="eco-nav-sheet-in absolute left-0 right-0 bottom-0 top-[calc(env(safe-area-inset-top,0px)+4rem)] sm:top-[calc(env(safe-area-inset-top,0px)+5rem)] overflow-y-auto bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 shadow-xl flex flex-col py-4 gap-1 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))]"
              aria-label="Мобильная навигация"
            >
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={close}
                  className="text-lg font-medium py-3.5 touch-manipulation text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3 flex flex-col gap-0.5">
                {user ? (
                  <>
                    {ACCOUNT_LINKS.map(({ to, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={close}
                        className="text-lg font-medium py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        logout()
                        close()
                      }}
                      className="text-left text-lg font-medium py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors"
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      onClick={close}
                      className="text-lg font-medium py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      Регистрация
                    </Link>
                    <Link
                      to="/login"
                      onClick={close}
                      className="text-lg font-medium py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      Войти
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>

        )}
      </header>

      {/* Глобальные уведомления: справа сверху, исчезают через 6 с */}
      <div
        className="fixed right-3 sm:right-4 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] sm:top-[calc(env(safe-area-inset-top,0px)+5.25rem)] z-[100] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col gap-2 pointer-events-none"
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
    </>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { SITE_ACCOUNT_LINKS } from '../lib/siteAccountLinks'
import { LV_BRAND } from '../lib/siteBrand'
import type { MapUiState } from '../lib/siteOutletContext'
import { fetchActiveRental } from '../api/fleet'
import SiteHeaderNotifications from './SiteHeaderNotifications'

const NAV_LINKS = [
  { to: '/map', label: 'Карта' },
  { to: '/tariffs', label: 'Тарифы' },
  { to: '/rewards', label: 'Награды' },
  { to: '/support', label: 'Поддержка' },
] as const

function formatCarsiki(amount: number | undefined): string {
  const n = Math.round(Number(amount ?? 0))
  return n.toLocaleString('ru-RU')
}

function mapUserInitials(name: string | undefined, email: string | undefined): string {
  const n = (name || email || '?').trim()
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

type SiteHeaderProps = {
  onOpenRail: () => void
  /** Состояние поиска/фильтров карты (из SiteLayout, только на /map) */
  mapUi?: MapUiState
}

export default function SiteHeader({ onOpenRail, mapUi }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const isMap = pathname === '/map'
  const { user, logout, token, isAccessTokenValid } = useAuth()
  const [open, setOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountWrapRef = useRef<HTMLDivElement>(null)

  const { data: activeRental } = useQuery({
    queryKey: ['rental', 'active', token],
    queryFn: () => fetchActiveRental(token!),
    enabled: Boolean(token) && isAccessTokenValid,
    staleTime: 30_000,
  })

  const walletLabel =
    activeRental != null ? activeRental.balance.toFixed(2) : (user?.balance ?? 0).toFixed(2)

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
      <header className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 md:left-[7rem] md:right-8 z-[80] pointer-events-none font-display">
        <div className="bg-neutral-900/40 backdrop-blur-2xl rounded-full px-3 sm:px-8 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-6 shadow-2xl border border-white/5 pointer-events-auto font-medium">
          <div className="flex items-center gap-2 sm:gap-8 flex-1 min-w-0">
            <button
              type="button"
              className="md:hidden shrink-0 size-9 flex items-center justify-center rounded-full text-neutral-300 hover:text-[#D4FF00] hover:bg-white/10 transition-colors"
              aria-label="Открыть меню"
              onClick={onOpenRail}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <span className="hidden min-[380px]:block text-xs sm:text-xl font-black text-[#D4FF00] uppercase tracking-widest truncate max-w-[5.5rem] sm:max-w-none shrink-0">
              {LV_BRAND}
            </span>
            {isMap && mapUi != null ? (
              <div className="flex-1 max-w-md min-w-0 relative group">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#D4FF00] transition-colors text-lg">
                  search
                </span>
                <input
                  value={mapUi.mapQuery}
                  onChange={(e) => mapUi.setMapQuery(e.target.value)}
                  className="w-full bg-white/5 border-none rounded-full py-2 pl-10 pr-11 sm:pr-24 text-xs sm:text-sm focus:ring-1 focus:ring-[#D4FF00]/30 placeholder:text-neutral-500 text-white transition-all"
                  placeholder="Search vehicle or location..."
                  autoComplete="off"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    aria-expanded={mapUi.mapFilterOpen}
                    aria-label="Доп. фильтр на карте"
                    onClick={() => mapUi.setMapFilterOpen((o) => !o)}
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                      mapUi.mapFilterOpen || mapUi.mapOnlyAvailable
                        ? 'text-[#D4FF00] bg-white/10'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                  </button>
                </div>
                {mapUi.mapFilterOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-[1100] rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-md p-3 shadow-xl">
                    <label className="flex items-center gap-2 text-xs sm:text-sm text-neutral-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mapUi.mapOnlyAvailable}
                        onChange={(e) => mapUi.setMapOnlyAvailable(e.target.checked)}
                        className="rounded border-neutral-500 accent-[#D4FF00]"
                      />
                      Только свободные (скрыть забронированные и в поездке)
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <nav
                className="hidden md:flex flex-1 justify-center items-center gap-4 lg:gap-6 min-w-0 overflow-x-auto [scrollbar-width:none]"
                aria-label="Разделы сайта"
              >
                {NAV_LINKS.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`shrink-0 text-sm font-semibold py-2 px-3 rounded-full transition-colors whitespace-nowrap ${
                      pathname === to || pathname.startsWith(`${to}/`)
                        ? 'text-[#D4FF00] bg-white/10'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            {user ? (
              <>
                <div
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-[#D4FF00]/20 text-[11px] text-[#D4FF00]"
                  title="CARSIKI"
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden>
                    savings
                  </span>
                  <span className="font-bold tabular-nums">{formatCarsiki(carsiki)}</span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 bg-white/5 rounded-full border border-white/5 min-w-0 max-w-[30vw] sm:max-w-none"
                  title="Баланс"
                >
                  <span className="material-symbols-outlined text-sm text-[#D4FF00] shrink-0">
                    account_balance_wallet
                  </span>
                  <span className="text-white font-bold text-[11px] sm:text-sm tabular-nums truncate">{walletLabel} BYN</span>
                </div>
                <SiteHeaderNotifications
                  accountMenuOpen={accountMenuOpen}
                  onOpenPanel={() => {
                    setAccountMenuOpen(false)
                    setOpen(false)
                  }}
                />
                <div className="relative" ref={accountWrapRef}>
                  <button
                    type="button"
                    className="flex items-center justify-center size-9 sm:size-10 rounded-full border border-white/15 bg-neutral-800 text-[11px] font-bold text-white hover:border-[#D4FF00]/50 transition-colors"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="true"
                    aria-label={accountMenuOpen ? 'Закрыть меню' : 'Аккаунт'}
                    onClick={() => setAccountMenuOpen((v) => !v)}
                  >
                    {mapUserInitials(user.name, user.email)}
                  </button>
                  <div
                    className={`absolute right-0 top-[calc(100%+0.5rem)] w-[min(100vw-2rem,22rem)] origin-top-right transition-[opacity,transform] duration-200 ease-out ${
                      accountMenuOpen
                        ? 'pointer-events-auto scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0'
                    }`}
                  >
                    <div className="rounded-2xl border border-white/10 bg-neutral-900/90 backdrop-blur-3xl shadow-2xl overflow-hidden p-5 sm:p-6 flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-[#D4FF00] bg-neutral-800 flex items-center justify-center text-base font-bold text-white shrink-0">
                          {mapUserInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-base leading-tight truncate">{user.name || user.email}</p>
                          <p className="text-[#d1fc00] text-[10px] font-bold tracking-widest uppercase">Premium Tier</p>
                        </div>
                      </div>
                      <nav className="flex flex-col gap-0.5" aria-label="Аккаунт">
                        {SITE_ACCOUNT_LINKS.map(({ to, label, icon }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={closeAccount}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-sm text-white"
                          >
                            <span className="material-symbols-outlined text-neutral-400 text-[20px]">{icon}</span>
                            {label}
                          </Link>
                        ))}
                        <Link
                          to="/dashboard#wallet"
                          onClick={closeAccount}
                          className="flex items-center justify-between p-3 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-sm font-bold text-[#D4FF00] mt-1"
                        >
                          <span className="flex items-center gap-3">
                            <span className="material-symbols-outlined">add_circle</span>
                            Пополнение
                          </span>
                          <span className="material-symbols-outlined">chevron_right</span>
                        </Link>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm text-orange-400/90 text-left mt-1"
                          onClick={() => {
                            logout()
                            closeAccount()
                            close()
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]">logout</span>
                          Выйти
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-full text-sm font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  Регистрация
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-full text-sm font-bold bg-[#D4FF00] text-[#0a0a0a] hover:bg-[#e5ff4d] transition-colors"
                >
                  Войти
                </Link>
              </div>
            )}

            <button
              type="button"
              className="md:hidden flex items-center justify-center size-10 rounded-full text-neutral-200 hover:bg-white/10 transition-colors"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? 'Закрыть меню' : 'Меню разделов'}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="material-symbols-outlined text-[24px]">{open ? 'close' : 'more_horiz'}</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          id="site-mobile-nav"
          className="md:hidden fixed inset-0 z-[75]"
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Закрыть"
            onClick={close}
          />
          <nav
            className="eco-nav-sheet-in absolute left-0 right-0 bottom-0 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] overflow-y-auto bg-neutral-950 border-t border-white/10 flex flex-col py-4 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]"
            aria-label="Мобильная навигация"
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={close}
                className="text-base font-semibold py-3.5 text-white/90 hover:text-[#D4FF00] border-b border-white/5"
              >
                {label}
              </Link>
            ))}
            <Link to="/" onClick={close} className="text-base font-semibold py-3.5 text-neutral-400 hover:text-white">
              Главная
            </Link>
            <Link to="/dashboard" onClick={close} className="text-base font-semibold py-3.5 text-neutral-400 hover:text-white">
              Личный кабинет
            </Link>
            {user ? (
              <Link
                to="/dashboard#notifications"
                onClick={close}
                className="text-base font-semibold py-3.5 text-neutral-400 hover:text-[#D4FF00] border-b border-white/5"
              >
                Уведомления в кабинете
              </Link>
            ) : null}
            {!user ? (
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={close}
                  className="py-3 text-center rounded-full bg-[#D4FF00] text-[#0a0a0a] font-bold"
                >
                  Войти
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      )}
    </>
  )
}

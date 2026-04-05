import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/map', label: 'Карта' },
  { to: '/tariffs', label: 'Тарифы' },
  { to: '/rewards', label: 'Награды' },
  { to: '/support', label: 'Поддержка' },
] as const

export default function SiteHeader() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-black/90 backdrop-blur-lg shrink-0 pt-[env(safe-area-inset-top,0px)]">
      <div className="layout-shell flex h-16 sm:h-20 items-center gap-3 sm:gap-4">
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 focus:outline-none focus-visible:ring-0"
        >
          <div className="flex items-center justify-center size-9 sm:size-10 rounded-xl bg-black dark:bg-white text-white dark:text-black shadow-sm shrink-0">
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
              className="text-sm lg:text-base font-medium py-2.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto md:ml-0">
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={close}
                className="hidden sm:inline-flex max-w-[160px] lg:max-w-none truncate text-base font-medium py-3 px-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-0"
              >
                {user.name || user.email}
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout()
                  close()
                }}
                className="hidden sm:inline-flex text-base font-medium py-3 px-4 rounded-xl text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-0"
              >
                Выйти
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1 rounded-xl overflow-hidden focus-within:ring-0">
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
            className="md:hidden flex items-center justify-center size-10 rounded-xl text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть меню"
            onClick={close}
          />
          <nav
            className="absolute left-0 right-0 bottom-0 top-[calc(env(safe-area-inset-top,0px)+4rem)] sm:top-[calc(env(safe-area-inset-top,0px)+5rem)] overflow-y-auto bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 shadow-xl flex flex-col py-4 gap-1 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))]"
            aria-label="Мобильная навигация"
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={close}
                className="text-lg font-medium py-3.5 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={close}
                    className="text-lg font-medium py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors truncate"
                  >
                    {user.name || user.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      close()
                    }}
                    className="text-left text-lg font-medium py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
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
  )
}

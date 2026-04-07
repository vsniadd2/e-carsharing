import { Link, useLocation } from 'react-router-dom'

const neonFill = { fontVariationSettings: "'FILL' 1" } as const

type SiteSideRailProps = {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export default function SiteSideRail({ mobileOpen, onMobileOpenChange }: SiteSideRailProps) {
  const { pathname, hash } = useLocation()
  const close = () => onMobileOpenChange(false)
  const isDash = pathname === '/dashboard'
  const h = hash.replace(/^#/, '')

  const item = (to: string, icon: string, label: string, active: boolean) => (
    <Link
      to={to}
      onClick={close}
      className={`touch-manipulation transition-all duration-200 active:scale-90 ${
        active ? 'text-[#D4FF00] scale-110' : 'text-neutral-500 hover:text-[#D4FF00] scale-95'
      }`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="material-symbols-outlined text-2xl" style={active ? neonFill : undefined}>
        {icon}
      </span>
    </Link>
  )

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[65] bg-black/60 lg:hidden"
          aria-label="Закрыть меню"
          onClick={close}
        />
      )}
      <aside
        className={`fixed z-[70] left-[max(0.5rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] bottom-[max(1rem,env(safe-area-inset-bottom))] w-20 rounded-[3rem] bg-neutral-900/80 backdrop-blur-xl shadow-[0px_24px_48px_rgba(0,0,0,0.4)] flex flex-col items-center py-6 sm:py-8 gap-6 sm:gap-8 border border-white/5 transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] lg:translate-x-0'
        }`}
      >
        <button
          type="button"
          className="lg:hidden absolute -right-2 top-6 size-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-300"
          aria-label="Закрыть меню"
          onClick={close}
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
        <div className="text-2xl font-bold text-[#D4FF00] font-display tracking-tight select-none" aria-hidden>
          L
        </div>
        <nav className="flex flex-col gap-5 sm:gap-6 items-center flex-1" aria-label="Основная навигация">
          {item('/', 'home', 'Главная', pathname === '/')}
          {item('/map', 'map', 'Карта', pathname === '/map')}
          {item('/dashboard#wallet', 'payments', 'Кошелёк', isDash && (h === 'wallet' || h === ''))}
          {item('/dashboard#history', 'route', 'Поездки', isDash && h === 'history')}
          {item('/dashboard#settings', 'settings', 'Настройки', isDash && h === 'settings')}
        </nav>
        {item('/support', 'contact_support', 'Поддержка', pathname === '/support')}
      </aside>
    </>
  )
}

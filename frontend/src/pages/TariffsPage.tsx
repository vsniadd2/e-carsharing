import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPublicVehicles } from '../api/fleet'
import { useAuth } from '../context/AuthContext'
import { tariffItemsFromApiVehicles, type TariffItem } from '../lib/tariffsFromApi'
import { LV_BRAND } from '../lib/siteBrand'

type TabType = 'cars' | 'bikes' | 'scooters'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'cars', label: 'Автомобили', icon: 'directions_car' },
  { key: 'bikes', label: 'Велосипеды', icon: 'pedal_bike' },
  { key: 'scooters', label: 'Самокаты', icon: 'electric_scooter' },
]

export default function TariffsPage() {
  const [tab, setTab] = useState<TabType>('cars')
  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchPublicVehicles,
    staleTime: 60_000,
  })
  const dataByTab = useMemo(() => tariffItemsFromApiVehicles(vehicles), [vehicles])
  const items = dataByTab[tab]
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleBook = (item: TariffItem) => {
    if (!user) {
      navigate('/login', { state: { from: '/tariffs' } })
      return
    }
    navigate(`/map?vehicle=${encodeURIComponent(item.fleetVehicleId)}`)
  }

  return (
    <div className="flex w-full min-w-0 flex-col font-display overflow-x-clip text-white">
      <main className="flex-grow layout-shell py-8 sm:py-12 w-full min-w-0">
        <div className="mb-12">
          <h1 className="font-display text-3xl min-[400px]:text-4xl md:text-6xl font-bold mb-4 tracking-tight text-white">
            Наши <span className="text-neutral-400">тарифы</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl leading-relaxed">
            Актуальные цены совпадают с парком на карте (данные из сервера после seed в БД).
          </p>
        </div>

        {isError && (
          <p className="text-sm text-red-400 mb-6" role="alert">
            Не удалось загрузить тарифы. Проверьте API и обновите страницу.
          </p>
        )}

        <div className="mb-8 sm:mb-12 w-full overflow-x-auto overscroll-x-contain pb-1">
          <div className="inline-flex sm:flex p-1 bg-white/5 rounded-[1.25rem] border border-white/10 gap-1 min-w-min">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`shrink-0 px-4 sm:px-8 py-2.5 sm:py-3 rounded-[1rem] text-sm sm:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  tab === key
                    ? 'bg-[#D4FF00] text-[#0a0a0a] shadow-[0_0_20px_rgba(212,255,0,0.25)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {isLoading && (
            <p className="text-neutral-400 col-span-full">Загрузка тарифов…</p>
          )}
          {!isLoading && items.length === 0 && !isError && (
            <p className="text-neutral-400 col-span-full">Нет транспорта в этой категории.</p>
          )}
          {items.map((item) => (
            <div
              key={item.key}
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md flex flex-col transition-all hover:border-[#D4FF00]/35 hover:bg-white/[0.07]"
            >
              <div className="relative h-56 w-full overflow-hidden bg-neutral-900">
                {item.badge && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-black/50 text-[#D4FF00] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-[#D4FF00]/30">
                      {item.badge}
                    </span>
                  </div>
                )}
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${item.img})` }}
                  role="img"
                  aria-label={item.name}
                />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                    {item.charge && (
                      <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <span className="material-symbols-outlined text-sm">battery_charging_full</span>
                        <span>{item.charge} зарядки</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-2xl font-bold text-white">{item.priceStart} BYN</span>
                      <span className="text-neutral-400 text-sm">посадка</span>
                    </div>
                    <div className="text-neutral-300 text-base font-semibold">
                      + {item.pricePerMinute} BYN <span className="text-neutral-500 text-sm font-normal">/ мин</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBook(item)}
                    className="w-full py-4 rounded-full bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.2)]"
                  >
                    Забронировать
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-10 sm:py-12 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="layout-shell">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
            <div>
              <h4 className="text-white font-bold mb-4">Компания</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link to="/about" className="hover:text-[#D4FF00] transition-colors">О нас</Link></li>
                <li><Link to="/careers" className="hover:text-[#D4FF00] transition-colors">Карьера</Link></li>
                <li><Link to="/press" className="hover:text-[#D4FF00] transition-colors">Пресса</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link to="/scooters" className="hover:text-[#D4FF00] transition-colors">Самокаты</Link></li>
                <li><Link to="/bikes" className="hover:text-[#D4FF00] transition-colors">Велосипеды</Link></li>
                <li><Link to="/safety" className="hover:text-[#D4FF00] transition-colors">Безопасность</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link to="/help" className="hover:text-[#D4FF00] transition-colors">Помощь</Link></li>
                <li><Link to="/contact" className="hover:text-[#D4FF00] transition-colors">Связаться</Link></li>
                <li><Link to="/report" className="hover:text-[#D4FF00] transition-colors">Сообщить о проблеме</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Правовая информация</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link to="/privacy" className="hover:text-[#D4FF00] transition-colors">Конфиденциальность</Link></li>
                <li><Link to="/terms" className="hover:text-[#D4FF00] transition-colors">Условия</Link></li>
                <li><Link to="/cookies" className="hover:text-[#D4FF00] transition-colors">Cookie</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="material-symbols-outlined text-[#D4FF00]">electric_scooter</span>
              <span className="text-neutral-400 text-sm">© 2026 {LV_BRAND}</span>
            </div>
            <div className="flex gap-6">
              <a className="text-neutral-400 hover:text-[#D4FF00] transition-colors" href="#" aria-label="Twitter">
                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a className="text-neutral-400 hover:text-[#D4FF00] transition-colors" href="#" aria-label="Instagram">
                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.067-.047 1.407-.06 3.808-.06z" clipRule="evenodd" /><path d="M12.315 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM6.993 12a5.007 5.007 0 1110.014 0 5.007 5.007 0 01-10.014 0z" /><path d="M19.23 6.07a1.3 1.3 0 11-2.6 0 1.3 1.3 0 012.6 0z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

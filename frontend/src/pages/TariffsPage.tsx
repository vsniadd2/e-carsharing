import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type TabType = 'cars' | 'bikes' | 'scooters'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'cars', label: 'Автомобили', icon: 'directions_car' },
  { key: 'bikes', label: 'Велосипеды', icon: 'pedal_bike' },
  { key: 'scooters', label: 'Самокаты', icon: 'electric_scooter' },
]

type Item = { name: string; price: string; img: string; badge?: string; charge?: string }

const CARS: Item[] = [
  { name: 'MINI Cooper Electric', price: '0.61', img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&h=250&fit=crop', badge: 'Daily', charge: '92%' },
  { name: 'Ford Mustang Mach-E GT', price: '1.10', img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=250&fit=crop', badge: 'Premium', charge: '88%' },
  { name: 'Tesla Model Y', price: '0.99', img: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&h=250&fit=crop', badge: 'SUV', charge: '95%' },
  { name: 'Tesla Model 3', price: '0.61', img: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=250&fit=crop', badge: 'Daily', charge: '90%' },
  { name: 'Tesla Model S Performance Ludicrous', price: '2.20', img: 'https://images.unsplash.com/photo-1551830820-330a71b99659?w=400&h=250&fit=crop', badge: 'Premium', charge: '98%' },
  { name: 'Tesla Model X Performance', price: '1.85', img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&h=250&fit=crop', badge: 'SUV Premium', charge: '85%' },
  { name: 'Porsche Taycan', price: '1.75', img: 'https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=400&h=250&fit=crop', badge: 'Luxury', charge: '87%' },
  { name: 'BMW i4', price: '1.25', img: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=250&fit=crop', badge: 'Premium', charge: '91%' },
  { name: 'Audi e-tron GT', price: '1.65', img: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400&h=250&fit=crop', badge: 'Luxury', charge: '100%' },
  { name: 'Polestar 2', price: '1.15', img: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400&h=250&fit=crop', badge: 'Premium', charge: '82%' },
]

const BIKES: Item[] = [
  { name: 'Электровелосипед', price: '0.85', img: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=250&fit=crop', badge: 'Город', charge: '95%' },
]

const SCOOTERS: Item[] = [
  { name: 'Электросамокат', price: '0.75', img: 'https://images.unsplash.com/photo-1594925782034-5e4762d25953?w=400&h=250&fit=crop', badge: 'Микромобильность', charge: '90%' },
]

const DATA: Record<TabType, Item[]> = {
  cars: CARS,
  bikes: BIKES,
  scooters: SCOOTERS,
}

export default function TariffsPage() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<TabType>('cars')
  const items = DATA[tab]

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-display flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-black/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-0">
              <div className="flex items-center justify-center size-10 rounded-xl bg-black dark:bg-white text-white dark:text-black shadow-sm">
                <span className="material-symbols-outlined text-[24px]">electric_scooter</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-black dark:text-white">EcoRide</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/map" className="text-base font-medium py-2.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Карта</Link>
              <Link to="/tariffs" className="text-base font-medium py-2.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Тарифы</Link>
              <Link to="/rewards" className="text-base font-medium py-2.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Награды</Link>
              <Link to="/support" className="text-base font-medium py-2.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Поддержка</Link>
            </nav>
            <div className="flex items-center gap-4 shrink-0">
              {user ? (
                <>
                  <Link to="/dashboard" className="hidden sm:inline-flex text-base font-medium py-3 px-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-0">
                    {user.name || user.email}
                  </Link>
                  <button type="button" onClick={() => logout()} className="hidden sm:inline-flex text-base font-medium py-3 px-4 rounded-xl text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-0">
                    Выйти
                  </button>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-1 rounded-xl overflow-hidden focus-within:ring-0">
                  <Link to="/register" className="px-6 py-3.5 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors rounded-l-xl focus:outline-none focus-visible:ring-0">
                    Регистрация
                  </Link>
                  <Link to="/login" className="px-6 py-3.5 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors rounded-r-xl focus:outline-none focus-visible:ring-0">
                    Войти
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-black dark:text-white">
            Наши <span className="text-slate-500 dark:text-slate-400">Тарифы</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
            Премиальный электрокаршеринг для ваших поездок. Выбирайте транспорт, который подходит вашему стилю жизни.
          </p>
        </div>

        <div className="mb-12">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  tab === key
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div
              key={item.name}
              className="group bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                {item.badge && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-black/10 dark:bg-white/10 text-black dark:text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
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
                    <h3 className="text-xl font-bold text-black dark:text-white mb-1">{item.name}</h3>
                    {item.charge && (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="material-symbols-outlined text-sm">battery_charging_full</span>
                        <span>{item.charge} зарядки</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-bold text-black dark:text-white">{item.price} BYN</span>
                    <span className="text-slate-500 text-sm">/ 1 мин</span>
                  </div>
                  <button
                    type="button"
                    className="w-full py-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-black dark:text-white font-bold transition-all flex items-center justify-center gap-2"
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

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-black dark:text-white font-bold mb-4">Компания</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/about" className="hover:text-black dark:hover:text-white transition-colors">О нас</Link></li>
                <li><Link to="/careers" className="hover:text-black dark:hover:text-white transition-colors">Карьера</Link></li>
                <li><Link to="/press" className="hover:text-black dark:hover:text-white transition-colors">Пресса</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-black dark:text-white font-bold mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/scooters" className="hover:text-black dark:hover:text-white transition-colors">Самокаты</Link></li>
                <li><Link to="/bikes" className="hover:text-black dark:hover:text-white transition-colors">Велосипеды</Link></li>
                <li><Link to="/safety" className="hover:text-black dark:hover:text-white transition-colors">Безопасность</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-black dark:text-white font-bold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/help" className="hover:text-black dark:hover:text-white transition-colors">Помощь</Link></li>
                <li><Link to="/contact" className="hover:text-black dark:hover:text-white transition-colors">Связаться</Link></li>
                <li><Link to="/report" className="hover:text-black dark:hover:text-white transition-colors">Сообщить о проблеме</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-black dark:text-white font-bold mb-4">Правовая информация</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/privacy" className="hover:text-black dark:hover:text-white transition-colors">Конфиденциальность</Link></li>
                <li><Link to="/terms" className="hover:text-black dark:hover:text-white transition-colors">Условия</Link></li>
                <li><Link to="/cookies" className="hover:text-black dark:hover:text-white transition-colors">Cookie</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="material-symbols-outlined text-slate-500">electric_scooter</span>
              <span className="text-slate-500 text-sm">© 2026 EcoRide Inc.</span>
            </div>
            <div className="flex gap-6">
              <a className="text-slate-500 hover:text-black dark:hover:text-white transition-colors" href="#" aria-label="Twitter">
                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a className="text-slate-500 hover:text-black dark:hover:text-white transition-colors" href="#" aria-label="Instagram">
                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.067-.047 1.407-.06 3.808-.06z" clipRule="evenodd" /><path d="M12.315 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM6.993 12a5.007 5.007 0 1110.014 0 5.007 5.007 0 01-10.014 0z" /><path d="M19.23 6.07a1.3 1.3 0 11-2.6 0 1.3 1.3 0 012.6 0z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

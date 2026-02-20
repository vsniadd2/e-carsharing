import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const RIDES = [
  { vehicle: 'E-Scooter S2', icon: 'electric_scooter', date: '24 окт 2023 • 14:30', from: 'Central St.', to: 'Tech Park', duration: '12 мин', cost: '14.40 BYN', status: 'Completed', statusClass: 'bg-neutral-200 text-black border-neutral-300' },
  { vehicle: 'E-Bike X4', icon: 'pedal_bike', date: '22 окт 2023 • 09:15', from: 'Metro Station', to: 'Library', duration: '28 мин', cost: '26.24 BYN', status: 'Completed', statusClass: 'bg-neutral-200 text-black border-neutral-300' },
  { vehicle: 'E-Scooter S2', icon: 'electric_scooter', date: '20 окт 2023 • 18:45', from: 'Gym', to: 'Home', duration: '8 мин', cost: '9.92 BYN', status: 'Refunded', statusClass: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
]

export default function DashboardPage() {
  const [searchRides, setSearchRides] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="bg-black text-slate-100 font-body antialiased min-h-screen flex overflow-hidden">
      <aside className="w-64 bg-black border-r border-[#262626] flex-col hidden lg:flex shrink-0 h-screen sticky top-0">
        <div className="flex flex-col h-full p-4 justify-between">
          <div className="flex flex-col gap-8">
            <Link to="/" className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-bold text-xl">EV</div>
              <div>
                <h1 className="text-white font-display font-bold text-lg leading-tight">EV Rentals</h1>
                <p className="text-neutral-500 text-xs">Экопоездки</p>
              </div>
            </Link>
            <nav className="flex flex-col gap-2">
              <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white text-black group transition-colors">
                <span className="material-symbols-outlined">dashboard</span>
                <span className="font-display font-medium text-sm">Дашборд</span>
              </Link>
              <Link to="/map" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
                <span className="material-symbols-outlined group-hover:text-white transition-colors">map</span>
                <span className="font-display font-medium text-sm">Карта</span>
              </Link>
              <a href="#wallet" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
                <span className="material-symbols-outlined group-hover:text-white transition-colors">wallet</span>
                <span className="font-display font-medium text-sm">Кошелёк</span>
              </a>
              <a href="#history" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
                <span className="material-symbols-outlined group-hover:text-white transition-colors">history</span>
                <span className="font-display font-medium text-sm">История поездок</span>
              </a>
              <Link to="/rewards" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
                <span className="material-symbols-outlined group-hover:text-white transition-colors">redeem</span>
                <span className="font-display font-medium text-sm">Награды</span>
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
              <span className="material-symbols-outlined group-hover:text-white transition-colors">settings</span>
              <span className="font-display font-medium text-sm">Настройки</span>
            </a>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#262626] px-2">
              <div
                className="w-8 h-8 rounded-full bg-neutral-700 bg-cover bg-center grayscale shrink-0 flex items-center justify-center text-white text-sm font-bold"
                aria-hidden
              >
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-white text-sm font-medium leading-none truncate">{user?.name || user?.email}</p>
                <p className="text-neutral-500 text-xs mt-1">Бесплатный план</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left text-neutral-400 hover:text-white text-xs mt-1 transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto w-full relative bg-neutral-950">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-6">
          <div className="flex lg:hidden items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold">EV</div>
              <span className="text-white font-display font-bold">EV Rentals</span>
            </Link>
            <button type="button" className="text-white p-2">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Дашборд</h2>
              <p className="text-neutral-400 mt-1 font-body">Обзор эковлияния и наград.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="flex items-center gap-2 px-4 py-2 bg-[#171717] border border-[#262626] hover:border-neutral-500 text-neutral-300 rounded-lg transition-colors font-display text-sm font-medium">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                Окт 2023
              </button>
              <Link to="/map" className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors font-display text-sm font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Новая поездка
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-[#171717] border border-[#262626] rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-display font-bold uppercase tracking-wider text-xs">Эко-пробег</span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl md:text-5xl font-display font-bold text-white">1,250</h3>
                    <span className="text-neutral-400 font-display font-medium text-lg">баллов</span>
                  </div>
                  <p className="text-neutral-400 text-sm mt-1">Вы в топ-5% эко-коммутеров в этом месяце!</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 rounded-full bg-neutral-800 text-white border border-neutral-700 text-xs font-bold uppercase tracking-wider">Зелёный комьютер</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="flex justify-between text-sm font-medium mb-2 font-display">
                  <span className="text-neutral-300">Прогресс до Gold</span>
                  <span className="text-white">75%</span>
                </div>
                <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full relative w-3/4">
                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white]" />
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-neutral-500">
                  <span>0 баллов</span>
                  <span>250 до цели</span>
                  <span>2000 баллов</span>
                </div>
              </div>
            </div>

            <div className="col-span-1 bg-[#171717] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-400 font-display font-medium text-sm">Общее влияние</span>
                <span className="material-symbols-outlined text-white">eco</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-display font-bold text-white">24.5</h3>
                  <span className="text-neutral-400 font-display font-medium">кг</span>
                </div>
                <p className="text-white text-lg font-display font-semibold mt-1">CO₂ сэкономлено</p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#262626]">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <span className="material-symbols-outlined text-white text-[18px]">trending_up</span>
                  <span><span className="text-white font-medium">+12%</span> к прошлому месяцу</span>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-[#171717] border border-white/20 rounded-2xl p-0 overflow-hidden flex flex-col">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white rounded-lg text-black">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <h4 className="text-white font-display font-bold text-lg">Уведомление о парковке</h4>
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Обнаружена парковка в запрещённой зоне. Используйте разрешённые места, чтобы избежать блокировки на 24 ч.
                </p>
              </div>
              <div className="mt-auto bg-neutral-900 p-4 border-t border-neutral-800 flex justify-between items-center">
                <span className="text-xs text-white font-medium uppercase tracking-wide">Требуется действие</span>
                <a href="#rules" className="text-sm text-white hover:text-neutral-300 font-medium flex items-center gap-1 transition-colors">
                  Правила <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 bg-[#171717] border border-[#262626] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-white">Доступные награды</h3>
                <Link to="/rewards" className="text-white text-sm font-medium hover:text-neutral-300 transition-colors underline decoration-neutral-600 underline-offset-4">Все</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black border border-[#262626] rounded-xl p-4 flex gap-4 items-center group cursor-pointer hover:border-white/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">electric_scooter</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-display font-bold text-base">Бесплатная разблокировка</h4>
                    <p className="text-neutral-500 text-xs">На любую поездку на самокате</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-white bg-neutral-800 px-3 py-1.5 rounded hover:bg-white hover:text-black transition-colors">ПОЛУЧИТЬ</button>
                </div>
                <div className="bg-black border border-[#262626] rounded-xl p-4 flex gap-4 items-center group cursor-pointer hover:border-white/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">percent</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-display font-bold text-base">Скидка 20%</h4>
                    <p className="text-neutral-500 text-xs">На следующие 3 поездки на этой неделе</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-white bg-neutral-800 px-3 py-1.5 rounded hover:bg-white hover:text-black transition-colors">ПОЛУЧИТЬ</button>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-[#171717] border border-[#262626] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-display font-bold text-white">Недавние поездки</h3>
                <input
                  type="text"
                  value={searchRides}
                  onChange={(e) => setSearchRides(e.target.value)}
                  className="bg-black border border-[#262626] text-neutral-300 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-white focus:border-white outline-none w-full sm:w-64 placeholder-neutral-600"
                  placeholder="Поиск поездок..."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-neutral-500 border-b border-[#262626] text-xs uppercase font-display tracking-wider">
                      <th className="px-4 py-3 font-medium">Транспорт</th>
                      <th className="px-4 py-3 font-medium">Дата</th>
                      <th className="px-4 py-3 font-medium">Маршрут</th>
                      <th className="px-4 py-3 font-medium">Длительность</th>
                      <th className="px-4 py-3 font-medium text-right">Стоимость</th>
                      <th className="px-4 py-3 font-medium text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] text-sm">
                    {RIDES.map((ride, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300">
                              <span className="material-symbols-outlined text-[18px]">{ride.icon}</span>
                            </div>
                            <span className="text-white font-medium">{ride.vehicle}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-neutral-400">{ride.date}</td>
                        <td className="px-4 py-4 text-neutral-300">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-neutral-600" />
                            <span className="text-xs text-neutral-500">{ride.from}</span>
                            <span className="material-symbols-outlined text-[12px] text-neutral-600">arrow_right_alt</span>
                            <span className="w-2 h-2 rounded-full bg-white" />
                            <span className="text-xs text-white">{ride.to}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-neutral-400">{ride.duration}</td>
                        <td className="px-4 py-4 text-right text-white font-medium">{ride.cost}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${ride.statusClass}`}>{ride.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-center">
                <button type="button" className="text-sm text-neutral-400 hover:text-white font-medium transition-colors flex items-center gap-1">
                  Вся история <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
              </div>
            </div>
          </div>

          <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden relative border border-[#262626] mt-2 bg-[#171717]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay grayscale"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAtdPah5rLKhQzPURPNfNgjeaCw34DXuD_-ufSsfGFNaYVMMRkVhLLljv99myprCUcmMukn1yCj9q3ZAJYpYbn4SfhQO6X7oC2yX3RhfEIzHqWFAiRENYX7-RO7zhXjVRAl3sqwUejS834JEuwF8YhHgUQw61cVzg_ajnL3BHwYJwtC4S6dLv7w6xpvVupqjv3frr6dAAjg4WqcGk01JBk6WzcD1VV-g4y57WjPPAjacUhEKAFQF3iKPCA85JTjlzywCxF3ItusOU')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-[#171717]/80 backdrop-blur-md p-6 rounded-xl border border-[#262626] max-w-md w-full shadow-2xl">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-full text-white">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">Найти транспорт рядом</h3>
                  <p className="text-neutral-400 text-sm mb-4">В 5 минутах ходьбы: 12 самокатов и 5 велосипедов.</p>
                  <Link to="/map" className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-lg font-display font-medium transition-colors shadow-lg shadow-white/10 text-center block">
                    Открыть карту
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 pb-8 border-t border-[#262626] pt-6 flex flex-col md:flex-row justify-between items-center text-neutral-500 text-xs gap-4 max-w-[1400px] mx-auto px-4 md:px-8">
          <p>© 2024 EV Rentals Inc. Все права защищены.</p>
          <div className="flex gap-6">
            <a className="hover:text-neutral-300 transition-colors" href="#">Конфиденциальность</a>
            <a className="hover:text-neutral-300 transition-colors" href="#">Условия</a>
            <a className="hover:text-neutral-300 transition-colors" href="#">Помощь</a>
          </div>
        </footer>
      </main>
    </div>
  )
}

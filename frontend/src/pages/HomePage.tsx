import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRef, useState, useEffect } from 'react'
import heroImage from '@img/cattouchret.png'

function useInView(opts?: { once?: boolean; rootMargin?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const once = opts?.once ?? true
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsInView(true)
        if (once) observer.disconnect()
      },
      { threshold: 0.15, rootMargin: opts?.rootMargin ?? '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [once, opts?.rootMargin])
  return { ref, isInView }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function AnimatedStat({
  target,
  suffix,
  label,
  trigger,
}: {
  target: number
  suffix: string
  label: string
  trigger: boolean
}) {
  const [display, setDisplay] = useState(0)
  const runRef = useRef(false)
  useEffect(() => {
    if (!trigger || runRef.current) return
    runRef.current = true
    const duration = 1800
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuad(progress)
      setDisplay(target * eased)
      if (progress < 1) requestAnimationFrame(tick)
      else setDisplay(target)
    }
    requestAnimationFrame(tick)
  }, [trigger, target])
  const show = suffix === 'M+' ? display.toFixed(1) : suffix === 'k' ? String(Math.round(display)) : Math.round(display).toString()
  return (
    <div>
      <div className="text-3xl font-bold text-black dark:text-white mb-1">
        {show}{suffix}
      </div>
      <div className="text-sm text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const statsInView = useInView({ once: true })
  const heroRef = useRef<HTMLElement>(null)
  const rewardsRef = useRef<HTMLElement>(null)
  const routesRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const entries: { ref: React.RefObject<HTMLElement | null>; key: string }[] = [
      { ref: heroRef, key: 'hero' },
      { ref: rewardsRef, key: 'rewards' },
      { ref: routesRef, key: 'routes' },
      { ref: ctaRef, key: 'cta' },
      { ref: footerRef, key: 'footer' },
    ]
    entries.forEach(({ ref: r, key }) => {
      const el = r.current
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setRevealed((prev) => ({ ...prev, [key]: true }))
        },
        { threshold: 0.08, rootMargin: '0px 0px -50px 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <div className="bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden">
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

      <main className="flex-grow">
        <section ref={heroRef} className={`scroll-reveal ${revealed.hero ? 'is-visible' : ''} relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-white dark:bg-black`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 max-w-2xl">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-black dark:text-white">
                  Город. <br />
                  <span className="text-slate-500">На электротяге.</span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-500 max-w-lg leading-relaxed">
                  Арендуйте электросамокаты и велосипеды мгновенно. Ноль выбросов, полная свобода. Присоединяйтесь к экологичной мобильности.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/map"
                    className="h-14 px-8 rounded-lg bg-black text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 text-base font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    Начать поездку
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                  <Link
                    to="/map"
                    className="h-14 px-8 rounded-lg border border-slate-300 dark:border-slate-800 hover:border-black dark:hover:border-white text-base font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Смотреть карту
                  </Link>
                </div>
                <div className="pt-8 flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-black dark:text-white text-[20px]">check_circle</span>
                    <span>Углеродно-нейтрально</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-black dark:text-white text-[20px]">check_circle</span>
                    <span>Поддержка 24/7</span>
                  </div>
                </div>
              </div>
              <div className="relative lg:h-[600px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/50 to-transparent dark:from-slate-800/50 rounded-full blur-[100px] opacity-40" />
                <div className="relative w-full aspect-square max-w-md lg:max-w-full">
                  <img
                    alt="Электромобиль в природном ландшафте"
                    className="w-full h-full object-cover rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
                    src={heroImage}
                  />
                  <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xl max-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                        <span className="material-symbols-outlined text-sm">battery_charging_full</span>
                      </div>
                      <span className="text-sm font-bold">Запас хода</span>
                    </div>
                    <div className="text-2xl font-bold">212 км</div>
                    <div className="text-xs text-slate-500">На полном заряде</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={statsInView.ref} className={`scroll-reveal ${statsInView.isInView ? 'is-visible' : ''} border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <AnimatedStat trigger={statsInView.isInView} target={2.5} suffix="M+" label="Поездок" />
              </div>
              <div>
                <AnimatedStat trigger={statsInView.isInView} target={500} suffix="k" label="Пользователей" />
              </div>
              <div>
                <AnimatedStat trigger={statsInView.isInView} target={12} suffix="" label="Городов" />
              </div>
              <div>
                <AnimatedStat trigger={statsInView.isInView} target={0} suffix="%" label="Выбросов" />
              </div>
            </div>
          </div>
        </section>

        <section id="rewards" ref={rewardsRef} className={`scroll-reveal ${revealed.rewards ? 'is-visible' : ''} py-24 relative overflow-hidden bg-white dark:bg-black`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-black dark:text-white">Ездите экологично — получайте баллы</h2>
                <p className="text-lg text-slate-500">Каждый километр приносит пользу планете и награды: скидки на поездки или пожертвования на озеленение.</p>
              </div>
              <Link to="/dashboard" className="text-black dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-2 font-medium">
                Все награды
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: 'currency_bitcoin', title: 'Зарабатывайте кредиты', text: 'Кредиты на кошелёк за каждые 10 км на экопарке.' },
                { icon: 'forest', title: 'Посадка деревьев', text: 'Можно отдавать баллы: мы сажаем дерево за каждые 50 км.' },
                { icon: 'diamond', title: 'Бонусы', text: 'Доступ к особым ТС, бронирование и приоритетная поддержка.' },
              ].map((card) => (
                <div key={card.icon} className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white rounded-xl p-8 transition-all">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-black dark:text-white mb-6 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-black dark:text-white">{card.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={routesRef} className={`scroll-reveal ${revealed.routes ? 'is-visible' : ''} py-24 bg-slate-50 dark:bg-slate-900/30`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-12 text-black dark:text-white">Маршруты по Минску</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Проспект Независимости', time: '25 мин', km: '5 км', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Minsk_Landscape.jpg/800px-Minsk_Landscape.jpg' },
                { title: 'Парк Победы и Комсомольское озеро', time: '40 мин', km: '7.5 км', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Belarus-Minsk-City_Hall-2.jpg/800px-Belarus-Minsk-City_Hall-2.jpg' },
                { title: 'Национальная библиотека — Лошица', time: '55 мин', km: '11 км', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Belarus_Minsk_city_gates_at_night.jpg/800px-Belarus_Minsk_city_gates_at_night.jpg' },
              ].map((route) => (
                <div key={route.title} className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer">
                  <img alt={route.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={route.img} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{route.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span>{route.time}</span>
                          <span className="text-slate-500">•</span>
                          <span>{route.km}</span>
                        </div>
                      </div>
                      <Link to="/map" className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <span className="material-symbols-outlined">arrow_outward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={ctaRef} className={`scroll-reveal ${revealed.cta ? 'is-visible' : ''} py-24 bg-white dark:bg-black`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-300/20 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-slate-300/20 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none" />
              <h2 className="text-3xl sm:text-5xl font-bold mb-6 text-black dark:text-white">Готовы поехать?</h2>
              <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">Найдите транспорт рядом и начните исследовать город по-новому.</p>
              <div className="flex justify-center">
                <Link to="/map" className="h-12 px-8 rounded-lg bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black font-bold transition-colors flex items-center justify-center gap-2">
                  Let&apos;s go
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="support" ref={footerRef} className={`scroll-reveal ${revealed.footer ? 'is-visible' : ''} border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-black py-12`}>
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

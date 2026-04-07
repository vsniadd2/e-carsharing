import { Link } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import heroImage from '@img/cattouchret.png'
import { LV_BRAND } from '../lib/siteBrand'

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
      <div className="text-3xl font-bold text-white mb-1 tabular-nums">
        {show}{suffix}
      </div>
      <div className="text-sm text-neutral-400 uppercase tracking-wider">{label}</div>
    </div>
  )
}

export default function HomePage() {
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
    <div className="flex w-full min-w-0 flex-col overflow-x-clip text-white">
      <main className="flex-grow">
        <section ref={heroRef} className={`scroll-reveal ${revealed.hero ? 'is-visible' : ''} relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-20 lg:pb-28 xl:pt-24 xl:pb-32 overflow-hidden`}>
          <div className="layout-shell relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-10 xl:gap-14 2xl:gap-16 items-center">
              <div className="space-y-6 sm:space-y-8 min-w-0 max-w-2xl lg:max-w-none">
                <h1 className="font-display font-bold tracking-tight leading-[1.08] text-[clamp(2rem,4.2vw+0.75rem,3.75rem)] lg:text-[clamp(2.75rem,3.2vw+1.25rem,4.25rem)] xl:text-[clamp(3rem,2.8vw+1.5rem,4.5rem)]">
                  Город. <br />
                  <span className="text-neutral-400">На электротяге.</span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-neutral-400 max-w-xl lg:max-w-lg leading-relaxed">
                  Арендуйте электросамокаты и велосипеды мгновенно. Ноль выбросов, полная свобода. Присоединяйтесь к экологичной мобильности.
                </p>
                <div className="flex flex-col min-[480px]:flex-row gap-3 sm:gap-4">
                  <Link
                    to="/map"
                    className="h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#D4FF00] text-[#0a0a0a] hover:bg-[#e5ff4d] text-sm sm:text-base font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,255,0,0.25)]"
                  >
                    Начать поездку
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                  <Link
                    to="/map"
                    className="h-12 sm:h-14 px-6 sm:px-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-sm sm:text-base font-semibold transition-colors flex items-center justify-center gap-2 text-white"
                  >
                    Смотреть карту
                  </Link>
                </div>
                <div className="pt-6 sm:pt-8 flex flex-col min-[400px]:flex-row min-[400px]:items-center gap-3 min-[400px]:gap-6 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D4FF00] text-[20px]">check_circle</span>
                    <span>Углеродно-нейтрально</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D4FF00] text-[20px]">check_circle</span>
                    <span>Поддержка 24/7</span>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center min-w-0 lg:justify-end">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4FF00]/15 to-transparent rounded-full blur-[100px] opacity-50 pointer-events-none lg:left-[-10%] lg:right-[-10%]" />
                <div className="relative w-full max-w-[min(100%,420px)] sm:max-w-[min(100%,460px)] lg:max-w-[min(100%,min(52vw,520px))] xl:max-w-[500px] 2xl:max-w-[540px] mx-auto lg:mx-0">
                  <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] lg:aspect-[5/6] xl:aspect-[4/5] max-h-[min(68vh,560px)] lg:max-h-[min(62vh,600px)] xl:max-h-[min(58vh,620px)]">
                  <img
                    alt="Электромобиль в природном ландшафте"
                    className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-2xl border border-white/10"
                    src={heroImage}
                  />
                  <div className="absolute -bottom-3 left-2 sm:-bottom-4 sm:left-3 lg:-bottom-5 lg:left-0 bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-2xl shadow-xl max-w-[min(200px,85vw)] z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-white/10 text-[#D4FF00]">
                        <span className="material-symbols-outlined text-sm">battery_charging_full</span>
                      </div>
                      <span className="text-sm font-bold text-white">Запас хода</span>
                    </div>
                    <div className="text-2xl font-bold text-white">212 км</div>
                    <div className="text-xs text-neutral-400">На полном заряде</div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={statsInView.ref} className={`scroll-reveal ${statsInView.isInView ? 'is-visible' : ''} border-y border-white/10 bg-white/[0.03]`}>
          <div className="layout-shell py-8 sm:py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
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

        <section id="rewards" ref={rewardsRef} className={`scroll-reveal ${revealed.rewards ? 'is-visible' : ''} py-16 sm:py-24 relative overflow-hidden`}>
          <div className="layout-shell">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">Ездите экологично — получайте баллы</h2>
                <p className="text-lg text-neutral-400">Каждый километр приносит пользу планете и награды: скидки на поездки или пожертвования на озеленение.</p>
              </div>
              <Link to="/dashboard" className="text-[#D4FF00] hover:text-white transition-colors flex items-center gap-2 font-semibold">
                Все награды
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { icon: 'currency_bitcoin', title: 'Зарабатывайте кредиты', text: 'Кредиты на кошелёк за каждые 10 км на экопарке.' },
                { icon: 'forest', title: 'Посадка деревьев', text: 'Можно отдавать баллы: мы сажаем дерево за каждые 50 км.' },
                { icon: 'diamond', title: 'Бонусы', text: 'Доступ к особым ТС, бронирование и приоритетная поддержка.' },
              ].map((card) => (
                <div key={card.icon} className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 transition-all hover:border-[#D4FF00]/35 hover:bg-white/[0.07]">
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-[#D4FF00] mb-6 group-hover:shadow-[0_0_20px_rgba(212,255,0,0.2)] transition-shadow">
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                  <p className="text-neutral-400 leading-relaxed">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={routesRef} className={`scroll-reveal ${revealed.routes ? 'is-visible' : ''} py-16 sm:py-24 bg-white/[0.02]`}>
          <div className="layout-shell">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-12 text-white">Маршруты по Минску</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  title: 'Проспект Независимости',
                  time: '25 мин',
                  km: '5 км',
                  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Minsk_Prospekt_Nezalezhnosti_05.jpg/1280px-Minsk_Prospekt_Nezalezhnosti_05.jpg',
                },
                {
                  title: 'Парк Победы и Комсомольское озеро',
                  time: '40 мин',
                  km: '7.5 км',
                  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Panorama_of_Lake_in_Victory_Park_-_Outside_Museum_of_the_Great_Patriotic_War_-_Minsk_-_Belarus_%2826916546474%29.jpg/1920px-Panorama_of_Lake_in_Victory_Park_-_Outside_Museum_of_the_Great_Patriotic_War_-_Minsk_-_Belarus_%2826916546474%29.jpg',
                },
                {
                  title: 'Национальная библиотека — Лошица',
                  time: '55 мин',
                  km: '11 км',
                  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/5_50_64_2f_-_Belarus_National_Library%2C_Minsk_2009_%283901618837%29.jpg/1280px-5_50_64_2f_-_Belarus_National_Library%2C_Minsk_2009_%283901618837%29.jpg',
                },
              ].map((route) => (
                <Link
                  key={route.title}
                  to="/map"
                  aria-label={`${route.title}: открыть карту`}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer block border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e]"
                >
                  <img
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={route.img}
                  />
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
                      <span
                        className="w-10 h-10 rounded-full bg-[#D4FF00] text-[#0a0a0a] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 pointer-events-none shadow-[0_0_16px_rgba(212,255,0,0.4)]"
                        aria-hidden
                      >
                        <span className="material-symbols-outlined">arrow_outward</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section ref={ctaRef} className={`scroll-reveal ${revealed.cta ? 'is-visible' : ''} py-16 sm:py-24`}>
          <div className="layout-shell text-center">
            <div className="border border-white/10 sm:rounded-[2rem] bg-neutral-900/50 backdrop-blur-xl p-6 sm:p-10 lg:p-12 relative overflow-hidden max-w-4xl mx-auto">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#D4FF00]/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#6bfe9c]/10 blur-[100px] rounded-full pointer-events-none" />
              <h2 className="font-display text-2xl min-[400px]:text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 text-white">Готовы поехать?</h2>
              <p className="text-neutral-400 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto px-1">Найдите транспорт рядом и начните исследовать город по-новому.</p>
              <div className="flex justify-center">
                <Link to="/map" className="h-12 px-8 rounded-full bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,255,0,0.25)]">
                  Let&apos;s go
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="support" ref={footerRef} className={`scroll-reveal ${revealed.footer ? 'is-visible' : ''} border-t border-white/10 py-10 sm:py-12 pb-[max(2.5rem,env(safe-area-inset-bottom))]`}>
        <div className="layout-shell">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
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

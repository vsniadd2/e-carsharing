import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RewardsPage() {
  const { user, isReady } = useAuth()
  const carsiki = user?.carsiki ?? 0
  const bynEq = (carsiki / 100).toFixed(2)

  return (
    <div className="bg-white dark:bg-black flex w-full min-w-0 flex-col overflow-x-clip">
      <main className="layout-shell py-12 sm:py-16 lg:py-24 w-full min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 sm:mb-14 lg:mb-16 gap-4 sm:gap-6">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] font-bold tracking-tight mb-3 sm:mb-4 text-black dark:text-white">
              Награды — <span className="text-emerald-500 dark:text-emerald-400">CARSIKI</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500">
              После каждой поездки начисляется кэшбек около <strong className="text-black dark:text-white">8%</strong> от её стоимости в
              баллах <strong className="text-black dark:text-white">CARSIKI</strong>.{' '}
              <strong>100 CARSIKI = 1 BYN</strong> (1 CARSIK = 0,01 BYN). На карте при завершении поездки можно включить оплату части
              суммы баллами — они конвертируются в возврат на кошелёк в BYN.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 self-start lg:self-auto">
            <Link
              to="/map"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">map</span>
              На карту
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-black dark:text-white font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Дашборд
            </Link>
          </div>
        </div>

        {isReady && user && (
          <div className="mb-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 sm:p-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ваш баланс</p>
            <p className="text-3xl sm:text-4xl font-bold text-black dark:text-white tabular-nums">
              {carsiki} <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">CARSIKI</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">Эквивалент: ~{bynEq} BYN</p>
          </div>
        )}

        {isReady && !user && (
          <div className="mb-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-6 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">Войдите, чтобы видеть баланс CARSIKI и копить баллы за поездки.</p>
            <Link
              to="/login"
              state={{ from: '/rewards' }}
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm"
            >
              Войти
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              icon: 'savings',
              title: 'Кэшбек CARSIKI',
              text: 'После завершения поездки на счёт начисляется ~8% от её стоимости в баллах CARSIKI. Уведомление приходит на сайте.',
            },
            {
              icon: 'payments',
              title: 'Оплата поездки баллами',
              text: 'При завершении включите переключатель: часть итога можно покрыть CARSIKI (списание баллов + возврат BYN на кошелёк).',
            },
            {
              icon: 'calendar_month',
              title: 'Курс',
              text: '100 CARSIKI = 1 BYN. Баллы не сгорают в демо и копятся на вашем профиле.',
            },
          ].map((card) => (
            <div
              key={card.icon}
              className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white rounded-2xl p-6 sm:p-8 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-black dark:text-white mb-6 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-black dark:text-white">{card.title}</h2>
              <p className="text-slate-500 leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

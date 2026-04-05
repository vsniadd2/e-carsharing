import { Link } from 'react-router-dom'

export default function RewardsPage() {
  return (
    <div className="bg-white dark:bg-black flex w-full min-w-0 flex-col overflow-x-clip">
      <main className="layout-shell py-12 sm:py-16 lg:py-24 w-full min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 sm:mb-14 lg:mb-16 gap-4 sm:gap-6">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] font-bold tracking-tight mb-3 sm:mb-4 text-black dark:text-white">
              Ездите экологично — получайте баллы
            </h1>
            <p className="text-base sm:text-lg text-slate-500">
              Каждый километр приносит пользу планете и награды: скидки на поездки или пожертвования на озеленение.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-black dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-2 font-medium shrink-0 self-start lg:self-auto text-sm sm:text-base"
          >
            Все награды
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: 'currency_bitcoin', title: 'Зарабатывайте кредиты', text: 'Кредиты на кошелёк за каждые 10 км на экопарке.' },
            { icon: 'forest', title: 'Посадка деревьев', text: 'Можно отдавать баллы: мы сажаем дерево за каждые 50 км.' },
            { icon: 'diamond', title: 'Бонусы', text: 'Доступ к особым ТС, бронирование и приоритетная поддержка.' },
          ].map((card) => (
            <div
              key={card.icon}
              className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white rounded-xl p-6 sm:p-8 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-black dark:text-white mb-6 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
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

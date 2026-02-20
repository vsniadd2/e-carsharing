import { Link } from 'react-router-dom'

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
              На главную
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-black dark:text-white">
              Ездите экологично — получайте баллы
            </h1>
            <p className="text-lg text-slate-500">
              Каждый километр приносит пользу планете и награды: скидки на поездки или пожертвования на озеленение.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-black dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-2 font-medium"
          >
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
            <div
              key={card.icon}
              className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white rounded-xl p-8 transition-all"
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

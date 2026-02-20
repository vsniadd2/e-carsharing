import { Link } from 'react-router-dom'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
              На главную
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-6 text-black dark:text-white">Поддержка</h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
          Мы на связи и готовы помочь с арендой, оплатой и любыми вопросами. Поддержка работает ежедневно.
        </p>

        <div className="space-y-4">
          <Link
            to="/help"
            className="block p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white transition-colors"
          >
            <span className="font-medium text-black dark:text-white">Помощь</span>
            <p className="text-sm text-slate-500 mt-1">Ответы на частые вопросы и инструкции</p>
          </Link>
          <Link
            to="/contact"
            className="block p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white transition-colors"
          >
            <span className="font-medium text-black dark:text-white">Связаться</span>
            <p className="text-sm text-slate-500 mt-1">Email, телефон и форма обратной связи</p>
          </Link>
          <Link
            to="/report"
            className="block p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white transition-colors"
          >
            <span className="font-medium text-black dark:text-white">Сообщить о проблеме</span>
            <p className="text-sm text-slate-500 mt-1">Неисправный транспорт или нарушение правил</p>
          </Link>
        </div>
      </main>
    </div>
  )
}

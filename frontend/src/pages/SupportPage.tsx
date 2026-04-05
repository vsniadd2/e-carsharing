import { Link } from 'react-router-dom'

export default function SupportPage() {
  return (
    <div className="bg-white dark:bg-black flex w-full min-w-0 flex-col overflow-x-clip">
      <main className="layout-shell py-8 sm:py-12 w-full min-w-0">
        <h1 className="text-[clamp(1.75rem,3vw+0.5rem,2.25rem)] font-bold tracking-tight mb-4 sm:mb-6 text-black dark:text-white">
          Поддержка
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6 sm:mb-8 max-w-2xl">
          Мы на связи и готовы помочь с арендой, оплатой и любыми вопросами. Поддержка работает ежедневно.
        </p>

        <div className="space-y-3 sm:space-y-4 max-w-2xl">
          <Link
            to="/help"
            className="block p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-black dark:hover:border-white transition-colors active:scale-[0.99]"
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

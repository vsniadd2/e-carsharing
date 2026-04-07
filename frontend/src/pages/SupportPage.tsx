import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createSupportTicket } from '../api/support'

export default function SupportPage() {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError(null)
    setOk(null)
    setSending(true)
    try {
      const r = await createSupportTicket(token, subject.trim(), message.trim())
      setOk(`Обращение №${r.id.slice(0, 8)}… отправлено. Мы ответим на ваш email.`)
      setSubject('')
      setMessage('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-clip text-white">
      <main className="layout-shell py-8 sm:py-12 w-full min-w-0">
        <h1 className="font-display text-[clamp(1.75rem,3vw+0.5rem,2.25rem)] font-bold tracking-tight mb-4 sm:mb-6 text-white">
          Поддержка
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-4 max-w-2xl">
          Это служба поддержки сервиса каршеринга и микромобильности: помогаем с поездками, бронированием, оплатой и
          техническими сбоями. Опишите проблему в обращении — заявка попадает оператору в админ-панель в реальном времени.
        </p>

        {ok && (
          <p className="mb-6 text-sm text-[#6bfe9c] max-w-2xl" role="status">
            {ok}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setError(null)
            setOk(null)
          }}
          className="mb-8 sm:mb-10 inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#D4FF00] text-[#0a0a0a] font-bold text-sm sm:text-base hover:bg-[#e5ff4d] transition-colors shadow-[0_0_20px_rgba(212,255,0,0.2)]"
        >
          Создать тикет
        </button>

        <div className="space-y-3 sm:space-y-4 max-w-2xl">
          <Link
            to="/help"
            className="block p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#D4FF00]/40 transition-colors active:scale-[0.99]"
          >
            <span className="font-semibold text-white">Помощь</span>
            <p className="text-sm text-neutral-400 mt-1">Ответы на частые вопросы и инструкции</p>
          </Link>
          <Link
            to="/contact"
            className="block p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#D4FF00]/40 transition-colors"
          >
            <span className="font-semibold text-white">Связаться</span>
            <p className="text-sm text-neutral-400 mt-1">Email, телефон и форма обратной связи</p>
          </Link>
          <Link
            to="/report"
            className="block p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#D4FF00]/40 transition-colors"
          >
            <span className="font-semibold text-white">Сообщить о проблеме</span>
            <p className="text-sm text-neutral-400 mt-1">Неисправный транспорт или нарушение правил</p>
          </Link>
        </div>
      </main>

      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70"
          role="presentation"
          onClick={() => !sending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-title"
            className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-neutral-900/95 backdrop-blur-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ticket-title" className="text-lg font-bold text-white mb-1">
              Новое обращение
            </h2>
            <p className="text-sm text-neutral-400 mb-4">Тема и описание уйдут в админ-панель для обработки.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label htmlFor="ticket-subject" className="block text-xs font-medium text-neutral-400 mb-1">
                  Тема (от 3 символов)
                </label>
                <input
                  id="ticket-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-[#D4FF00]/40 focus:border-[#D4FF00]/30 outline-none"
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="ticket-msg" className="block text-xs font-medium text-neutral-400 mb-1">
                  Сообщение (от 10 символов)
                </label>
                <textarea
                  id="ticket-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-neutral-600 resize-y focus:ring-1 focus:ring-[#D4FF00]/40 focus:border-[#D4FF00]/30 outline-none"
                  required
                  minLength={10}
                  maxLength={4000}
                />
              </div>
              {error && (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-full border border-white/20 text-sm font-medium text-neutral-300 hover:bg-white/5"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded-full bg-[#D4FF00] text-[#0a0a0a] text-sm font-bold disabled:opacity-50 hover:bg-[#e5ff4d]"
                >
                  {sending ? 'Отправка…' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

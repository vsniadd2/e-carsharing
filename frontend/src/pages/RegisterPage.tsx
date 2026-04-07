import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EcoAuthShell from '../components/EcoAuthShell'

const inputClass =
  'w-full bg-eco-auth-container-highest border-none rounded-md py-4 min-h-[3.25rem] pl-12 pr-4 text-eco-auth-on-surface placeholder:text-eco-auth-on-surface-variant/30 focus:ring-1 focus:ring-eco-auth-primary/20 transition-all outline-none text-sm'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!termsAccepted) {
      setError('Нужно принять условия использования и политику конфиденциальности')
      return
    }
    if (!email.trim()) {
      setError('Укажите email')
      return
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    try {
      await register(email.trim(), password, fullName.trim() || undefined)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EcoAuthShell>
      <section className="relative z-10 w-full layout-shell layout-shell--form layout-shell--form-register">
        <div className="eco-auth-glass rounded-xl p-5 sm:p-8 shadow-[0px_24px_48px_rgba(0,0,0,0.4)] border border-eco-auth-outline-variant/10">
          <div className="mb-10">
            <h2 className="font-display text-3xl font-bold tracking-tight text-eco-auth-primary mb-2">Создать аккаунт</h2>
            <p className="text-eco-auth-secondary text-sm font-light">Начните свой путь с интеллектуальной мобильностью.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="reg-fullname" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                Full Name
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                  person
                </span>
                <input
                  id="reg-fullname"
                  className={inputClass}
                  placeholder="Константин Александров"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                Email
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                  mail
                </span>
                <input
                  id="reg-email"
                  className={inputClass}
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                    lock
                  </span>
                  <input
                    id="reg-password"
                    className={inputClass}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                  Повторите пароль
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                    verified_user
                  </span>
                  <input
                    id="reg-confirm"
                    className={inputClass}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <input
                id="reg-terms"
                className="mt-0.5 h-6 w-6 min-h-[1.5rem] min-w-[1.5rem] shrink-0 rounded-md bg-eco-auth-container-highest border border-eco-auth-secondary/25 text-eco-auth-primary focus:ring-2 focus:ring-eco-auth-primary/35 focus:ring-offset-2 focus:ring-offset-eco-auth-surface cursor-pointer accent-eco-auth-primary"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="reg-terms" className="text-[11px] leading-relaxed text-eco-auth-secondary/70 cursor-pointer">
                Я соглашаюсь с{' '}
                <Link to="/terms" className="text-eco-auth-primary hover:underline">
                  Условиями использования
                </Link>{' '}
                и{' '}
                <Link to="/privacy" className="text-eco-auth-primary hover:underline">
                  Политикой конфиденциальности
                </Link>
                .
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-950/80 border border-red-800/50 text-red-200 text-sm">{error}</div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="eco-auth-active-scale w-full bg-eco-auth-primary text-eco-auth-on-primary font-display font-bold py-4 rounded-md tracking-tight hover:opacity-90 transition-all flex justify-center items-center gap-2 group disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? 'Регистрация…' : 'Зарегистрироваться'}
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform" aria-hidden>
                  arrow_forward
                </span>
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-eco-auth-secondary">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-eco-auth-primary font-bold ml-1 hover:underline underline-offset-4 decoration-eco-auth-primary/30"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </EcoAuthShell>
  )
}

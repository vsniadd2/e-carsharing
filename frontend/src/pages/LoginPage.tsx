import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EcoAuthShell from '../components/EcoAuthShell'

const inputClass =
  'w-full bg-eco-auth-container-highest border-none rounded-md py-3.5 pl-12 pr-4 text-eco-auth-on-surface placeholder:text-eco-auth-on-surface-variant/30 focus:ring-1 focus:ring-eco-auth-primary/20 transition-all outline-none text-sm'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EcoAuthShell>
      <section className="relative z-10 w-full layout-shell layout-shell--form">
        <div className="eco-auth-glass rounded-xl p-5 sm:p-8 shadow-[0px_24px_48px_rgba(0,0,0,0.4)] border border-eco-auth-outline-variant/10">
          <div className="mb-10">
            <h2 className="font-display text-3xl font-bold tracking-tight text-eco-auth-primary mb-2">Вход</h2>
            <p className="text-eco-auth-secondary text-sm font-light">Войдите в аккаунт EcoRide.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                Email
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                  mail
                </span>
                <input
                  id="login-email"
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

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[10px] font-eco-auth-body uppercase tracking-widest text-eco-auth-secondary px-1 block">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-eco-auth-secondary/50 text-lg pointer-events-none" aria-hidden>
                  lock
                </span>
                <input
                  id="login-password"
                  className={inputClass}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
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
                {loading ? 'Вход…' : 'Войти'}
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform" aria-hidden>
                  arrow_forward
                </span>
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-eco-auth-secondary">
              Нет аккаунта?{' '}
              <Link
                to="/register"
                className="text-eco-auth-primary font-bold ml-1 hover:underline underline-offset-4 decoration-eco-auth-primary/30"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </section>
    </EcoAuthShell>
  )
}

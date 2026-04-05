import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isJwtExpired } from '../api/auth'
import {
  adminLogin,
  adminLogoutRemote,
  clearAdminSession,
  loadAdminTokens,
  persistAdminSession,
  refreshAdminSession,
  ADMIN_ACCESS_KEY,
} from '../api/adminAuth'
import { fetchAdminStats } from '../api/fleet'

export default function AdminPage() {
  const titleId = useId()
  const [sessionReady, setSessionReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const { access, refresh } = loadAdminTokens()
      if (!refresh) {
        if (!cancelled) setSessionReady(true)
        return
      }
      if (access && !isJwtExpired(access)) {
        if (!cancelled) {
          setAuthed(true)
          setSessionReady(true)
        }
        return
      }
      try {
        const auth = await refreshAdminSession(refresh)
        if (cancelled) return
        persistAdminSession(auth)
        setAuthed(true)
      } catch {
        clearAdminSession()
      } finally {
        if (!cancelled) setSessionReady(true)
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (authed) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [authed])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const auth = await adminLogin(login.trim(), password)
      persistAdminSession(auth)
      setAuthed(true)
      setLogin('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setSubmitting(false)
    }
  }

  const logout = () => {
    const { refresh: r } = loadAdminTokens()
    if (r) void adminLogoutRemote(r).catch(() => {})
    clearAdminSession()
    setAuthed(false)
    setPassword('')
    setError('')
  }

  const adminAccess = authed ? sessionStorage.getItem(ADMIN_ACCESS_KEY) : null
  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['admin', 'stats', adminAccess],
    queryFn: () => fetchAdminStats(adminAccess!),
    enabled: Boolean(authed && adminAccess),
    staleTime: 30_000,
  })

  if (!sessionReady) {
    return (
      <div className="min-h-dvh min-w-0 w-full bg-white dark:bg-black font-display flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
        Загрузка…
      </div>
    )
  }

  return (
    <div className="min-h-dvh min-w-0 w-full bg-white dark:bg-black font-display text-slate-900 dark:text-slate-100">
      {!authed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black shadow-xl p-6 sm:p-8"
          >
            <h1 id={titleId} className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-1">
              Вход в админ-панель
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Введите учётные данные администратора
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="admin-login" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Логин
                </label>
                <input
                  id="admin-login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-base text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
                  placeholder="login"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Пароль
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-base text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
                  placeholder="password"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-black dark:bg-white text-white dark:text-black py-3.5 text-base font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white dark:focus-visible:ring-offset-black disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? 'Вход…' : 'Войти'}
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
              <Link
                to="/"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              >
                На главную
              </Link>
            </div>
          </div>
        </div>
      )}

      {authed && (
        <div className="layout-shell py-8 sm:py-10 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white tracking-tight">
                Админ-панель
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                Управление EcoRide (демо). Сессия: JWT access + refresh.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                На сайт
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>

          {statsError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
              Не удалось загрузить статистику
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Пользователи', value: stats?.usersCount, icon: 'group' },
              { label: 'Активные поездки', value: stats?.activeRentalsCount, icon: 'route' },
              { label: 'Транспорт в сети', value: stats?.fleetOnlineCount, icon: 'electric_scooter' },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-5 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[28px]">{icon}</span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
                  {value === undefined ? '…' : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

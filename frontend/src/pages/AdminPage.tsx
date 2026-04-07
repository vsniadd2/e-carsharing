import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as signalR from '@microsoft/signalr'
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
import { adminTicketsHubUrl } from '../lib/apiOrigin'
import { createSignalRLoggerIgnoringNegotiationAbort, isSignalRNegotiationAbortError } from '../lib/signalRStrictMode'
import {
  createAdminVehicle,
  fetchAdminStats,
  fetchAdminTickets,
  type AdminCreateVehicleBody,
  type AdminTicketItem,
  type SupportTicketCreatedPayload,
} from '../api/fleet'

export default function AdminPage() {
  const queryClient = useQueryClient()
  const titleId = useId()
  const [sessionReady, setSessionReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ticketHub, setTicketHub] = useState<'off' | 'connecting' | 'connected' | 'error'>('off')

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

  const { data: ticketsFetched, isError: ticketsError } = useQuery({
    queryKey: ['admin', 'tickets', adminAccess],
    queryFn: () => fetchAdminTickets(adminAccess!, 100),
    enabled: Boolean(authed && adminAccess),
    staleTime: 60_000,
  })

  const [tickets, setTickets] = useState<AdminTicketItem[]>([])

  const [fvId, setFvId] = useState('')
  const [fvType, setFvType] = useState<AdminCreateVehicleBody['type']>('car')
  const [fvName, setFvName] = useState('')
  const [fvLat, setFvLat] = useState('53.9045')
  const [fvLng, setFvLng] = useState('27.5615')
  const [fvBattery, setFvBattery] = useState('90')
  const [fvPriceStart, setFvPriceStart] = useState('15')
  const [fvPriceMin, setFvPriceMin] = useState('2')
  const [fvSeats, setFvSeats] = useState('5')
  const [fvRange, setFvRange] = useState('300')
  const [fvClass, setFvClass] = useState<'economy' | 'comfort' | 'premium'>('comfort')
  const [fvDesc, setFvDesc] = useState('')
  const [fvPhoto, setFvPhoto] = useState('')
  const [fvLowBattery, setFvLowBattery] = useState(false)
  const [fvError, setFvError] = useState('')
  const [fvOk, setFvOk] = useState('')

  const createVehicleMut = useMutation({
    mutationFn: (body: AdminCreateVehicleBody) => createAdminVehicle(adminAccess!, body),
    onSuccess: () => {
      setFvOk('Транспорт добавлен.')
      setFvError('')
      setFvId('')
      setFvName('')
      setFvLowBattery(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (e: Error) => {
      setFvOk('')
      setFvError(e.message)
    },
  })

  useEffect(() => {
    if (ticketsFetched) setTickets(ticketsFetched)
  }, [ticketsFetched])

  useEffect(() => {
    if (!authed || !adminAccess) {
      setTicketHub('off')
      return
    }
    setTicketHub('connecting')
    let cancelled = false
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(adminTicketsHubUrl(), {
        accessTokenFactory: () => sessionStorage.getItem(ADMIN_ACCESS_KEY) ?? '',
        transport: signalR.HttpTransportType.WebSockets,
      })
      .configureLogging(createSignalRLoggerIgnoringNegotiationAbort())
      .withAutomaticReconnect()
      .build()

    const onCreated = (payload: SupportTicketCreatedPayload) => {
      const row: AdminTicketItem = {
        id: payload.id,
        userEmail: payload.userEmail,
        userName: payload.userName,
        subject: payload.subject,
        messagePreview: payload.messagePreview,
        status: 'open',
        createdAt: payload.createdAt,
      }
      setTickets((prev) => (prev.some((t) => t.id === row.id) ? prev : [row, ...prev]))
    }

    conn.on('TicketCreated', onCreated)

    conn
      .start()
      .then(() => {
        if (!cancelled) setTicketHub('connected')
      })
      .catch((err: unknown) => {
        if (cancelled || isSignalRNegotiationAbortError(err)) return
        setTicketHub('error')
      })

    conn.onreconnecting(() => setTicketHub('connecting'))
    conn.onreconnected(() => setTicketHub('connected'))
    conn.onclose(() => setTicketHub('off'))

    return () => {
      cancelled = true
      conn.off('TicketCreated', onCreated)
      void conn.stop()
    }
  }, [authed, adminAccess])

  const submitNewVehicle = (e: FormEvent) => {
    e.preventDefault()
    setFvOk('')
    setFvError('')
    if (!adminAccess) return

    const id = fvId.trim()
    if (!id || id.length > 32) {
      setFvError('Укажите Id ТС (до 32 символов).')
      return
    }
    const name = fvName.trim()
    if (!name) {
      setFvError('Укажите название.')
      return
    }
    const lat = Number.parseFloat(fvLat.replace(',', '.'))
    const lng = Number.parseFloat(fvLng.replace(',', '.'))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setFvError('Укажите корректные координаты.')
      return
    }
    const priceStart = Number.parseFloat(fvPriceStart.replace(',', '.'))
    const pricePerMinute = Number.parseFloat(fvPriceMin.replace(',', '.'))
    if (!Number.isFinite(priceStart) || !Number.isFinite(pricePerMinute)) {
      setFvError('Укажите корректные цены.')
      return
    }

    const charging = fvType === 'charging'
    let batteryPercent: number | undefined
    if (!charging) {
      const b = Number.parseFloat(fvBattery.replace(',', '.'))
      if (!Number.isFinite(b)) {
        setFvError('Укажите заряд батареи (0–100).')
        return
      }
      batteryPercent = Math.min(100, Math.max(0, b))
    }

    let seats: number | null = null
    let rangeKm: number | null = null
    if (!charging) {
      const s = Number.parseInt(fvSeats, 10)
      const r = Number.parseInt(fvRange, 10)
      seats = Number.isFinite(s) ? s : null
      rangeKm = Number.isFinite(r) ? r : null
    }

    const body: AdminCreateVehicleBody = {
      id,
      type: fvType,
      name,
      lat,
      lng,
      priceStart,
      pricePerMinute,
      lowBatteryFlag: !charging && fvLowBattery,
      description: fvDesc.trim() ? fvDesc.trim() : null,
      photoUrl: fvPhoto.trim() ? fvPhoto.trim() : null,
      vehicleClass: fvType === 'car' ? fvClass : null,
    }
    if (!charging) {
      body.batteryPercent = batteryPercent
      body.seats = seats
      body.rangeKm = rangeKm
    }

    createVehicleMut.mutate(body)
  }

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
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black shadow-xl p-6 sm:p-8"
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
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-base text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
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
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-base text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
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
                className="mt-2 w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black py-3.5 text-base font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white dark:focus-visible:ring-offset-black disabled:opacity-50 disabled:pointer-events-none"
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
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                На сайт
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-5 sm:p-6"
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

          <section className="mt-12 pt-10 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-black dark:text-white mb-2">Добавить транспорт</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-2xl">
              Новая точка появится на карте и в тарифах после сохранения. Id — уникальный код (как в seed), до 32 символов.
            </p>
            <form
              onSubmit={submitNewVehicle}
              className="grid gap-4 max-w-3xl sm:grid-cols-2"
            >
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fv-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Id ТС
                  </label>
                  <input
                    id="fv-id"
                    value={fvId}
                    onChange={(x) => setFvId(x.target.value)}
                    maxLength={32}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                    placeholder="demo-car-99"
                  />
                </div>
                <div>
                  <label htmlFor="fv-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Тип
                  </label>
                  <select
                    id="fv-type"
                    value={fvType}
                    onChange={(x) => setFvType(x.target.value as AdminCreateVehicleBody['type'])}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                  >
                    <option value="car">Авто</option>
                    <option value="bike">Велосипед</option>
                    <option value="scooter">Самокат</option>
                    <option value="charging">Зарядка</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="fv-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Название
                </label>
                <input
                  id="fv-name"
                  value={fvName}
                  onChange={(x) => setFvName(x.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                  placeholder="Tesla Model 3"
                />
              </div>
              {fvType === 'car' ? (
                <div className="sm:col-span-2 sm:max-w-xs">
                  <label htmlFor="fv-class" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Класс авто
                  </label>
                  <select
                    id="fv-class"
                    value={fvClass}
                    onChange={(x) => setFvClass(x.target.value as typeof fvClass)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                  >
                    <option value="economy">Эконом</option>
                    <option value="comfort">Комфорт</option>
                    <option value="premium">Премиум</option>
                  </select>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div>
                  <label htmlFor="fv-lat" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Широта
                  </label>
                  <input
                    id="fv-lat"
                    value={fvLat}
                    onChange={(x) => setFvLat(x.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="fv-lng" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Долгота
                  </label>
                  <input
                    id="fv-lng"
                    value={fvLng}
                    onChange={(x) => setFvLng(x.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                  />
                </div>
              </div>
              {fvType !== 'charging' ? (
                <>
                  <div>
                    <label htmlFor="fv-battery" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Заряд, %
                    </label>
                    <input
                      id="fv-battery"
                      value={fvBattery}
                      onChange={(x) => setFvBattery(x.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fvLowBattery}
                        onChange={(x) => setFvLowBattery(x.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Низкий заряд (флаг)
                    </label>
                  </div>
                  <div>
                    <label htmlFor="fv-seats" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Места
                    </label>
                    <input
                      id="fv-seats"
                      value={fvSeats}
                      onChange={(x) => setFvSeats(x.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="fv-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Запас хода, км
                    </label>
                    <input
                      id="fv-range"
                      value={fvRange}
                      onChange={(x) => setFvRange(x.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                    />
                  </div>
                </>
              ) : null}
              <div>
                <label htmlFor="fv-price-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Старт, руб.
                </label>
                <input
                  id="fv-price-start"
                  value={fvPriceStart}
                  onChange={(x) => setFvPriceStart(x.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="fv-price-min" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  За минуту, руб.
                </label>
                <input
                  id="fv-price-min"
                  value={fvPriceMin}
                  onChange={(x) => setFvPriceMin(x.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="fv-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Описание (необязательно)
                </label>
                <input
                  id="fv-desc"
                  value={fvDesc}
                  onChange={(x) => setFvDesc(x.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="fv-photo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URL фото (необязательно)
                </label>
                <input
                  id="fv-photo"
                  value={fvPhoto}
                  onChange={(x) => setFvPhoto(x.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-black dark:text-white"
                />
              </div>
              {fvError ? (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {fvError}
                </p>
              ) : null}
              {fvOk ? (
                <p className="sm:col-span-2 text-sm text-emerald-600 dark:text-emerald-400" role="status">
                  {fvOk}
                </p>
              ) : null}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={createVehicleMut.isPending}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl text-sm font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50"
                >
                  {createVehicleMut.isPending ? 'Сохранение…' : 'Добавить в парк'}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-12 pt-10 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold text-black dark:text-white">Обращения в поддержку</h2>
              <p className="text-xs text-slate-500">
                WebSocket (SignalR):{' '}
                {ticketHub === 'connected'
                  ? 'подключено'
                  : ticketHub === 'connecting'
                    ? 'подключение…'
                    : ticketHub === 'error'
                      ? 'ошибка'
                      : 'нет'}
              </p>
            </div>
            {ticketsError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
                Не удалось загрузить список тикетов
              </p>
            )}
            {tickets.length === 0 ? (
              <p className="text-sm text-slate-500">Пока нет обращений. Новые появятся здесь и приходят в реальном времени.</p>
            ) : (
              <ul className="space-y-3 max-w-4xl">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-black dark:text-white">{t.subject}</span>
                      <span className="text-xs text-slate-500 font-mono">{t.id.slice(0, 8)}…</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-2">
                      {t.userName} · {t.userEmail} · {t.status} ·{' '}
                      {new Date(t.createdAt).toLocaleString('ru-RU')}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">{t.messagePreview}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

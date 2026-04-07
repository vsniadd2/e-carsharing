import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo, useCallback, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import {
  depositWallet,
  fetchRentalHistory,
  fetchWalletLedger,
  fetchPublicVehicles,
  fetchNotifications,
  markNotificationRead,
} from '../api/fleet'
import { detectPaymentSystemFromCardNumber } from '../lib/cardBin'
import { CardBrandMark } from '../components/CardBrandMark'

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Демо-проверка номера карты (алгоритм Луна). */
function luhnOk(cardDigits: string): boolean {
  if (cardDigits.length !== 16) return false
  let sum = 0
  let alt = false
  for (let i = cardDigits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(cardDigits[i]!, 10)
    if (Number.isNaN(n)) return false
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function formatCardGroups(digits: string): string {
  const d = digitsOnly(digits).slice(0, 16)
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

const LEDGER_TYPE_RU: Record<string, string> = {
  Deposit: 'Пополнение',
  TripCharge: 'Поездка',
  TripStartFee: 'Старт поездки',
  Adjustment: 'Корректировка',
  TripPaidByCarsiki: 'Оплата CARSIKI',
}

type DepositUiPhase = 'form' | 'processing' | 'approved'

export default function DashboardPage() {
  const [searchRides, setSearchRides] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('25')
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [modalAmount, setModalAmount] = useState('25')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [depositUiPhase, setDepositUiPhase] = useState<DepositUiPhase>('form')
  const walletRef = useRef<HTMLDivElement>(null)
  const { user, logout, token, isAccessTokenValid, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const periodLabel = useMemo(
    () =>
      new Date().toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    []
  )

  useEffect(() => {
    if (!isAccessTokenValid) return
    void refreshProfile()
  }, [isAccessTokenValid, refreshProfile])

  /** Якоря #wallet / #history / #settings после перехода с карты и т.п. */
  useEffect(() => {
    const id = location.hash.replace(/^#/, '')
    if (!id) return
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [location.pathname, location.hash])

  useEffect(() => {
    const st = location.state as { walletHighlight?: boolean } | null
    if (!st?.walletHighlight) return
    const id = requestAnimationFrame(() => {
      walletRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      navigate(location.pathname, { replace: true, state: {} })
    })
    return () => cancelAnimationFrame(id)
  }, [location.pathname, location.state, navigate])

  const authedQueryEnabled = Boolean(token) && isAccessTokenValid

  const { data: history = [] } = useQuery({
    queryKey: ['rental', 'history', token],
    queryFn: () => fetchRentalHistory(token!),
    enabled: authedQueryEnabled,
    staleTime: 60_000,
  })

  const { data: ledger = [] } = useQuery({
    queryKey: ['wallet', 'ledger', token],
    queryFn: () => fetchWalletLedger(token!, 15),
    enabled: authedQueryEnabled,
    staleTime: 30_000,
  })

  const {
    data: notifications = [],
    isError: notificationsError,
  } = useQuery({
    queryKey: ['notifications', token],
    queryFn: () => fetchNotifications(token!),
    enabled: authedQueryEnabled,
    staleTime: 30_000,
  })

  const latestCarsikiNotice = useMemo(
    () => notifications.find((n) => n.type === 'carsiki_earned' && !n.read),
    [notifications],
  )

  const markCarsikiNoticeReadMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications', token] }),
  })

  const { data: fleetVehicles = [], isError: fleetError } = useQuery({
    queryKey: ['vehicles', 'public'],
    queryFn: fetchPublicVehicles,
    staleTime: 60_000,
  })

  const historyStats = useMemo(() => {
    let totalKm = 0
    let totalMin = 0
    let totalByn = 0
    for (const h of history) {
      totalKm += Number(h.distanceKm)
      totalMin += Number(h.billableMinutes)
      totalByn += Number(h.total)
    }
    return {
      trips: history.length,
      totalKm,
      totalMin,
      totalByn,
    }
  }, [history])

  const depositMut = useMutation({
    mutationFn: (payload: { amount: number; cardLast4: string }) =>
      depositWallet(token!, payload.amount, payload.cardLast4),
    onSuccess: async () => {
      setDepositModalOpen(false)
      setDepositUiPhase('form')
      setModalError(null)
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
      setCardHolder('')
      await refreshProfile()
      await queryClient.invalidateQueries({ queryKey: ['rental'] })
      await queryClient.invalidateQueries({ queryKey: ['wallet', 'ledger'] })
    },
    onError: (e: Error) => {
      setDepositUiPhase('form')
      setModalError(e.message || 'Не удалось пополнить')
    },
  })

  const openDepositModal = useCallback((amountStr: string) => {
    setModalAmount(amountStr)
    setModalError(null)
    setDepositUiPhase('form')
    setCardNumber('')
    setCardExpiry('')
    setCardCvv('')
    setCardHolder('')
    setDepositModalOpen(true)
  }, [])

  const depositFlowBusy = depositUiPhase !== 'form' || depositMut.isPending

  useEffect(() => {
    if (!depositModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !depositFlowBusy) setDepositModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [depositModalOpen, depositFlowBusy])

  const handleCardExpiryChange = (raw: string) => {
    const d = digitsOnly(raw).slice(0, 4)
    if (d.length <= 2) setCardExpiry(d)
    else setCardExpiry(`${d.slice(0, 2)}/${d.slice(2)}`)
  }

  const handleDepositFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setModalError(null)
    if (!token) {
      setModalError('Войдите в аккаунт')
      return
    }
    const amount = Number.parseFloat(modalAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 1) {
      setModalError('Сумма от 1 BYN')
      return
    }
    const rawCard = digitsOnly(cardNumber)
    if (rawCard.length !== 16) {
      setModalError('Введите 16 цифр номера карты')
      return
    }
    if (!luhnOk(rawCard)) {
      setModalError('Неверный номер карты (проверьте цифры)')
      return
    }
    const parts = cardExpiry.split('/')
    const mm = parts[0] ? digitsOnly(parts[0]) : ''
    const yy = parts[1] ? digitsOnly(parts[1]) : ''
    if (mm.length !== 2 || yy.length !== 2) {
      setModalError('Укажите срок действия ММ/ГГ')
      return
    }
    const month = Number.parseInt(mm, 10)
    const yearShort = Number.parseInt(yy, 10)
    if (month < 1 || month > 12) {
      setModalError('Некорректный месяц')
      return
    }
    const now = new Date()
    const yFull = yearShort < 100 ? 2000 + yearShort : yearShort
    const curYm = now.getFullYear() * 12 + now.getMonth()
    const expYm = yFull * 12 + month - 1
    if (expYm < curYm) {
      setModalError('Срок действия карты истёк')
      return
    }
    const cvv = digitsOnly(cardCvv)
    if (cvv.length < 3 || cvv.length > 4) {
      setModalError('CVV / CVC — 3 или 4 цифры')
      return
    }
    const holder = cardHolder.trim()
    if (holder.length > 0 && holder.length < 2) {
      setModalError('Имя на карте: минимум 2 символа или оставьте пустым')
      return
    }
    const rounded = Math.floor(amount * 100) / 100
    setDepositUiPhase('processing')
    try {
      await sleep(2200)
      setDepositUiPhase('approved')
      await sleep(1300)
      await depositMut.mutateAsync({ amount: rounded, cardLast4: rawCard.slice(-4) })
    } catch {
      /* ошибка API: onError мутации уже выставил modalError и фазу form */
    }
  }

  const detectedCardBrand = useMemo(() => detectPaymentSystemFromCardNumber(cardNumber), [cardNumber])

  const filteredHistory = history.filter((h) => {
    const q = searchRides.trim().toLowerCase()
    if (!q) return true
    return h.vehicleName.toLowerCase().includes(q)
  })

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="bg-black text-slate-100 font-body antialiased flex-1 min-h-0 flex overflow-hidden w-full relative">
      {depositModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
          role="presentation"
          onClick={() => {
            if (!depositFlowBusy) setDepositModalOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deposit-modal-title"
            className="w-full max-w-md rounded-3xl border border-[#333] bg-[#171717] shadow-xl p-6 sm:p-7 max-h-[min(92vh,640px)] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="deposit-modal-title" className="text-lg font-display font-bold text-white">
                Оплата картой
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                disabled={depositFlowBusy}
                className="p-1 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => setDepositModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Демо: реквизиты карты никуда не отправляются, только сумма пополнения уходит в API. Для теста подойдёт номер{' '}
              <kbd className="px-1 py-0.5 rounded bg-black border border-[#333] text-neutral-300 font-mono text-[10px]">
                4242&nbsp;4242&nbsp;4242&nbsp;4242
              </kbd>{' '}
              (проходит проверку Луна).
            </p>
            {depositUiPhase === 'processing' ? (
              <div className="flex flex-col items-center justify-center gap-4 py-6 mb-2">
                <div
                  className="size-11 rounded-full border-2 border-white/15 border-t-white motion-safe:animate-spin"
                  aria-hidden
                />
                <p className="text-sm text-neutral-300 text-center">Связь с банком…</p>
              </div>
            ) : null}
            {depositUiPhase === 'approved' ? (
              <div
                className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-4 mb-4 text-center"
                role="status"
              >
                <p className="text-lg font-display font-bold tracking-widest text-emerald-400">APPROVED</p>
                <p className="text-xs text-neutral-400 mt-1">Оплата подтверждена · зачисление на кошелёк</p>
              </div>
            ) : null}
            <form
              onSubmit={handleDepositFormSubmit}
              className={`flex flex-col gap-4 ${depositFlowBusy ? 'opacity-45 pointer-events-none' : ''}`}
            >
              <div>
                <label htmlFor="dep-amount" className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Сумма, BYN
                </label>
                <input
                  id="dep-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={modalAmount}
                  onChange={(ev) => setModalAmount(ev.target.value)}
                  disabled={depositFlowBusy}
                  className="w-full bg-black border border-[#262626] text-white rounded-xl px-3 py-2.5 text-sm disabled:opacity-70"
                />
              </div>
              <div>
                <label htmlFor="dep-card" className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Номер карты
                </label>
                <div className="flex w-full min-h-[2.75rem] rounded-xl border border-[#262626] bg-black overflow-hidden transition-[box-shadow,border-color] focus-within:border-white focus-within:ring-1 focus-within:ring-white/20">
                  <div
                    className="flex w-[3.25rem] shrink-0 items-center justify-center border-r border-[#262626] bg-neutral-950 px-1.5 py-2"
                    aria-hidden
                  >
                    <CardBrandMark brand={detectedCardBrand} className="h-6 w-[2.65rem] rounded-sm" />
                  </div>
                  <p id="dep-card-brand" className="sr-only">
                    {detectedCardBrand
                      ? `Определённая платёжная система: ${detectedCardBrand}`
                      : 'Платёжная система по номеру пока не определена'}
                  </p>
                  <input
                    id="dep-card"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    value={formatCardGroups(cardNumber)}
                    onChange={(ev) => setCardNumber(digitsOnly(ev.target.value).slice(0, 16))}
                    disabled={depositFlowBusy}
                    aria-describedby="dep-card-brand"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm font-mono tracking-wide text-white outline-none ring-0 focus:ring-0 disabled:opacity-70"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dep-exp" className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Срок (ММ/ГГ)
                  </label>
                  <input
                    id="dep-exp"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="ММ/ГГ"
                    value={cardExpiry}
                    onChange={(ev) => handleCardExpiryChange(ev.target.value)}
                    disabled={depositFlowBusy}
                    className="w-full bg-black border border-[#262626] text-white rounded-xl px-3 py-2.5 text-sm font-mono disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="dep-cvv" className="block text-xs font-medium text-neutral-400 mb-1.5">
                    CVV
                  </label>
                  <input
                    id="dep-cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(ev) => setCardCvv(digitsOnly(ev.target.value).slice(0, 4))}
                    disabled={depositFlowBusy}
                    className="w-full bg-black border border-[#262626] text-white rounded-xl px-3 py-2.5 text-sm font-mono disabled:opacity-70"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dep-holder" className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Имя на карте <span className="text-neutral-600">(необязательно)</span>
                </label>
                <input
                  id="dep-holder"
                  autoComplete="cc-name"
                  placeholder="IVAN IVANOV"
                  value={cardHolder}
                  onChange={(ev) => setCardHolder(ev.target.value.toUpperCase())}
                  disabled={depositFlowBusy}
                  className="w-full bg-black border border-[#262626] text-white rounded-xl px-3 py-2.5 text-sm uppercase disabled:opacity-70"
                />
              </div>
              {modalError ? (
                <p className="text-sm text-red-400" role="alert">
                  {modalError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={depositFlowBusy}
                  className="flex-1 min-w-[8rem] px-4 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 disabled:opacity-50"
                >
                  {depositUiPhase === 'processing'
                    ? 'Ожидание ответа…'
                    : depositUiPhase === 'approved'
                      ? depositMut.isPending
                        ? 'Зачисление…'
                        : 'Подтверждено'
                      : `Оплатить ${modalAmount || '—'} BYN`}
                </button>
                <button
                  type="button"
                  disabled={depositFlowBusy}
                  className="px-4 py-2.5 rounded-xl border border-[#444] text-neutral-300 text-sm hover:border-white disabled:opacity-40"
                  onClick={() => setDepositModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
          aria-label="Закрыть меню"
          onClick={closeMobileNav}
        />
      )}
      <aside
        className={`fixed lg:relative z-[60] top-0 bottom-0 left-0 w-64 max-w-[min(16rem,88vw)] bg-black border-r border-[#262626] flex flex-col shrink-0 min-h-0 h-full self-stretch transition-transform duration-300 ease-out ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-4 justify-between pt-[max(1rem,env(safe-area-inset-top,0px))] lg:pt-4">
          <div className="flex flex-col gap-8">
            <Link to="/" onClick={closeMobileNav} className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black font-bold text-lg font-display">E</div>
              <div>
                <h1 className="text-white font-display font-bold text-lg leading-tight">EcoRide</h1>
                <p className="text-neutral-500 text-xs">Каршеринг</p>
              </div>
            </Link>
            <nav className="flex flex-col gap-2">
              <Link to="/dashboard" onClick={closeMobileNav} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white text-black group transition-colors">
                <span className="material-symbols-outlined">dashboard</span>
                <span className="font-display font-medium text-sm">Дашборд</span>
              </Link>
              <Link
                to="/map"
                onClick={(e) => {
                  closeMobileNav()
                  if (location.pathname === '/map') e.preventDefault()
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl touch-manipulation text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group"
              >
                <span className="material-symbols-outlined group-hover:text-white transition-colors">map</span>
                <span className="font-display font-medium text-sm">Карта</span>
              </Link>
              <Link
                to="/dashboard#wallet"
                onClick={closeMobileNav}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl touch-manipulation text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group"
              >
                <span className="material-symbols-outlined group-hover:text-white transition-colors">wallet</span>
                <span className="font-display font-medium text-sm">Кошелёк</span>
              </Link>
              <Link
                to="/dashboard#history"
                onClick={closeMobileNav}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl touch-manipulation text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group"
              >
                <span className="material-symbols-outlined group-hover:text-white transition-colors">history</span>
                <span className="font-display font-medium text-sm">История поездок</span>
              </Link>
              <Link to="/rewards" onClick={closeMobileNav} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group">
                <span className="material-symbols-outlined group-hover:text-white transition-colors">redeem</span>
                <span className="font-display font-medium text-sm">Награды</span>
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/dashboard#settings"
              onClick={closeMobileNav}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl touch-manipulation text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:text-white transition-colors">settings</span>
              <span className="font-display font-medium text-sm">Настройки</span>
            </Link>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#262626] px-2">
              <div
                className="w-8 h-8 rounded-full bg-neutral-700 bg-cover bg-center grayscale shrink-0 flex items-center justify-center text-white text-sm font-bold"
                aria-hidden
              >
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-white text-sm font-medium leading-none truncate">{user?.name || user?.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left text-neutral-400 hover:text-white text-xs mt-1 transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-h-0 h-full overflow-y-auto w-full relative bg-neutral-950">
        <div className="layout-shell py-4 md:py-8 flex flex-col gap-6 min-w-0">
          {latestCarsikiNotice ? (
            <div
              className="rounded-2xl border border-emerald-500/50 bg-emerald-950/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              role="status"
            >
              <div className="min-w-0">
                <p className="text-emerald-200 font-semibold text-sm">{latestCarsikiNotice.title}</p>
                <p className="text-emerald-100/90 text-xs mt-1 leading-relaxed">{latestCarsikiNotice.body}</p>
              </div>
              <button
                type="button"
                className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                disabled={markCarsikiNoticeReadMut.isPending}
                onClick={() => markCarsikiNoticeReadMut.mutate(latestCarsikiNotice.id)}
              >
                Скрыть
              </button>
            </div>
          ) : null}
          <div className="flex lg:hidden items-center justify-between mb-2 pt-[env(safe-area-inset-top,0px)] gap-2">
            <Link to="/" onClick={closeMobileNav} className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-bold shrink-0 font-display text-sm">E</div>
              <span className="text-white font-display font-bold truncate">EcoRide</span>
            </Link>
            <button
              type="button"
              className="text-white p-2 rounded-xl hover:bg-neutral-800 shrink-0"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              <span className="material-symbols-outlined">{mobileNavOpen ? 'close' : 'menu'}</span>
            </button>
          </div>

          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 min-w-0">
            <div className="min-w-0">
              <h2 className="text-[clamp(1.5rem,3vw+0.75rem,2.25rem)] md:text-4xl font-display font-bold text-white tracking-tight">
                Дашборд
              </h2>
              <p className="text-neutral-400 mt-1 font-body text-sm sm:text-base">
                Баланс, история поездок и уведомления из вашего аккаунта.
              </p>
            </div>
            <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto md:flex-nowrap shrink-0">
              <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#171717] border border-[#262626] text-neutral-300 rounded-xl font-display text-sm font-medium min-h-[2.5rem] capitalize">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                {periodLabel}
              </div>
              <Link to="/map" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl transition-colors font-display text-sm font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] min-h-[2.5rem] flex-1 sm:flex-initial min-w-[10rem]">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Новая поездка
              </Link>
            </div>
          </header>

          <div
            id="wallet"
            ref={walletRef}
            className="scroll-mt-28 bg-[#171717] border border-[#262626] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-display font-bold text-lg mb-1">Кошелёк</h3>
              <p className="text-neutral-400 text-sm mb-2">Пополнение тестового баланса на счёт в приложении</p>
              <p className="text-3xl font-display font-bold text-white">
                {(user?.balance ?? 0).toFixed(2)} <span className="text-lg text-neutral-400">BYN</span>
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                CARSIKI:{' '}
                <span className="text-emerald-400 font-semibold tabular-nums">{user?.carsiki ?? 0}</span>
                <span className="text-neutral-600"> (~{((user?.carsiki ?? 0) / 100).toFixed(2)} BYN)</span>
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-black border border-[#262626] text-white rounded-xl px-3 py-2 w-28 text-sm"
                aria-label="Сумма пополнения по умолчанию"
              />
              <button
                type="button"
                onClick={() => {
                  const n = Number(depositAmount)
                  if (!Number.isFinite(n) || n < 1) return
                  openDepositModal(String(Math.floor(n)))
                }}
                disabled={depositMut.isPending || !token}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 disabled:opacity-50"
              >
                Пополнить картой
              </button>
              <button
                type="button"
                onClick={() => openDepositModal('25')}
                disabled={depositMut.isPending || !token}
                className="px-3 py-2 rounded-xl border border-[#444] text-neutral-300 text-sm hover:border-white"
              >
                +25
              </button>
              <button
                type="button"
                onClick={() => openDepositModal('50')}
                disabled={depositMut.isPending || !token}
                className="px-3 py-2 rounded-xl border border-[#444] text-neutral-300 text-sm hover:border-white"
              >
                +50
              </button>
            </div>
          </div>

          {token ? (
            <div className="bg-[#171717] border border-[#262626] rounded-3xl p-6">
              <h3 className="text-white font-display font-bold text-base mb-3">Последние операции</h3>
              {ledger.length === 0 ? (
                <p className="text-neutral-500 text-sm">Пока нет проводок</p>
              ) : (
                <ul className="divide-y divide-[#262626] text-sm">
                  {ledger.map((row) => (
                    <li key={row.id} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-neutral-400">
                        {new Date(row.createdAt).toLocaleString('ru-RU')} ·{' '}
                        {LEDGER_TYPE_RU[row.type] ?? row.type}
                      </span>
                      <span className={row.amount >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                        {row.amount >= 0 ? '+' : ''}
                        {row.amount.toFixed(2)} BYN
                      </span>
                      {row.type === 'Deposit' && row.paymentCardLast4 ? (
                        <span className="w-full text-xs text-neutral-500 font-mono tracking-wide">
                          Карта · •••• •••• •••• {row.paymentCardLast4}
                        </span>
                      ) : null}
                      <span className="w-full text-xs text-neutral-600">Баланс после: {row.balanceAfter.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-[#171717] border border-[#262626] rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="relative z-10">
                <span className="text-white font-display font-bold uppercase tracking-wider text-xs">По завершённым поездкам</span>
                <p className="text-neutral-500 text-xs mt-1 mb-4">Суммы по данным из истории в вашем аккаунте</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-[#262626] bg-black/40 p-4">
                    <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Поездок</p>
                    <p className="text-2xl font-display font-bold text-white">{historyStats.trips}</p>
                  </div>
                  <div className="rounded-2xl border border-[#262626] bg-black/40 p-4">
                    <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Пробег</p>
                    <p className="text-2xl font-display font-bold text-white">{historyStats.totalKm.toFixed(1)}</p>
                    <p className="text-neutral-600 text-xs mt-0.5">км</p>
                  </div>
                  <div className="rounded-2xl border border-[#262626] bg-black/40 p-4">
                    <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">В движении</p>
                    <p className="text-2xl font-display font-bold text-white">{historyStats.totalMin.toFixed(0)}</p>
                    <p className="text-neutral-600 text-xs mt-0.5">мин</p>
                  </div>
                  <div className="rounded-2xl border border-[#262626] bg-black/40 p-4">
                    <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Списания</p>
                    <p className="text-2xl font-display font-bold text-white">{historyStats.totalByn.toFixed(2)}</p>
                    <p className="text-neutral-600 text-xs mt-0.5">BYN</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 bg-[#171717] border border-[#262626] rounded-3xl p-6 flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-display font-bold text-sm uppercase tracking-wide">Уведомления</h4>
                <span className="material-symbols-outlined text-neutral-400 text-[20px]">notifications</span>
              </div>
              {!token ? (
                <p className="text-neutral-500 text-sm">Войдите, чтобы видеть уведомления</p>
              ) : notificationsError ? (
                <p className="text-amber-500/90 text-sm">Не удалось загрузить уведомления</p>
              ) : notifications.length === 0 ? (
                <p className="text-neutral-500 text-sm">Нет уведомлений</p>
              ) : (
                <ul className="space-y-3 text-sm flex-1 overflow-y-auto max-h-64">
                  {notifications.slice(0, 8).map((n) => (
                    <li key={n.id} className="border-b border-[#262626] pb-3 last:border-0 last:pb-0">
                      <p className="text-white font-medium leading-snug">{n.title}</p>
                      <p className="text-neutral-400 text-xs mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-neutral-600 text-[10px] mt-1">
                        {new Date(n.createdAt).toLocaleString('ru-RU')} · {n.type}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-[#262626] bg-[#171717] px-5 py-4">
              <p className="text-neutral-400 text-sm">Программа наград и баллы — на отдельной странице.</p>
              <Link
                to="/rewards"
                className="text-white text-sm font-medium hover:text-neutral-300 transition-colors inline-flex items-center gap-1 shrink-0"
              >
                Перейти
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            <div id="history" className="scroll-mt-28 col-span-1 md:col-span-2 xl:col-span-3 bg-[#171717] border border-[#262626] rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-display font-bold text-white">Недавние поездки</h3>
                <input
                  type="text"
                  value={searchRides}
                  onChange={(e) => setSearchRides(e.target.value)}
                  className="bg-black border border-[#262626] text-neutral-300 text-sm rounded-xl px-3 py-2 focus:ring-1 focus:ring-white focus:border-white outline-none w-full sm:w-64 placeholder-neutral-600"
                  placeholder="Поиск поездок..."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-neutral-500 border-b border-[#262626] text-[10px] sm:text-xs uppercase font-display tracking-wider">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">Транспорт</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">Дата</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium min-w-[7rem]">Дистанция</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap hidden sm:table-cell">Длительность</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-right whitespace-nowrap">Стоимость</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-center whitespace-nowrap">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] text-xs sm:text-sm">
                    {!token ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                          Войдите, чтобы видеть историю
                        </td>
                      </tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                          Нет завершённых поездок
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((ride) => (
                        <tr key={ride.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">directions_car</span>
                              </div>
                              <span className="text-white font-medium truncate max-w-[8rem] sm:max-w-none">{ride.vehicleName}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-neutral-400 whitespace-nowrap">
                            {new Date(ride.endedAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-neutral-300">
                            <span className="text-neutral-400">{ride.distanceKm.toFixed(2)} км</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-neutral-400 hidden sm:table-cell">
                            {ride.billableMinutes} мин
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-right text-white font-medium whitespace-nowrap">
                            {ride.total.toFixed(2)} BYN
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium border bg-neutral-200 text-black border-neutral-300">
                              Завершено
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            id="settings"
            className="scroll-mt-28 rounded-3xl border border-[#262626] bg-[#171717] p-6"
          >
            <h3 className="text-lg font-display font-bold text-white mb-2">Настройки и документы</h3>
            <p className="text-neutral-500 text-sm mb-4">
              Отдельный экран настроек профиля появится позже. Сейчас доступны справочные страницы.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link to="/help" className="text-white underline decoration-neutral-600 underline-offset-4 hover:text-neutral-300">
                Помощь
              </Link>
              <Link to="/privacy" className="text-white underline decoration-neutral-600 underline-offset-4 hover:text-neutral-300">
                Конфиденциальность
              </Link>
              <Link to="/terms" className="text-white underline decoration-neutral-600 underline-offset-4 hover:text-neutral-300">
                Условия
              </Link>
            </div>
          </div>

          <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden relative border border-[#262626] mt-2 bg-[#171717]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay grayscale"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAtdPah5rLKhQzPURPNfNgjeaCw34DXuD_-ufSsfGFNaYVMMRkVhLLljv99myprCUcmMukn1yCj9q3ZAJYpYbn4SfhQO6X7oC2yX3RhfEIzHqWFAiRENYX7-RO7zhXjVRAl3sqwUejS834JEuwF8YhHgUQw61cVzg_ajnL3BHwYJwtC4S6dLv7w6xpvVupqjv3frr6dAAjg4WqcGk01JBk6WzcD1VV-g4y57WjPPAjacUhEKAFQF3iKPCA85JTjlzywCxF3ItusOU')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-[#171717]/80 backdrop-blur-md p-6 rounded-2xl border border-[#262626] max-w-md w-full shadow-2xl">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-full text-white">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">Транспорт на карте</h3>
                  <p className="text-neutral-400 text-sm mb-4">
                    {fleetError
                      ? 'Не удалось загрузить парк с сервера. Откройте карту и попробуйте снова.'
                      : `Сейчас в парке: ${fleetVehicles.length} ТС (данные API).`}
                  </p>
                  <Link to="/map" className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl font-display font-medium transition-colors shadow-lg shadow-white/10 text-center block">
                    Открыть карту
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-[#262626] pt-6 flex flex-col md:flex-row justify-between items-center text-neutral-500 text-xs gap-4 layout-shell">
          <p>© {new Date().getFullYear()} EcoRide</p>
          <div className="flex gap-6">
            <Link className="hover:text-neutral-300 transition-colors" to="/support">
              Поддержка
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}

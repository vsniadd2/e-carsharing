import type { User } from './auth'
import { authedFetch } from './authed'

const API_BASE = ''

async function readError(res: Response, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return res.statusText || 'Ошибка запроса'
}

export type ApiVehicle = {
  id: string
  type: string
  name: string
  position: [number, number]
  battery: number | null
  rangeKm: number | null
  seats: number | null
  priceStart: number
  pricePerMinute: number
  /** economy | comfort | premium — только для type car */
  vehicleClass?: string | null
  status: string
  lowBattery: boolean
  photoUrl?: string | null
  description?: string | null
}

export async function fetchPublicVehicles(): Promise<ApiVehicle[]> {
  const res = await fetch(`${API_BASE}/api/vehicles`)
  if (!res.ok) throw new Error(await readError(res, await res.json().catch(() => ({}))))
  return res.json() as Promise<ApiVehicle[]>
}

export type RentalActiveDto = {
  rentalId: string
  vehicleId: string
  vehicleName: string
  status: string
  reservedAt: string
  startedAt: string | null
  /** ISO UTC; только при status === 'reserved' */
  reservationExpiresAt?: string | null
  batteryPercent: number
  distanceKm: number
  chargedAmount: number
  billableMinutes: number
  lowBatteryMode: boolean
  speedLimitKmh: number | null
  balance: number
}

const SESSION_INVALID_EVENT = 'ecoride:session-invalid'

export function dispatchSessionInvalid(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT))
}

export async function fetchActiveRental(token: string): Promise<RentalActiveDto | null> {
  const res = await authedFetch(token, '/api/rentals/active', { method: 'GET' })
  if (res.status === 204) return null
  if (res.status === 401) {
    dispatchSessionInvalid()
    return null
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as RentalActiveDto
}

export async function reserveVehicle(token: string, vehicleId: string): Promise<void> {
  const res = await authedFetch(token, '/api/rentals/reserve', {
    method: 'POST',
    body: JSON.stringify({ vehicleId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(await readError(res, data)) as Error & { code?: string }
    const code = (data as { code?: string }).code
    if (typeof code === 'string') err.code = code
    throw err
  }
}

export async function startRental(token: string): Promise<void> {
  const res = await authedFetch(token, '/api/rentals/start', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(await readError(res, data)) as Error & { code?: string }
    const code = (data as { code?: string }).code
    if (typeof code === 'string') err.code = code
    throw err
  }
}

export async function pauseRental(token: string): Promise<void> {
  const res = await authedFetch(token, '/api/rentals/pause', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
}

export async function resumeRental(token: string): Promise<void> {
  const res = await authedFetch(token, '/api/rentals/resume', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
}

export type TripReceiptDto = {
  rentalId: string
  vehicleName: string
  reservedAt: string
  startedAt: string | null
  endedAt: string
  totalBillableMinutes: number
  distanceKm: number
  priceStart: number
  pricePerMinute: number
  perMinuteTotal: number
  total: number
  balanceAfter: number
  carsikiEarned: number
  carsikiSpent: number
  bynCreditedFromCarsiki: number
  carsikiBalanceAfter: number
}

export async function completeRental(token: string, useCarsiki: boolean): Promise<TripReceiptDto> {
  const res = await authedFetch(token, '/api/rentals/complete', {
    method: 'POST',
    body: JSON.stringify({ useCarsiki }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as TripReceiptDto
}

export async function cancelReservation(token: string): Promise<void> {
  const res = await authedFetch(token, '/api/rentals/cancel-reservation', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
}

export async function fetchMe(token: string): Promise<User> {
  const res = await authedFetch(token, '/api/me', { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    dispatchSessionInvalid()
    throw new Error(await readError(res, data))
  }
  if (!res.ok) throw new Error(await readError(res, data))
  return data as User
}

export async function depositWallet(
  token: string,
  amount: number,
  cardLast4?: string,
): Promise<User> {
  const res = await authedFetch(token, '/api/wallet/deposit', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      ...(cardLast4 && /^\d{4}$/.test(cardLast4) ? { cardLast4 } : {}),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as User
}

export type WalletLedgerItem = {
  id: string
  amount: number
  balanceAfter: number
  type: string
  createdAt: string
  rentalId: string | null
  /** Последние 4 цифры карты (пополнение). */
  paymentCardLast4?: string | null
}

export async function fetchWalletLedger(token: string, take = 40): Promise<WalletLedgerItem[]> {
  const res = await authedFetch(token, `/api/wallet/ledger?take=${take}`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as WalletLedgerItem[]
}

export type RentalHistoryItem = {
  id: string
  vehicleName: string
  endedAt: string
  total: number
  distanceKm: number
  billableMinutes: number
}

export async function fetchRentalHistory(token: string, take = 20): Promise<RentalHistoryItem[]> {
  const res = await authedFetch(token, `/api/rentals/history?take=${take}`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as RentalHistoryItem[]
}

export type NotificationDto = {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

export async function fetchNotifications(token: string): Promise<NotificationDto[]> {
  const res = await authedFetch(token, '/api/notifications', { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as NotificationDto[]
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  const res = await authedFetch(token, `/api/notifications/${id}/read`, { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
}

export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/push/vapid-public`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return ''
  return (data as { publicKey?: string }).publicKey ?? ''
}

export async function subscribePush(
  token: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const res = await authedFetch(token, '/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    }),
  })
  if (res.ok || res.status === 204) return
  const data = await res.json().catch(() => ({}))
  throw new Error(await readError(res, data))
}

export type AdminStats = {
  usersCount: number
  activeRentalsCount: number
  fleetOnlineCount: number
}

export async function fetchAdminStats(adminAccessToken: string): Promise<AdminStats> {
  const res = await authedFetch(adminAccessToken, '/api/admin/stats', { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as AdminStats
}

export type AdminTicketItem = {
  id: string
  userEmail: string
  userName: string
  subject: string
  messagePreview: string
  status: string
  createdAt: string
}

/** Payload события SignalR TicketCreated (как с бэкенда) */
export type SupportTicketCreatedPayload = {
  id: string
  userEmail: string
  userName: string
  subject: string
  messagePreview: string
  createdAt: string
}

export async function fetchAdminTickets(adminAccessToken: string, take = 50): Promise<AdminTicketItem[]> {
  const res = await authedFetch(adminAccessToken, `/api/admin/tickets?take=${take}`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as AdminTicketItem[]
}

export type AdminCreateVehicleBody = {
  id: string
  type: 'car' | 'bike' | 'scooter' | 'charging'
  name: string
  lat: number
  lng: number
  batteryPercent?: number
  priceStart: number
  pricePerMinute: number
  seats?: number | null
  rangeKm?: number | null
  lowBatteryFlag?: boolean
  photoUrl?: string | null
  description?: string | null
  vehicleClass?: string | null
}

export async function createAdminVehicle(
  adminAccessToken: string,
  body: AdminCreateVehicleBody
): Promise<{ id: string }> {
  const res = await authedFetch(adminAccessToken, '/api/admin/vehicles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as { id: string }
}

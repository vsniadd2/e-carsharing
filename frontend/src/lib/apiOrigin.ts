/**
 * Прямой origin бэкенда (без завершающего «/»).
 * Если задан в VITE_PUBLIC_API_ORIGIN — клиент SignalR подключается к API напрямую (обходит прокси Vite, удобно при 404 negotiate).
 * Иначе — относительные пути /hubs/* через прокси dev-сервера.
 */
export function getPublicApiOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_API_ORIGIN?.trim() ?? ''
  if (!raw) return ''
  return raw.replace(/\/$/, '')
}

export function rentalHubUrl(): string {
  const o = getPublicApiOrigin()
  return o ? `${o}/hubs/rental` : '/hubs/rental'
}

export function adminTicketsHubUrl(): string {
  const o = getPublicApiOrigin()
  return o ? `${o}/hubs/admin-tickets` : '/hubs/admin-tickets'
}

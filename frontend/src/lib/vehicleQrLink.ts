/**
 * Абсолютная ссылка на карту с выбранным ТС — её кодируют в наклейке QR (и распознаёт сканер в приложении).
 */
export function buildVehicleMapDeepLink(vehicleId: string): string {
  const search = `vehicle=${encodeURIComponent(vehicleId)}`
  if (typeof window === 'undefined') {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '')
    return `${base}/map?${search}`
  }
  return new URL(`map?${search}`, window.location.origin + import.meta.env.BASE_URL).href
}

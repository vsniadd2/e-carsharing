import type { ApiVehicle } from '../api/fleet'
import { effectiveTariff, VEHICLE_CLASS_LABEL_RU } from './tariffCaps'

export type TariffTab = 'cars' | 'bikes' | 'scooters'

export type TariffItem = {
  key: string
  name: string
  priceStart: string
  pricePerMinute: string
  img: string
  badge?: string
  charge: string
  fleetVehicleId: string
  tab: TariffTab
}

function fmtByn(n: number): string {
  return n.toFixed(2)
}

function heroImageUrl(url: string | null | undefined): string {
  const u = url?.trim()
  if (!u) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Tesla_Model_3_parked%2C_front_left_corner.jpg/960px-Tesla_Model_3_parked%2C_front_left_corner.jpg'
  }
  return u.includes('?') ? u.replace(/\bw=\d+\b/, 'w=400').replace(/\bh=\d+\b/, 'h=250') : `${u}?w=400&h=250&fit=crop`
}

function tabForType(type: string): TariffTab | null {
  if (type === 'car') return 'cars'
  if (type === 'bike') return 'bikes'
  if (type === 'scooter') return 'scooters'
  return null
}

/** Тарифы = тот же парк, что на карте (данные с API после seed). */
export function tariffItemsFromApiVehicles(rows: ApiVehicle[]): Record<TariffTab, TariffItem[]> {
  const flat: TariffItem[] = []

  for (const v of rows) {
    const tab = tabForType(v.type)
    if (tab == null) continue

    const eff = effectiveTariff(v.type, v.vehicleClass, v.priceStart, v.pricePerMinute)
    const classRu =
      tab === 'cars' && v.vehicleClass
        ? VEHICLE_CLASS_LABEL_RU[v.vehicleClass.toLowerCase()] ?? v.vehicleClass
        : null

    const badge =
      classRu != null
        ? classRu
        : tab === 'cars' && v.seats != null
          ? `${v.seats} мест`
          : tab === 'cars'
            ? 'Авто'
            : tab === 'bikes'
              ? 'E-bike'
              : 'Самокат'

    const charge =
      v.battery != null && v.type !== 'charging' ? `${Math.round(Number(v.battery))}%` : '—'

    flat.push({
      key: v.id,
      name: v.name,
      priceStart: fmtByn(eff.priceStart),
      pricePerMinute: fmtByn(eff.pricePerMinute),
      img: heroImageUrl(v.photoUrl),
      badge,
      charge,
      fleetVehicleId: v.id,
      tab,
    })
  }

  const byTab = (t: TariffTab) => flat.filter((x) => x.tab === t).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return {
    cars: byTab('cars'),
    bikes: byTab('bikes'),
    scooters: byTab('scooters'),
  }
}

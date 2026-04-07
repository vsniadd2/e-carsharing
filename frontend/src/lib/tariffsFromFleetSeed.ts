import fleetRows from '@fleetSeed'
import { effectiveTariff, VEHICLE_CLASS_LABEL_RU } from './tariffCaps'

type FleetJsonRow = {
  id: string
  type: string
  vehicleClass?: string | null
  name: string
  lat: number
  lng: number
  batteryPercent: number
  priceStart: number
  pricePerMinute: number
  status: number
  rangeKm?: number | null
  lowBatteryFlag: boolean
  seats?: number | null
  photoUrl?: string | null
  description?: string | null
}

export type TariffTab = 'cars' | 'bikes' | 'scooters'

export type TariffItem = {
  /** Стабильный ключ для React (дедуп по тарифу) */
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

/** Уникальные карточки тарифов из того же `fleet.json`, что и seed.mjs */
export function buildTariffItemsFromFleetSeed(): Record<TariffTab, TariffItem[]> {
  const rows = fleetRows as FleetJsonRow[]
  const seen = new Set<string>()
  const flat: TariffItem[] = []

  for (const r of rows) {
    const tab = tabForType(r.type)
    if (tab == null) continue

    const eff = effectiveTariff(r.type, r.vehicleClass, Number(r.priceStart), Number(r.pricePerMinute))
    const dedupeKey = `${r.type}|${r.name}|${eff.priceStart}|${eff.pricePerMinute}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const classRu =
      tab === 'cars' && r.vehicleClass
        ? VEHICLE_CLASS_LABEL_RU[r.vehicleClass.toLowerCase()] ?? r.vehicleClass
        : null

    const badge =
      classRu != null
        ? classRu
        : tab === 'cars' && r.seats != null
          ? `${r.seats} мест`
          : tab === 'cars'
            ? 'Авто'
            : tab === 'bikes'
              ? 'E-bike'
              : 'Самокат'

    flat.push({
      key: dedupeKey,
      name: r.name,
      priceStart: fmtByn(eff.priceStart),
      pricePerMinute: fmtByn(eff.pricePerMinute),
      img: heroImageUrl(r.photoUrl),
      badge,
      charge: `${Math.round(Number(r.batteryPercent) || 0)}%`,
      fleetVehicleId: r.id,
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

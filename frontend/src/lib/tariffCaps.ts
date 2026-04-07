/** Синхронно с backend `VehicleEffectivePricing` и `appsettings.json` → Rental:TariffCaps */

const CAPS = {
  economy: { maxPriceStart: 1.4, maxPricePerMinute: 0.4 },
  comfort: { maxPriceStart: 2.2, maxPricePerMinute: 0.7 },
  premium: { maxPriceStart: 3, maxPricePerMinute: 1 },
} as const

const ABS_MAX_START = 3
const ABS_MAX_PER_MIN = 1

type Tier = keyof typeof CAPS

function resolveTier(type: string, vehicleClass?: string | null): Tier {
  if (type === 'car') {
    const c = vehicleClass?.trim().toLowerCase()
    if (c === 'economy' || c === 'comfort' || c === 'premium') return c
    return 'comfort'
  }
  if (type === 'bike') return 'comfort'
  return 'economy'
}

export function effectiveTariff(
  type: string,
  vehicleClass: string | null | undefined,
  priceStart: number,
  pricePerMinute: number
): { priceStart: number; pricePerMinute: number } {
  if (type === 'charging') {
    return {
      priceStart: round2(priceStart),
      pricePerMinute: round2(pricePerMinute),
    }
  }
  const tier = resolveTier(type, vehicleClass)
  const caps = CAPS[tier]
  const start = Math.min(priceStart, caps.maxPriceStart, ABS_MAX_START)
  const perMin = Math.min(pricePerMinute, caps.maxPricePerMinute, ABS_MAX_PER_MIN)
  return {
    priceStart: round2(Math.max(0, start)),
    pricePerMinute: round2(Math.max(0, perMin)),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const VEHICLE_CLASS_LABEL_RU: Record<string, string> = {
  economy: 'Эконом',
  comfort: 'Комфорт',
  premium: 'Премиум',
}

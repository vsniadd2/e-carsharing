/** Только цифры номера карты. */
function cardDigits(raw: string): string {
  return raw.replace(/\D/g, '')
}

export type DetectedCardBrand = 'Visa' | 'Mastercard' | 'МИР'

/**
 * Грубое автоопределение платёжной системы по BIN (первые цифры).
 * — 4… — Visa
 * — 51–55 — Mastercard
 * — 2221–2720 — Mastercard
 * — 2200–2204 — МИР
 */
export function detectPaymentSystemFromCardNumber(cardNumber: string): DetectedCardBrand | null {
  const d = cardDigits(cardNumber)
  if (d.length < 1) return null

  if (d[0] === '4') return 'Visa'

  if (d.length >= 4) {
    const p4 = Number.parseInt(d.slice(0, 4), 10)
    if (!Number.isNaN(p4) && p4 >= 2200 && p4 <= 2204) return 'МИР'
    if (!Number.isNaN(p4) && p4 >= 2221 && p4 <= 2720) return 'Mastercard'
  }

  if (d.length >= 2) {
    const p2 = Number.parseInt(d.slice(0, 2), 10)
    if (!Number.isNaN(p2) && p2 >= 51 && p2 <= 55) return 'Mastercard'
  }

  return null
}

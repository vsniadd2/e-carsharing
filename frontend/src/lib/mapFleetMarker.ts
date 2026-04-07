/**
 * SVG-маркеры карты: контуры транспорта основаны на Lucide (ISC)
 * https://github.com/lucide-icons/lucide — car, bike, scooter, plug-zap
 */

export type FleetMapMarkerKind = 'car' | 'bike' | 'scooter' | 'charging'

/** Палитра экрана карты (map.txt — неон + приглушённые самокат/вел) */
const ACCENT: Record<FleetMapMarkerKind, string> = {
  car: '#D4FF00',
  bike: '#a3a3a3',
  scooter: '#525252',
  charging: '#6bfe9c',
}

/** Lucide paths, viewBox 0 0 24 24, stroke-2 cap-round join-round */
const ICON_GLYPH: Record<FleetMapMarkerKind, string> = {
  car: `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>`,
  bike: `<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>`,
  scooter: `<path d="M21 4h-3.5l2 11.05"/><path d="M6.95 17h5.142c.523 0 .95-.406 1.063-.916a6.5 6.5 0 0 1 5.345-5.009"/><circle cx="19.5" cy="17.5" r="2.5"/><circle cx="4.5" cy="17.5" r="2.5"/>`,
  charging: `<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="m2 22 3-3"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m18 3-4 4h6l-4 4"/>`,
}

function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type FleetOccupancy = 'available' | 'reserved' | 'inuse'

function normalizeOccupancy(
  fleetStatus: string | undefined,
  kind: FleetMapMarkerKind
): FleetOccupancy {
  if (kind === 'charging') return 'available'
  const s = fleetStatus?.toLowerCase() ?? 'available'
  if (s === 'reserved') return 'reserved'
  if (s === 'inuse') return 'inuse'
  return 'available'
}

export function buildFleetMapMarkerDataUrl(opts: {
  kind: FleetMapMarkerKind
  /** null — нет данных (показываем «—», полоса пустая) */
  batteryPercent: number | null
  lowBattery: boolean
  selected: boolean
  /** Статус парка API: available | reserved | inuse */
  fleetStatus?: string
}): string {
  const { kind, batteryPercent, lowBattery, selected, fleetStatus } = opts
  const accent = ACCENT[kind]
  const occ = normalizeOccupancy(fleetStatus, kind)

  const statusStroke =
    occ === 'reserved' ? '#f59e0b' : occ === 'inuse' ? '#e11d48' : accent

  const ring =
    selected ? 5.5 : occ !== 'available' ? 4 : kind === 'car' ? 3 : kind === 'scooter' ? 2 : 2.5
  const headStroke = selected ? '#D4FF00' : statusStroke
  const glyph = ICON_GLYPH[kind]

  const glyphStroke =
    kind === 'charging'
      ? '#6bfe9c'
      : kind === 'car' && occ === 'available'
        ? '#D4FF00'
        : kind === 'scooter' && occ === 'available'
          ? '#ffffff'
          : kind === 'bike' && occ === 'available'
            ? '#e5e5e5'
            : '#f1f5f9'

  const headFill = kind === 'car' && occ === 'available' ? '#000000' : '#0f172a'

  /** Неоновое свечение для доступных авто */
  const neonGlow =
    kind === 'car' && occ === 'available'
      ? `<circle cx="28" cy="21" r="26" fill="none" stroke="#D4FF00" stroke-width="1.5" opacity="0.45"/>`
      : ''

  /** Внешнее кольцо цвета статуса, если занято или выбран занятый */
  const statusHalo =
    occ === 'reserved' || occ === 'inuse'
      ? `<circle cx="28" cy="21" r="24" fill="none" stroke="${statusStroke}" stroke-width="${selected ? 2.25 : 2}" opacity="0.95"/>`
      : ''

  const label =
    kind === 'charging'
      ? 'ЭЗС'
      : batteryPercent != null
        ? `${batteryPercent}%`
        : '—'

  const showBar = kind !== 'charging'
  const barMax = 36
  const barW =
    batteryPercent == null ? 0 : Math.max(2, Math.round((barMax * batteryPercent) / 100))
  const barFill = lowBattery ? '#f97316' : '#6bfe9c'
  const badgeStroke = lowBattery ? '#ea580c' : '#525252'

  const barHtml =
    showBar
      ? `<rect x="10" y="41" width="${barMax}" height="5" rx="2" fill="#1e293b"/>
         <rect x="10" y="41" width="${barW}" height="5" rx="2" fill="${barFill}"/>`
      : ''

  const selectHalo =
    selected
      ? `<circle cx="28" cy="21" r="25" fill="none" stroke="#D4FF00" stroke-width="2.25" opacity="0.95"/>
         <circle cx="28" cy="21" r="22" fill="none" stroke="#ffffff" stroke-width="1.25" opacity="0.45"/>`
      : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68">
  <defs>
    <filter id="sd" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#sd)">
    ${neonGlow}
    ${statusHalo}
    ${selectHalo}
    <circle cx="28" cy="21" r="20" fill="${headFill}" stroke="${headStroke}" stroke-width="${ring}"/>
    <g transform="translate(16,9)" fill="none" stroke="${glyphStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${glyph}
    </g>
  </g>
  ${barHtml}
  <rect x="5" y="48" width="46" height="15" rx="7.5" fill="#020617" stroke="${badgeStroke}" stroke-width="1"/>
  <text x="28" y="58.5" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="10.5" font-weight="700" fill="#f8fafc">${escapeXmlText(label)}</text>
  <path d="M28 63 L23 68 H33 Z" fill="#020617" stroke="${badgeStroke}" stroke-width="0.75" stroke-linejoin="round"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

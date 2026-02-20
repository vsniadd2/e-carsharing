import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

type VehicleFilter = 'all' | 'scooters' | 'bikes' | 'cars' | 'charging'

type VehicleType = 'scooter' | 'bike' | 'car' | 'charging'

export interface Vehicle {
  id: string
  type: VehicleType
  position: [number, number]
  name: string
  battery?: number
  rangeKm?: number
  seats?: number
  priceStart: string
  pricePerMin: string
  lowBattery?: boolean
  /** Адрес (для зарядных станций / заправок) */
  address?: string
}

const MINSK_CENTER: [number, number] = [53.9045, 27.5615]

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface WeatherData {
  temp: number
  weatherCode: number
  location: string
  date: string
}

// Реальные ЭЗС Минска — координаты из OpenStreetMap (Overpass API, февраль 2026)
const CHARGING_STATIONS: Vehicle[] = [
  { id: 'CH-001', type: 'charging', position: [53.93777, 27.54887], name: 'VADI AVTO', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-002', type: 'charging', position: [53.86459, 27.48214], name: 'Белоруснефть № 022', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-003', type: 'charging', position: [53.88403, 27.56289], name: 'Malanka (Рокоссовского р-н)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-004', type: 'charging', position: [53.93995, 27.57206], name: 'Malanka (Беломорская)', address: 'г. Минск, ул. Беломорская', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-005', type: 'charging', position: [53.91776, 27.50256], name: 'Системы нормативной безопасности', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-006', type: 'charging', position: [53.90284, 27.55705], name: 'Eleven (Московский р-н)', address: 'г. Минск, Московский р-н', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-007', type: 'charging', position: [53.91999, 27.58240], name: 'Eleven (самокаты)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-008', type: 'charging', position: [53.86010, 27.47825], name: 'Malanka (Газеты Звезда)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-009', type: 'charging', position: [53.89910, 27.56551], name: 'Белоруснефть № 011', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-010', type: 'charging', position: [53.91002, 27.54599], name: 'Белоруснефть № 04', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-011', type: 'charging', position: [53.91208, 27.53781], name: 'Белоруснефть № 014', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-012', type: 'charging', position: [53.90816, 27.49451], name: 'Белоруснефть № 013', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-013', type: 'charging', position: [53.93170, 27.51192], name: 'Белоруснефть № 01', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-014', type: 'charging', position: [53.93764, 27.49131], name: 'Белоруснефть № 02', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-015', type: 'charging', position: [53.94493, 27.59921], name: 'Белоруснефть № 012', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-016', type: 'charging', position: [53.87154, 27.57227], name: 'ЭЗС (Рокоссовского)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-017', type: 'charging', position: [53.93977, 27.46549], name: 'Malanka № 074', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-018', type: 'charging', position: [53.89125, 27.55266], name: 'Белоруснефть № 023', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-019', type: 'charging', position: [53.89395, 27.55014], name: 'Белоруснефть № 033', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-020', type: 'charging', position: [53.91124, 27.54913], name: 'Malanka № 015', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-021', type: 'charging', position: [53.89121, 27.55287], name: 'Белоруснефть № 024', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-022', type: 'charging', position: [53.92373, 27.51767], name: 'Белоруснефть № 016', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-023', type: 'charging', position: [53.93427, 27.48354], name: 'Белоруснефть № 017', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-024', type: 'charging', position: [53.93026, 27.57963], name: 'Белоруснефть № 026', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-025', type: 'charging', position: [53.92237, 27.52638], name: 'Белоруснефть № 028', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-026', type: 'charging', position: [53.87832, 27.53354], name: 'Белоруснефть № 031', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-027', type: 'charging', position: [53.89609, 27.55700], name: 'Белоруснефть № 030', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-028', type: 'charging', position: [53.93061, 27.64696], name: 'Белоруснефть № 035', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-029', type: 'charging', position: [53.89445, 27.47500], name: 'Белоруснефть № 052', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-030', type: 'charging', position: [53.89822, 27.52594], name: 'Белоруснефть № 068', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-031', type: 'charging', position: [53.91144, 27.54479], name: 'Белоруснефть № 029', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-032', type: 'charging', position: [53.90633, 27.49318], name: 'Белоруснефть № 043', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-033', type: 'charging', position: [53.91328, 27.49470], name: 'Malanka № 058', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-034', type: 'charging', position: [53.89707, 27.55024], name: 'Malanka № 032', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-035', type: 'charging', position: [53.89718, 27.55594], name: 'Malanka № 034', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-036', type: 'charging', position: [53.92718, 27.49674], name: 'Белоруснефть № 055', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-037', type: 'charging', position: [53.89724, 27.54587], name: 'Белоруснефть № 040', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-038', type: 'charging', position: [53.93076, 27.54816], name: 'Белоруснефть № 047', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-039', type: 'charging', position: [53.89786, 27.56317], name: 'Белоруснефть № 050', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-040', type: 'charging', position: [53.85202, 27.53792], name: 'Белоруснефть № 066', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-041', type: 'charging', position: [53.86000, 27.57386], name: 'Белоруснефть № 039', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-042', type: 'charging', position: [53.88604, 27.58202], name: 'Malanka № 042', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-043', type: 'charging', position: [53.85625, 27.61036], name: 'Malanka № 046', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-044', type: 'charging', position: [53.90320, 27.55887], name: 'Malanka № 054', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-045', type: 'charging', position: [53.90093, 27.54162], name: 'Белоруснефть № 062', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-046', type: 'charging', position: [53.90117, 27.56975], name: 'Белоруснефть № 045', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-047', type: 'charging', position: [53.90990, 27.57883], name: 'Malanka № 070', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-048', type: 'charging', position: [53.86376, 27.48688], name: 'Белоруснефть № 061', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-049', type: 'charging', position: [53.91849, 27.60382], name: 'Белоруснефть № 041', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-050', type: 'charging', position: [53.90901, 27.48452], name: 'Белоруснефть № 059', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-051', type: 'charging', position: [53.90386, 27.50310], name: 'Белоруснефть № 063', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-052', type: 'charging', position: [53.91534, 27.46831], name: 'Malanka № 057', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-053', type: 'charging', position: [53.90404, 27.45658], name: 'Белоруснефть № 069', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-054', type: 'charging', position: [53.91555, 27.56637], name: 'Белоруснефть № 065', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-055', type: 'charging', position: [53.91764, 27.50184], name: 'Белоруснефть № 067', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-056', type: 'charging', position: [53.86382, 27.45490], name: 'Белоруснефть № 051', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-057', type: 'charging', position: [53.89413, 27.51990], name: 'Malanka № 072', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-058', type: 'charging', position: [53.89483, 27.55547], name: 'Белоруснефть № 049', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-059', type: 'charging', position: [53.93516, 27.49358], name: 'Белоруснефть № 073', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-060', type: 'charging', position: [53.88439, 27.55196], name: 'Белоруснефть № 086', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-061', type: 'charging', position: [53.91060, 27.53614], name: 'Malanka № 082', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-062', type: 'charging', position: [53.88923, 27.57754], name: 'Белоруснефть № 075', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-063', type: 'charging', position: [53.90703, 27.57343], name: 'Malanka № 078', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-064', type: 'charging', position: [53.86136, 27.58856], name: 'Malanka № 094', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-065', type: 'charging', position: [53.89958, 27.54287], name: 'Malanka № 077', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-066', type: 'charging', position: [53.93352, 27.50272], name: 'Malanka № 080', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-067', type: 'charging', position: [53.94788, 27.45556], name: 'Malanka № 107', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-068', type: 'charging', position: [53.93351, 27.50274], name: 'Malanka № 083', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-069', type: 'charging', position: [53.93559, 27.58027], name: 'Malanka № 095', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-070', type: 'charging', position: [53.86736, 27.46558], name: 'Malanka № 099', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-071', type: 'charging', position: [53.91642, 27.45826], name: 'Malanka № 102', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-072', type: 'charging', position: [53.93247, 27.45793], name: 'Malanka № 092', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-073', type: 'charging', position: [53.93469, 27.45858], name: 'Malanka № 093', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-074', type: 'charging', position: [53.89568, 27.57159], name: 'Malanka № 116', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-075', type: 'charging', position: [53.89129, 27.52243], name: 'Porsche Destination', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-076', type: 'charging', position: [53.90465, 27.45950], name: 'Evika (Победителей)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-077', type: 'charging', position: [53.90279, 27.61702], name: 'Evika (Восток)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-078', type: 'charging', position: [53.86512, 27.46828], name: 'Малanka (юго-запад)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-079', type: 'charging', position: [53.89828, 27.55618], name: 'Malanka (центр)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-080', type: 'charging', position: [53.90940, 27.45412], name: 'Белоруснефть (з-д Победителей)', address: 'г. Минск, пр. Победителей', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-081', type: 'charging', position: [53.92246, 27.51395], name: 'Malanka (Сухаревская)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-082', type: 'charging', position: [53.88402, 27.47946], name: 'Malanka (юго-запад 2)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-083', type: 'charging', position: [53.88481, 27.45021], name: 'Malanka (Беловежская)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-084', type: 'charging', position: [53.91686, 27.58773], name: 'BatteryFly №1', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-085', type: 'charging', position: [53.91689, 27.58779], name: 'BatteryFly №2', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-086', type: 'charging', position: [53.91646, 27.58662], name: 'Malanka (Независимости)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-087', type: 'charging', position: [53.87505, 27.59735], name: 'Malanka № 076', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-088', type: 'charging', position: [53.88679, 27.57560], name: 'Malanka № 105', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-089', type: 'charging', position: [53.89523, 27.54591], name: 'Malanka № 087', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-090', type: 'charging', position: [53.91752, 27.54951], name: 'Malanka № 079', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-091', type: 'charging', position: [53.90737, 27.54998], name: 'Белоруснефть № 085', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-092', type: 'charging', position: [53.90931, 27.57009], name: 'Белоруснефть № 084', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-093', type: 'charging', position: [53.91716, 27.54368], name: 'Malanka № 044', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-094', type: 'charging', position: [53.90396, 27.63366], name: 'Malanka (восток)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-095', type: 'charging', position: [53.92800, 27.64506], name: 'Белоруснефть (Минск-Арена)', address: 'г. Минск, пр. Победителей, Минск-Арена', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-096', type: 'charging', position: [53.83004, 27.45457], name: 'Malanka № 080 доп', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-097', type: 'charging', position: [53.87475, 27.63727], name: 'Pandora EV', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-098', type: 'charging', position: [53.87439, 27.47949], name: 'Evika (юго-запад)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-099', type: 'charging', position: [53.89505, 27.46143], name: 'Evika (запад)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-100', type: 'charging', position: [53.86358, 27.46965], name: 'Evika (Притыцкого)', priceStart: '—', pricePerMin: '—' },
  { id: 'CH-101', type: 'charging', position: [53.88301, 27.45457], name: 'Malanka (Беловежская 2)', priceStart: '—', pricePerMin: '—' },
]

const VEHICLES: Vehicle[] = [
  { id: 'S4-8829', type: 'scooter', position: [53.9045, 27.5615], name: 'Swift Scooter S4', battery: 84, rangeKm: 19, priceStart: '3.20 BYN', pricePerMin: '0.80 BYN/мин' },
  { id: 'S2-1102', type: 'scooter', position: [53.908, 27.558], name: 'Swift Scooter S2', battery: 45, rangeKm: 10, priceStart: '2.56 BYN', pricePerMin: '0.70 BYN/мин', lowBattery: true },
  { id: 'S4-5511', type: 'scooter', position: [53.901, 27.565], name: 'Swift Scooter S4', battery: 92, rangeKm: 22, priceStart: '3.20 BYN', pricePerMin: '0.80 BYN/мин' },
  { id: 'XB-3301', type: 'bike', position: [53.9065, 27.555], name: 'E-Bike X4', battery: 78, rangeKm: 45, priceStart: '3.84 BYN', pricePerMin: '0.96 BYN/мин' },
  { id: 'XB-2207', type: 'bike', position: [53.899, 27.562], name: 'E-Bike X4', battery: 100, rangeKm: 55, priceStart: '3.84 BYN', pricePerMin: '0.96 BYN/мин' },
  ...CHARGING_STATIONS,
  { id: 'EC-1001', type: 'car', position: [53.907, 27.563], name: 'EV Sedan M5', battery: 88, rangeKm: 320, seats: 5, priceStart: '15.00 BYN', pricePerMin: '2.50 BYN/мин' },
  { id: 'EC-1002', type: 'car', position: [53.898, 27.552], name: 'E-Car C1', battery: 72, rangeKm: 280, seats: 5, priceStart: '12.00 BYN', pricePerMin: '2.00 BYN/мин' },
]

// Пока на карте только зарядные станции (без самокатов, велосипедов, автомобилей)
const MAP_VEHICLES = VEHICLES.filter((v) => v.type === 'charging')

function getVehicleIconName(type: VehicleType): string {
  return type === 'scooter' ? 'electric_scooter' : type === 'bike' ? 'pedal_bike' : type === 'car' ? 'directions_car' : 'ev_station'
}

const YANDEX_MAPS_API_KEY = '83bb1cb1-7dc7-4552-bd60-439f4cecb36d'
const YANDEX_SCRIPT_ID = 'yandex-maps-api-script'
const YANDEX_SCRIPT_URL_21 = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=ru_RU`

export default function MapPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState<VehicleFilter>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(MAP_VEHICLES[0] ?? null)
  const [mapReady, setMapReady] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const yandexMapRef = useRef<InstanceType<Window['ymaps']['Map']> | null>(null)
  const initCalledRef = useRef(false)
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const handleRentClick = () => {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    // TODO: открыть процесс аренды выбранного транспорта
  }

  useEffect(() => {
    const [lat, lon] = MINSK_CENTER
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe/Minsk`
    fetch(url)
      .then((res) => res.json())
      .then((data: { current?: { temperature_2m?: number; weather_code?: number }; timezone?: string }) => {
        const temp = data.current?.temperature_2m ?? 0
        const code = data.current?.weather_code ?? 0
        const now = new Date()
        const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        setWeather({
          temp: Math.round(temp),
          weatherCode: code,
          location: 'Минск, Беларусь',
          date: dateStr,
        })
        setWeatherError(null)
      })
      .catch(() => setWeatherError('Погода недоступна'))
  }, [])

  const filteredVehicles = useMemo(() => {
    // На карте пока только зарядные станции; «Все» и «Зарядки» показывают их
    if (filter === 'all' || filter === 'charging') return MAP_VEHICLES
    if (filter === 'scooters') return []
    if (filter === 'bikes') return []
    if (filter === 'cars') return []
    return MAP_VEHICLES
  }, [filter])

  // При переключении на «Зарядки» подгоняем карту по всем станциям и сбрасываем выбор
  useEffect(() => {
    if (filter !== 'charging') return
    const charging = VEHICLES.filter((v) => v.type === 'charging')
    if (charging.length === 0) return
    setSelectedVehicle((prev) => (prev?.type === 'charging' ? prev : charging[0]))
  }, [filter])

  // Подгон границ карты при фильтре «Зарядки»
  useEffect(() => {
    const map = yandexMapRef.current
    if (!map || !mapReady || filter !== 'charging' || filteredVehicles.length === 0) return
    const ymaps = window.ymaps
    const points = filteredVehicles.map((v) => v.position)
    try {
      const bounds = ymaps.util.bounds.fromPoints(points)
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
    } catch {
      map.setCenter(MINSK_CENTER, 11)
    }
  }, [mapReady, filter, filteredVehicles])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    function initMap() {
      if (initCalledRef.current || !mapContainerRef.current || !window.ymaps) return
      initCalledRef.current = true
      const map = new window.ymaps.Map(mapContainerRef.current!, {
        center: MINSK_CENTER,
        zoom: 14,
        controls: [],
      })
      yandexMapRef.current = map
      setMapReady(true)
      setScriptError(null)
    }

    const existing = document.getElementById(YANDEX_SCRIPT_ID)
    if (existing) {
      if (window.ymaps) window.ymaps.ready(initMap)
      return
    }

    if (window.ymaps) {
      window.ymaps.ready(initMap)
      return
    }

    const script = document.createElement('script')
    script.id = YANDEX_SCRIPT_ID
    script.src = YANDEX_SCRIPT_URL_21
    script.async = true
    script.onload = () => window.ymaps?.ready(initMap)
    script.onerror = () => setScriptError('Не удалось загрузить Яндекс.Карты')
    document.head.appendChild(script)

    return () => {
      if (yandexMapRef.current) {
        yandexMapRef.current.destroy()
        yandexMapRef.current = null
      }
      initCalledRef.current = false
      setMapReady(false)
    }
  }, [retryTrigger])

  useEffect(() => {
    const map = yandexMapRef.current
    if (!map || !mapReady) return
    map.geoObjects.removeAll()
    const ymaps = window.ymaps
    filteredVehicles.forEach((vehicle) => {
      const isSelected = selectedVehicle?.id === vehicle.id
      const isCharging = vehicle.type === 'charging'
      const isCar = vehicle.type === 'car'
      const iconName = getVehicleIconName(vehicle.type)
      const balloonContent = [
        `<strong>${vehicle.name}</strong>`,
        `ID: #${vehicle.id}`,
        vehicle.battery != null ? `Батарея: ${vehicle.battery}%` : '',
      ]
        .filter(Boolean)
        .join('<br/>')
      // Зарядки: зелёный круг + иконка (выделены на карте)
      if (isCharging) {
        const iconContent = '<img src="/charging-icon.svg" width="22" height="22" alt="" style="display:block;">'
        const placemark = new ymaps.Placemark(
          vehicle.position,
          { iconContent, balloonContent, hintContent: vehicle.name },
          { preset: 'islands#circleIcon', iconColor: '#22c55e' }
        )
        placemark.events.add('click', () => setSelectedVehicle(vehicle))
        map.geoObjects.add(placemark)
        return
      }
      // Автомобили (если вернём на карту): иконка car-side
      if (isCar) {
        const placemark = new ymaps.Placemark(
          vehicle.position,
          { balloonContent, hintContent: vehicle.name },
          {
            iconLayout: 'default#image',
            iconImageHref: '/car-icon.svg',
            iconImageSize: [24, 24],
            iconImageOffset: [-12, -12],
          }
        )
        placemark.events.add('click', () => setSelectedVehicle(vehicle))
        map.geoObjects.add(placemark)
        return
      }
      // Самокаты и велосипеды: кружок с Material-иконкой
      const iconContent = `<span class="material-symbols-outlined" style="font-size:22px;color:#fff;">${iconName}</span>`
      const iconColor = vehicle.lowBattery ? '#f59e0b' : isSelected ? '#fff' : '#666'
      const placemark = new ymaps.Placemark(
        vehicle.position,
        { iconContent, balloonContent, hintContent: vehicle.name },
        { preset: 'islands#circleIcon', iconColor }
      )
      placemark.events.add('click', () => setSelectedVehicle(vehicle))
      map.geoObjects.add(placemark)
    })
  }, [mapReady, filteredVehicles, selectedVehicle?.id])

  const handleMyLocation = () => {
    const map = yandexMapRef.current
    if (!map || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setCenter([pos.coords.latitude, pos.coords.longitude], 16),
      () => {}
    )
  }

  const handleZoomIn = () => {
    const map = yandexMapRef.current
    if (map) map.setZoom(Math.min(19, map.getZoom() + 1))
  }

  const handleZoomOut = () => {
    const map = yandexMapRef.current
    if (map) map.setZoom(Math.max(2, map.getZoom() - 1))
  }

  const handleRetryMap = () => {
    setScriptError(null)
    const script = document.getElementById(YANDEX_SCRIPT_ID)
    if (script) script.remove()
    initCalledRef.current = false
    setRetryTrigger((t) => t + 1)
  }

  return (
    <div className="bg-black text-white font-display overflow-hidden h-screen w-screen flex">
      <aside className="w-[280px] flex-shrink-0 h-full flex flex-col justify-between bg-black border-r border-[#333] z-20">
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full size-12 ring-1 ring-white grayscale"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAyLYHSAqriq8pF0paqLqXgyXyjW0x09L88uuZLJwuUlQHQ_HSnYc48lxfc3i5pEKfQ0lKofxjZbOJKwfrLMxtbCMZP6WBKABxPn1NIxKIuD-ll-jlln1f4uzCCEuKhxlpGJ3wFayA_DtGBzQQtJB-sTf6ssA_Q7MqJWgUZXO-1G5d3BuLDyP34AgyBQFv4_XrCmN3N6yh6nFhzmnwiKtk74f8R8fbSTU40A2k7EE37ew7VwK-cuScsFM9EIkxUJlhUkheXXg7jGtE")' }}
              aria-hidden
            />
            <div className="flex flex-col">
              <h1 className="text-white text-lg font-bold leading-tight uppercase tracking-wide">EV Rentals</h1>
              <p className="text-gray-400 text-xs font-normal">Кредиты: <span className="text-white font-bold">78.40 BYN</span></p>
            </div>
          </div>
          <button type="button" className="flex w-full cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-white text-black text-sm font-bold border border-white hover:bg-black hover:text-white transition-colors">
            <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
            Пополнить
          </button>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:border hover:border-white/20 transition-all">
            <span className="material-symbols-outlined">home</span>
            <span className="text-sm font-medium">Главная</span>
          </Link>
          <Link to="/map" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-black border border-white">
            <span className="material-symbols-outlined">map</span>
            <span className="text-sm font-bold">Карта</span>
          </Link>
          <a href="#wallet" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:border hover:border-white/20 transition-all">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-sm font-medium">Кошелёк</span>
          </a>
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:border hover:border-white/20 transition-all">
            <span className="material-symbols-outlined">pedal_bike</span>
            <span className="text-sm font-medium">Поездки</span>
          </Link>
          <a href="#settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:border hover:border-white/20 transition-all">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </a>
          <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:border hover:border-white/20 transition-all">
            <span className="material-symbols-outlined">support_agent</span>
            <span className="text-sm font-medium">Поддержка</span>
          </Link>
        </nav>
        <div className="px-4 pb-4 flex justify-center">
          {weatherError && (
            <div className="weather-card flex items-center justify-center min-h-[140px] text-sm text-amber-700">
              {weatherError}
            </div>
          )}
          {!weatherError && weather && (
            <div className="weather-card">
              <div className="weather-container" aria-hidden>
                {weather.weatherCode <= 2 && (
                  <>
                    <span className="weather-sun sunshine" />
                    <span className="weather-sun" />
                  </>
                )}
                <div className={`weather-cloud front ${weather.weatherCode >= 1 ? '' : 'opacity-0'}`}>
                  <span className="left-front" />
                  <span className="right-front" />
                </div>
                <div className={`weather-cloud back ${weather.weatherCode >= 1 ? '' : 'opacity-0'}`}>
                  <span className="left-back" />
                  <span className="right-back" />
                </div>
              </div>
              <div className="weather-card-header">
                <span className="weather-location">{weather.location}</span>
                <span className="weather-date">{weather.date}</span>
              </div>
              <span className="weather-temp">{weather.temp}°</span>
              <div className="weather-temp-scale">
                <span>Цельсий</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#333] bg-black">
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span className="material-symbols-outlined text-white text-[16px]">wifi</span>
            <span>Система онлайн</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative h-full bg-black">
        <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md shadow-2xl shadow-black/80">
            <label className="flex flex-col w-full h-12">
              <div className="flex w-full items-center rounded-lg bg-black border border-[#333]">
                <div className="text-white flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-4 h-full text-sm font-medium"
                  placeholder="Поиск места или ID транспорта..."
                />
                <div className="pr-2">
                  <button type="button" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
                    <span className="material-symbols-outlined">tune</span>
                  </button>
                </div>
              </div>
            </label>
          </div>
          <div className="flex flex-col gap-2 pointer-events-auto">
            <button type="button" onClick={handleMyLocation} className="size-10 flex items-center justify-center bg-black text-white rounded-lg shadow-lg border border-[#333] hover:bg-white hover:text-black transition-colors">
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <div className="flex flex-col rounded-lg shadow-lg border border-[#333] overflow-hidden">
              <button type="button" onClick={handleZoomIn} className="size-10 flex items-center justify-center bg-black text-white hover:bg-white hover:text-black border-b border-[#333] transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button type="button" onClick={handleZoomOut} className="size-10 flex items-center justify-center bg-black text-white hover:bg-white hover:text-black transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-[1000] pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-sm border border-[#333] rounded-xl p-2 shadow-xl flex flex-wrap gap-1">
            {(['all', 'scooters', 'bikes', 'cars', 'charging'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key ? 'bg-white text-black border border-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {key === 'all' ? 'apps' : key === 'scooters' ? 'electric_scooter' : key === 'bikes' ? 'pedal_bike' : key === 'cars' ? 'directions_car' : 'ev_station'}
                </span>
                {key === 'all' ? 'Все' : key === 'scooters' ? 'Самокаты' : key === 'bikes' ? 'Велосипеды' : key === 'cars' ? 'Автомобили' : 'Зарядки'}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-[1000] w-[380px] pointer-events-auto">
          <div className="bg-[#121212] border border-[#333] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {selectedVehicle ? (
              <>
                <div
                  className="h-48 bg-cover bg-center relative grayscale contrast-125"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAKh-gt3atDaojRYxqf5xO7W31QU2sRqbpnXSEA2quT9CfOSlWYfpK2G2yha0Tj6NQCkFdJdmJ1klNLioop5FPIeNvx_qviLPFcvVGS4AzgShwL3o5pdEbtldGERoVCBxwfMQWS2v6bEcCfsWEfV1aTrojsBv3FO6eFb87qUmFxaGS9YqftnWI1eVYj5hc417_Ygg41fTehSG_aDIOsspt4N5N62wr74ujBfb6PrqI9bytVld2O1f-gtsHlsof_CE7CdbduMZlzWGs")' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedVehicle(null)}
                    className="absolute top-3 left-3 size-8 rounded-full bg-black/80 hover:bg-black border border-white text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Закрыть"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border ${selectedVehicle.lowBattery ? 'bg-amber-600 text-black border-amber-400' : 'bg-black text-white border-white'}`}>
                    <span className={`size-2 rounded-full ${selectedVehicle.lowBattery ? 'bg-black' : 'bg-white animate-pulse'}`} />
                    {selectedVehicle.lowBattery ? 'Низкий заряд' : 'Доступен'}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#121212] to-transparent" />
                </div>
                <div className="p-5 flex flex-col gap-4 -mt-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight uppercase">{selectedVehicle.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">ID: #{selectedVehicle.id} • ~0.3 км</p>
                      {selectedVehicle.type === 'charging' && (
                        <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {selectedVehicle.address ?? 'г. Минск'}
                        </p>
                      )}
                    </div>
                    {selectedVehicle.type !== 'charging' && (
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-white font-mono">{selectedVehicle.priceStart}</span>
                        <span className="text-gray-400 text-xs">+ {selectedVehicle.pricePerMin}</span>
                      </div>
                    )}
                  </div>
                  {selectedVehicle.type !== 'charging' && (selectedVehicle.battery != null || selectedVehicle.seats != null) && (
                    <div className={`grid gap-3 ${selectedVehicle.seats != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {selectedVehicle.battery != null && (
                        <div className="bg-[#121212] rounded-lg p-3 flex flex-col gap-1 border border-[#333]">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-white">battery_charging_full</span>
                            Батарея
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.battery}%</span>
                        </div>
                      )}
                      {selectedVehicle.rangeKm != null && (
                        <div className="bg-[#121212] rounded-lg p-3 flex flex-col gap-1 border border-[#333]">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-white">distance</span>
                            Запас
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.rangeKm} км</span>
                        </div>
                      )}
                      {selectedVehicle.seats != null && (
                        <div className="bg-[#121212] rounded-lg p-3 flex flex-col gap-1 border border-[#333]">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-white">group</span>
                            Мест
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.seats}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedVehicle.type !== 'charging' && (
                    <div className="flex gap-3 mt-1">
                      <button type="button" onClick={handleRentClick} className="flex-1 h-11 bg-white hover:bg-gray-200 text-black border border-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <span className="material-symbols-outlined">lock_open</span>
                        {user ? 'Забронировать' : 'Войти для аренды'}
                      </button>
                      <button type="button" className="size-11 flex-shrink-0 bg-black text-gray-300 hover:text-white rounded-lg border border-[#333] hover:border-white flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined">qr_code_scanner</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-gray-400 text-center">Выберите транспорт на карте</div>
            )}
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <div ref={mapContainerRef} className="h-full w-full bg-black" />
          {scriptError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[300] p-6">
              <div className="text-center text-gray-300 max-w-md flex flex-col gap-4">
                <p className="font-bold text-white">Яндекс.Карты не загружены</p>
                <p className="text-sm">{scriptError}</p>
                <p className="text-xs text-gray-500">Проверьте API-ключ и подключение к интернету. Отключите блокировщики рекламы для этого сайта.</p>
                <a
                  href={YANDEX_SCRIPT_URL_21}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 underline"
                >
                  Открыть ссылку на API в новой вкладке
                </a>
                <button
                  type="button"
                  onClick={handleRetryMap}
                  className="mx-auto px-6 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors"
                >
                  Повторить загрузку
                </button>
              </div>
            </div>
          )}
          {!scriptError && mapReady && (
            <div className="absolute bottom-1 right-1 px-2 py-1 bg-black/80 text-[10px] text-gray-500 border border-[#333] rounded z-[400]">
              © <a href="https://yandex.ru/maps" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300">Яндекс.Карты</a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

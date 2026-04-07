import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as signalR from '@microsoft/signalr'
import { rentalHubUrl } from '../lib/apiOrigin'
import { createSignalRLoggerIgnoringNegotiationAbort, isSignalRNegotiationAbortError } from '../lib/signalRStrictMode'
import { useAuth } from '../context/AuthContext'
import {
  fetchPublicVehicles,
  fetchActiveRental,
  reserveVehicle,
  startRental,
  pauseRental,
  resumeRental,
  completeRental,
  cancelReservation,
  type ApiVehicle,
  type RentalActiveDto,
  type TripReceiptDto,
} from '../api/fleet'
import QRCode from 'react-qr-code'
import { playNotifySound } from '../lib/notifyBeep'
import { buildFleetMapMarkerDataUrl, type FleetMapMarkerKind } from '../lib/mapFleetMarker'
import { VEHICLE_CLASS_LABEL_RU } from '../lib/tariffCaps'
import { buildVehicleMapDeepLink } from '../lib/vehicleQrLink'
import type { SiteOutletContext } from '../lib/siteOutletContext'

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
  /** Статус парка с API: available | reserved | inuse */
  fleetStatus?: string
  /** Адрес (для зарядных станций / заправок) */
  address?: string
  /** URL фото для шапки карточки (с API или fallback по типу) */
  photoUrl?: string
  /** Текст описания в карточке */
  description?: string
  /** Класс тарифа (авто): economy | comfort | premium */
  vehicleClass?: string
}

const MINSK_CENTER: [number, number] = [53.9045, 27.5615]

const VEHICLE_HERO_FALLBACK: Record<Exclude<VehicleType, 'charging'>, string> = {
  scooter:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Electric_kick_scooter_in_Paris_2018.jpg/1280px-Electric_kick_scooter_in_Paris_2018.jpg',
  bike: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Electric_bicycle_at_station_%282%29.jpg/1280px-Electric_bicycle_at_station_%282%29.jpg',
  car: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Tesla_Model_3_parked%2C_front_left_corner.jpg/1280px-Tesla_Model_3_parked%2C_front_left_corner.jpg',
}

const CHARGING_CARD_HERO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Charging_station_of_Tesla_in_Shanghai.jpg/1280px-Charging_station_of_Tesla_in_Shanghai.jpg'

function vehicleCardHeroImage(v: Vehicle): string {
  if (v.type === 'charging') return CHARGING_CARD_HERO
  return v.photoUrl?.trim() || VEHICLE_HERO_FALLBACK[v.type]
}

function mapMarkerHint(v: Vehicle): string {
  if (v.type === 'charging') return v.name
  const fs = (v.fleetStatus ?? 'available').toLowerCase()
  if (fs === 'reserved') return `${v.name} · Забронировано`
  if (fs === 'inuse') return `${v.name} · В поездке`
  return v.name
}

function mapApiVehicleToVehicle(v: ApiVehicle): Vehicle {
  const isCharging = v.type === 'charging'
  return {
    id: v.id,
    type: v.type as VehicleType,
    position: v.position,
    name: v.name,
    battery: v.battery != null ? Number(v.battery) : undefined,
    rangeKm: v.rangeKm ?? undefined,
    seats: v.seats ?? undefined,
    priceStart: isCharging ? '—' : `${Number(v.priceStart).toFixed(2)} BYN`,
    pricePerMin: isCharging ? '—' : `${Number(v.pricePerMinute).toFixed(2)} BYN/мин`,
    lowBattery: v.lowBattery,
    fleetStatus: v.status,
    photoUrl: v.photoUrl?.trim() || undefined,
    description: v.description?.trim() || undefined,
    vehicleClass: v.type === 'car' && v.vehicleClass ? v.vehicleClass : undefined,
  }
}

const YANDEX_MAPS_API_KEY = '83bb1cb1-7dc7-4552-bd60-439f4cecb36d'
const YANDEX_SCRIPT_ID = 'yandex-maps-api-script'
const YANDEX_SCRIPT_URL_21 = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=ru_RU`

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const [lat1, lon1] = a
  const [lat2, lon2] = b
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const q =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)))
}

function formatAvgDistanceMeters(m: number): string {
  if (!Number.isFinite(m) || m < 0) return '—'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

/** Метка на Яндекс.Картах (типы пакета неполные). */
type YMapPlacemark = {
  options: { set: (key: string | Record<string, unknown>, value?: unknown) => void }
  geometry: { setCoordinates: (c: [number, number]) => void }
  properties: { set: (key: string, value: unknown) => void }
  events: { add: (event: string, handler: () => void) => void }
}

function formatReservationCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MapPage() {
  const { mapUi } = useOutletContext<SiteOutletContext>()
  if (!mapUi) throw new Error('MapPage: требуется mapUi из SiteLayout')
  const { mapQuery, mapOnlyAvailable } = mapUi

  const { token, user, isAccessTokenValid, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<VehicleFilter>('cars')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const yandexMapRef = useRef<InstanceType<Window['ymaps']['Map']> | null>(null)
  const initCalledRef = useRef(false)
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [rentalError, setRentalError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<TripReceiptDto | null>(null)
  const [useCarsikiOnComplete, setUseCarsikiOnComplete] = useState(false)
  const [carsikiToast, setCarsikiToast] = useState<string | null>(null)
  const lowBeepDoneRef = useRef(false)
  /** Актуальный список ТС для клика по метке (без замыкания на старый массив). */
  const mapFilteredVehiclesRef = useRef<Vehicle[]>([])
  const placemarksByIdRef = useRef<Map<string, YMapPlacemark>>(new Map())
  const lastPlacemarkIconHrefRef = useRef<Map<string, string>>(new Map())
  const [completeTripDialogOpen, setCompleteTripDialogOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null)
  const [reservationTick, setReservationTick] = useState(0)

  const dismissVehiclePanel = useCallback(() => {
    setSelectedVehicle(null)
  }, [])

  const { data: apiVehicles = [], isError: vehiclesError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchPublicVehicles,
    staleTime: 45_000,
  })

  const rentableFleet = useMemo(() => apiVehicles.map(mapApiVehicleToVehicle), [apiVehicles])

  const copyVehicleLink = useCallback(async (href: string) => {
    try {
      await navigator.clipboard.writeText(href)
      setCopyLinkError(null)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      setCopyLinkError('Не удалось скопировать')
    }
  }, [])

  useEffect(() => {
    setLinkCopied(false)
    setCopyLinkError(null)
  }, [selectedVehicle?.id])

  const { data: activeRental } = useQuery({
    queryKey: ['rental', 'active', token],
    queryFn: () => fetchActiveRental(token!),
    enabled: Boolean(token) && isAccessTokenValid,
    // Активная поездка: метрики приходят по SignalR (серверный тик RentalUpdated), без опроса HTTP.
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'active' || s === 'paused') return false
      // Бронь: редкий запасной refetch, если отвалится WebSocket (сервер всё равно снимает бронь по тику).
      if (s === 'reserved') return 60_000
      return false
    },
  })

  useEffect(() => {
    if (activeRental?.status !== 'reserved') return
    const id = window.setInterval(() => setReservationTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [activeRental?.status, activeRental?.rentalId])

  const reservationRemainingSec = useMemo(() => {
    if (activeRental?.status !== 'reserved') return null
    let endMs = activeRental.reservationExpiresAt ? Date.parse(activeRental.reservationExpiresAt) : NaN
    if (Number.isNaN(endMs)) {
      const ra = Date.parse(activeRental.reservedAt)
      if (!Number.isNaN(ra)) endMs = ra + 20 * 60 * 1000
    }
    if (Number.isNaN(endMs)) return null
    /* eslint-disable-next-line react-hooks/purity -- остаток брони от «сейчас», обновляется по reservationTick */
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000))
  }, [
    activeRental?.status,
    activeRental?.reservationExpiresAt,
    activeRental?.reservedAt,
    activeRental?.rentalId,
    reservationTick,
  ])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(rentalHubUrl(), {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .configureLogging(createSignalRLoggerIgnoringNegotiationAbort())
      .withAutomaticReconnect()
      .build()

    const onRental = (dto: RentalActiveDto | null) => {
      queryClient.setQueryData(['rental', 'active', token], dto)
      void refreshProfile()
    }
    const onFleet = () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    }

    conn.on('RentalUpdated', onRental)
    conn.on('FleetUpdated', onFleet)

    void conn
      .start()
      .then(() => {
        if (cancelled) return
        void queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        void queryClient.invalidateQueries({ queryKey: ['rental', 'active', token] })
      })
      .catch((err: unknown) => {
        if (cancelled || isSignalRNegotiationAbortError(err)) return
        console.error(err)
      })

    return () => {
      cancelled = true
      conn.off('RentalUpdated', onRental)
      conn.off('FleetUpdated', onFleet)
      void conn.stop()
    }
  }, [token, queryClient, refreshProfile])

  const reserveMut = useMutation({
    mutationFn: () => reserveVehicle(token!, selectedVehicle!.id),
    onSuccess: async () => {
      setRentalError(null)
      await queryClient.invalidateQueries({ queryKey: ['rental'] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      if (token) {
        await queryClient.refetchQueries({ queryKey: ['rental', 'active', token] })
      }
      void refreshProfile()
    },
    onError: (e: Error & { code?: string }) => {
      setRentalError(e.message)
      if (e.code === 'InsufficientBalance') navigate('/dashboard', { state: { walletHighlight: true } })
    },
  })

  const startMut = useMutation({
    mutationFn: () => startRental(token!),
    onSuccess: async () => {
      setRentalError(null)
      void refreshProfile()
    },
    onError: (e: Error & { code?: string }) => {
      setRentalError(e.message)
      if (e.code === 'InsufficientBalance') navigate('/dashboard', { state: { walletHighlight: true } })
    },
  })

  const pauseMut = useMutation({
    mutationFn: () => pauseRental(token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['rental'] }),
    onError: (e: Error) => setRentalError(e.message),
  })

  const resumeMut = useMutation({
    mutationFn: () => resumeRental(token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['rental'] }),
    onError: (e: Error) => setRentalError(e.message),
  })

  const completeMut = useMutation({
    mutationFn: () => completeRental(token!, useCarsikiOnComplete),
    onSuccess: async (r) => {
      setCompleteTripDialogOpen(false)
      setReceipt(r)
      setRentalError(null)
      lowBeepDoneRef.current = false
      setUseCarsikiOnComplete(false)
      const earned = r.carsikiEarned ?? 0
      if (earned > 0) {
        setCarsikiToast(`+${earned} CARSIKI начислено за поездку (100 CARSIKI = 1 BYN)`)
        window.setTimeout(() => setCarsikiToast(null), 7000)
      }
      await queryClient.invalidateQueries({ queryKey: ['rental'] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void refreshProfile()
    },
    onError: (e: Error) => setRentalError(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelReservation(token!),
    onSuccess: async () => {
      setRentalError(null)
      await queryClient.invalidateQueries({ queryKey: ['rental'] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (e: Error) => setRentalError(e.message),
  })

  const handleRentClick = useCallback(() => {
    if (!token || !user) {
      navigate('/login', { state: { from: '/map' } })
      return
    }
    if (!selectedVehicle || selectedVehicle.type === 'charging') return
    setRentalError(null)
    reserveMut.mutate()
  }, [token, user, selectedVehicle, navigate, reserveMut])

  useEffect(() => {
    if (activeRental?.lowBatteryMode && !lowBeepDoneRef.current) {
      lowBeepDoneRef.current = true
      playNotifySound()
    }
    if (!activeRental) lowBeepDoneRef.current = false
  }, [activeRental])

  /** Вкладки типа ТС (Все / самокаты / …). */
  const tabFilteredVehicles = useMemo(() => {
    if (filter === 'charging') return rentableFleet.filter((v) => v.type === 'charging')
    if (filter === 'scooters') return rentableFleet.filter((v) => v.type === 'scooter')
    if (filter === 'bikes') return rentableFleet.filter((v) => v.type === 'bike')
    if (filter === 'cars') return rentableFleet.filter((v) => v.type === 'car')
    return rentableFleet.filter((v) => v.type !== 'charging')
  }, [filter, rentableFleet])

  /** Поиск по ID / названию / описанию + «только свободные». */
  const mapFilteredVehicles = useMemo(() => {
    let list = tabFilteredVehicles
    if (mapOnlyAvailable) {
      list = list.filter(
        (v) => v.type === 'charging' || v.fleetStatus === 'available' || v.fleetStatus == null || v.fleetStatus === ''
      )
    }
    const q = mapQuery.trim().toLowerCase().replace(/^#/, '')
    if (!q) return list
    return list.filter((v) => {
      const id = v.id.toLowerCase()
      const name = v.name.toLowerCase()
      const desc = (v.description ?? '').toLowerCase()
      return id.includes(q) || name.includes(q) || desc.includes(q)
    })
  }, [tabFilteredVehicles, mapOnlyAvailable, mapQuery])

  const liveFleetStats = useMemo(() => {
    const transport = mapFilteredVehicles.filter((v) => v.type !== 'charging')
    const available = transport.filter(
      (v) => v.fleetStatus === 'available' || v.fleetStatus == null || v.fleetStatus === '',
    ).length
    const forDist = transport.filter((v) => v.fleetStatus !== 'inuse')
    const center: [number, number] = [MINSK_CENTER[0], MINSK_CENTER[1]]
    let avgM = 0
    if (forDist.length > 0) {
      const sum = forDist.reduce((acc, v) => acc + haversineMeters(center, v.position), 0)
      avgM = sum / forDist.length
    }
    return {
      availableLabel: available.toLocaleString('en-US'),
      avgLabel: forDist.length ? formatAvgDistanceMeters(avgM) : '—',
    }
  }, [mapFilteredVehicles])

  useEffect(() => {
    const vid = searchParams.get('vehicle')
    if (!vid || rentableFleet.length === 0) return
    const v = rentableFleet.find((x) => x.id === vid)
    if (v) {
      if (v.type === 'car') setFilter('cars')
      else if (v.type === 'bike') setFilter('bikes')
      else if (v.type === 'scooter') setFilter('scooters')
      else if (v.type === 'charging') setFilter('charging')
      setSelectedVehicle(v)
    }
  }, [searchParams, rentableFleet])

  useEffect(() => {
    if (filter !== 'charging') return
    const list = rentableFleet.filter((v) => v.type === 'charging')
    setSelectedVehicle((prev) => {
      if (list.length === 0) return prev?.type === 'charging' ? null : prev
      if (prev?.type === 'charging' && list.some((c) => c.id === prev.id)) return prev
      return null
    })
  }, [filter, rentableFleet])

  useEffect(() => {
    setSelectedVehicle((prev) => {
      if (!prev) return prev
      if (mapFilteredVehicles.some((v) => v.id === prev.id)) return prev
      return null
    })
  }, [mapFilteredVehicles])

  // Подгон границ карты при фильтре «Зарядки»
  useEffect(() => {
    const map = yandexMapRef.current
    if (!map || !mapReady || filter !== 'charging' || mapFilteredVehicles.length === 0) return
    const ymaps = window.ymaps
    const points = mapFilteredVehicles.map((v) => v.position)
    try {
      const bounds = ymaps.util.bounds.fromPoints(points)
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
    } catch {
      map.setCenter(MINSK_CENTER, 11)
    }
  }, [mapReady, filter, mapFilteredVehicles])

  /** Один результат поиска — центрировать карту */
  useEffect(() => {
    const map = yandexMapRef.current
    const q = mapQuery.trim()
    if (!map || !mapReady || q.length < 2 || mapFilteredVehicles.length !== 1) return
    const [lat, lng] = mapFilteredVehicles[0].position
    try {
      map.setCenter([lat, lng], Math.max(map.getZoom(), 15))
    } catch {
      /* ignore */
    }
  }, [mapReady, mapQuery, mapFilteredVehicles])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    function fitMapViewport(map: InstanceType<Window['ymaps']['Map']>) {
      try {
        map.container.fitToViewport()
      } catch {
        /* API может быть недоступен до полной отрисовки */
      }
    }

    function initMap() {
      if (initCalledRef.current || !mapContainerRef.current || !window.ymaps) return
      initCalledRef.current = true
      const map = new window.ymaps.Map(mapContainerRef.current!, {
        center: MINSK_CENTER,
        zoom: 14,
        controls: [],
      })
      yandexMapRef.current = map
      try {
        const o = (map as unknown as { options?: { set?: (k: string, v: unknown) => void } }).options
        o?.set?.('theme', 'dark')
      } catch {
        /* тема может быть недоступна в raster 2.1 */
      }
      /* Контейнер часто 0×0 при первом кадре (flex + absolute) — без этого тайлы не грузятся */
      requestAnimationFrame(() => {
        fitMapViewport(map)
        requestAnimationFrame(() => fitMapViewport(map))
      })
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
      placemarksByIdRef.current.clear()
      lastPlacemarkIconHrefRef.current.clear()
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
    const el = mapContainerRef.current
    if (!mapReady || !map || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      try {
        map.container.fitToViewport()
      } catch {
        /* ignore */
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mapReady])

  useEffect(() => {
    const map = yandexMapRef.current
    if (!map || !mapReady || !window.ymaps) return

    mapFilteredVehiclesRef.current = mapFilteredVehicles
    const ymaps = window.ymaps
    const MARKER_W = 56
    const MARKER_H = 68
    const placemarks = placemarksByIdRef.current
    const lastHref = lastPlacemarkIconHrefRef.current

    const ordered =
      selectedVehicle == null
        ? mapFilteredVehicles
        : [...mapFilteredVehicles].sort((a, b) => {
            if (a.id === selectedVehicle.id) return 1
            if (b.id === selectedVehicle.id) return -1
            return 0
          })

    const geo = map.geoObjects as { add: (o: unknown) => void; remove: (o: unknown) => void; removeAll: () => void }
    const desiredIds = new Set(ordered.map((v) => v.id))
    for (const [id, pm] of [...placemarks.entries()]) {
      if (!desiredIds.has(id)) {
        try {
          geo.remove(pm)
        } catch {
          /* ignore */
        }
        placemarks.delete(id)
        lastHref.delete(id)
      }
    }

    for (const vehicle of ordered) {
      const isSelected = selectedVehicle?.id === vehicle.id
      const kind: FleetMapMarkerKind =
        vehicle.type === 'charging' ? 'charging' : vehicle.type
      const batteryPercent =
        vehicle.type === 'charging'
          ? null
          : activeRental?.vehicleId === vehicle.id && activeRental.batteryPercent != null
            ? Math.round(Number(activeRental.batteryPercent))
            : vehicle.battery != null
              ? Math.round(vehicle.battery)
              : null
      const lowBattery =
        vehicle.type !== 'charging' &&
        Boolean(
          vehicle.lowBattery ||
            (batteryPercent != null && batteryPercent <= 20) ||
            (activeRental?.vehicleId === vehicle.id && activeRental?.lowBatteryMode)
        )

      const iconHref = buildFleetMapMarkerDataUrl({
        kind,
        batteryPercent,
        lowBattery,
        selected: isSelected,
        fleetStatus: vehicle.fleetStatus,
      })

      const hint = mapMarkerHint(vehicle)
      const vid = vehicle.id
      let pm = placemarks.get(vid) as YMapPlacemark | undefined

      if (!pm) {
        const newPm = new ymaps.Placemark(
          vehicle.position,
          { hintContent: hint },
          {
            hasBalloon: false,
            openBalloonOnClick: false,
            iconLayout: 'default#image',
            iconImageHref: iconHref,
            iconImageSize: [MARKER_W, MARKER_H],
            iconImageOffset: [-MARKER_W / 2, -MARKER_H],
            iconShape: {
              type: 'Rectangle',
              coordinates: [
                [-MARKER_W / 2, -MARKER_H],
                [MARKER_W / 2, 0],
              ],
            },
          }
        ) as unknown as YMapPlacemark
        pm = newPm
        pm.events.add('click', () => {
          const v = mapFilteredVehiclesRef.current.find((x) => x.id === vid)
          if (v) setSelectedVehicle(v)
        })
        geo.add(pm)
        placemarks.set(vid, pm)
        lastHref.set(vid, iconHref)
      } else {
        try {
          pm.geometry.setCoordinates(vehicle.position)
        } catch {
          /* ignore */
        }
        pm.properties.set('hintContent', hint)
        const prev = lastHref.get(vid)
        if (prev !== iconHref) {
          pm.options.set({
            iconImageHref: iconHref,
            iconImageSize: [MARKER_W, MARKER_H],
            iconImageOffset: [-MARKER_W / 2, -MARKER_H],
          })
          lastHref.set(vid, iconHref)
        }
      }
    }
  }, [
    mapReady,
    mapFilteredVehicles,
    selectedVehicle?.id,
    activeRental?.vehicleId,
    activeRental?.batteryPercent,
    activeRental?.lowBatteryMode,
    activeRental?.status,
  ])

  const vehicleDeepLink = useMemo(
    () => (selectedVehicle ? buildVehicleMapDeepLink(selectedVehicle.id) : ''),
    [selectedVehicle?.id]
  )

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

  const mineTrip =
    Boolean(selectedVehicle && activeRental && activeRental.vehicleId === selectedVehicle.id)
  const hasOpenRental = activeRental != null
  const canReserveHere =
    Boolean(
      selectedVehicle &&
        selectedVehicle.type !== 'charging' &&
        !hasOpenRental &&
        (selectedVehicle.fleetStatus === 'available' || !selectedVehicle.fleetStatus)
    )
  const showPrimaryStart = Boolean(mineTrip && activeRental?.status === 'reserved')
  const showPrimaryReserve = canReserveHere
  const liveBattery =
    selectedVehicle && activeRental?.vehicleId === selectedVehicle.id
      ? Math.round(activeRental.batteryPercent)
      : selectedVehicle?.battery

  const availabilityLabel = (() => {
    if (!selectedVehicle || selectedVehicle.type === 'charging') return ''
    if (mineTrip) {
      if (activeRental?.status === 'reserved') return 'Забронировано'
      if (activeRental?.status === 'paused') return 'Пауза'
      if (activeRental?.status === 'active') return 'В поездке'
    }
    const fs = selectedVehicle.fleetStatus ?? 'available'
    if (fs !== 'available') return 'Недоступно'
    if (selectedVehicle.lowBattery) return 'Низкий заряд'
    return 'Доступен'
  })()

  const showLowBadge =
    Boolean(selectedVehicle?.type !== 'charging' && (selectedVehicle?.lowBattery || activeRental?.lowBatteryMode))

  const neonIconFill = { fontVariationSettings: "'FILL' 1" } as const

  return (
    <div className="bg-[color:var(--color-map-bg)] text-white font-display overflow-hidden flex-1 min-h-0 w-full min-h-dvh h-dvh relative flex flex-col">
      {carsikiToast ? (
        <div
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[2600] max-w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-[color:var(--color-map-tertiary-glow)]/50 bg-neutral-950/95 text-[color:var(--color-map-tertiary-glow)] px-4 py-3 text-sm shadow-xl"
          role="status"
        >
          {carsikiToast}
        </div>
      ) : null}

      <main className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden bg-[color:var(--color-map-bg)]">
        <div className="fixed z-[38] bottom-[max(5.5rem,env(safe-area-inset-bottom)+4.5rem)] sm:bottom-12 left-4 right-4 md:left-[7rem] md:right-auto md:max-w-xs pointer-events-auto">
          <div className="bg-neutral-900/60 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-map-tertiary-glow)] shadow-[0_0_8px_#6bfe9c]" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400">
                Live Operations: Minsk
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Available Vehicles</p>
                <p className="text-xl sm:text-2xl font-display font-bold tabular-nums">{liveFleetStats.availableLabel}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Avg. Distance</p>
                <p className="text-xl sm:text-2xl font-display font-bold tabular-nums">{liveFleetStats.avgLabel}</p>
              </div>
            </div>
          </div>
          {vehiclesError && (
            <p className="text-amber-400 text-[10px] sm:text-xs mt-2 px-0.5">Не удалось загрузить парк с сервера</p>
          )}
          {activeRental?.lowBatteryMode && (
            <div className="mt-2 rounded-xl border border-amber-500/80 bg-amber-950/95 text-amber-100 text-[10px] sm:text-xs px-3 py-2">
              Низкий заряд транспорта. Ограничение скорости {activeRental.speedLimitKmh ?? 90} км/ч.
            </div>
          )}
        </div>

        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[40] pointer-events-auto w-[min(calc(100vw-1rem),52rem)] px-1">
          <div className="bg-neutral-900/60 backdrop-blur-2xl rounded-full p-1.5 sm:p-2 flex items-center gap-0.5 sm:gap-2 shadow-[0px_24px_48px_rgba(0,0,0,0.6)] border border-white/5 overflow-x-auto [scrollbar-width:none]">
            {(['all', 'scooters', 'bikes', 'cars'] as const).map((key) => {
              const active = filter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`shrink-0 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1 sm:gap-2 ${
                    active
                      ? 'bg-[#D4FF00] text-[#0a0a0a] shadow-[0_0_20px_rgba(212,255,0,0.3)]'
                      : 'text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  {key === 'scooters' || key === 'bikes' || key === 'cars' ? (
                    <span
                      className="material-symbols-outlined text-base sm:text-lg"
                      style={key === 'cars' && active ? neonIconFill : undefined}
                    >
                      {key === 'scooters' ? 'electric_scooter' : key === 'bikes' ? 'pedal_bike' : 'electric_car'}
                    </span>
                  ) : null}
                  {key === 'all' ? 'All' : key === 'scooters' ? 'Scooters' : key === 'bikes' ? 'Bikes' : 'Cars'}
                </button>
              )
            })}
            <div className="w-px h-5 sm:h-6 bg-white/10 mx-1 shrink-0" />
            <button
              type="button"
              aria-label="Зарядные станции"
              onClick={() => setFilter('charging')}
              className={`shrink-0 p-2 sm:p-3 rounded-full transition-all ${
                filter === 'charging' ? 'bg-[#D4FF00] text-[#0a0a0a] shadow-[0_0_20px_rgba(212,255,0,0.3)]' : 'text-neutral-400 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">ev_station</span>
            </button>
          </div>
        </div>

        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.5rem,env(safe-area-inset-right))] z-[40] flex flex-col gap-3 sm:gap-4 pointer-events-auto">
          <div className="flex flex-col bg-neutral-900/80 backdrop-blur-xl rounded-full p-0.5 shadow-2xl border border-white/5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-3 sm:p-4 hover:text-[#D4FF00] transition-colors border-b border-white/5"
              aria-label="Приблизить"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button type="button" onClick={handleZoomOut} className="p-3 sm:p-4 hover:text-[#D4FF00] transition-colors" aria-label="Отдалить">
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleMyLocation}
            className="bg-[#D4FF00] p-3 sm:p-4 rounded-full text-[#546600] shadow-2xl transition-transform hover:scale-105 active:scale-95"
            aria-label="Моё местоположение"
          >
            <span className="material-symbols-outlined" style={neonIconFill}>
              my_location
            </span>
          </button>
        </div>

        {selectedVehicle && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-[max(4.5rem,env(safe-area-inset-bottom)+3.5rem)] sm:pb-[max(1rem,env(safe-area-inset-bottom))] lg:bottom-6 lg:pb-0 pointer-events-none">
          <div className="layout-safe-x flex justify-stretch lg:justify-end pointer-events-none">
          <div className="w-full lg:w-[380px] max-w-full pointer-events-auto">
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(52dvh,520px)] lg:max-h-none">
                <div
                  className="h-48 bg-cover bg-center relative grayscale contrast-125"
                  style={{ backgroundImage: `url("${vehicleCardHeroImage(selectedVehicle)}")` }}
                >
                  <button
                    type="button"
                    onClick={dismissVehiclePanel}
                    className="absolute top-3 left-3 size-8 rounded-full bg-black/80 hover:bg-black border border-white text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Закрыть карточку"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                  <div
                    className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
                      showLowBadge ? 'bg-amber-600 text-black border-amber-400' : 'bg-black text-white border-white'
                    }`}
                  >
                    <span className={`size-2 rounded-full ${showLowBadge ? 'bg-black' : 'bg-white animate-pulse'}`} />
                    {availabilityLabel || '—'}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-900 to-transparent" />
                </div>
                <div className="p-5 flex flex-col gap-4 -mt-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight uppercase">{selectedVehicle.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">ID: #{selectedVehicle.id} • ~0.3 км</p>
                      {selectedVehicle.type === 'car' && selectedVehicle.vehicleClass ? (
                        <p className="text-gray-400 text-xs mt-0.5">
                          Класс:{' '}
                          <span className="text-gray-300">
                            {VEHICLE_CLASS_LABEL_RU[selectedVehicle.vehicleClass.toLowerCase()] ??
                              selectedVehicle.vehicleClass}
                          </span>
                        </p>
                      ) : null}
                      {selectedVehicle.type === 'charging' && (
                        <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {selectedVehicle.address ?? 'г. Минск'}
                        </p>
                      )}
                      {selectedVehicle.description ? (
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">{selectedVehicle.description}</p>
                      ) : selectedVehicle.type === 'charging' ? (
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                          Зарядная станция на карте EcoRide. Уточняйте доступность разъёмов и тарифы у оператора площадки.
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                          Электротранспорт парка EcoRide. Забронируйте и начните поездку с карты.
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
                  {vehicleDeepLink ? (
                    <div className="flex gap-3 items-stretch rounded-2xl border border-white/10 bg-black/40 p-3">
                      <div className="shrink-0 rounded-xl bg-white p-1.5">
                        <QRCode
                          value={vehicleDeepLink}
                          size={88}
                          fgColor="#111111"
                          bgColor="#ffffff"
                          aria-label={`QR: ${selectedVehicle.name}, ID ${selectedVehicle.id}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
                        <p className="text-white text-xs font-bold uppercase tracking-wide">
                          {selectedVehicle.type === 'charging' ? 'Личный QR объекта' : 'Личный QR транспорта'}
                        </p>
                        <p className="text-gray-500 text-[11px] leading-snug">
                          Уникальная ссылка для наклейки. Другой телефон может отсканировать этот QR камерой или из
                          галереи — откроется карта с этим средством.
                        </p>
                        <button
                          type="button"
                          onClick={() => void copyVehicleLink(vehicleDeepLink)}
                          className="self-start text-xs font-medium px-2 py-1 rounded border border-white/15 text-neutral-300 hover:text-white hover:border-[#D4FF00]/40 transition-colors"
                        >
                          {linkCopied ? 'Скопировано' : 'Копировать ссылку'}
                        </button>
                        {copyLinkError ? (
                          <p className="text-red-400 text-[10px]" role="alert">
                            {copyLinkError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {selectedVehicle.type !== 'charging' &&
                    (liveBattery != null || selectedVehicle.rangeKm != null || selectedVehicle.seats != null) && (
                    <div className={`grid gap-3 ${selectedVehicle.seats != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {liveBattery != null && (
                        <div className="bg-black/30 rounded-xl p-3 flex flex-col gap-1 border border-white/10">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-[#D4FF00]">battery_charging_full</span>
                            Батарея
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{liveBattery}%</span>
                        </div>
                      )}
                      {selectedVehicle.rangeKm != null && (
                        <div className="bg-black/30 rounded-xl p-3 flex flex-col gap-1 border border-white/10">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-[#D4FF00]">distance</span>
                            Запас
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.rangeKm} км</span>
                        </div>
                      )}
                      {selectedVehicle.seats != null && (
                        <div className="bg-black/30 rounded-xl p-3 flex flex-col gap-1 border border-white/10">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-[#D4FF00]">group</span>
                            Мест
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.seats}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedVehicle.type !== 'charging' && (
                    <div className="flex flex-col gap-3 mt-1">
                      {rentalError && (
                        <p className="text-red-400 text-xs" role="alert">
                          {rentalError}
                        </p>
                      )}
                      {activeRental && mineTrip && (
                        <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-neutral-300 space-y-1">
                          <p>
                            Статус: <span className="text-white font-bold">{activeRental.status}</span>
                          </p>
                          {activeRental.status === 'reserved' && reservationRemainingSec != null ? (
                            <p className="text-amber-200/90 font-mono">
                              До снятия брони: {formatReservationCountdown(reservationRemainingSec)}
                            </p>
                          ) : null}
                          <p>В пути: {activeRental.distanceKm.toFixed(2)} км</p>
                          <p>Списано: {activeRental.chargedAmount.toFixed(2)} BYN</p>
                          <p>Минут (оценка): {activeRental.billableMinutes}</p>
                        </div>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        {hasOpenRental && !mineTrip && (
                          <p className="text-amber-400 text-xs w-full">
                            У вас уже есть бронь или поездка на другом транспорте. Завершите или отмените её, чтобы
                            забронировать это ТС.
                          </p>
                        )}
                        {(showPrimaryReserve || showPrimaryStart) && (
                          <button
                            type="button"
                            onClick={showPrimaryStart ? () => startMut.mutate() : handleRentClick}
                            disabled={showPrimaryStart ? startMut.isPending : reserveMut.isPending}
                            className={`flex-1 min-w-[140px] h-11 disabled:opacity-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                              showPrimaryStart
                                ? 'bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] border-[#D4FF00] shadow-[0_0_16px_rgba(212,255,0,0.35)]'
                                : 'bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] border-[#D4FF00]'
                            }`}
                          >
                            <span className="material-symbols-outlined">
                              {showPrimaryStart ? 'play_arrow' : 'lock_open'}
                            </span>
                            {showPrimaryStart
                              ? startMut.isPending
                                ? '…'
                                : 'Старт'
                              : reserveMut.isPending
                                ? '…'
                                : 'Забронировать'}
                          </button>
                        )}
                        {showPrimaryStart && (
                          <button
                            type="button"
                            onClick={() => cancelMut.mutate()}
                            disabled={cancelMut.isPending}
                            className="h-11 px-3 rounded-xl border border-white/15 text-neutral-300 text-sm hover:text-white hover:border-[#D4FF00]/40"
                          >
                            {cancelMut.isPending ? '…' : 'Отмена брони'}
                          </button>
                        )}
                        {mineTrip && activeRental?.status === 'active' && (
                          <>
                            <button
                              type="button"
                              onClick={() => pauseMut.mutate()}
                              disabled={pauseMut.isPending}
                              className="flex-1 min-w-[100px] h-11 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm"
                            >
                              Пауза
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUseCarsikiOnComplete(false)
                                setCompleteTripDialogOpen(true)
                              }}
                              disabled={completeMut.isPending}
                              className="flex-1 min-w-[120px] h-11 bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] rounded-xl font-bold text-sm"
                            >
                              Завершить
                            </button>
                          </>
                        )}
                        {mineTrip && activeRental?.status === 'paused' && (
                          <>
                            <button
                              type="button"
                              onClick={() => resumeMut.mutate()}
                              disabled={resumeMut.isPending}
                              className="flex-1 h-11 bg-[#D4FF00] hover:bg-[#e5ff4d] text-[#0a0a0a] rounded-xl font-bold text-sm border border-[#D4FF00]"
                            >
                              Продолжить
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUseCarsikiOnComplete(false)
                                setCompleteTripDialogOpen(true)
                              }}
                              disabled={completeMut.isPending}
                              className="flex-1 h-11 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/15 rounded-xl font-bold text-sm"
                            >
                              Завершить
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
          </div>
          </div>
          </div>
        </div>
        )}

        <div className="absolute inset-0 z-0">
          <div ref={mapContainerRef} className="h-full w-full bg-[color:var(--color-map-bg)]" />
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
                  className="mx-auto px-6 py-2 rounded-xl bg-[#D4FF00] text-[#0a0a0a] font-medium hover:bg-[#e5ff4d] transition-colors"
                >
                  Повторить загрузку
                </button>
              </div>
            </div>
          )}
          {!scriptError && mapReady && (
            <div className="absolute bottom-1 right-1 px-2 py-1 bg-black/80 text-[10px] text-neutral-500 border border-white/10 rounded z-[400]">
              © <a href="https://yandex.ru/maps" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300">Яндекс.Карты</a>
            </div>
          )}
        </div>
      </main>

      {completeTripDialogOpen ? (
        <div
          className="fixed inset-0 z-[2450] flex items-center justify-center p-4 bg-black/85"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-trip-title"
          onClick={() => {
            if (!completeMut.isPending) {
              setCompleteTripDialogOpen(false)
              setUseCarsikiOnComplete(false)
            }
          }}
        >
          <div
            className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="complete-trip-title" className="text-lg font-bold mb-3">
              Завершить поездку?
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              Вы уверены, что хотите завершить поездку? После подтверждения будет сформирован чек.
            </p>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 mb-6">
              <input
                type="checkbox"
                className="size-4 rounded border-neutral-500 accent-[#D4FF00] shrink-0"
                checked={useCarsikiOnComplete}
                onChange={(e) => setUseCarsikiOnComplete(e.target.checked)}
              />
              <span>
                Учитывать <span className="text-white font-semibold">CARSIKI</span> в оплате этой поездки
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={completeMut.isPending}
                className="flex-1 min-w-[8rem] h-11 rounded-2xl border border-white/15 text-neutral-200 text-sm font-medium hover:border-[#D4FF00]/40 disabled:opacity-50"
                onClick={() => {
                  setCompleteTripDialogOpen(false)
                  setUseCarsikiOnComplete(false)
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={completeMut.isPending}
                className="flex-1 min-w-[8rem] h-11 rounded-2xl bg-[#D4FF00] text-[#0a0a0a] text-sm font-bold hover:bg-[#e5ff4d] disabled:opacity-50"
                onClick={() => completeMut.mutate()}
              >
                {completeMut.isPending ? '…' : 'Завершить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {receipt && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/85"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-title"
        >
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 id="receipt-title" className="text-xl font-bold mb-1">
              {receipt.startedAt ? 'Поездка завершена' : 'Бронь закрыта'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">{receipt.vehicleName}</p>
            <ul className="text-sm space-y-2 text-gray-300 mb-6">
              <li className="flex justify-between gap-4">
                <span>Дистанция</span>
                <span className="text-white font-mono">{receipt.distanceKm.toFixed(2)} км</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Время (мин)</span>
                <span className="text-white font-mono">{receipt.totalBillableMinutes}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Посадка</span>
                <span className="text-white font-mono">{receipt.priceStart.toFixed(2)} BYN</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Поминутно</span>
                <span className="text-white font-mono">{receipt.perMinuteTotal.toFixed(2)} BYN</span>
              </li>
              <li className="flex justify-between gap-4 pt-2 border-t border-white/10 text-base font-bold text-white">
                <span>Итого</span>
                <span className="font-mono">{receipt.total.toFixed(2)} BYN</span>
              </li>
              {(receipt.bynCreditedFromCarsiki ?? 0) > 0 ? (
                <li className="flex justify-between gap-4 text-emerald-300 text-sm">
                  <span>Оплачено CARSIKI (возврат на кошелёк)</span>
                  <span className="font-mono">+{(receipt.bynCreditedFromCarsiki ?? 0).toFixed(2)} BYN</span>
                </li>
              ) : null}
              {(receipt.carsikiSpent ?? 0) > 0 ? (
                <li className="flex justify-between gap-4 text-gray-400 text-xs">
                  <span>Списано CARSIKI</span>
                  <span className="font-mono">{receipt.carsikiSpent ?? 0}</span>
                </li>
              ) : null}
              {(receipt.carsikiEarned ?? 0) > 0 ? (
                <li className="flex justify-between gap-4 text-emerald-300/90 text-sm">
                  <span>Начислено CARSIKI</span>
                  <span className="font-mono">+{receipt.carsikiEarned ?? 0}</span>
                </li>
              ) : null}
              <li className="flex justify-between gap-4 text-gray-400 text-xs">
                <span>CARSIKI на счету</span>
                <span className="font-mono">{receipt.carsikiBalanceAfter ?? 0}</span>
              </li>
              <li className="flex justify-between gap-4 text-gray-400 text-xs">
                <span>Баланс после</span>
                <span className="font-mono">{receipt.balanceAfter.toFixed(2)} BYN</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="w-full h-11 rounded-2xl bg-[#D4FF00] text-[#0a0a0a] font-bold hover:bg-[#e5ff4d] transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

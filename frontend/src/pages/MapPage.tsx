import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
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

const sidebarNavClass =
  'flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl touch-manipulation select-none transition-colors'

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
  const { token, user, isAccessTokenValid, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapQuery, setMapQuery] = useState('')
  const [mapFilterOpen, setMapFilterOpen] = useState(false)
  const [mapOnlyAvailable, setMapOnlyAvailable] = useState(false)
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

  const closeSidebar = () => setSidebarOpen(false)

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

  return (
    <div className="bg-black text-white font-display overflow-hidden flex-1 min-h-0 w-full flex flex-row relative items-stretch">
      {carsikiToast ? (
        <div
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[2600] max-w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-emerald-500/60 bg-emerald-950/95 text-emerald-100 px-4 py-3 text-sm shadow-xl"
          role="status"
        >
          {carsikiToast}
        </div>
      ) : null}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[65] bg-black/60 lg:hidden"
          aria-label="Закрыть меню"
          onClick={closeSidebar}
        />
      )}
      <aside
        className={`fixed lg:relative z-[70] top-0 bottom-0 left-0 w-[min(280px,100vw)] flex-shrink-0 min-h-0 h-full flex flex-col justify-between bg-black border-r border-[#333] transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-gray-400 text-xs font-normal truncate min-w-0">
              Баланс:{' '}
              <span className="text-white font-bold">
                {(activeRental != null ? activeRental.balance : (user?.balance ?? 0)).toFixed(2)} BYN
              </span>
            </p>
            <button
              type="button"
              className="lg:hidden shrink-0 size-10 flex items-center justify-center rounded-xl border border-[#333] text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Закрыть меню"
              onClick={closeSidebar}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <Link
            to="/dashboard#wallet"
            onClick={closeSidebar}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl h-10 px-4 bg-white text-black text-sm font-bold border border-white hover:bg-black hover:text-white transition-colors touch-manipulation"
          >
            <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
            Пополнить
          </Link>
        </div>
        <nav className="flex-1 px-3 sm:px-4 flex flex-col gap-2 overflow-y-auto">
          <Link
            to="/"
            onClick={closeSidebar}
            className={`${sidebarNavClass} text-gray-400 hover:text-white hover:border hover:border-white/20`}
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-sm font-medium">Главная</span>
          </Link>
          <Link
            to="/map"
            onClick={(e) => {
              closeSidebar()
              if (location.pathname === '/map') e.preventDefault()
            }}
            className={`${sidebarNavClass} bg-white text-black border border-white`}
          >
            <span className="material-symbols-outlined">map</span>
            <span className="text-sm font-bold">Карта</span>
          </Link>
          <Link
            to="/dashboard#wallet"
            onClick={closeSidebar}
            className={`${sidebarNavClass} text-gray-400 hover:text-white hover:border hover:border-white/20`}
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-sm font-medium">Кошелёк</span>
          </Link>
          <Link
            to="/dashboard#history"
            onClick={closeSidebar}
            className={`${sidebarNavClass} text-gray-400 hover:text-white hover:border hover:border-white/20`}
          >
            <span className="material-symbols-outlined">pedal_bike</span>
            <span className="text-sm font-medium">Поездки</span>
          </Link>
          <Link
            to="/dashboard#settings"
            onClick={closeSidebar}
            className={`${sidebarNavClass} text-gray-400 hover:text-white hover:border hover:border-white/20`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </Link>
          <Link
            to="/support"
            onClick={closeSidebar}
            className={`${sidebarNavClass} text-gray-400 hover:text-white hover:border hover:border-white/20`}
          >
            <span className="material-symbols-outlined">support_agent</span>
            <span className="text-sm font-medium">Поддержка</span>
          </Link>
        </nav>
        <div className="p-3 sm:p-4 border-t border-[#333] bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span className="material-symbols-outlined text-white text-[16px]">wifi</span>
            <span>Система онлайн</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-[calc(100dvh-5.5rem)] lg:min-h-0 flex flex-col relative overflow-hidden bg-black">
        <div className="absolute top-0 left-0 right-0 z-[1000] pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none">
          <div className="layout-safe-x flex justify-between items-start gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-1 min-w-0 items-start gap-2">
            <button
              type="button"
              className="lg:hidden shrink-0 size-10 flex items-center justify-center bg-black text-white rounded-xl shadow-lg border border-[#333] hover:bg-white hover:text-black transition-colors"
              aria-label="Открыть меню"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div className="flex-1 min-w-0 max-w-md shadow-2xl shadow-black/80 relative">
            <label className="flex flex-col w-full">
              <div className="flex w-full items-center rounded-xl bg-black border border-[#333] h-12">
                <div className="text-white flex items-center justify-center pl-4 shrink-0">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  className="w-full min-w-0 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-4 h-full text-sm font-medium"
                  placeholder="ID, название или фрагмент описания…"
                  autoComplete="off"
                />
                <div className="pr-2 shrink-0">
                  <button
                    type="button"
                    aria-expanded={mapFilterOpen}
                    aria-label="Фильтр на карте"
                    onClick={() => setMapFilterOpen((o) => !o)}
                    className={`p-2 rounded-full hover:bg-white/10 ${
                      mapFilterOpen || mapOnlyAvailable ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined">tune</span>
                  </button>
                </div>
              </div>
              {mapFilterOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[1100] rounded-xl border border-[#333] bg-black/95 backdrop-blur-sm p-3 shadow-xl pointer-events-auto">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mapOnlyAvailable}
                      onChange={(e) => setMapOnlyAvailable(e.target.checked)}
                      className="rounded border-gray-500"
                    />
                    Только свободные (скрыть забронированные и в поездке)
                  </label>
                </div>
              )}
            </label>
            </div>
          </div>
          <div className="flex flex-col gap-2 pointer-events-auto shrink-0">
            <button type="button" onClick={handleMyLocation} className="size-10 flex items-center justify-center bg-black text-white rounded-xl shadow-lg border border-[#333] hover:bg-white hover:text-black transition-colors">
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <div className="flex flex-col rounded-xl shadow-lg border border-[#333] overflow-hidden">
              <button type="button" onClick={handleZoomIn} className="size-10 flex items-center justify-center bg-black text-white hover:bg-white hover:text-black border-b border-[#333] transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button type="button" onClick={handleZoomOut} className="size-10 flex items-center justify-center bg-black text-white hover:bg-white hover:text-black transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="absolute left-0 right-0 z-[999] pointer-events-none top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] lg:top-auto lg:bottom-6 lg:left-0 lg:right-0 pb-0">
          <div className="layout-safe-x pointer-events-none">
          <div className="bg-black/90 backdrop-blur-sm border border-[#333] rounded-2xl p-2 shadow-xl flex flex-wrap gap-1 pointer-events-auto max-h-[36vh] overflow-y-auto lg:max-h-none w-full sm:w-fit max-w-full">
            {(['all', 'scooters', 'bikes', 'cars', 'charging'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
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
          {vehiclesError && (
            <p className="text-amber-400 text-xs mt-2 pointer-events-auto px-1">Не удалось загрузить парк с сервера</p>
          )}
          {activeRental?.lowBatteryMode && (
            <div className="mt-2 pointer-events-auto w-full max-w-md">
              <div className="rounded-xl border border-amber-500/80 bg-amber-950/95 text-amber-100 text-xs sm:text-sm px-3 py-2">
                Низкий заряд транспорта. Ограничение скорости {activeRental.speedLimitKmh ?? 90} км/ч.
              </div>
            </div>
          )}
          </div>
        </div>

        {selectedVehicle && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:bottom-6 lg:pb-0 pointer-events-none">
          <div className="layout-safe-x flex justify-stretch lg:justify-end pointer-events-none">
          <div className="w-full lg:w-[380px] max-w-full pointer-events-auto">
          <div className="bg-[#121212] border border-[#333] rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(52dvh,520px)] lg:max-h-none">
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
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#121212] to-transparent" />
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
                    <div className="flex gap-3 items-stretch rounded-2xl border border-[#333] bg-black/50 p-3">
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
                          className="self-start text-xs font-medium px-2 py-1 rounded border border-[#555] text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
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
                        <div className="bg-[#121212] rounded-xl p-3 flex flex-col gap-1 border border-[#333]">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-white">battery_charging_full</span>
                            Батарея
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{liveBattery}%</span>
                        </div>
                      )}
                      {selectedVehicle.rangeKm != null && (
                        <div className="bg-[#121212] rounded-xl p-3 flex flex-col gap-1 border border-[#333]">
                          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                            <span className="material-symbols-outlined text-[16px] text-white">distance</span>
                            Запас
                          </div>
                          <span className="text-white font-mono text-lg font-medium">{selectedVehicle.rangeKm} км</span>
                        </div>
                      )}
                      {selectedVehicle.seats != null && (
                        <div className="bg-[#121212] rounded-xl p-3 flex flex-col gap-1 border border-[#333]">
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
                    <div className="flex flex-col gap-3 mt-1">
                      {rentalError && (
                        <p className="text-red-400 text-xs" role="alert">
                          {rentalError}
                        </p>
                      )}
                      {activeRental && mineTrip && (
                        <div className="rounded-xl border border-[#444] bg-black/40 p-3 text-xs text-gray-300 space-y-1">
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
                                ? 'bg-green-500 hover:bg-green-400 text-black border-green-500'
                                : 'bg-white hover:bg-gray-200 text-black border-white'
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
                            className="h-11 px-3 rounded-xl border border-[#555] text-gray-300 text-sm hover:text-white hover:border-gray-400"
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
                              className="flex-1 min-w-[120px] h-11 bg-white hover:bg-gray-200 text-black rounded-xl font-bold text-sm"
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
                              className="flex-1 h-11 bg-green-500 hover:bg-green-400 text-black rounded-xl font-bold text-sm"
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
                              className="flex-1 h-11 bg-white hover:bg-gray-200 text-black rounded-xl font-bold text-sm"
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
                  className="mx-auto px-6 py-2 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition-colors"
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
            className="bg-[#141414] border border-[#444] rounded-3xl max-w-md w-full p-6 text-white shadow-2xl"
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
                className="size-4 rounded border-gray-500 text-white accent-white shrink-0"
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
                className="flex-1 min-w-[8rem] h-11 rounded-2xl border border-[#555] text-gray-200 text-sm font-medium hover:border-gray-400 disabled:opacity-50"
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
                className="flex-1 min-w-[8rem] h-11 rounded-2xl bg-white text-black text-sm font-bold hover:bg-gray-200 disabled:opacity-50"
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
          <div className="bg-[#141414] border border-[#444] rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
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
              <li className="flex justify-between gap-4 pt-2 border-t border-[#333] text-base font-bold text-white">
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
              className="w-full h-11 rounded-2xl bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

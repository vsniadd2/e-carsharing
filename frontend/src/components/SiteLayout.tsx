import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteSideRail from './SiteSideRail'
import NotificationToastsHost from './NotificationToastsHost'
import type { SiteOutletContext } from '../lib/siteOutletContext'

export default function SiteLayout() {
  const { pathname } = useLocation()
  const mapPage = pathname === '/map'
  const [railOpen, setRailOpen] = useState(false)
  const [mapQuery, setMapQuery] = useState('')
  const [mapFilterOpen, setMapFilterOpen] = useState(false)
  const [mapOnlyAvailable, setMapOnlyAvailable] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    if (!mapPage) {
      setMapQuery('')
      setMapFilterOpen(false)
      setMapOnlyAvailable(false)
    }
  }, [mapPage])

  const mapUi = useMemo(
    () =>
      mapPage
        ? {
            mapQuery,
            setMapQuery,
            mapFilterOpen,
            setMapFilterOpen,
            mapOnlyAvailable,
            setMapOnlyAvailable,
          }
        : undefined,
    [mapPage, mapQuery, mapFilterOpen, mapOnlyAvailable],
  )

  const outletContext = useMemo<SiteOutletContext>(
    () => ({
      mapUi,
    }),
    [mapUi],
  )

  const mainPad = mapPage ? '' : 'pt-[5.75rem] md:pt-[5.75rem]'

  return (
    <div className="flex min-h-screen min-h-dvh min-w-0 w-full flex-1 flex-col overflow-x-clip bg-[color:var(--color-map-bg)] font-display text-white selection:bg-[#d1fc00] selection:text-[#546600]">
      <NotificationToastsHost mapLayout={mapPage} />
      <SiteSideRail mobileOpen={railOpen} onMobileOpenChange={setRailOpen} />
      <SiteHeader onOpenRail={() => setRailOpen(true)} mapUi={mapUi} />
      <div
        className={`flex flex-1 flex-col min-h-0 w-full min-w-0 ${mapPage ? '' : 'md:pl-[6.5rem]'} ${mainPad}`}
      >
        <Outlet context={outletContext} />
      </div>
    </div>
  )
}

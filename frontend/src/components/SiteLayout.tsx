import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'

export default function SiteLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="flex min-h-screen min-h-dvh min-w-0 w-full flex-1 flex-col overflow-x-clip bg-white font-display text-slate-900 dark:bg-black dark:text-slate-100">
      <SiteHeader />
      {/* flex-1 min-h-0 только для страниц, которые сами скроллятся (дашборд, карта); документные страницы без flex-1 на корне */}
      <div className="flex flex-1 flex-col min-h-0 w-full min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

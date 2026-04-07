import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHPhWJR4Tosa_JdP-m5aKlL5ugqdU1ni0CZbOhdbYBUUh618afEb-9UC4aRAuppib21epq0FXndAcU1gkYTM7gTNLAfqfRFFwp2n0SZfglchK9hkfWKyjCwupFUs42YtTPGAtGjExdqtz2NCvIm6hd-U-yjMKAAlkjdvkuCC8pV5ymrjUFzJ1-LsS1tjNiNtrjvOApySmJo4zyBz7vZsiRvqBTgTeYvcneIublwixq8LWm7HCyZPLgAKhOSx2AiXmhvhdQE3xYA7xx'

type EcoAuthShellProps = {
  children: ReactNode
}

export default function EcoAuthShell({ children }: EcoAuthShellProps) {
  return (
    <main className="eco-auth-shell relative flex min-h-dvh w-full flex-1 flex-col items-center justify-center overflow-x-clip overflow-y-auto bg-eco-auth-surface py-20 pb-[max(5rem,env(safe-area-inset-bottom,0px))] font-eco-auth-body text-eco-auth-on-surface selection:bg-eco-auth-tertiary selection:text-eco-auth-on-tertiary-container sm:py-24">
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-40 scale-110 blur-[2px]"
          alt=""
          src={HERO_IMAGE}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-eco-auth-surface via-eco-auth-surface/60 to-transparent" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="layout-shell flex justify-between items-center gap-3 py-3 sm:py-4">
          <Link to="/" className="font-display text-xl sm:text-2xl font-bold tracking-tighter text-eco-auth-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-eco-auth-primary/30 rounded shrink-0 min-w-0">
            EcoRide
          </Link>
        </div>
      </header>

      {children}

      <div className="hidden lg:block absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))] text-right z-[5] pointer-events-none">
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] font-eco-auth-body text-eco-auth-secondary uppercase tracking-[0.3em] opacity-40">
            Telemetry Enabled
          </span>
          <div className="w-32 h-0.5 bg-eco-auth-outline-variant/20 relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1/3 bg-eco-auth-tertiary" />
          </div>
          <span className="text-[10px] font-eco-auth-body text-eco-auth-tertiary uppercase tracking-[0.1em]">
            Status: Ready
          </span>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 border-t border-r border-eco-auth-outline-variant/10 mt-[max(1rem,env(safe-area-inset-top,0px))] mr-[max(1rem,env(safe-area-inset-right,0px))] pointer-events-none z-[5]" />
      <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 border-b border-l border-eco-auth-outline-variant/10 mb-[max(1rem,env(safe-area-inset-bottom,0px))] ml-[max(1rem,env(safe-area-inset-left,0px))] pointer-events-none z-[5]" />
    </main>
  )
}

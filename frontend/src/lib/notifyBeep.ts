/** Сначала `public/notify.mp3`, иначе короткий сигнал через Web Audio. */
export function playNotifySound(): void {
  try {
    const a = new Audio('/notify.mp3')
    a.volume = 0.35
    void a.play().catch(() => playNotifyBeep())
  } catch {
    playNotifyBeep()
  }
}

/** Короткий сигнал в колонках (Web Audio), если разрешён контекст. */
export function playNotifyBeep(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    g.gain.value = 0.08
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.stop()
      void ctx.close()
    }, 180)
  } catch {
    /* ignore */
  }
}

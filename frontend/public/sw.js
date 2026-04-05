/* EcoRide: Web Push + уведомления (фон). */
self.addEventListener('push', (event) => {
  let title = 'EcoRide'
  let body = ''
  try {
    const t = event.data?.text()
    if (t) {
      const j = JSON.parse(t)
      title = j.title || title
      body = j.body || ''
    }
  } catch (_) {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [120, 80, 120],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/map')
    })
  )
})

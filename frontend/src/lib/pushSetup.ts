import { fetchVapidPublicKey, subscribePush } from '../api/fleet'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Регистрация SW + Web Push (Chrome/Edge на localhost). Ошибки глушим — не блокируем вход. */
export async function tryRegisterPushForEcoRide(accessToken: string): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (!('Notification' in window)) return

  // Уже отклонено пользователем — не вызываем requestPermission снова (Chrome блокирует и шумит в консоли).
  if (Notification.permission === 'denied') return

  const vapidPublic = await fetchVapidPublicKey()
  if (!vapidPublic) return

  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

  let permission: NotificationPermission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
  })

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const key = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !key || !auth) return

  await subscribePush(accessToken, { endpoint, keys: { p256dh: key, auth } })
}

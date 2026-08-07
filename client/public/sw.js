/**
 * TossSync Service Worker — Web Push handler.
 *
 * Receives push payloads ({ title, body, data }) from the backend
 * (server/utils/pushService.js) and surfaces them as native device
 * notifications configured for maximum "offline alarm" impact:
 *   - vibrate: [200, 100, 200]  -> a short buzz pattern on mobile
 *   - requireInteraction: true  -> stays on screen until the resident acts
 *   - silent: false             -> triggers the device's default sound
 */

// Activate this worker immediately on install/update so pushes work right away.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/**
 * Safely decode the push payload. The backend always sends JSON, but we guard
 * against empty/malformed data so the worker never throws inside the handler.
 */
const readPayload = (event) => {
  try {
    return event.data ? event.data.json() : {}
  } catch {
    return {}
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event)
  const title = payload.title || 'TossSync Reminder'

  const options = {
    body: payload.body || 'You have an upcoming waste pickup.',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'tosssync-pickup',
    renotify: true,
    data: payload.data || {}
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard'

  // Focus an already-open TossSync tab when possible, otherwise open a new one.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((client) => client.url.includes(targetUrl))
        if (existing) return existing.focus()
        return self.clients.openWindow(targetUrl)
      })
  )
})

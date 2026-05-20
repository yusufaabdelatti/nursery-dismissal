self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

self.addEventListener('push', (event) => {
  let title = '🔔 Nursery Update'
  let body = 'Tap to open the app'

  if (event.data) {
    try {
      const data = JSON.parse(event.data.text())
      title = data.title || title
      body = data.body || body
    } catch {
      // use defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [300, 100, 300, 100, 300],
      tag: 'nursery-notification',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow('/')
    })
  )
})

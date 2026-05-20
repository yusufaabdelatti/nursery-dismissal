self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('🔔 Pickup Request', {
      body: 'Tap to open the nursery app',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [300, 100, 300],
      tag: 'nursery',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus()
        }
        return clients.openWindow('/')
      })
  )
})

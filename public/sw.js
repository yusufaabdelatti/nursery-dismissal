self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('🔔 New Pickup Request', {
      body: 'A child in your class needs to be picked up. Tap to open.',
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

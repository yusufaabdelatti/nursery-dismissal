self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'New Pickup Request', {
      body: data.body ?? 'A child is ready for pickup',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      tag: data.requestId ?? 'pickup',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/staff'))
})

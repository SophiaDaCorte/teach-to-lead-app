// Este service worker solo existe para limpiar el anterior y desinstalarse.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.registration.unregister()
    const ventanas = await self.clients.matchAll({ type: 'window' })
    ventanas.forEach((v) => v.navigate(v.url))
  })())
})
const CACHE = 'ttl-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Supabase, fuentes y otros dominios pasan directo, sin caché
  if (url.origin !== self.location.origin) return

  // Siempre intenta la red primero. El caché solo se usa si no hay internet.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copia))
        }
        return res
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  )
})
const CACHE = 'ttl-v1'
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
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
  // Solo cachea archivos de la propia app. Supabase, fuentes y demás
  // dominios externos pasan directo, así los datos nunca salen viejos.
  if (url.origin !== self.location.origin) return

  // Páginas: siempre intenta la red primero para recibir la versión nueva
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }

  // Archivos estáticos: usa el caché y lo actualiza en segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const red = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        })
        .catch(() => cached)
      return cached || red
    })
  )
})
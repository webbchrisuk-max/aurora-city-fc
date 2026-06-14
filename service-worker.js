/* ===================== SECTION: AURORA CITY FC PWA SERVICE WORKER ===================== */
const AURORA_CACHE = 'aurora-city-fc-v1';
const AURORA_FILES = [
  './',
  './AuroraCityFC_ManagerDashboard.html',
  './AuroraCityFC_TransferCentre.html',
  './AuroraCityFC_Boardroom.html',
  './AuroraCityFC_SquadHub.html',
  './manifest.json',
  './offline.html',
  './assets/aurora-city-fc/icons/icon-192.png',
  './assets/aurora-city-fc/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(AURORA_CACHE)
      .then(cache => cache.addAll(AURORA_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== AURORA_CACHE).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(AURORA_CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match('./offline.html'))
      )
  );
});

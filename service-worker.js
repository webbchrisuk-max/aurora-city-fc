/* ===================== SECTION: AURORA CITY FC SERVICE WORKER ===================== */
const AURORA_FC_CACHE = 'aurora-city-fc-v2026-06-15-connected';
const CORE_ASSETS = [
  './',
  './AuroraCityFC_ManagerDashboard.html',
  './AuroraCityFC_TransferCentre.html',
  './AuroraCityFC_Boardroom.html',
  './AuroraCityFC_SquadHub.html',
  './AuroraFCData.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(AURORA_FC_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== AURORA_FC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(AURORA_FC_CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./AuroraCityFC_ManagerDashboard.html')))
  );
});

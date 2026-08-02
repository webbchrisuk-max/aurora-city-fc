/*
 * Aurora City FC — fast-update service worker
 *
 * IMPORTANT:
 * Change CACHE_VERSION whenever you publish a new Aurora build.
 * Example: 2026-08-02-01 -> 2026-08-03-01
 */

const CACHE_VERSION = '2026-08-02-01';
const CACHE_PREFIX = 'aurora-city-fc';

const PAGE_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${CACHE_VERSION}`;

const CURRENT_CACHES = new Set([
  PAGE_CACHE,
  ASSET_CACHE,
  DATA_CACHE
]);

const APP_SHELL = [
  './',
  './AuroraCityFC_ManagerDashboard.html',
  './AuroraCityFC_SquadHub.html',
  './AuroraCityFC_TrainingGround.html',
  './AuroraCityFC_Boardroom.html',
  './AuroraCityFC_MediaCentre.html',
  './AuroraCityFC_TransferCentre.html',
  './manifest.json',
  './AuroraFCData.js',

  // Current Aurora artwork used by the supplied pages.
  './assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png',
  './assets/aurora-city-fc/1485E058-D5FB-4DF2-8C37-A520FF55A246.png',
  './assets/aurora-city-fc/EA9B5F84-50A9-439D-A901-16917F9A1E5B.png',
  './assets/aurora-city-fc/fixture/payday.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGE_CACHE);

    // One missing optional file must not prevent the new worker installing.
    await Promise.allSettled(
      APP_SHELL.map(url =>
        cache.add(new Request(url, { cache: 'reload' }))
      )
    );

    // Activate this build immediately instead of leaving it waiting.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(cacheName => {
        const isAuroraCache =
          cacheName.startsWith(`${CACHE_PREFIX}-`) ||
          cacheName.toLowerCase().includes('aurora');

        if (isAuroraCache && !CURRENT_CACHES.has(cacheName)) {
          return caches.delete(cacheName);
        }

        return Promise.resolve(false);
      })
    );

    // Take control of all open Aurora pages immediately.
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const type = event.data?.type;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'CLEAR_AURORA_CACHES') {
    event.waitUntil((async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith(`${CACHE_PREFIX}-`) ||
            name.toLowerCase().includes('aurora')
          )
          .map(name => caches.delete(name))
      );
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Leave Firebase, Google APIs and all other external services untouched.
  if (url.origin !== self.location.origin) return;

  // Never intercept the worker file itself.
  if (url.pathname.endsWith('/service-worker.js')) return;

  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(networkFirst(request, PAGE_CACHE, 5000));
    return;
  }

  if (
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE, 3500));
    return;
  }

  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname)
  ) {
    event.respondWith(fastAsset(request));
    return;
  }

  event.respondWith(networkFirst(request, ASSET_CACHE, 3500));
});

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  try {
    const response = await fetchWithTimeout(
      new Request(request, { cache: 'no-cache' }),
      timeoutMs
    );

    if (canCache(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (cachedResponse) return cachedResponse;

    if (
      request.mode === 'navigate' ||
      request.destination === 'document'
    ) {
      const dashboard =
        await caches.match('./AuroraCityFC_ManagerDashboard.html');

      if (dashboard) return dashboard;

      return new Response(
        `<!doctype html>
        <html lang="en">
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Aurora City FC — Offline</title>
          <body style="font-family:system-ui;background:#07111f;color:#fff;padding:2rem">
            <h1>Aurora is offline</h1>
            <p>Reconnect to the internet and reopen the app.</p>
          </body>
        </html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }

    throw error;
  }
}

/*
 * Images appear quickly from cache, while a live revalidation starts at the
 * same time. On a new service-worker version, APP_SHELL is refreshed during
 * installation, so changed Aurora hero artwork is ready immediately.
 */
async function fastAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request);

  const updatePromise = fetch(
    new Request(request, { cache: 'no-cache' })
  )
    .then(async response => {
      if (canCache(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    // Do not delay the visible page while the newest asset is downloaded.
    updatePromise.catch(() => null);
    return cachedResponse;
  }

  const networkResponse = await updatePromise;
  if (networkResponse) return networkResponse;

  return new Response('', { status: 504, statusText: 'Asset unavailable' });
}

function canCache(response) {
  return Boolean(
    response &&
    response.ok &&
    (response.type === 'basic' || response.type === 'default')
  );
}

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

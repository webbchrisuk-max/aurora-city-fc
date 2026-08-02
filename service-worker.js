/*
 * Aurora City FC — fast-update service worker
 * Build: 2026-08-02 22:50 BST
 *
 * Change CACHE_VERSION for every published Aurora build.
 */

const CACHE_VERSION = '2026-08-02-02';
const CACHE_PREFIX = 'aurora-city-fc';

const PAGE_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${CACHE_VERSION}`;

const CURRENT_CACHES = new Set([PAGE_CACHE, ASSET_CACHE, DATA_CACHE]);

/*
 * Keep installation quick: only cache the small core shell here.
 * Department pages are cached automatically when they are opened.
 */
const CORE_SHELL = [
  './',
  './index.html',
  './AuroraCityFC_ManagerDashboard.html',
  './aurora-unified-shell.css',
  './aurora-unified-shell.js',
  './aurora-hero.css',
  './aurora-hero.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGE_CACHE);

    await Promise.allSettled(
      CORE_SHELL.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );

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

    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const type = event.data?.type;

  if (type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
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

  /* Firebase, Google APIs and remote GitHub images stay untouched. */
  if (url.origin !== self.location.origin) return;

  /* The browser must always check the worker file itself directly. */
  if (url.pathname.endsWith('/service-worker.js')) return;

  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(networkFirst(request, PAGE_CACHE, 4500));
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

  /*
   * Images are network-first so replacing a hero under the same filename
   * appears immediately. Cached artwork is still used if the network fails.
   */
  if (
    request.destination === 'image' ||
    /\.(?:png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(networkFirst(request, ASSET_CACHE, 3200));
    return;
  }

  if (
    request.destination === 'font' ||
    /\.(?:woff2?|ttf|otf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
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

    if (request.mode === 'navigate' || request.destination === 'document') {
      const dashboard = await caches.match('./AuroraCityFC_ManagerDashboard.html');
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

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (canCache(response)) {
    await cache.put(request, response.clone());
  }
  return response;
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

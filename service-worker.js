/* Aurora City FC — shared-data service worker
 * Build: 02 Aug 2026
 *
 * Goals:
 * - activate new Aurora builds immediately;
 * - keep HTML, JavaScript and CSS network-first so updates are not trapped;
 * - never serve a service-worker-cached AuroraMaster.json;
 * - keep images and icons available offline;
 * - remove obsolete Aurora caches during activation.
 */

const CACHE_NAME = "aurora-city-fc-v2026-08-02-shared-data-1";
const CACHE_PREFIX = "aurora-city-fc-";

const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./AuroraCityFC_GameShell.html",
  "./AuroraFCData.js",
  "./aurora-navigation.js",
  "./aurora-navigation.css",
  "./aurora-notifications.js",
  "./AuroraCityFC_ManagerDashboard.html",
  "./AuroraCityFC_NexusMaster.html",
  "./AuroraCityFC_FinanceDepartment.html",
  "./AuroraCityFC_TransferCentre.html",
  "./AuroraCityFC_MatchdayCentre.html",
  "./AuroraCityFC_SquadHub.html",
  "./AuroraCityFC_AnalysisRoom.html",
  "./AuroraCityFC_ScoutingCentre.html",
  "./AuroraCityFC_TrainingGround.html",
  "./AuroraCityFC_LearningCentre.html",
  "./AuroraCityFC_Boardroom.html",
  "./AuroraCityFC_MediaCentre.html",
  "./assets/aurora-city-fc/icons/icon-192.png",
  "./assets/aurora-city-fc/icons/icon-512.png"
];

const CODE_FILE_PATTERN = /\.(?:html?|js|css)$/i;
const STATIC_FILE_PATTERN = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$/i;

function isCacheable(response) {
  return Boolean(response && response.ok && response.type !== "opaque");
}

async function putInRuntimeCache(request, response) {
  if (!isCacheable(response)) return;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function findCached(request) {
  return (
    (await caches.match(request)) ||
    (await caches.match(request, { ignoreSearch: true })) ||
    null
  );
}

async function safePrecache() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    CORE_FILES.map(async file => {
      const request = new Request(file, { cache: "reload" });
      const response = await fetch(request);

      if (!isCacheable(response)) {
        throw new Error(`Unable to precache ${file}`);
      }

      await cache.put(file, response);
    })
  );
}

async function networkFirst(request, fallbackToShell = false) {
  try {
    const response = await fetch(request);
    await putInRuntimeCache(request, response);
    return response;
  } catch (_) {
    const cached = await findCached(request);
    if (cached) return cached;

    if (fallbackToShell) {
      return (
        (await caches.match("./index.html")) ||
        (await caches.match("./AuroraCityFC_GameShell.html")) ||
        Response.error()
      );
    }

    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await findCached(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await putInRuntimeCache(request, response);
    return response;
  } catch (_) {
    return Response.error();
  }
}

async function freshAuroraMaster(request) {
  /*
   * AuroraFCData.js already owns the approved local-storage fallback.
   * The service worker deliberately avoids caching AuroraMaster.json so an
   * old data export cannot override a newer shared-data refresh.
   */
  try {
    return await fetch(new Request(request, { cache: "no-store" }));
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      await safePrecache();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (_) {
          /* Navigation preload is optional. */
        }
      }

      await self.clients.claim();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      clients.forEach(client => {
        client.postMessage({
          type: "AURORA_SERVICE_WORKER_UPDATED",
          cacheName: CACHE_NAME
        });
      });
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (/\/AuroraMaster\.json$/i.test(url.pathname)) {
    event.respondWith(freshAuroraMaster(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  if (CODE_FILE_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_FILE_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener("message", event => {
  const type = event.data && event.data.type;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "CLEAR_AURORA_CACHES") {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX))
            .map(key => caches.delete(key))
        )
      )
    );
  }
});

/*
 * Aurora City FC — emergency recovery service worker
 * Build: 2026-08-02-2314
 *
 * This deliberately uses the live network and stores no app pages.
 * Its first activation removes every previous Aurora/browser cache so a
 * broken cached dashboard cannot continue replacing restored files.
 */
const RECOVERY_BUILD = 'aurora-recovery-2026-08-02-2314';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data?.type === 'CLEAR_AURORA_CACHES'){
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.endsWith('/service-worker.js')) return;

  event.respondWith((async () => {
    try{
      return await fetch(new Request(request,{cache:'no-store'}));
    }catch(error){
      if(request.mode === 'navigate'){
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aurora offline</title><body style="margin:0;padding:32px;background:#020612;color:#eaf4ff;font-family:system-ui"><h1>Aurora is offline</h1><p>Reconnect, then reopen Aurora.</p></body>',
          {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}
        );
      }
      return Response.error();
    }
  })());
});

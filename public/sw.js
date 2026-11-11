// Keeps the app itself on the phone so it opens without signal.
// Pages: network first, falling back to the saved copy. Built files and fonts: saved copy first.
const CACHE = 'pt-app-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (same && req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put('/index.html', res.clone());
        return res;
      } catch {
        return (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const asset = same && (url.pathname.startsWith('/assets/') || /\.(png|svg|ico|webmanifest|json)$/.test(url.pathname)) && !url.pathname.startsWith('/api/');
  if (!asset && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch {
      return Response.error();
    }
  })());
});

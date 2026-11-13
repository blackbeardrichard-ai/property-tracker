// Keeps the whole app on the phone so every screen opens without signal.
//
// On install, every file of this version (listed in /precache.json by the build) is stored,
// including screens not opened yet. The app opens from that stored copy straight away, even on
// a weak signal; a new version is fetched in the background and used the next time it opens.
// The farm data itself is kept separately, by src/lib/offline.js.
const VERSION = '__BUILD__';            // replaced by the build (vite.config.js)
const APP = 'pt-app-' + VERSION;
const META = 'pt-meta';
const FONTS = 'pt-fonts-v1';
const TILES = 'pt-tiles-v1';            // satellite map tiles you've looked at
const PHOTOS = 'pt-photos-v1';          // photos you've looked at (kept by file, not by signed link)

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const list = await (await fetch('/precache.json', { cache: 'no-store' })).json();
    const cache = await caches.open(APP);
    // Built files never change under the same name, so reuse ones already on the phone.
    await Promise.all(list.files.map(async f => {
      if (f.startsWith('/assets/')) { const have = await caches.match(f, { ignoreVary: true }); if (have) { await cache.put(f, have); return; } }
      const res = await fetch(f, { cache: 'reload' });
      if (!res.ok) throw new Error('precache ' + f + ' ' + res.status);
      await cache.put(f === '/' ? '/index.html' : f, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Keep this version and the one before (a page still open on it may need its files).
    const meta = await caches.open(META);
    const prev = await (await meta.match('/version'))?.text();
    for (const k of await caches.keys()) if (k.startsWith('pt-app-') && k !== APP && k !== 'pt-app-' + prev) await caches.delete(k);
    for (const k of ['pt-app-v1']) await caches.delete(k);
    if (prev !== VERSION) await meta.put('/version', new Response(VERSION));
    await self.clients.claim();
  })());
});

const cacheFirst = (req, name, key = req) => (async () => {
  const hit = await caches.match(key, { ignoreVary: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') (await caches.open(name)).put(key, res.clone());
    return res;
  } catch { return Response.error(); }
})();

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (same && req.mode === 'navigate' && !url.pathname.startsWith('/api/')) {
    // The stored copy of this version, at once. The browser checks for a newer version by itself.
    e.respondWith((async () => (await caches.open(APP).then(c => c.match('/index.html', { ignoreVary: true })))
      || (await caches.match('/index.html', { ignoreVary: true }))
      || fetch(req).catch(() => Response.error()))());
    return;
  }
  if (same && url.pathname === '/precache.json') return;
  if (same && (url.pathname.startsWith('/assets/') || /\.(png|svg|ico|webmanifest|json|jpg)$/.test(url.pathname))) { e.respondWith(cacheFirst(req, APP)); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(cacheFirst(req, FONTS)); return; }
  if (url.hostname === 'server.arcgisonline.com') { e.respondWith(cacheFirst(req, TILES)); return; }
  if (url.pathname.includes('/storage/v1/object/sign/photos/')) {
    // Signed links change every time; the photo behind them doesn't. Keep it by its path.
    e.respondWith(cacheFirst(req, PHOTOS, url.origin + url.pathname));
  }
});

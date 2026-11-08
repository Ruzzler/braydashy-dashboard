// Network first, cache as fallback (2026-11-07). The old cache-first worker kept serving an
// old index.html after an update, which then asked for asset files a release no longer has.
const CACHE_NAME = 'braydashy-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => { })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).pathname.startsWith('/api/')) return;
    event.respondWith(
        fetch(req)
            .then((response) => {
                if (response.ok && ASSETS.includes(new URL(req.url).pathname)) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return response;
            })
            .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
});

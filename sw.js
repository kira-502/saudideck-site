// SaudiDeck service worker — offline shell + stale-while-revalidate
// Bump CACHE_VERSION to force a full cache refresh on the next visit
const CACHE_VERSION = 'saudideck-v3';

// Pre-cache unversioned assets. Versioned JS/CSS (games.js?v=N, style.css?v=N)
// are cached lazily by the fetch handler on first request — this way we don't
// need to keep sw.js in sync with cache-busting version bumps in index.html.
const SHELL = [
    './',
    'index.html',
    'guide-pc.html',
    'guide-deck.html',
    'assets/logo.png',
    'assets/Windows_logo.png',
    'assets/Steam_Deck_logo.png',
    'assets/badge_verified.png',
    'assets/pc_step1.png',
    'assets/pc_step2.png',
    'assets/pc_step3.png',
    'assets/deck_step2_a.png',
    'assets/deck_step2_b.png',
    'assets/deck_step3_a.png',
    'assets/deck_step3_b.png',
    'assets/fonts/cairo-arabic.woff2',
    'assets/fonts/cairo-latin.woff2',
    'assets/fonts/cairo-latin-ext.woff2',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Skip cross-origin (Steam CDN, IGDB, etc.) — let the network handle these
    if (url.origin !== self.location.origin) return;

    // Stale-while-revalidate for same-origin: serve cache immediately, refresh in background
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req).then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
                }
                return response;
            }).catch(() => {
                // Offline + uncached: never return undefined (browser shows network error)
                if (cached) return cached;
                // For navigation requests, fall back to cached index.html (SPA-ish)
                if (req.mode === 'navigate') return caches.match('index.html');
                return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
            });
            return cached || fetchPromise;
        })
    );
});

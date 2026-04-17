// SaudiDeck service worker — offline shell + stale-while-revalidate for game data
// Bump CACHE_VERSION when the app shell changes (HTML/CSS/JS/fonts)
const CACHE_VERSION = 'saudideck-v1';

// Core shell: loads instantly offline after first visit
const SHELL = [
    './',
    'index.html',
    'style.css?v=12',
    'script.js?v=30',
    'games.js?v=72',
    'assets/logo.png',
    'assets/Windows_logo.png',
    'assets/Steam_Deck_logo.png',
    'assets/badge_verified.png',
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
            }).catch(() => cached); // Offline: return cached if we have it
            return cached || fetchPromise;
        })
    );
});

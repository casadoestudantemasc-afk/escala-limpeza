const CACHE = 'escala-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/js/config.js',
  '/js/admin.js',
  '/js/db.js',
  '/js/resident.js',
  '/js/modules/state.js',
  '/js/modules/dateUtil.js',
  '/js/modules/db.js',
  '/js/modules/uiUtils.js',
  '/js/modules/render.js',
  '/js/modules/escala.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Deixa requisições ao Supabase sempre ir à rede
  if (e.request.url.includes('supabase.co')) return;

  const isShellRequest =
    e.request.mode === 'navigate' ||
    e.request.destination === 'script' ||
    e.request.destination === 'style' ||
    e.request.destination === 'document';

  // Para HTML/JS/CSS: prioriza rede para evitar código antigo no admin.
  if (isShellRequest) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Para demais assets: cache-first com fallback de rede.
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

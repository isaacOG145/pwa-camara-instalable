const NOMBRE_CACHE = 'inspeccion-pwa-v1';

const ARCHIVOS_PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Fase de instalación: precachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(NOMBRE_CACHE)
      .then((cache) => {
        return cache.addAll(ARCHIVOS_PRECACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Fallo en el precacheo durante install:', error);
      })
  );
});

// Fase de activación: limpiar cachés antiguas si cambia la versión
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombresCaches) => {
        return Promise.all(
          nombresCaches.map((nombre) => {
            if (nombre !== NOMBRE_CACHE) {
              return caches.delete(nombre);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fase fetch: estrategia Cache First
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((respuestaCacheada) => {
        if (respuestaCacheada) {
          return respuestaCacheada;
        }
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('Error al resolver la petición fetch:', error);
      })
  );
});
const CACHE_STATIC = 'app-static';
const CACHE_DYNAMIC = 'app-dynamic';

const ARCHIVOS_ESTATICOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Fase de instalación: precachear el App Shell en CACHE_STATIC
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cacheStatic) => {
        return cacheStatic.addAll(ARCHIVOS_ESTATICOS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Error al precachear archivos estáticos:', error);
      })
  );
});

// Fase de activación: limpiar cachés antiguas distintas a las actuales
self.addEventListener('activate', (event) => {
  const cachesPermitidas = [CACHE_STATIC, CACHE_DYNAMIC];

  event.waitUntil(
    caches
      .keys()
      .then((nombresCaches) => {
        return Promise.all(
          nombresCaches.map((nombre) => {
            if (!cachesPermitidas.includes(nombre)) {
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

// Enrutamiento dinámico de peticiones fetch
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET (como POST) o esquemas de extensiones
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  const esArchivoEstatico = ARCHIVOS_ESTATICOS.some((ruta) => {
    const rutaLimpia = ruta.replace('./', '');
    return rutaLimpia === '' ? url.pathname.endsWith('/') : url.pathname.endsWith(rutaLimpia);
  });

  if (esArchivoEstatico) {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(netFirst(event.request));
  }
});

// Estrategia 1: Cache First (para recursos estáticos / App Shell)
function cacheFirst(request) {
  return caches.match(request).then((respCache) => {
    // Revisar si hay caché
    if (respCache) {
      return respCache;
    }

    return fetch(request).then((respNet) => {
      return caches.open(CACHE_STATIC).then((cacheStatic) => {
        cacheStatic.put(request, respNet.clone());
        return respNet;
      });
    });
  });
}

// Estrategia 2: Network First (para datos dinámicos o peticiones externas)
function netFirst(request) {
  return fetch(request)
    .then((respnet) => {
      return caches.open(CACHE_DYNAMIC).then((cacheDynamic) => {
        cacheDynamic.put(request, respnet.clone());
        return respnet;
      });
    })
    .catch(() => {
      return caches.match(request).then((resCache) => {
        if (resCache) {
          return resCache;
        }
        return new Response(
          JSON.stringify({
            error: 'No hay red ni cache disponible'
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      });
    });
}
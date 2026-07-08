// Service worker de DescriptIA: cachea todos los archivos para que la app
// se pueda instalar y funcione sin conexión. Para publicar una actualización,
// sube el número de versión (CACHE) y se refrescará en el siguiente arranque.
const CACHE = "fiesta-v3.1.1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./css/estilos.css",
  "./js/nucleo/pantallas.js",
  "./js/nucleo/util.js",
  "./js/nucleo/arranque.js",
  "./js/descriptia/estado.js",
  "./js/descriptia/datos.js",
  "./js/descriptia/juego.js",
  "./js/descriptia/main.js",
  "./js/cartas/main.js",
  "./js/ruleta/main.js",
  "./data/ruleta/tematicas.js",
  "./data/descriptia/tarjetas.js",
  "./data/cartas/efectos.js",
  "./site.webmanifest",
  "./icons/icono.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Cartas de la Fortuna: reverso + 40 españolas + 6 tarot (para jugar offline)
  "./img/cartas/reverso.png",
  "./img/cartas/oros-1.png",
  "./img/cartas/oros-2.png",
  "./img/cartas/oros-3.png",
  "./img/cartas/oros-4.png",
  "./img/cartas/oros-5.png",
  "./img/cartas/oros-6.png",
  "./img/cartas/oros-7.png",
  "./img/cartas/oros-sota.png",
  "./img/cartas/oros-caballo.png",
  "./img/cartas/oros-rey.png",
  "./img/cartas/copas-1.png",
  "./img/cartas/copas-2.png",
  "./img/cartas/copas-3.png",
  "./img/cartas/copas-4.png",
  "./img/cartas/copas-5.png",
  "./img/cartas/copas-6.png",
  "./img/cartas/copas-7.png",
  "./img/cartas/copas-sota.png",
  "./img/cartas/copas-caballo.png",
  "./img/cartas/copas-rey.png",
  "./img/cartas/espadas-1.png",
  "./img/cartas/espadas-2.png",
  "./img/cartas/espadas-3.png",
  "./img/cartas/espadas-4.png",
  "./img/cartas/espadas-5.png",
  "./img/cartas/espadas-6.png",
  "./img/cartas/espadas-7.png",
  "./img/cartas/espadas-sota.png",
  "./img/cartas/espadas-caballo.png",
  "./img/cartas/espadas-rey.png",
  "./img/cartas/bastos-1.png",
  "./img/cartas/bastos-2.png",
  "./img/cartas/bastos-3.png",
  "./img/cartas/bastos-4.png",
  "./img/cartas/bastos-5.png",
  "./img/cartas/bastos-6.png",
  "./img/cartas/bastos-7.png",
  "./img/cartas/bastos-sota.png",
  "./img/cartas/bastos-caballo.png",
  "./img/cartas/bastos-rey.png",
  "./img/cartas/tarot-diablo.png",
  "./img/cartas/tarot-diablo-invertida.png",
  "./img/cartas/tarot-loco.png",
  "./img/cartas/tarot-loco-invertida.png",
  "./img/cartas/tarot-rueda.png",
  "./img/cartas/tarot-rueda-invertida.png",
  // Zona Tensionada: cartas de los roles + reverso (Fase 0)
  "./img/zona/reverso.png",
  "./img/zona/buitre.png",
  "./img/zona/plataforma.png",
  "./img/zona/hacienda.png",
  "./img/zona/sindicato.png",
  "./img/zona/okupa.png",
  "./img/zona/tasador.png",
  "./img/zona/inmobiliaria.png",
  "./img/zona/influencer.png",
  "./img/zona/vecino-1.png",
  "./img/zona/vecino-2.png",
  "./img/zona/vecino-3.png",
  "./img/zona/vecino-4.png",
  "./img/zona/vecino-5.png",
];

// Al instalar: guardar todos los archivos en caché.
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting())
  );
});

// Al activar: borrar cachés de versiones antiguas.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
      )
      .then(() => self.clients.claim())
  );
});

// Al pedir un recurso: servir de la caché y, si no está, ir a la red.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    caches.match(evento.request).then((cacheado) => {
      return (
        cacheado ||
        fetch(evento.request).catch(() => caches.match("./index.html"))
      );
    })
  );
});

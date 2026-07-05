// Service worker de DescriptIA: cachea todos los archivos para que la app
// se pueda instalar y funcione sin conexión. Para publicar una actualización,
// sube el número de versión (CACHE) y se refrescará en el siguiente arranque.
const CACHE = "descriptia-v1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./css/estilos.css",
  "./js/estado.js",
  "./js/datos.js",
  "./js/pantallas.js",
  "./js/juego.js",
  "./js/main.js",
  "./data/tarjetas.js",
  "./site.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
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

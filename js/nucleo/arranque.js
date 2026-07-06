// Núcleo de FIEsta: arranque de la app y utilidades comunes a todos los juegos.
// Debe cargarse el ÚLTIMO: al terminar muestra el hub de juegos.

// Botones "Atrás": cualquier botón con data-volver navega solo, sin JS específico.
function conectarNavegacionGenerica() {
  document.querySelectorAll("[data-volver]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarPantalla(boton.dataset.volver));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  conectarNavegacionGenerica();
  // La app siempre arranca en el hub (pantalla "fiesta").
  mostrarPantalla("fiesta");
});

// Registra el service worker (permite instalarla como app y jugar sin conexión).
// Solo funciona sobre http(s), no al abrir el archivo directamente (file://).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* si falla, la app sigue funcionando igual, solo sin offline */
    });
  });
}

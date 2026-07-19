// Núcleo de FIEsta: arranque de la app y utilidades comunes a todos los juegos.
// Debe cargarse el ÚLTIMO: al terminar muestra el hub de juegos.

// Versión de la app. Al subirla, sube también CACHE en sw.js (otro contexto, no ve esto).
const APP_VERSION = "5.5.0";

// Textos de la ventana de información de cada juego (la ⓘ de las tarjetas del hub).
const INFO_JUEGOS = {
  descriptia: {
    titulo: "DescriptIA",
    texto:
      "Juego por equipos con un solo móvil. Se juegan tres rondas con las mismas " +
      "40 tarjetas: descripción libre, una sola palabra y gestos. En cada turno " +
      "de 40 segundos, un jugador hace adivinar a su equipo tantas tarjetas como " +
      "pueda. Gana el equipo con más aciertos.",
  },
  cartas: {
    titulo: "Cartas de la Fortuna",
    texto:
      "Por turnos, cada jugador roba una carta del mazo y cumple su efecto: " +
      "puede afectarte a ti, a quien elijas o a todo el grupo. Algunos efectos " +
      "duran varios turnos (se consultan en el botón «Efectos»). La partida " +
      "termina cuando se acaba el mazo. Este juego trata de beber, y mucho.",
  },
  ruleta: {
    titulo: "La Ruleta",
    texto:
      "En cada turno, un jugador se tapa los ojos mientras el resto ve dónde cae " +
      "el sector oculto dentro de un espectro entre dos polos (por ejemplo, " +
      "frío – caliente) y acuerda una pista. Después, el jugador coloca la aguja " +
      "donde cree que está el sector: cuanto más cerca del centro, más puntos " +
      "(hasta 3). Gana quien más puntos suma.",
  },
  zona: {
    titulo: "Zona Tensionada",
    texto:
      "Juego de roles ocultos con una persona narradora aparte. Cada noche, los " +
      "fondos buitre desahucian a alguien del barrio; de día, el vecindario " +
      "debate y vota a quién expulsar. Las cartas especiales (Hacienda, el " +
      "Okupa, el Tasador…) cambian cada partida.",
  },
  blackjack: {
    titulo: "21 Arcanos",
    texto:
      "Blackjack con dos modos. En el Clásico juegas tú solo contra la banca con " +
      "una banca de fichas que se guarda entre partidas. En el modo Arcade " +
      "compiten hasta 5 jugadores en un solo móvil: cada uno apuesta en su " +
      "turno y, al empezar la partida, tres arcanos de tarot fijan reglas de mesa " +
      "que valen para todos. Un interruptor de modo fiesta añade tragos a la partida.",
  },
};

// Botones "Atrás": cualquier botón con data-volver navega solo, sin JS específico.
function conectarNavegacionGenerica() {
  document.querySelectorAll("[data-volver]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarPantalla(boton.dataset.volver));
  });
}

// La ⓘ de cada tarjeta del hub abre la ventana de info de su juego; tocar en
// cualquier parte del overlay la cierra (mismo patrón que los efectos de Cartas).
function conectarInfoJuegos() {
  const overlay = document.getElementById("info-juego");
  document.querySelectorAll(".juego-card-info").forEach((icono) => {
    icono.addEventListener("click", (evento) => {
      // Que el toque no llegue a la tarjeta: abriría el juego a la vez.
      evento.stopPropagation();
      const info = INFO_JUEGOS[icono.dataset.info];
      document.getElementById("info-juego-titulo").textContent = info.titulo;
      document.getElementById("info-juego-texto").textContent = info.texto;
      overlay.hidden = false;
    });
  });
  overlay.addEventListener("click", () => {
    overlay.hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  conectarNavegacionGenerica();
  conectarInfoJuegos();
  document.getElementById("app-version").textContent = "v" + APP_VERSION;
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

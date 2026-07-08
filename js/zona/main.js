// Zona Tensionada: arranque del juego y (en fases próximas) su lógica.
//
// Parodia de *El Pueblo Duerme* con temática de crisis de la vivienda: el pueblo
// es el barrio, los lobos son fondos buitre, morir es ser desahuciado y el
// linchamiento es una asamblea de vecinos. Juegan 5–14 personas con carta, más
// una persona narradora (sin carta) que maneja el móvil durante la noche.
//
// Namespacing: todo cuelga de `ztEstado` y de funciones/constantes con prefijo
// (zt… / ZT_…). Los .js comparten el mismo espacio global, así que una variable
// llamada `estado` pisaría la de DescriptIA, y `jugadores` la de cualquiera.
// (zt = Zona Tensionada.)

// Límites de jugadores que reciben carta (la narradora no cuenta).
const ZT_MIN_JUGADORES = 5;
const ZT_MAX_JUGADORES = 14;
const ZT_JUGADORES_INICIAL = 8;

// Estado de la partida. Igual que en los otros juegos, TODO vive dentro de un
// único objeto: así los cuatro juegos no se estorban y, cuando llegue la Fase 8,
// guardar la partida es serializar este objeto y ya está (nada de rebuscar
// variables sueltas por el archivo).
//
// Se declara entero desde ya —aunque casi todos los campos estén vacíos— para
// que sirva de mapa de lo que el juego necesita recordar. Las fases lo van
// rellenando; ninguna añade campos nuevos por sorpresa.
const ztEstado = {
  // [{ nombre, rol, vivo, identidad, sinVotoHoy, parejaCon }] — Fase 3
  jugadores: [],

  // Lo que se elige en zt-jugadores y zt-config (Fase 2).
  config: {
    numJugadores: ZT_JUGADORES_INICIAL,
    numBuitres: 2,
    // Un interruptor por carta especial. El preset según el nº de jugadores
    // decide los valores iniciales (Fase 2, TODO 2.2).
    especiales: {
      hacienda: true,
      sindicato: true,
      plataforma: false,
      okupa: false,
      tasador: false,
      influencer: false,
      inmobiliaria: false,
    },
  },

  concejalIndex: null,  // índice del Concejal en `jugadores` (o null) — Fase 4
  noche: 0,             // nº de noche actual — Fase 5
  colaTurnos: [],       // turnos nocturnos pendientes esta noche — Fase 5
  victimaNoche: null,   // a quién eligieron los buitres (aún sin resolver) — Fase 5

  // Los dos poderes que se gastan y NO deben poder repetirse. Viven en el estado
  // (no en el DOM) para que sobrevivan a un re-render y a la persistencia.
  sindicatoDisponible: true, // el uso único de la cacerolada — Fase 5
  okupaResistio: false,      // si el Okupa ya gastó su vida extra — Fase 5

  fase: "config",       // en qué punto va la partida (para la persistencia) — Fase 8
};

// ============================================================
//  Registro del juego en el hub
// ============================================================

// Punto de entrada del juego: se ejecuta UNA vez, cuando el DOM está listo (por
// el addEventListener del final de este archivo). Aquí solo se enganchan botones;
// la navegación la hacen las funciones que se llaman al pulsarlos.
//
// La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que su navegación se
// hace por código. Los botones «Atrás» de las pantallas zt-* usan data-volver y
// los resuelve el núcleo (conectarNavegacionGenerica, js/nucleo/arranque.js:8),
// sin código aquí. Las nuevas pantallas de la Fase 2 registrarán su wiring aquí.
function ztConectar() {
  document
    .getElementById("btn-juego-zona")
    .addEventListener("click", ztEntrarJugadores);
}

// Entra a la configuración desde el hub. El click no llama a mostrarPantalla
// directamente: pasa por aquí para PREPARAR la pantalla antes de enseñarla. Hoy no
// hay nada que preparar, pero en la Fase 2 esta función crecerá (resetear el nº de
// jugadores, pintar los inputs de nombres, limpiar el error), como rlEntrarConfig()
// en js/ruleta/main.js:63.
function ztEntrarJugadores() {
  mostrarPantalla("zt-jugadores");
}

// Este juego registra su propio wiring cuando el DOM está listo, igual que los
// otros tres. El núcleo (arranque.js) no sabe que Zona Tensionada existe: son los
// juegos los que se apuntan solos.
document.addEventListener("DOMContentLoaded", ztConectar);

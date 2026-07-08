// La Ruleta: arranque del juego y (en fases próximas) su lógica.
//
// Versión con un solo móvil de *Wavelength*: un jugador adivina dónde cae un
// concepto dentro de un espectro entre dos polos, guiándose por una pista verbal
// que le da el resto del grupo.
//
// Namespacing: todo cuelga de `rlEstado` y de funciones/constantes con prefijo
// (rl… / RL_…), porque todos los .js comparten el mismo espacio global y una
// variable con el mismo nombre que otra de DescriptIA (`estado`) o Cartas
// (`cfEstado`) se pisaría. (rl = La Ruleta.)

// Límites de jugadores para este juego (sin equipos).
const RL_MIN_JUGADORES = 2;
const RL_MAX_JUGADORES = 6;
const RL_JUGADORES_INICIAL = 2;

// Estado del juego. Al tenerlo todo dentro de un único objeto, los tres juegos no
// se estorban. Se irá rellenando a lo largo de las fases.
const rlEstado = {
  numJugadores: RL_JUGADORES_INICIAL, // cuántos jugadores hay ahora mismo
  jugadores: [],       // [{ nombre, puntos }] en orden barajado
  tematicas: [],       // las 3 temáticas elegidas para esta partida
  tematicaIndex: 0,    // 0..2: qué temática se está jugando
  turnoIndex: 0,       // quién adivina dentro de la temática actual
  centroSector: 90,    // ángulo central del sector (se regenera cada turno)
  anguloAguja: 90,     // posición actual de la aguja (grados, 0..180)
  subEstado: "pista",  // "pista" | "adivinando" | "resultado"
};

// Engancha los botones de este juego. Se llama una vez, al cargar la página.
function rlConectar() {
  // La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que la navegación
  // se hace por código. Los botones "Atrás" usan data-volver="fiesta" y los
  // resuelve el núcleo (conectarNavegacionGenerica), sin código aquí.
  document
    .getElementById("btn-juego-ruleta")
    .addEventListener("click", rlEntrarConfig);

  // Navegación de andamiaje para poder recorrer el esqueleto. La lógica real de
  // cada botón llega en su fase (config en la 2, turnos en la 6).
  document
    .getElementById("rl-btn-empezar")
    .addEventListener("click", () => mostrarPantalla("rl-turno"));
  document
    .getElementById("rl-btn-ver-ruleta")
    .addEventListener("click", () => mostrarPantalla("rl-juego"));
}

// Prepara y muestra la pantalla de configuración (se llama al entrar desde el hub).
// En la Fase 2 aquí se preparará el stepper y la lista de nombres; de momento solo
// resetea el contador y muestra la pantalla.
function rlEntrarConfig() {
  rlEstado.numJugadores = RL_JUGADORES_INICIAL;
  mostrarPantalla("rl-config");
}

// Cada juego registra su propio wiring cuando el DOM está listo (igual que Cartas
// y DescriptIA). El núcleo, aparte, arranca mostrando el hub.
document.addEventListener("DOMContentLoaded", rlConectar);

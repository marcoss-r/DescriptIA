// Cartas de la Fortuna: arranque del juego y (en fases próximas) su lógica.
//
// Namespacing: todo lo de este juego cuelga de `cfEstado` y de funciones con
// prefijo (cf… / conectarCartas…), para no chocar con las variables globales de
// DescriptIA (que usa `estado`, `cfg`, `conectarInicio`, …). Todos los .js
// comparten el mismo espacio global, así que dos variables con el mismo nombre
// se pisarían. (cf = Cartas de la Fortuna.)

// Límites de jugadores para este juego (sin equipos).
const CF_MIN_JUGADORES = 2;
const CF_MAX_JUGADORES = 10;
const CF_JUGADORES_INICIAL = 4;

// Estado del juego. Al tenerlo todo dentro de un único objeto, DescriptIA y este
// juego no se estorban. Se irá rellenando a lo largo de las fases.
const cfEstado = {
  numJugadores: CF_JUGADORES_INICIAL, // cuántos jugadores hay ahora mismo
  jugadores: [],       // { id, nombre }
  orden: [],           // ids de jugadores ya barajados: en qué orden juegan
  mazo: [],            // cartas que quedan por robar
  turno: 0,            // índice dentro de `orden` del jugador al que le toca
  cartaRevelada: null, // última carta descubierta, o null si el mazo está boca abajo
};

// Engancha los botones de este juego. Se llama una vez, al cargar la página.
function conectarCartas() {
  // La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que la navegación se
  // hace por código: data-volver es solo para botones de "Atrás". Al entrar, preparamos
  // la pantalla de configuración (cfEntrarConfig la deja lista y la muestra).
  document
    .getElementById("btn-juego-cartas")
    .addEventListener("click", cfEntrarConfig);

  conectarCartasConfig();
}

// ============================================================
//  Configuración de jugadores (2–10)
// ============================================================

// Prepara y muestra la pantalla de configuración (se llama al entrar desde el hub).
function cfEntrarConfig() {
  cfEstado.numJugadores = CF_JUGADORES_INICIAL;
  cfSincronizarJugadores();
  cfRenderNombres();
  document.getElementById("cf-valor-num-jugadores").textContent = cfEstado.numJugadores;
  document.getElementById("cf-error-jugadores").textContent = "";
  mostrarPantalla("cf-config");
}

// Engancha el stepper (− nº +) y el botón "Empezar". Se llama una vez al cargar.
function conectarCartasConfig() {
  const stepper = document.querySelector('[data-stepper="cf-jugadores"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso); // -1 o +1
      const nuevo = cfEstado.numJugadores + paso;
      if (nuevo < CF_MIN_JUGADORES || nuevo > CF_MAX_JUGADORES) return; // fuera de rango: no hacer nada
      cfEstado.numJugadores = nuevo;
      document.getElementById("cf-valor-num-jugadores").textContent = nuevo;
      cfSincronizarJugadores();
      cfRenderNombres();
    });
  });

  document.getElementById("cf-btn-empezar").addEventListener("click", cfEmpezar);
}

// Mantiene cfEstado.jugadores con EXACTAMENTE cfEstado.numJugadores elementos,
// conservando los nombres ya escritos.
function cfSincronizarJugadores() {
  // Conservamos los nombres ya escritos y creamos un array nuevo con exactamente
  // cfEstado.numJugadores elementos (los que falten entran con nombre "").
  const cfActuales = cfEstado.jugadores;
  const cfNuevos = [];
  for (let i = 0; i < cfEstado.numJugadores; i++) {
    cfNuevos.push({ id: i + 1, nombre: cfActuales[i] ? cfActuales[i].nombre : "" });
  }
  cfEstado.jugadores = cfNuevos;
}

// Pinta un <input> por jugador dentro de #cf-lista-nombres y mantiene sus nombres
// sincronizados con cfEstado a medida que se escribe.
function cfRenderNombres() {
  const cont = document.getElementById("cf-lista-nombres");
  cont.innerHTML = "";
  cfEstado.jugadores.forEach((jugador, indice) => {
    const fila = document.createElement("div");
    fila.className = "campo";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Jugador ${indice + 1}`;
    input.value = jugador.nombre;
    input.maxLength = 20;
    input.addEventListener("input", () => {
      cfEstado.jugadores[indice].nombre = input.value;
    });

    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// Valida los nombres, fija el orden de turno al azar y pasa a la pantalla de juego.
function cfEmpezar() {
  const error = document.getElementById("cf-error-jugadores");
  const hayVacios = cfEstado.jugadores.some((j) => j.nombre.trim() === "");
  if (hayVacios) {
    error.textContent = "Todos los jugadores necesitan un nombre.";
    return;
  }
  error.textContent = "";

  // Orden de turno al azar: barajar() (js/nucleo/util.js) devuelve una copia de la
  // lista de ids en orden aleatorio (Fisher–Yates), sin tocar el original.
  cfEstado.orden = barajar(cfEstado.jugadores.map((j) => j.id));

  mostrarPantalla("cf-juego");
}

// Cada juego registra su propio wiring cuando el DOM está listo (igual que hace
// DescriptIA en su main.js). El núcleo, aparte, arranca mostrando el hub.
document.addEventListener("DOMContentLoaded", conectarCartas);

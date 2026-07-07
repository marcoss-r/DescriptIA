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
const CF_JUGADORES_INICIAL = 2;

// Estado del juego. Al tenerlo todo dentro de un único objeto, DescriptIA y este
// juego no se estorban. Se irá rellenando a lo largo de las fases.
const cfEstado = {
  numJugadores: CF_JUGADORES_INICIAL, // cuántos jugadores hay ahora mismo
  jugadores: [],       // { id, nombre }
  orden: [],           // ids de jugadores ya barajados: en qué orden juegan
  mazo: [],            // cartas que quedan por robar
  turno: 0,            // índice dentro de `orden` del jugador al que le toca
  cartaRevelada: null, // última carta descubierta, o null si el mazo está boca abajo
  efectosActivos: [],  // { carta, beneficiadoId, perjudicadoId, expiraEnTurnoDe }
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
  conectarCartasJuego();
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
  // Ofrecemos "Continuar" solo si hay una partida guardada reanudable.
  document.getElementById("cf-btn-continuar").hidden = !cfHayPartidaGuardada();
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
  document.getElementById("cf-btn-continuar").addEventListener("click", cfReanudar);
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

  // Preparar el mazo: la española (40) + el tarot (6) = 46 cartas. El spread
  // (...) junta los dos arrays en uno y barajar() lo devuelve mezclado.
  // Reseteamos el turno y la carta revelada.
  cfEstado.mazo = barajar([...cfConstruirMazo(), ...cfConstruirMazoTarot()]);
  cfEstado.turno = 0;
  cfEstado.cartaRevelada = null;
  cfEstado.efectosActivos = [];

  cfEntrarJuego();
}

// ============================================================
//  Lógica del mazo (robar cartas)
// ============================================================

// Saca la carta de arriba del mazo, la guarda como carta revelada y la DEVUELVE.
// Si el mazo ya está vacío, devuelve null (eso marca el fin de la partida). Esta
// función SÍ muta cfEstado.mazo con pop(): la carta robada desaparece del array y
// no vuelve a salir (al revés que barajar(), que copia sin mutar).
function cfRobarCarta() {
  if (cfEstado.mazo.length === 0) {
    return null;
  } else {
    const carta = cfEstado.mazo.pop();
    cfEstado.cartaRevelada = carta;
    return carta;
  }
}

// ============================================================
//  Continuar partida (persistencia en localStorage)
// ============================================================

// Clave bajo la que se guarda la partida. Prefijada (cartas_) para no chocar con
// la de DescriptIA ("descriptia_partida").
const CF_CLAVE_GUARDADO = "cartas_partida";

// Guarda todo cfEstado en localStorage, para poder reanudar tras cerrar la app.
// localStorage solo almacena TEXTO, por eso JSON.stringify convierte el objeto en
// una cadena. El try/catch cubre el modo privado o sin espacio: si setItem falla,
// simplemente no guardamos (no rompemos el juego).
function cfGuardar() {
  try {
    localStorage.setItem(CF_CLAVE_GUARDADO, JSON.stringify(cfEstado));
  } catch (e) {
    console.warn("No se pudo guardar la partida:", e);
  }
}

// Carga la partida guardada DENTRO de cfEstado. Devuelve true si había una partida
// válida (y entonces cfEstado ya queda con esos datos), false si no.
function cfCargar() {
  let texto = null;
  try {
    texto = localStorage.getItem(CF_CLAVE_GUARDADO);
  } catch (e) {
    return false; // localStorage bloqueado: no hay nada que reanudar
  }
  if (!texto) return false; // no había ninguna partida guardada

  let datos;
  try {
    datos = JSON.parse(texto); // de texto de vuelta a objeto
  } catch (e) {
    return false; // el texto guardado estaba corrupto
  }
  if (!datos || typeof datos !== "object") return false;

  // Object.assign copia las propiedades de `datos` encima de cfEstado, dejándolo
  // igual que cuando se guardó (mazo, orden, turno, jugadores, numJugadores...).
  Object.assign(cfEstado, datos);
  return true;
}

// ¿Hay una partida guardada? (solo comprueba, sin tocar cfEstado). Se usa para
// decidir si mostrar el botón "Continuar" en la configuración.
function cfHayPartidaGuardada() {
  try {
    return localStorage.getItem(CF_CLAVE_GUARDADO) !== null;
  } catch (e) {
    return false;
  }
}

// Borra la partida guardada (al terminar el mazo).
function cfBorrar() {
  try {
    localStorage.removeItem(CF_CLAVE_GUARDADO);
  } catch (e) {
    // Si no se puede borrar, tampoco es crítico.
  }
}

// Reanuda la partida guardada: la carga en cfEstado y entra a la pantalla de juego
// (que pinta el turno guardado). Enganchado al botón "Continuar".
function cfReanudar() {
  if (cfCargar()) {
    cfEntrarJuego();
  }
}

// Fin de la partida: descarta la partida guardada y muestra la pantalla de fin.
function cfTerminar() {
  cfBorrar();
  mostrarPantalla("cf-fin");
}

// ============================================================
//  Pantalla de juego: turnos y revelado
// ============================================================

// Engancha los botones de la pantalla de juego (una vez, al cargar).
function conectarCartasJuego() {
  // Tocar la carta (el mazo boca abajo) la revela.
  document.getElementById("cf-carta").addEventListener("click", cfRevelarCarta);
  // "Siguiente jugador" pasa el turno.
  document
    .getElementById("cf-btn-siguiente")
    .addEventListener("click", cfSiguienteJugador);
}

// Entra a la pantalla de juego (desde cfEmpezar). El mazo y el orden ya vienen
// preparados; solo pintamos el primer turno y mostramos la pantalla.
function cfEntrarJuego() {
  cfPintarTurno();
  mostrarPantalla("cf-juego");
}

// Deja la pantalla lista para el jugador ACTUAL: su nombre en la cabecera, la
// carta boca abajo, sin efecto y sin botón de "siguiente" (aún no ha revelado).
function cfPintarTurno() {
  // Al empezar el turno de un jugador caducan los efectos que expiraban "cuando le
  // vuelva a tocar" a ese jugador (el 6, el diablo y el loco invertida).
  cfExpirarEfectos();
  document.getElementById("cf-turno-nombre").textContent = cfNombreActual();
  cfEstado.cartaRevelada = null;
  document.getElementById("cf-carta").classList.remove("volteada");
  document.getElementById("cf-efecto").textContent = "";
  document.getElementById("cf-accion").innerHTML = "";
  document.getElementById("cf-btn-siguiente").hidden = true;
  cfRenderEfectos();
  // Guardamos al inicio de cada turno (carta boca abajo): así "Continuar" siempre
  // reanuda en un turno limpio, sin cartas reveladas a medias.
  cfGuardar();
}

// --- Ayudantes (ya resueltos: ejemplo del patrón "ramificar por origen") ---

// Id del jugador al que le toca ahora (cfEstado.turno es el índice dentro del orden
// ya barajado).
function cfJugadorActualId() {
  return cfEstado.orden[cfEstado.turno];
}

// Nombre de un jugador a partir de su id.
function cfNombrePorId(id) {
  const jugador = cfEstado.jugadores.find((j) => j.id === id);
  return jugador ? jugador.nombre : "";
}

// Nombre del jugador al que le toca ahora.
function cfNombreActual() {
  return cfNombrePorId(cfJugadorActualId());
}

// Ruta del PNG del FRENTE de una carta, según su origen (española o tarot).
function cfRutaImagen(carta) {
  if (carta.origen === "tarot") {
    const sufijo = carta.orientacion === "invertida" ? "-invertida" : "";
    return `img/cartas/tarot-${carta.nombre}${sufijo}.png`;
  }
  return `img/cartas/${carta.palo}-${carta.valor}.png`;
}

// Texto del efecto de una carta. Aquí se ve para qué guardábamos `origen`: la
// española busca por VALOR y el tarot por NOMBRE + ORIENTACIÓN.
function cfEfectoDe(carta) {
  if (carta.origen === "tarot") {
    return CF_EFECTOS_TAROT[carta.nombre][carta.orientacion];
  }
  return CF_EFECTOS_POR_VALOR[carta.valor];
}

// --- Acciones del turno ---

// Revela la carta superior del mazo para el jugador actual: roba una carta, pinta
// su frente y su efecto, la voltea y muestra "Siguiente jugador". El guard inicial
// evita robar dos veces si se toca la carta ya revelada; si el mazo está vacío, la
// partida termina.
function cfRevelarCarta() {
  if (cfEstado.cartaRevelada !== null) {
    return;
  }
  const carta = cfRobarCarta();
  if (carta === null) {
    cfTerminar();
    return;
  }
  document.getElementById("cf-carta-frente-img").src = cfRutaImagen(carta);
  document.getElementById("cf-efecto").textContent = cfEfectoDe(carta);
  document.getElementById("cf-carta").classList.add("volteada");
  // Según la carta, prepara su acción especial (elegir jugador, números de la rueda,
  // botón de la ruleta rusa) y decide cuándo aparece "Siguiente jugador".
  cfConfigurarAccion(carta);
}

// Pasa el turno al siguiente jugador, o termina si el mazo se ha agotado. El módulo
// hace que el turno vuelva a 0 tras el último jugador (rotación en círculo); si ya
// no quedan cartas, la partida termina.
function cfSiguienteJugador() {
  cfEstado.turno = (cfEstado.turno + 1) % cfEstado.orden.length;
  if (cfEstado.mazo.length === 0) {
    cfTerminar();
    return;
  }
  cfPintarTurno();
}

// ============================================================
//  Efectos actuales y acciones especiales de las cartas (Fase 6)
// ============================================================

// Entero aleatorio entre min y max, ambos incluidos.
function cfEnteroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ¿Esta carta obliga a elegir a otro jugador? (el 7 y el Diablo, normal e invertida)
function cfNecesitaObjetivo(carta) {
  if (carta.origen === "espanola") return carta.valor === 7;
  return carta.nombre === "diablo";
}

function cfEsRuedaNormal(carta) {
  return carta.origen === "tarot" && carta.nombre === "rueda" && carta.orientacion === "normal";
}
function cfEsRuedaInvertida(carta) {
  return carta.origen === "tarot" && carta.nombre === "rueda" && carta.orientacion === "invertida";
}

// Roles de una carta para la zona "Efectos actuales": quién queda beneficiado
// (azul, arriba) y quién perjudicado (rojo, abajo), y cuándo caduca el efecto
// (expiraEnTurnoDe = id del jugador en cuyo próximo turno se quita, o null =
// indefinido). Devuelve null si la carta no genera efecto de los que se muestran.
function cfRolesDeEfecto(carta, elegidoId) {
  const yo = cfJugadorActualId();
  if (carta.origen === "espanola") {
    if (carta.valor === 7) {
      // El elegido bebe cada vez que lo haga quien la saca. Indefinido.
      return { beneficiadoId: yo, perjudicadoId: elegidoId, expiraEnTurnoDe: null };
    }
    if (carta.valor === 6) {
      // Quien la saca queda "ignorado" una ronda: perjudicado, sin beneficiado.
      return { beneficiadoId: null, perjudicadoId: yo, expiraEnTurnoDe: yo };
    }
    return null;
  }
  if (carta.nombre === "diablo") {
    if (carta.orientacion === "normal") {
      // Bebe el elegido por quien la saca.
      return { beneficiadoId: yo, perjudicadoId: elegidoId, expiraEnTurnoDe: yo };
    }
    // Invertida: quien la saca bebe por el elegido.
    return { beneficiadoId: elegidoId, perjudicadoId: yo, expiraEnTurnoDe: yo };
  }
  if (carta.nombre === "loco" && carta.orientacion === "invertida") {
    // Inmune una ronda: solo beneficiado.
    return { beneficiadoId: yo, perjudicadoId: null, expiraEnTurnoDe: yo };
  }
  return null;
}

// Registra el efecto de una carta en cfEstado.efectosActivos (si genera uno).
function cfRegistrarEfecto(carta, elegidoId) {
  const roles = cfRolesDeEfecto(carta, elegidoId);
  if (!roles) return;
  cfEstado.efectosActivos.push({ carta, ...roles });
}

// Quita los efectos que caducan al empezar el turno del jugador actual.
function cfExpirarEfectos() {
  const actualId = cfJugadorActualId();
  cfEstado.efectosActivos = cfEstado.efectosActivos.filter(
    (ef) => ef.expiraEnTurnoDe !== actualId
  );
}

// Prepara la acción especial bajo el efecto, según la carta revelada, y decide
// cuándo aparece "Siguiente jugador".
function cfConfigurarAccion(carta) {
  const accion = document.getElementById("cf-accion");
  accion.innerHTML = "";
  const siguiente = document.getElementById("cf-btn-siguiente");

  // Cartas que obligan a elegir: "Siguiente" espera hasta que se elija el objetivo.
  if (cfNecesitaObjetivo(carta)) {
    siguiente.hidden = true;
    cfPintarBotonesObjetivo(carta, accion);
    return;
  }

  // El resto: registran su efecto (si lo tienen) y muestran ya "Siguiente".
  cfRegistrarEfecto(carta, null);
  cfRenderEfectos();

  if (cfEsRuedaNormal(carta)) {
    cfPintarRuedaNormal(accion);
  } else if (cfEsRuedaInvertida(carta)) {
    cfPintarRuedaInvertida(accion);
  }
  siguiente.hidden = false;
}

// Fila de botones (un jugador por botón, sin el actual) para elegir el objetivo.
function cfPintarBotonesObjetivo(carta, accion) {
  const titulo = document.createElement("p");
  titulo.className = "cf-accion-titulo";
  titulo.textContent = "Elige a un jugador:";
  accion.appendChild(titulo);

  const fila = document.createElement("div");
  fila.className = "cf-objetivos";
  const actualId = cfJugadorActualId();
  cfEstado.jugadores.forEach((jugador) => {
    if (jugador.id === actualId) return; // no puede elegirse a sí mismo
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secundario";
    btn.textContent = jugador.nombre;
    btn.addEventListener("click", () => {
      cfRegistrarEfecto(carta, jugador.id);
      cfRenderEfectos();
      accion.innerHTML = ""; // ya elegido: quitamos los botones
      document.getElementById("cf-btn-siguiente").hidden = false;
    });
    fila.appendChild(btn);
  });
  accion.appendChild(fila);
}

// Rueda normal: genera tragos (2–6) y nº de jugadores (1 … total − 1, porque se
// reparte entre los demás, sin contar al que la saca).
function cfPintarRuedaNormal(accion) {
  const tragos = cfEnteroAleatorio(2, 6);
  const cuantos = cfEnteroAleatorio(1, cfEstado.jugadores.length - 1);
  const info = document.createElement("p");
  info.className = "cf-accion-numeros";
  info.textContent = `${tragos} tragos · repartir entre ${cuantos} ${cuantos === 1 ? "jugador" : "jugadores"}`;
  accion.appendChild(info);
}

// Ruleta rusa (rueda invertida): botón que revela el número secreto (1..total).
function cfPintarRuedaInvertida(accion) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Revelar número";
  btn.addEventListener("click", () => {
    const numero = cfEnteroAleatorio(1, cfEstado.jugadores.length);
    const res = document.createElement("p");
    res.className = "cf-accion-numeros";
    res.textContent = `Número secreto: ${numero}`;
    btn.replaceWith(res);
  });
  accion.appendChild(btn);
}

// Pinta la zona "Efectos actuales": una columna por efecto (beneficiado azul
// arriba, mini-sprite en medio, perjudicado rojo abajo). Se oculta si no hay.
function cfRenderEfectos() {
  const zona = document.getElementById("cf-efectos");
  const lista = document.getElementById("cf-efectos-lista");
  lista.innerHTML = "";
  if (cfEstado.efectosActivos.length === 0) {
    zona.hidden = true;
    return;
  }
  zona.hidden = false;
  cfEstado.efectosActivos.forEach((ef) => {
    const item = document.createElement("div");
    item.className = "cf-efecto-item";

    const benef = document.createElement("span");
    benef.className = "cf-efecto-benef";
    benef.textContent = ef.beneficiadoId ? cfNombrePorId(ef.beneficiadoId) : "";

    const img = document.createElement("img");
    img.src = cfRutaImagen(ef.carta);
    img.alt = "";

    const perj = document.createElement("span");
    perj.className = "cf-efecto-perj";
    perj.textContent = ef.perjudicadoId ? cfNombrePorId(ef.perjudicadoId) : "";

    item.append(benef, img, perj);
    lista.appendChild(item);
  });
}

// Cada juego registra su propio wiring cuando el DOM está listo (igual que hace
// DescriptIA en su main.js). El núcleo, aparte, arranca mostrando el hub.
document.addEventListener("DOMContentLoaded", conectarCartas);

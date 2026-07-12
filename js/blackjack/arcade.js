// 21 Arcanos — Modo Arcade («El Torneo»): 1–5 jugadores hotseat compiten con una
// pila de fichas; gana la pila más grande al final. Ver plan §5.
//
// Estructura de una ronda: el dealer enseña su carta visible → cada jugador, al
// recibir el móvil, apuesta y juega su mano viendo la carta del dealer → al final el
// dealer revela y roba, y se comparan todas las manos. Mesa COMPARTIDA (Fase 9.2):
// las apuestas ya no son secretas; una barra superior muestra las manos y apuestas
// del resto de jugadores. Reparto: las manos de salida se reparten al empezar la
// ronda (así el zapato es justo para todos) y se le muestran a cada jugador en su turno.
//
// Deuda (sin eliminación): la apuesta mínima es obligatoria aunque no tengas
// fichas, así que la pila puede quedar en negativo; en deuda solo puedes apostar la
// mínima y no puedes doblar/dividir/rendirte. Nadie queda fuera de la partida.
//
// Solitario (1 jugador): 8 rondas contra la banca, sin estadísticas persistentes,
// y al terminar se guarda el récord de puntuación máxima con el ruleset con que
// se logró. Nº de mazos NO configurable: 1–2 jugadores, 1 baraja (+1 si hace
// falta); 3–5 jugadores, 2 barajas (+2 si hacen falta). Ver bjArcadeIniciarRonda.
//
// El tarot (Fase 7) y la capa de tragos del modo fiesta (Fase 8) se enganchan aquí
// más adelante; en la Fase 6 el interruptor de modo fiesta se guarda pero aún no
// añade tragos. Reutiliza helpers globales del Clásico (bjCrearCartaImg,
// bjFormatearFichas, bjClaseResultado, BJ_TEXTO_RESULTADO_CORTO), el motor y el
// volteo compartido de js/blackjack/animaciones.js (bjCrearCartaVolteada).

// Configuración del Arcade.
const BJ_ARCADE_JUG_INICIAL = 2;
const BJ_PILA_INICIAL = 60; // pila inicial fija, no configurable
const BJ_ARCADE_RONDAS_SOLITARIO = 8; // solitario: rondas fijas (plan §5)
const BJ_ARCADE_RECORD_CLAVE = "blackjack_arcade_record"; // récord del solitario

// Estado del Arcade. `jugadores` guarda la pila persistente durante la partida;
// `jugadoresRonda` es el estado de la ronda en curso (paralelo a `jugadores`).
const bjArcade = {
  config: { numJugadores: BJ_ARCADE_JUG_INICIAL, rondas: BJ_RONDAS_DEFECTO, fiesta: false },
  jugadores: [],        // [{ nombre, pila, racha, bustPrevio, ganoPrevio }]
  ruleset: null,        // ruleset EFECTIVO de la partida (el Hierofante puede pisarlo)
  numBarajas: 1,
  mazo: [],
  rondasTotal: BJ_RONDAS_DEFECTO,
  ronda: 1,
  mazoAgotado: false,   // el zapato se quedó sin cartas: la partida termina al fin de ronda
  multRonda: 1,         // multiplicador de ganancias de la ronda (Rueda / Juicio)
  manoDealer: [],
  dealerOculta: true,
  orden: [],            // orden de juego de la ronda (índices de jugadores, barajado)
  turnoIndex: 0,        // posición dentro de `orden` (no índice de jugador directo)
  apuestaActual: BJ_APUESTA_MIN, // apuesta que está fijando el jugador de turno
  apuestaMin: BJ_APUESTA_MIN,    // límites de esa apuesta (bjArcadeLimitesApuesta)
  apuestaMax: BJ_APUESTA_MIN,
  // Por jugador y ronda: { apuesta, manos, manoActiva, pilaInicio, cartasIniciales }
  jugadoresRonda: [],
};

// ============================================================
//  Wiring
// ============================================================

// Engancha todos los controles del Arcade. Se llama una vez al cargar la página.
function bjArcadeConectar() {
  bjArcadeConectarStepper("bj-arcade-jugadores", bjArcadeCambiarNumJugadores);
  bjArcadeConectarStepper("bj-arcade-rondas", bjArcadeCambiarRondas);
  document.getElementById("bj-btn-arcade-empezar").addEventListener("click", bjArcadeEmpezar);
  // «A la mesa» tras el revelado del tarot: arranca la primera ronda.
  document.getElementById("bj-btn-tarot-continuar").addEventListener("click", bjArcadeIniciarRonda);

  document.getElementById("bj-btn-pasar-listo").addEventListener("click", bjArcadeMostrarApuesta);
  bjArcadeConectarStepper("bj-arcade-apuesta", bjArcadeCambiarApuesta);
  document.getElementById("bj-btn-apostar").addEventListener("click", bjArcadeApostar);

  document.getElementById("bj-arcade-btn-pedir").addEventListener("click", bjArcadePedir);
  document.getElementById("bj-arcade-btn-plantarse").addEventListener("click", bjArcadePlantarse);
  document.getElementById("bj-arcade-btn-doblar").addEventListener("click", bjArcadeDoblar);
  document.getElementById("bj-arcade-btn-dividir").addEventListener("click", bjArcadeDividir);
  document.getElementById("bj-arcade-btn-rendirse").addEventListener("click", bjArcadeRendirse);

  document.getElementById("bj-btn-ronda-siguiente").addEventListener("click", bjArcadeRondaSiguiente);

  // «Volver al menú» desde la mesa: abandona el torneo (confirma antes).
  document.getElementById("bj-btn-arcade-menu").addEventListener("click", bjArcadeVolverMenu);
}

// Abandona la partida en curso y vuelve al menú. Confirma antes porque, a
// diferencia del Clásico (cuya banca se guarda), aquí no queda nada: el torneo
// entero se pierde. Al reentrar, bjEntrarArcade parte de cero desde la config.
function bjArcadeVolverMenu() {
  const aviso = "¿Abandonar la partida y volver al menú? Se perderá el torneo en curso.";
  if (window.confirm(aviso)) mostrarPantalla("bj-menu");
}

// Engancha los dos botones (− +) de un stepper a una función que recibe el paso.
function bjArcadeConectarStepper(nombre, fn) {
  const stepper = document.querySelector(`[data-stepper="${nombre}"]`);
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => fn(Number(boton.dataset.paso)));
  });
}

// ============================================================
//  Configuración (pantalla bj-arcade-config)
// ============================================================

// Entra al Arcade desde el menú: prepara la pantalla de configuración.
function bjEntrarArcade() {
  bjEstado.modo = "arcade";
  bjArcadeSincronizarJugadores();
  bjArcadeRenderNombres();
  document.getElementById("bj-arcade-valor-jugadores").textContent = bjArcade.config.numJugadores;
  document.getElementById("bj-arcade-valor-rondas").textContent = bjArcade.config.rondas;
  document.getElementById("bj-arcade-error").textContent = "";
  bjArcadeActualizarNotaConfig();
  mostrarPantalla("bj-arcade-config");
}

function bjArcadeCambiarNumJugadores(paso) {
  const nuevo = bjArcade.config.numJugadores + paso;
  if (nuevo < BJ_MIN_JUGADORES || nuevo > BJ_MAX_JUGADORES) return;
  bjArcade.config.numJugadores = nuevo;
  document.getElementById("bj-arcade-valor-jugadores").textContent = nuevo;
  bjArcadeSincronizarJugadores();
  bjArcadeRenderNombres();
  bjArcadeActualizarNotaConfig();
}

function bjArcadeCambiarRondas(paso) {
  const nuevo = bjArcade.config.rondas + paso;
  if (nuevo < BJ_RONDAS_MIN || nuevo > BJ_RONDAS_MAX) return;
  bjArcade.config.rondas = nuevo;
  document.getElementById("bj-arcade-valor-rondas").textContent = nuevo;
}

// El solitario oculta el nº de rondas (son 8 fijas) y muestra una nota explicativa.
function bjArcadeActualizarNotaConfig() {
  const solitario = bjArcade.config.numJugadores === 1;
  document.getElementById("bj-arcade-fila-rondas").hidden = solitario;
  document.getElementById("bj-arcade-nota").textContent = solitario
    ? "Juegas solo: 8 rondas contra la banca, guardando tu récord."
    : "";
}

// Mantiene bjArcade.jugadores con EXACTAMENTE numJugadores elementos, conservando
// los nombres ya escritos (la pila se añade al empezar la partida).
function bjArcadeSincronizarJugadores() {
  const actuales = bjArcade.jugadores;
  const nuevos = [];
  for (let i = 0; i < bjArcade.config.numJugadores; i++) {
    nuevos.push({ nombre: actuales[i] ? actuales[i].nombre : "" });
  }
  bjArcade.jugadores = nuevos;
}

// Pinta un <input> por jugador y sincroniza su nombre con bjArcade.jugadores.
function bjArcadeRenderNombres() {
  const cont = document.getElementById("bj-arcade-nombres");
  cont.innerHTML = "";
  bjArcade.jugadores.forEach((jugador, indice) => {
    const fila = document.createElement("div");
    fila.className = "campo";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Jugador ${indice + 1}`;
    input.value = jugador.nombre;
    input.maxLength = 20;
    input.addEventListener("input", () => {
      bjArcade.jugadores[indice].nombre = input.value;
    });
    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// ============================================================
//  Comienzo de la partida y de cada ronda
// ============================================================

// Valida los nombres, monta la partida (pilas, zapato, rondas) y arranca la ronda 1.
function bjArcadeEmpezar() {
  const c = bjArcade;
  const error = document.getElementById("bj-arcade-error");
  if (c.jugadores.some((j) => j.nombre.trim() === "")) {
    error.textContent = "Todos los jugadores necesitan un nombre.";
    return;
  }
  error.textContent = "";

  // `racha`, `bustPrevio` y `ganoPrevio` son el rastro entre rondas que usan los
  // arcanos del Carro y la Muerte (bonus de racha y apuestas forzadas).
  c.jugadores = c.jugadores.map((j) => ({
    nombre: j.nombre.trim(),
    pila: BJ_PILA_INICIAL,
    racha: 0,
    bustPrevio: false,
    ganoPrevio: false,
  }));
  // Nº de mazos NO configurable: 1–2 jugadores empiezan con 1 baraja completa,
  // 3–5 jugadores con 2. Si el zapato se queda corto para repartir una ronda,
  // bjArcadeIniciarRonda añade el mismo nº de barajas de golpe (ver ahí).
  c.numBarajas = c.jugadores.length >= 3 ? 2 : 1;
  c.mazo = bjConstruirMazo(c.numBarajas);
  c.rondasTotal = c.jugadores.length === 1 ? BJ_ARCADE_RONDAS_SOLITARIO : c.config.rondas;
  c.ronda = 1;
  c.mazoAgotado = false;
  c.config.fiesta = document.getElementById("bj-arcade-fiesta").checked;

  // La tirada del destino: 3 arcanos que quedan como reglas de mesa. El ruleset
  // efectivo se congela aquí (el Hierofante puede pisar el elegido por el usuario).
  bjTarotTirada();
  c.ruleset = bjTarotRulesetEfectivo(bjEstado.ruleset);
  bjTarotMostrar(); // al pulsar «A la mesa» arranca bjArcadeIniciarRonda
}

// Prepara una ronda: comprueba que quedan cartas, reparte al dealer y las manos de
// salida de cada jugador (que verán en su turno), y pasa al primer jugador.
function bjArcadeIniciarRonda() {
  const c = bjArcade;

  // Se necesitan al menos 2 cartas por jugador + 2 del dealer para repartir. Si no
  // llegan, se añaden en el momento tantas barajas completas como al empezar
  // (1 con 1–2 jugadores, 2 con 3–5): el zapato nunca deja la partida a medias.
  const necesarias = (c.jugadores.length + 1) * 2;
  if (bjCartasRestantes(c.mazo) < necesarias) {
    c.mazo = bjAnadirBarajas(c.mazo, c.numBarajas);
  }

  c.manoDealer = [bjRobar(c.mazo), bjRobar(c.mazo)];
  c.dealerOculta = !bjTarotTiene("sol-n"); // el Sol: la oculta se juega boca arriba

  // Multiplicador de ganancias de la ronda: la Rueda (×1–×3 al azar) y el Juicio
  // (la última ronda vale doble) se acumulan si coinciden.
  c.multRonda = 1;
  if (bjTarotTiene("rueda-n")) c.multRonda = 1 + Math.floor(Math.random() * 3);
  if (bjTarotTiene("juicio-n") && c.ronda >= c.rondasTotal) c.multRonda *= 2;

  c.jugadoresRonda = c.jugadores.map((jugador) => ({
    apuesta: 0,
    manos: [],
    manoActiva: 0,
    pilaInicio: jugador.pila,
    cartasIniciales: [bjRobar(c.mazo), bjRobar(c.mazo)],
  }));
  // El orden de juego cambia (aleatorio) en cada ronda; `turnoIndex` recorre este
  // array, así que quién juega ahora es c.orden[c.turnoIndex] (bjArcadeIndiceActual).
  c.orden = barajar(c.jugadores.map((_, i) => i));
  c.turnoIndex = 0;
  bjArcadeTurnoJugador();
}

// Empieza el turno del jugador actual: en multijugador, pasa el móvil; en
// solitario, va directo a la apuesta (no hay a quién ocultarla).
function bjArcadeTurnoJugador() {
  const c = bjArcade;
  if (c.jugadores.length === 1) {
    bjArcadeMostrarApuesta();
    return;
  }
  document.getElementById("bj-pasar-nombre").textContent = bjArcadeJugadorActual().nombre;
  bjArcadeRenderUpcard("bj-pasar-dealer");
  mostrarPantalla("bj-arcade-pasar");
}

// ============================================================
//  Apuesta del jugador de turno (pantalla bj-arcade-apuesta)
// ============================================================

// Límites de apuesta del jugador de turno, con los arcanos que los tocan.
// Devuelve { min, max, notas: [textos para la pantalla] }.
function bjArcadeLimitesApuesta(jugador) {
  const c = bjArcade;
  const notas = [];

  // Mínima base (el Loco invertido la duplica toda la partida).
  let min = BJ_APUESTA_MIN;
  if (bjTarotTiene("loco-i")) min = BJ_APUESTA_MIN * 2;

  // El Carro invertido: tras ganar una ronda, al menos el doble de la mínima.
  if (bjTarotTiene("carro-i") && jugador.ganoPrevio) {
    min = Math.max(min, BJ_APUESTA_MIN * 2);
    notas.push("Ganaste la ronda anterior: apuesta al menos el doble de la mínima.");
  }

  // El Juicio invertido: en la última ronda, al menos la mitad de tu pila.
  if (bjTarotTiene("juicio-i") && c.ronda >= c.rondasTotal && jugador.pila > min) {
    min = Math.max(min, Math.ceil(jugador.pila / 2));
    notas.push("Última ronda: apuestas al menos la mitad de tu pila.");
  }

  // Máxima: tu pila (en deuda queda clavada en la mínima). La Emperatriz
  // invertida la limita a 10 (sin bajar nunca de la mínima).
  let max = Math.max(min, jugador.pila);
  if (bjTarotTiene("emperatriz-i")) max = Math.max(min, Math.min(max, 10));

  // La Muerte invertida: si te pasaste la ronda anterior, apuesta mínima forzosa.
  if (bjTarotTiene("muerte-i") && jugador.bustPrevio) {
    max = min;
    notas.push("Te pasaste la ronda anterior: apuesta mínima obligatoria.");
  }

  if (jugador.pila < min) {
    notas.push("Sin fondos suficientes: apuestas la mínima (te dejará en deuda).");
  }
  return { min, max, notas };
}

// Prepara y muestra la pantalla de apuesta del jugador de turno.
function bjArcadeMostrarApuesta() {
  const c = bjArcade;
  const jugador = bjArcadeJugadorActual();

  // Límites de esta apuesta (se guardan para que el stepper los respete).
  const limites = bjArcadeLimitesApuesta(jugador);
  c.apuestaMin = limites.min;
  c.apuestaMax = limites.max;
  c.apuestaActual = limites.min;

  document.getElementById("bj-apuesta-nombre").textContent = jugador.nombre;
  document.getElementById("bj-apuesta-pila").textContent = bjFormatearFichas(jugador.pila);
  document.getElementById("bj-apuesta-ronda").textContent = c.ronda + "/" + c.rondasTotal;
  bjArcadeRenderUpcard("bj-apuesta-dealer");

  // Avisos: restricciones de los arcanos, deuda y multiplicador de la ronda.
  const notas = limites.notas.slice();
  if (c.multRonda > 1) notas.push(`Esta ronda las ganancias valen ×${c.multRonda}.`);
  document.getElementById("bj-apuesta-deuda").textContent = notas.join(" ");

  bjArcadeActualizarApuestaStepper();
  mostrarPantalla("bj-arcade-apuesta");
}

// Sube/baja la apuesta, acotada entre los límites calculados al entrar (mínima
// efectiva y pila/tope de los arcanos; en deuda queda bloqueada en la mínima).
function bjArcadeCambiarApuesta(paso) {
  const nueva = bjArcade.apuestaActual + paso * BJ_APUESTA_PASO;
  if (nueva < bjArcade.apuestaMin || nueva > bjArcade.apuestaMax) return;
  bjArcade.apuestaActual = nueva;
  bjArcadeActualizarApuestaStepper();
}

function bjArcadeActualizarApuestaStepper() {
  document.getElementById("bj-valor-apuesta-arcade").textContent = bjFormatearFichas(bjArcade.apuestaActual);
}

// Confirma la apuesta: la descuenta de la pila, monta la mano con las cartas ya
// repartidas al empezar la ronda, y pasa a la mesa a jugar.
function bjArcadeApostar() {
  const c = bjArcade;
  const jugador = bjArcadeJugadorActual();
  const ronda = bjArcadeRondaActual();

  jugador.pila -= c.apuestaActual;
  ronda.apuesta = c.apuestaActual;
  ronda.manos = [bjArcadeNuevaMano(ronda.cartasIniciales, c.apuestaActual, false)];
  ronda.manoActiva = 0;

  mostrarPantalla("bj-arcade");
  bjArcadeRenderMesa();
}

// Crea el objeto de una mano del jugador (misma forma que en el Clásico, más el
// campo `rendido` para la resolución diferida del Arcade). `mostradas` = cuántas
// cartas ya se han pintado (bjPintarCartasMano anima solo las nuevas).
function bjArcadeNuevaMano(cartas, apuesta, deAses) {
  return { cartas, apuesta, doblo: false, deAses, terminada: false, rendido: false, resultado: null, mostradas: 0 };
}

// ============================================================
//  Turno del jugador (pantalla bj-arcade)
// ============================================================

// Índice del jugador que actúa ahora, resuelto a través del orden barajado de la ronda.
function bjArcadeIndiceActual() {
  return bjArcade.orden[bjArcade.turnoIndex];
}
function bjArcadeJugadorActual() {
  return bjArcade.jugadores[bjArcadeIndiceActual()];
}
function bjArcadeRondaActual() {
  return bjArcade.jugadoresRonda[bjArcadeIndiceActual()];
}
function bjArcadeManoActiva() {
  const ronda = bjArcadeRondaActual();
  return ronda.manos[ronda.manoActiva];
}

// "Pedir": roba una carta a la mano activa. Si el zapato se agota, se planta y la
// partida terminará al acabar la ronda. Si se pasa, la mano termina.
function bjArcadePedir() {
  const mano = bjArcadeManoActiva();
  if (bjValorMano(mano.cartas) >= 21) return; // con 21 ya no se pide
  const carta = bjRobar(bjArcade.mazo);
  if (!carta) {
    bjArcade.mazoAgotado = true;
    mano.terminada = true;
    bjArcadeAvanzarMano();
    return;
  }
  mano.cartas.push(carta);
  if (bjEsBust(mano.cartas)) {
    mano.terminada = true;
    bjArcadeAvanzarMano();
  } else {
    bjArcadeRenderMesa();
  }
}

// "Plantarse": la mano activa queda como está. La Templanza invertida lo prohíbe
// con menos de 14 (el botón ya va deshabilitado; esto es el cinturón).
function bjArcadePlantarse() {
  if (!bjArcadePuedePlantarse()) return;
  bjArcadeManoActiva().terminada = true;
  bjArcadeAvanzarMano();
}

// "Doblar": paga otra apuesta sobre la mano activa, roba UNA carta y la planta.
function bjArcadeDoblar() {
  if (!bjArcadePuedeDoblar()) return;
  const mano = bjArcadeManoActiva();
  bjArcadeJugadorActual().pila -= mano.apuesta;
  mano.doblo = true;
  const carta = bjRobar(bjArcade.mazo);
  if (!carta) bjArcade.mazoAgotado = true;
  else mano.cartas.push(carta);
  mano.terminada = true;
  bjArcadeAvanzarMano();
}

// "Dividir" (split): separa un par en dos manos con su apuesta (máximo dos manos).
function bjArcadeDividir() {
  if (!bjArcadePuedeDividir()) return;
  const ronda = bjArcadeRondaActual();
  const original = ronda.manos[0];
  bjArcadeJugadorActual().pila -= ronda.apuesta;
  const esAses = original.cartas[0].valor === "A";
  ronda.manos = [
    bjArcadeNuevaMano([original.cartas[0]], ronda.apuesta, esAses),
    bjArcadeNuevaMano([original.cartas[1]], ronda.apuesta, esAses),
  ];
  ronda.manoActiva = 0;
  bjArcadeActivarMano(0);
}

// "Rendirse": abandona la mano; se le devuelve media apuesta al resolver la ronda.
function bjArcadeRendirse() {
  if (!bjArcadePuedeRendirse()) return;
  const mano = bjArcadeManoActiva();
  mano.rendido = true;
  mano.terminada = true;
  mano.resultado = "rendido";
  bjArcadeAvanzarMano();
}

// Pasa a la siguiente mano del jugador; si no queda, pasa al siguiente jugador.
function bjArcadeAvanzarMano() {
  const ronda = bjArcadeRondaActual();
  const siguiente = ronda.manoActiva + 1;
  if (siguiente < ronda.manos.length && !ronda.manos[siguiente].terminada) {
    bjArcadeActivarMano(siguiente);
  } else {
    bjArcadeSiguienteJugador();
  }
}

// Activa la mano `i`: si tiene una sola carta (recién dividida), le reparte la 2.ª;
// los ases divididos reciben una carta y se plantan solos.
function bjArcadeActivarMano(i) {
  const ronda = bjArcadeRondaActual();
  ronda.manoActiva = i;
  const mano = ronda.manos[i];
  if (mano.cartas.length === 1) {
    const carta = bjRobar(bjArcade.mazo);
    if (!carta) {
      bjArcade.mazoAgotado = true;
      mano.terminada = true;
      bjArcadeAvanzarMano();
      return;
    }
    mano.cartas.push(carta);
  }
  if (mano.deAses) {
    mano.terminada = true;
    bjArcadeAvanzarMano();
  } else {
    bjArcadeRenderMesa();
  }
}

// Pasa al siguiente jugador o, si ya han jugado todos, resuelve la ronda.
function bjArcadeSiguienteJugador() {
  const c = bjArcade;
  c.turnoIndex++;
  if (c.turnoIndex < c.orden.length) {
    bjArcadeTurnoJugador();
  } else {
    bjArcadeResolverRonda();
  }
}

// --- Disponibilidad de acciones (deuda + arcanos) ---
// En deuda (pila < 0), doblar/dividir necesitan fondos que no hay, y rendirse se
// prohíbe con pila < 0: así las tres quedan bloqueadas, como pide el plan §5.
// El ruleset consultado es el EFECTIVO de la partida (bjArcade.ruleset), que el
// Hierofante puede haber pisado al hacer la tirada.

// La Templanza invertida prohíbe plantarse con menos de 14.
function bjArcadePuedePlantarse() {
  if (!bjTarotTiene("templanza-i")) return true;
  return bjValorMano(bjArcadeManoActiva().cartas) >= 14;
}

function bjArcadePuedeDoblar() {
  const mano = bjArcadeManoActiva();
  // La Fuerza: normal, se dobla con cualquier nº de cartas; invertida, solo con
  // un total de 9, 10 u 11.
  const cartasOk = bjTarotTiene("fuerza-n") || mano.cartas.length === 2;
  const totalOk = !bjTarotTiene("fuerza-i") || [9, 10, 11].includes(bjValorMano(mano.cartas));
  return (
    bjArcade.ruleset.doblar &&
    cartasOk &&
    totalOk &&
    !mano.deAses &&
    bjArcadeJugadorActual().pila >= mano.apuesta &&
    bjCartasRestantes(bjArcade.mazo) >= 1
  );
}

function bjArcadePuedeDividir() {
  const ronda = bjArcadeRondaActual();
  // En multijugador no se permite dividir, para no añadir complejidad al torneo.
  if (bjArcade.jugadores.length > 1) return false;
  if (!bjArcade.ruleset.dividir || ronda.manos.length !== 1) return false;
  const cartas = ronda.manos[0].cartas;
  if (cartas.length !== 2) return false;
  if (bjValorCarta(cartas[0].valor) !== bjValorCarta(cartas[1].valor)) return false;
  return bjArcadeJugadorActual().pila >= ronda.apuesta && bjCartasRestantes(bjArcade.mazo) >= 2;
}

function bjArcadePuedeRendirse() {
  const ronda = bjArcadeRondaActual();
  if (bjTarotTiene("colgado-i")) return false; // rendirse prohibido
  // El Colgado normal permite rendirse incluso después de haber pedido carta.
  const cartasOk = bjTarotTiene("colgado-n") || ronda.manos[0].cartas.length === 2;
  return (
    bjArcade.ruleset.rendirse &&
    ronda.manos.length === 1 &&
    cartasOk &&
    bjArcadeJugadorActual().pila >= 0
  );
}

// ============================================================
//  Resolución de la ronda (pantalla bj-arcade-ronda)
// ============================================================

// El dealer revela y roba (si alguna mano sigue viva), se pagan todas las manos y
// se muestra el desglose de la ronda con las apuestas ya reveladas. Los arcanos
// entran aquí por tres sitios: las opciones del motor (Torre, Emperatriz, Justicia,
// Mundo inv.), los ajustes de pago por mano (Templanza, Mundo, Sol inv.) y los
// ajustes de ronda (multiplicador, Carro, Diablo inv., Emperador inv.).
function bjArcadeResolverRonda() {
  const c = bjArcade;
  c.dealerOculta = false;
  const opciones = bjTarotOpcionesMotor();

  const algunaViva = c.jugadoresRonda.some((ronda) =>
    ronda.manos.some((mano) => !mano.rendido && !bjEsBust(mano.cartas))
  );
  if (algunaViva) bjJugarDealer(c.manoDealer, c.mazo, opciones);

  // El Emperador invertido: el último del ranking AL EMPEZAR a pagar dobla lo que
  // gane. Se decide sobre pilaInicio (la pila con la apuesta ya descontada sería
  // injusta para quien apostó fuerte).
  let indiceUltimo = -1;
  if (bjTarotTiene("emperador-i") && c.jugadores.length > 1) {
    const pilas = c.jugadoresRonda.map((ronda) => ronda.pilaInicio);
    indiceUltimo = pilas.indexOf(Math.min.apply(null, pilas));
  }

  c.jugadoresRonda.forEach((ronda, i) => {
    const jugador = c.jugadores[i];
    const puedeNatural = ronda.manos.length === 1; // un 21 tras split no es blackjack
    // Multiplicador de GANANCIAS de este jugador: el de la ronda (Rueda/Juicio)
    // por 2 si es el último del ranking con el Emperador invertido.
    const mult = c.multRonda * (i === indiceUltimo ? 2 : 1);

    ronda.manos.forEach((mano) => {
      if (mano.rendido) {
        jugador.pila += mano.apuesta * 0.5;
        mano.resultado = "rendido";
        return;
      }
      const res = bjResolverMano(
        mano.cartas,
        c.manoDealer,
        Object.assign({ jugadorPuedeNatural: puedeNatural }, opciones)
      );
      let pago = bjArcadeAjustarPago(res, mano, puedeNatural, opciones);
      // El multiplicador solo agranda ganancias, nunca pérdidas ni empates.
      if (pago > 0) pago *= mult;
      const stake = mano.apuesta * (mano.doblo ? 2 : 1);
      jugador.pila += stake * (1 + pago);
      mano.resultado = res.resultado;
    });
  });

  bjArcadeAjustesDeRonda();
  bjArcadeRenderRonda();
  mostrarPantalla("bj-arcade-ronda");
}

// Ajustes de pago POR MANO de los arcanos (sobre el pago neto del motor):
//   - La Templanza: ganar con 5+ cartas sin pasarse paga como blackjack.
//   - El Mundo: el 21 exacto (sin ser natural) paga como blackjack.
//   - El Sol invertido: el dealer gana los blackjacks empatados.
function bjArcadeAjustarPago(res, mano, puedeNatural, opciones) {
  const pagoNatural = opciones.pagoNatural != null ? opciones.pagoNatural : 1.5;
  let pago = res.pago;

  if (res.resultado === "jugador") {
    const esNatural = puedeNatural && bjEsBlackjackNatural(mano.cartas);
    if (bjTarotTiene("templanza-n") && mano.cartas.length >= 5) pago = Math.max(pago, pagoNatural);
    if (bjTarotTiene("mundo-n") && !esNatural && bjValorMano(mano.cartas) === 21) {
      pago = Math.max(pago, pagoNatural);
    }
  }

  // Blackjack empatado con el Sol invertido: lo gana el dealer (pierdes la apuesta).
  if (
    bjTarotTiene("sol-i") &&
    res.resultado === "empate" &&
    puedeNatural &&
    bjEsBlackjackNatural(mano.cartas) &&
    bjEsBlackjackNatural(bjArcade.manoDealer)
  ) {
    res.resultado = "dealer";
    pago = -1;
  }
  return pago;
}

// Ajustes DE RONDA tras pagar las manos: bonus de racha del Carro, el trasvase del
// Diablo invertido y el rastro entre rondas (bustPrevio/ganoPrevio) que usan la
// Muerte y el Carro invertidos en la siguiente apuesta.
function bjArcadeAjustesDeRonda() {
  const c = bjArcade;

  // Delta de cada jugador ANTES de bonus/trasvases: define ganadores y perdedores.
  const deltas = c.jugadores.map((jugador, i) => jugador.pila - c.jugadoresRonda[i].pilaInicio);

  c.jugadores.forEach((jugador, i) => {
    // El Carro: racha de rondas ganadas; desde la 2.ª seguida, +5 de bonus.
    if (deltas[i] > 0) {
      jugador.racha++;
      if (bjTarotTiene("carro-n") && jugador.racha >= 2) jugador.pila += 5;
    } else if (deltas[i] < 0) {
      jugador.racha = 0;
    }
    // Rastro para las apuestas forzadas de la siguiente ronda.
    jugador.ganoPrevio = deltas[i] > 0;
    jugador.bustPrevio = c.jugadoresRonda[i].manos.some((mano) => bjEsBust(mano.cartas));
  });

  // El Diablo invertido: cada ganador le quita 3 fichas a cada perdedor.
  if (bjTarotTiene("diablo-i") && c.jugadores.length > 1) {
    const ganadores = [];
    const perdedores = [];
    deltas.forEach((delta, i) => {
      if (delta > 0) ganadores.push(i);
      else if (delta < 0) perdedores.push(i);
    });
    ganadores.forEach((g) => {
      c.jugadores[g].pila += 3 * perdedores.length;
    });
    perdedores.forEach((p) => {
      c.jugadores[p].pila -= 3 * ganadores.length;
    });
  }
}

// Avanza a la siguiente ronda, o termina si era la última o el zapato se agotó.
function bjArcadeRondaSiguiente() {
  const c = bjArcade;
  if (c.mazoAgotado || c.ronda >= c.rondasTotal) {
    bjArcadeFin();
    return;
  }
  c.ronda++;
  bjArcadeIniciarRonda(); // puede terminar la partida si no quedan cartas
}

// ============================================================
//  Fin de la partida (pantalla bj-fin)
// ============================================================

function bjArcadeFin() {
  if (bjArcade.jugadores.length === 1) {
    bjArcadeFinSolitario();
  } else {
    bjArcadeFinRanking();
  }
  mostrarPantalla("bj-fin");
}

// Multijugador: ranking por pila final (gana la más grande), con medallas y empates.
function bjArcadeFinRanking() {
  document.getElementById("bj-fin-titulo").textContent = "Fin de la partida 🏁";
  document.getElementById("bj-fin-record").textContent = "";

  const cont = document.getElementById("bj-fin-lista");
  cont.innerHTML = "";
  const ordenados = bjArcade.jugadores.slice().sort((a, b) => b.pila - a.pila);

  let puesto = 0;
  for (let i = 0; i < ordenados.length; i++) {
    if (i > 0 && ordenados[i].pila !== ordenados[i - 1].pila) puesto = i;
    bjArcadePintarFilaRanking(ordenados[i], puesto, cont);
  }
}

const BJ_MEDALLAS = ["🥇", "🥈", "🥉"];
const BJ_CLASES_PODIO = ["podio-oro", "podio-plata", "podio-bronce"];

// Pinta una fila del ranking reutilizando las clases .podio-* de DescriptIA.
function bjArcadePintarFilaRanking(jugador, puesto, cont) {
  const fila = document.createElement("div");
  fila.className = "podio-fila " + (BJ_CLASES_PODIO[puesto] || "podio-resto");

  const info = document.createElement("div");
  info.className = "podio-info";
  const emoji = document.createElement("span");
  emoji.className = "podio-medalla";
  emoji.textContent = BJ_MEDALLAS[puesto] || "•";
  const nombre = document.createElement("span");
  nombre.className = "podio-nombre";
  nombre.textContent = jugador.nombre;
  info.append(emoji, nombre);

  const pila = document.createElement("span");
  pila.className = "podio-aciertos" + (jugador.pila < 0 ? " bj-pila-neg" : "");
  pila.textContent = "🪙" + bjFormatearFichas(jugador.pila);

  fila.append(info, pila);
  cont.appendChild(fila);
}

// Solitario: puntuación final = pila; se guarda y muestra el récord con su ruleset.
function bjArcadeFinSolitario() {
  const puntuacion = bjArcade.jugadores[0].pila;
  const record = bjArcadeCargarRecord();

  // ¿Nuevo récord? Se guarda con el ruleset EFECTIVO con el que se ha jugado
  // (si el Hierofante lo cambió, el récord refleja las reglas reales).
  const esRecord = !record || puntuacion > record.puntuacion;
  if (esRecord) {
    bjArcadeGuardarRecord({ puntuacion, ruleset: Object.assign({}, bjArcade.ruleset) });
  }
  const rulesetMostrado = esRecord ? bjArcade.ruleset : record.ruleset;

  document.getElementById("bj-fin-titulo").textContent = esRecord ? "¡Nuevo récord! 🏆" : "Fin de la partida 🏁";

  const cont = document.getElementById("bj-fin-lista");
  cont.innerHTML = "";
  const fila = document.createElement("div");
  fila.className = "bj-ronda-fila";
  const etiqueta = document.createElement("span");
  etiqueta.className = "bj-ronda-nombre";
  etiqueta.textContent = "Tu puntuación";
  const valor = document.createElement("span");
  valor.className = "bj-ronda-delta " + (puntuacion < 0 ? "pierde" : "gana");
  valor.textContent = "🪙" + bjFormatearFichas(puntuacion);
  fila.append(etiqueta, valor);
  cont.appendChild(fila);

  // Récord (el recién guardado, o el anterior si no se ha batido).
  const mejor = esRecord ? puntuacion : record.puntuacion;
  document.getElementById("bj-fin-record").textContent =
    `Récord: 🪙${bjFormatearFichas(mejor)} (reglas: ${bjArcadeTextoRuleset(rulesetMostrado)}).`;
}

// Texto con las reglas opcionales activas de un ruleset (para acompañar el récord).
function bjArcadeTextoRuleset(ruleset) {
  const activas = BJ_REGLAS
    .filter((regla) => regla.disponible && ruleset && ruleset[regla.clave])
    .map((regla) => regla.nombre.toLowerCase());
  return activas.length ? activas.join(", ") : "reglas de casino";
}

function bjArcadeCargarRecord() {
  try {
    const texto = localStorage.getItem(BJ_ARCADE_RECORD_CLAVE);
    if (!texto) return null;
    const datos = JSON.parse(texto);
    if (datos && typeof datos.puntuacion === "number") return datos;
  } catch (e) {
    return null;
  }
  return null;
}

function bjArcadeGuardarRecord(record) {
  try {
    localStorage.setItem(BJ_ARCADE_RECORD_CLAVE, JSON.stringify(record));
  } catch (e) {
    console.warn("No se pudo guardar el récord del Arcade:", e);
  }
}

// ============================================================
//  Pintado
// ============================================================

// Pinta la carta visible del dealer (su primera carta) en un contenedor. Con el
// Ermitaño invertido, ni siquiera esa se ve hasta el final de la ronda.
function bjArcadeRenderUpcard(idContenedor) {
  const cont = document.getElementById(idContenedor);
  cont.innerHTML = "";
  if (bjArcade.manoDealer.length) {
    cont.appendChild(bjCrearCartaImg(bjArcade.manoDealer[0], bjTarotTiene("ermitano-i")));
  }
}

// Pinta la mesa del jugador de turno: cabecera, dealer (con carta oculta), sus
// manos y los botones de acción según el ruleset y su pila.
function bjArcadeRenderMesa() {
  const c = bjArcade;
  document.getElementById("bj-arcade-turno-nombre").textContent = bjArcadeJugadorActual().nombre;
  document.getElementById("bj-arcade-pila").textContent = bjFormatearFichas(bjArcadeJugadorActual().pila);
  // La Sacerdotisa invertida oculta el contador de cartas restantes.
  document.getElementById("bj-arcade-restantes").textContent =
    bjTarotTiene("sacerdotisa-i") ? "?" : bjCartasRestantes(c.mazo);

  // Visibilidad del dealer según los arcanos: el Ermitaño normal deja ver la
  // oculta al jugador con menos fichas; el invertido tapa incluso la visible.
  const pilas = c.jugadores.map((j) => j.pila);
  const veOculta =
    !c.dealerOculta ||
    (bjTarotTiene("ermitano-n") && bjArcadeJugadorActual().pila === Math.min.apply(null, pilas));
  const tapaVisible = bjTarotTiene("ermitano-i");

  // Entrada simple (no volteo): esta vista se repinta entera en cada acción del
  // jugador, así que un volteo se repetiría en cada "pedir". El revelado con giro se
  // reserva para la resolución de la ronda (bjArcadeRenderRonda).
  const contDealer = document.getElementById("bj-arcade-cartas-dealer");
  contDealer.innerHTML = "";
  c.manoDealer.forEach((carta, indice) => {
    const esUltima = indice === c.manoDealer.length - 1;
    const oculta = esUltima ? !veOculta : tapaVisible;
    contDealer.appendChild(bjCrearCartaImg(carta, oculta));
  });
  document.getElementById("bj-arcade-total-dealer").textContent = tapaVisible
    ? "?"
    : veOculta ? bjValorMano(c.manoDealer) : bjValorMano([c.manoDealer[0]]);

  bjArcadeRenderMesaJugadores();
  bjArcadeRenderManos();

  document.getElementById("bj-arcade-btn-pedir").disabled = bjValorMano(bjArcadeManoActiva().cartas) >= 21;
  document.getElementById("bj-arcade-btn-plantarse").disabled = !bjArcadePuedePlantarse();
  document.getElementById("bj-arcade-btn-doblar").disabled = !bjArcadePuedeDoblar();
  document.getElementById("bj-arcade-btn-dividir").disabled = !bjArcadePuedeDividir();
  document.getElementById("bj-arcade-btn-rendirse").disabled = !bjArcadePuedeRendirse();
}

// Mesa compartida (Fase 9.2): barra scrolleable con el RESTO de jugadores de la
// ronda, en el orden de juego. Cada uno muestra su nombre y su mano apilada (las
// cartas se solapan dejando ver ~30 % del lateral izquierdo de la de debajo). Quien
// ya jugó enseña sus cartas reales y su apuesta revelada; quien aún no ha jugado
// las lleva boca abajo y sin apuesta (sigue siendo secreta). Oculta en solitario.
function bjArcadeRenderMesaJugadores() {
  const c = bjArcade;
  const cont = document.getElementById("bj-arcade-mesa-jugadores");
  cont.innerHTML = "";
  if (c.jugadores.length <= 1) {
    cont.hidden = true;
    return;
  }

  const actual = bjArcadeIndiceActual();
  c.orden.forEach((idx, pos) => {
    if (idx === actual) return; // el jugador de turno se ve en su propia zona
    const jugador = c.jugadores[idx];
    const ronda = c.jugadoresRonda[idx];
    const yaJugo = pos < c.turnoIndex; // su turno ya pasó: mano y apuesta reveladas

    const bloque = document.createElement("div");
    bloque.className = "bj-mesa-jug";

    // Cabecera: nombre + total de su mano (como en «Tu mano» y el dealer). El total
    // solo se muestra cuando su turno ya pasó (si no, sus cartas van boca abajo).
    const cab = document.createElement("div");
    cab.className = "bj-mesa-jug-cab";
    const nombre = document.createElement("span");
    nombre.className = "bj-mesa-jug-nombre";
    nombre.textContent = jugador.nombre;
    cab.appendChild(nombre);

    // Ya jugó → todas las cartas de su(s) mano(s); si no → sus 2 iniciales, ocultas.
    const mano = yaJugo
      ? ronda.manos.reduce((acc, m) => acc.concat(m.cartas), [])
      : ronda.cartasIniciales;

    if (yaJugo) {
      const total = document.createElement("span");
      total.className = "bj-mesa-jug-total" + (bjEsBust(mano) ? " bj-total-bust" : "");
      total.textContent = bjValorMano(mano);
      cab.appendChild(total);
    }

    const cartas = document.createElement("div");
    cartas.className = "bj-mesa-jug-cartas";
    mano.forEach((carta) => cartas.appendChild(bjCrearCartaImg(carta, !yaJugo)));

    bloque.append(cab, cartas);

    if (yaJugo) {
      const apuesta = document.createElement("div");
      apuesta.className = "bj-mesa-jug-apuesta";
      apuesta.textContent = "🪙" + bjFormatearFichas(ronda.apuesta);
      bloque.appendChild(apuesta);
    }
    cont.appendChild(bloque);
  });
  cont.hidden = false;
}

// Pinta la(s) mano(s) del jugador de turno (una, o dos al dividir).
function bjArcadeRenderManos() {
  const ronda = bjArcadeRondaActual();
  const cont = document.getElementById("bj-arcade-manos");
  cont.innerHTML = "";
  const split = ronda.manos.length > 1;

  ronda.manos.forEach((mano, indice) => {
    const bloque = document.createElement("div");
    bloque.className = "bj-mano";
    if (split) bloque.classList.add("bj-mano-multi");
    if (split && indice === ronda.manoActiva) bloque.classList.add("activa");

    const cartas = document.createElement("div");
    cartas.className = "bj-cartas";
    // Reparto inicial con entrada simple; cada carta pedida/doblada después, con
    // volteo reverso→frente (bjPintarCartasMano lleva la cuenta en mano.mostradas).
    bjPintarCartasMano(cartas, mano);
    bloque.appendChild(cartas);

    const info = document.createElement("div");
    info.className = "bj-mano-info";
    const total = document.createElement("span");
    total.className = "bj-total" + (bjEsBust(mano.cartas) ? " bj-total-bust" : "");
    total.textContent = bjValorMano(mano.cartas);
    info.appendChild(total);
    if (split) {
      const apuesta = document.createElement("span");
      apuesta.className = "bj-mano-apuesta";
      apuesta.textContent = "🪙" + bjFormatearFichas(mano.apuesta * (mano.doblo ? 2 : 1));
      info.appendChild(apuesta);
    }
    bloque.appendChild(info);
    cont.appendChild(bloque);
  });
}

// Pinta la resolución de la ronda: dealer + una fila por jugador con sus manos,
// su apuesta (ya revelada), la variación de fichas y su pila nueva.
function bjArcadeRenderRonda() {
  const c = bjArcade;
  const base = c.ronda >= c.rondasTotal || c.mazoAgotado ? "Última ronda" : `Ronda ${c.ronda} de ${c.rondasTotal}`;
  document.getElementById("bj-ronda-titulo").textContent =
    base + (c.multRonda > 1 ? ` · ganancias ×${c.multRonda}` : "");

  // La mano final del dealer se revela entera con volteo escalonado (Fase 9.1):
  // es un repintado único por ronda, así que no hace falta compararlo con nada.
  const contDealer = document.getElementById("bj-ronda-cartas-dealer");
  contDealer.innerHTML = "";
  c.manoDealer.forEach((carta, indice) =>
    contDealer.appendChild(bjCrearCartaVolteada(carta, false, indice * BJ_VOLTEO_ESCALON_MS))
  );
  document.getElementById("bj-ronda-total-dealer").textContent = bjValorMano(c.manoDealer);

  const cont = document.getElementById("bj-ronda-jugadores");
  cont.innerHTML = "";
  c.jugadoresRonda.forEach((ronda, i) => {
    const jugador = c.jugadores[i];
    const delta = jugador.pila - ronda.pilaInicio;

    const fila = document.createElement("div");
    fila.className = "bj-ronda-fila";

    const izq = document.createElement("div");
    izq.className = "bj-ronda-fila-info";
    const nombre = document.createElement("span");
    nombre.className = "bj-ronda-nombre";
    nombre.textContent = jugador.nombre;
    const detalle = document.createElement("span");
    detalle.className = "bj-ronda-detalle";
    detalle.textContent =
      `Apostó 🪙${bjFormatearFichas(ronda.apuesta)} · ` + bjArcadeResumenManos(ronda.manos);
    izq.append(nombre, detalle);

    const der = document.createElement("div");
    der.className = "bj-ronda-fila-info bj-ronda-fila-der";
    const cambio = document.createElement("span");
    cambio.className = "bj-ronda-delta " + bjArcadeClaseDelta(delta);
    cambio.textContent = (delta > 0 ? "+" : delta < 0 ? "−" : "±") + bjFormatearFichas(Math.abs(delta));
    const pila = document.createElement("span");
    pila.className = "bj-ronda-detalle" + (jugador.pila < 0 ? " bj-pila-neg" : "");
    pila.textContent = "🪙" + bjFormatearFichas(jugador.pila);
    der.append(cambio, pila);

    fila.append(izq, der);
    cont.appendChild(fila);
  });

  bjArcadeRenderFiesta();

  document.getElementById("bj-btn-ronda-siguiente").textContent =
    c.mazoAgotado || c.ronda >= c.rondasTotal ? "Ver resultados" : "Siguiente ronda";
}

// Capa de modo fiesta 🍻 (Fase 8): pinta las consecuencias de tragos bajo la
// resolución de la ronda, solo si el modo está activado. Junta las reglas base
// (§7, calculadas de los resultados) con los recordatorios de los arcanos [F]
// activos (su línea `fiesta` viaja en bjEstado.tarot desde la tirada).
function bjArcadeRenderFiesta() {
  const seccion = document.getElementById("bj-ronda-fiesta");
  if (!bjArcade.config.fiesta) {
    seccion.hidden = true;
    return;
  }

  const lista = document.getElementById("bj-ronda-fiesta-lista");
  lista.innerHTML = "";

  bjArcadeTragosDeRonda().forEach((texto) => {
    lista.appendChild(bjArcadeCrearTrago(texto, "bj-fiesta-item"));
  });

  // Recordatorios de los arcanos con capa de fiesta activos en la mesa: se aplican
  // de palabra (algunos son reglas manuales o de temporización), así que solo se
  // muestran como recordatorio con su nombre.
  bjEstado.tarot
    .filter((arcano) => arcano.fiesta)
    .forEach((arcano) => {
      const nombre = arcano.nombre + (arcano.invertida ? " (invertida)" : "");
      lista.appendChild(bjArcadeCrearTrago(`🔮 ${nombre}: ${arcano.fiesta}`, "bj-fiesta-item bj-fiesta-arcano"));
    });

  if (!lista.children.length) {
    lista.appendChild(bjArcadeCrearTrago("Esta ronda se salva todo el mundo… por ahora.", "bj-fiesta-item bj-fiesta-vacio"));
  }

  seccion.hidden = false;
}

function bjArcadeCrearTrago(texto, clase) {
  const li = document.createElement("li");
  li.className = clase;
  li.textContent = texto;
  return li;
}

// Reglas base del modo fiesta (§7) calculadas de los resultados de la ronda.
// Devuelve una lista de frases ya con el nombre de cada jugador.
function bjArcadeTragosDeRonda() {
  const c = bjArcade;
  const frases = [];
  const dealerNatural = bjEsBlackjackNatural(c.manoDealer);

  // «Último del ranking»: solo tiene sentido con 2+ jugadores y si no van todos
  // igualados (si no, serían todos los últimos a la vez y beberían todos).
  const pilas = c.jugadores.map((j) => j.pila);
  const minPila = Math.min.apply(null, pilas);
  const hayUltimo = c.jugadores.length > 1 && minPila !== Math.max.apply(null, pilas);

  c.jugadoresRonda.forEach((ronda, i) => {
    const jugador = c.jugadores[i];
    const nombre = jugador.nombre;
    const delta = jugador.pila - ronda.pilaInicio;
    const sePaso = ronda.manos.some((mano) => bjEsBust(mano.cartas));
    const natural =
      ronda.manos.length === 1 &&
      ronda.manos[0].resultado === "jugador" &&
      bjEsBlackjackNatural(ronda.manos[0].cartas);

    if (natural) frases.push(`${nombre} hizo blackjack natural: reparte 3 tragos.`);
    if (sePaso) frases.push(`${nombre} se pasó: bebe 1 trago.`);
    if (dealerNatural && delta < 0) frases.push(`${nombre} cayó ante el blackjack del dealer: bebe 1 trago.`);
    if (hayUltimo && jugador.pila === minPila) frases.push(`${nombre} cierra el ranking: bebe 1 trago.`);
    if (jugador.pila < 0) frases.push(`${nombre} está en deuda: bebe 1 trago.`);
  });

  return frases;
}

// Resumen textual de las manos de un jugador: "18✓ · 22✗" (total + símbolo).
function bjArcadeResumenManos(manos) {
  const simbolos = { jugador: "✓", dealer: "✗", empate: "=", rendido: "🏳️" };
  return manos
    .map((mano) => bjValorMano(mano.cartas) + (simbolos[mano.resultado] || ""))
    .join(" · ");
}

// Color de la variación de fichas de una ronda.
function bjArcadeClaseDelta(delta) {
  if (delta > 0) return "gana";
  if (delta < 0) return "pierde";
  return "empate";
}

// Registra el wiring del Arcade cuando el DOM está listo.
document.addEventListener("DOMContentLoaded", bjArcadeConectar);

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
const BJ_ARCADE_RECORDS_CLAVE = "blackjack_arcade_records"; // leaderboard del solitario
const BJ_ARCADE_RECORD_CLAVE = "blackjack_arcade_record";   // récord único de antes (se migra)
const BJ_ARCADE_RECORDS_MAX = 4; // posiciones del leaderboard: lo que sale de aquí se borra

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

  // Rastro entre rondas que consultan los arcanos de posición PASADO (karma):
  //   racha/victorias  → Carro, Enamorados, Juicio
  //   bustPrevio       → Muerte, Sacerdotisa, Emperatriz, Rueda invertida
  //   ganoPrevio       → Carro, Estrella, Luna
  //   perdidasSeguidas → Enamorados, Juicio (segunda oportunidad)
  //   recargoMin       → recargo permanente sobre la apuesta mínima (Loco, Templanza)
  //   rondasLider      → El Emperador (bonus por rondas en cabeza)
  c.jugadores = c.jugadores.map((j) => ({
    nombre: j.nombre.trim(),
    pila: BJ_PILA_INICIAL,
    racha: 0,
    victorias: 0,
    bustPrevio: false,
    ganoPrevio: false,
    perdidasSeguidas: 0,
    recargoMin: 0,
    rondasLider: 0,
    blackjacksPrevios: 0, // La Emperatriz (Pasado): bonus acumulado del natural
    multRueda: 1,         // La Rueda (Pasado): multiplicador heredado de tu victoria
    multFijo: 1,          // El Juicio invertido: multiplicador que ya no se va
    ganoACiegas: false,   // La Luna (Pasado): ganaste sin ver la oculta del dealer
    dobloYGano: false,    // El Diablo (Pasado): doblaste y ganaste la ronda anterior
  }));

  // Banderas de mesa que encienden los arcanos de Pasado a mitad de partida.
  c.magoNoDoblar = false;   // El Mago invertido: el dealer hizo blackjack
  c.dealerArraso = false;   // El Sol invertido: el dealer ganó a todos
  c.dealerRevelado = false; // El Sol normal: todos ganaron al dealer
  c.contadorOculto = false; // La Sacerdotisa invertida: alguien se pasó
  c.dealerBlando = false;   // La Torre normal: el dealer arrasó y se ablanda
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

// Multiplicador que sortea la Rueda de la Fortuna al empezar cada ronda. En su
// posición Presente va de ×0,5 a ×3 (puede recortar la ganancia además de agrandarla);
// en la última ronda, su posición Futuro llega hasta ×5.
const BJ_RUEDA_MULTS = [0.5, 1, 1.5, 2, 2.5, 3];
const BJ_RUEDA_MULTS_ULTIMA = [1, 2, 3, 4, 5];

function bjArcadeMultRueda(ultima) {
  const opciones = ultima ? BJ_RUEDA_MULTS_ULTIMA : BJ_RUEDA_MULTS;
  return opciones[Math.floor(Math.random() * opciones.length)];
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
  // El Sol deja ver la oculta del dealer (Presente toda la partida, Futuro solo la
  // última ronda). Sin él, la oculta va tapada como de costumbre.
  c.dealerOculta = !(bjTarotAplica("sol-pr-n") || bjTarotAplica("sol-fu-n"));

  // Multiplicador de ganancias de la ronda: la Rueda sortea un factor por ronda y
  // el Juicio (Futuro) dobla la última. Solo puede haber una Rueda en la tirada, así
  // que sus posiciones son excluyentes. multRonda arranca en ×1 (sin efecto).
  c.multRonda = 1;
  if (bjTarotAplica("rueda-pr-n")) c.multRonda = bjArcadeMultRueda(false);
  if (bjTarotAplica("rueda-fu-n")) c.multRonda = bjArcadeMultRueda(true);
  if (bjTarotAplica("juicio-fu-n")) c.multRonda *= 2;

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

  // Mínima base de la mesa, más los recargos permanentes que el jugador se haya
  // ganado a lo largo de la partida (el Loco y la Templanza invertidos, en Pasado:
  // ver bjArcadeAjustesDeRonda, que va subiendo `recargoMin`).
  let min = BJ_APUESTA_MIN + (jugador.recargoMin || 0);

  // El Carro invertido (Pasado): tras ganar una ronda, al menos el doble de la mínima.
  if (bjTarotAplica("carro-pa-i") && jugador.ganoPrevio) {
    min = Math.max(min, BJ_APUESTA_MIN * 2);
    notas.push("Ganaste la ronda anterior: apuesta al menos el doble de la mínima.");
  }

  // La Muerte normal (Pasado): tras pasarte, tu mínima se reduce a la mitad.
  if (bjTarotAplica("muerte-pa-n") && jugador.bustPrevio) {
    min = Math.max(BJ_APUESTA_PASO, Math.ceil(min / 2 / BJ_APUESTA_PASO) * BJ_APUESTA_PASO);
    notas.push("Te pasaste la ronda anterior: tu apuesta mínima baja a la mitad.");
  }

  // El Juicio invertido (Futuro): en la última ronda, al menos la mitad de tu pila.
  if (bjTarotAplica("juicio-fu-i") && jugador.pila > min) {
    min = Math.max(min, Math.ceil(jugador.pila / 2));
    notas.push("Última ronda: apuestas al menos la mitad de tu pila.");
  }

  // Máxima: tu pila (en deuda queda clavada en la mínima). La Emperatriz
  // invertida (Presente) la limita a 10 (sin bajar nunca de la mínima).
  let max = Math.max(min, jugador.pila);
  if (bjTarotAplica("emperatriz-pr-i")) max = Math.max(min, Math.min(max, 10));

  // El Carro invertido (Futuro): en la última ronda, quien más victorias lleve
  // apuesta el doble de la máxima.
  if (bjTarotAplica("carro-fu-i") && bjArcadeLideraVictorias(jugador)) {
    min = max * 2;
    max = min;
    notas.push("Eres quien más victorias lleva: apuestas el doble de la máxima.");
  }

  // La Muerte invertida (Pasado): si te pasaste la ronda anterior, mínima forzosa.
  if (bjTarotAplica("muerte-pa-i") && jugador.bustPrevio) {
    max = min;
    notas.push("Te pasaste la ronda anterior: apuesta mínima obligatoria.");
  }

  // Los Enamorados invertidos (Pasado): tras dos victorias seguidas, apuesta doble.
  if (bjTarotAplica("enamorados-pa-i") && jugador.racha >= 2) {
    min = Math.min(max, min * 2);
    max = min;
    notas.push("Llevas dos victorias seguidas: debes doblar tu apuesta.");
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

// Plantarse: la Muerte y la Templanza invertidas ponen suelos a lo que puedes dejar
// en la mesa (te obligan a seguir pidiendo).
function bjArcadePuedePlantarse() {
  const mano = bjArcadeManoActiva();
  const total = bjValorMano(mano.cartas);
  const inicial = mano.cartas.length <= 2;

  // La Muerte invertida (Presente): nadie se planta con menos de 17.
  if (bjTarotAplica("muerte-pr-i") && total < 17) return false;
  // La Templanza invertida (Presente): no puedes plantarte con la mano inicial.
  if (bjTarotAplica("templanza-pr-i") && inicial) return false;
  // La Templanza invertida (Futuro): en la última ronda, ni con la mano inicial ni
  // con menos de 16.
  if (bjTarotAplica("templanza-fu-i") && (inicial || total < 16)) return false;
  return true;
}

// ¿Puede doblar el jugador de turno? Cruzan aquí la Fuerza (con cuántas cartas y con
// qué totales), el Mago (lo prohíbe) y el Emperador invertido (el último siempre puede).
function bjArcadePuedeDoblar() {
  const c = bjArcade;
  const mano = bjArcadeManoActiva();
  const jugador = bjArcadeJugadorActual();

  // El Mago invertido: en Pasado, si el dealer hizo blackjack ya nadie dobla el resto
  // de la partida (flag `magoNoDoblar`); en Futuro, nadie dobla en la última ronda.
  if (c.magoNoDoblar || bjTarotAplica("mago-fu-i")) return false;

  // La Fuerza: normal (Presente), se dobla con cualquier nº de cartas; invertida
  // (Presente o Futuro), solo con un total de 9, 10 u 11.
  const cartasOk = bjTarotAplica("fuerza-pr-n") || mano.cartas.length === 2;
  const soloDuros = bjTarotAplica("fuerza-pr-i") || bjTarotAplica("fuerza-fu-i");
  const totalOk = !soloDuros || [9, 10, 11].includes(bjValorMano(mano.cartas));

  // El Emperador invertido (Presente): el último del ranking puede doblar aunque la
  // regla esté desactivada.
  const permitido = c.ruleset.doblar || (bjTarotAplica("emperador-pr-i") && bjArcadeEsUltimo(jugador));

  return (
    permitido &&
    cartasOk &&
    totalOk &&
    !mano.deAses &&
    jugador.pila >= mano.apuesta &&
    bjCartasRestantes(c.mazo) >= 1
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

// ¿Puede rendirse? El Colgado abre o cierra la puerta, el Emperador normal se la
// cierra al líder y el Colgado invertido (Pasado) a quien viene de ganar.
function bjArcadePuedeRendirse() {
  const ronda = bjArcadeRondaActual();
  const jugador = bjArcadeJugadorActual();

  // El Colgado invertido: rendirse prohibido (Presente toda la partida, Futuro en la
  // última ronda).
  if (bjTarotAplica("colgado-pr-i") || bjTarotAplica("colgado-fu-i")) return false;
  // El Colgado invertido (Pasado): cada mano ganada impide rendirse en la siguiente.
  if (bjTarotAplica("colgado-pa-i") && jugador.ganoPrevio) return false;
  // El Emperador normal (Presente): el líder no puede rendirse.
  if (bjTarotAplica("emperador-pr-n") && bjArcadeEsLider(jugador)) return false;

  // El Colgado normal permite rendirse incluso después de haber pedido carta
  // (Presente toda la partida, Futuro solo en la última ronda).
  const tarde = bjTarotAplica("colgado-pr-n") || bjTarotAplica("colgado-fu-n");
  const cartasOk = tarde || ronda.manos[0].cartas.length === 2;
  return (
    bjArcade.ruleset.rendirse &&
    ronda.manos.length === 1 &&
    cartasOk &&
    jugador.pila >= 0
  );
}

// --- Ranking en vivo (lo consultan el Emperador, el Ermitaño y el Carro) ---
// Se mide sobre la pila ACTUAL de cada jugador. En solitario no hay ranking: nadie
// es líder ni último, así que los arcanos que dependen de él no disparan.

function bjArcadeEsLider(jugador) {
  const c = bjArcade;
  if (c.jugadores.length <= 1) return false;
  const max = Math.max.apply(null, c.jugadores.map((j) => j.pila));
  return jugador.pila === max;
}

function bjArcadeEsUltimo(jugador) {
  const c = bjArcade;
  if (c.jugadores.length <= 1) return false;
  const min = Math.min.apply(null, c.jugadores.map((j) => j.pila));
  return jugador.pila === min;
}

// Quién acumula más victorias (El Carro invertido, Futuro). Con empate a victorias,
// dispara para todos los empatados; con 0 victorias no dispara para nadie.
function bjArcadeLideraVictorias(jugador) {
  const c = bjArcade;
  if (c.jugadores.length <= 1) return false;
  const max = Math.max.apply(null, c.jugadores.map((j) => j.victorias));
  return max > 0 && jugador.victorias === max;
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
  // Se anota si la oculta del dealer llegó a verse ANTES de destaparla: la Luna
  // normal (Pasado) premia justamente haber ganado sin haberla visto.
  c.ocultaEraVisible =
    !c.dealerOculta || bjTarotAplica("ermitano-pr-n") || bjTarotAplica("ermitano-fu-n");
  c.dealerOculta = false;
  const opciones = bjTarotOpcionesMotor();

  // La Torre en posición Pasado retoca el límite del dealer SOLO en esta ronda:
  // normal, tras haber arrasado se ablanda a 16; invertida, si alguien ha logrado 21
  // se enfurece y roba hasta 18.
  if (bjTarotAplica("torre-pa-n") && c.dealerBlando) opciones.limiteDealer = 16;
  if (bjTarotAplica("torre-pa-i") && bjArcadeAlguien21()) opciones.limiteDealer = 18;

  const algunaViva = c.jugadoresRonda.some((ronda) =>
    ronda.manos.some((mano) => !mano.rendido && !bjEsBust(mano.cartas))
  );
  if (algunaViva) bjJugarDealer(c.manoDealer, c.mazo, opciones);

  c.jugadoresRonda.forEach((ronda, i) => {
    const jugador = c.jugadores[i];
    const puedeNatural = ronda.manos.length === 1; // un 21 tras split no es blackjack

    // Multiplicador de GANANCIAS de este jugador en esta ronda. Se guarda en la ronda
    // para que la resolución y el display de la mesa enseñen exactamente el mismo ×N.
    const mult = bjArcadeMultJugador(i);
    ronda.mult = mult;

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
      let pago = bjArcadeAjustarPago(res, mano, puedeNatural, opciones, jugador);
      // El multiplicador solo toca lo que se GANA, nunca las pérdidas ni los empates.
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

// ¿Ha logrado alguien un 21 esta ronda? (La Torre invertida, en Pasado, lo castiga.)
function bjArcadeAlguien21() {
  return bjArcade.jugadoresRonda.some((ronda) =>
    ronda.manos.some((mano) => bjValorMano(mano.cartas) === 21)
  );
}

// ¿Iba líder / último ANTES de esta ronda? Se mide sobre `pilaInicio` (la pila con la
// apuesta ya descontada castigaría a quien apostó fuerte).
function bjArcadePuestoInicio(indice, buscarMax) {
  const c = bjArcade;
  if (c.jugadores.length <= 1) return false;
  const pilas = c.jugadoresRonda.map((ronda) => ronda.pilaInicio);
  const objetivo = buscarMax ? Math.max.apply(null, pilas) : Math.min.apply(null, pilas);
  return pilas[indice] === objetivo;
}

// ============================================================
//  El multiplicador de cada jugador
// ============================================================

// Multiplicador de GANANCIAS de un jugador en la ronda: arranca en el de la mesa
// (Rueda / Juicio) y se le encadenan los arcanos que premian a ese jugador en
// concreto. Es el número que enseña el display ×N de la mesa, y solo afecta a lo que
// se gana: las pérdidas y los empates nunca se multiplican (ver bjArcadeResolverRonda).
function bjArcadeMultJugador(indice) {
  const c = bjArcade;
  const jugador = c.jugadores[indice];
  const ronda = c.jugadoresRonda[indice];
  let mult = c.multRonda;

  // El Emperador reparte ×2 según el puesto: al líder (Futuro normal) o al último
  // (Futuro invertido y Pasado invertido, que premia su próxima victoria).
  if (bjTarotAplica("emperador-fu-n") && bjArcadePuestoInicio(indice, true)) mult *= 2;
  if (bjTarotAplica("emperador-fu-i") && bjArcadePuestoInicio(indice, false)) mult *= 2;
  if (bjTarotAplica("emperador-pa-i") && bjArcadePuestoInicio(indice, false)) mult *= 2;

  // El Carro normal (Futuro): llegar en racha de victorias a la última ronda paga ×2.
  if (bjTarotAplica("carro-fu-n") && jugador.racha >= 1) mult *= 2;

  // La Luna normal: ganar «a ciegas» con la 2.ª carta tapada paga ×2 (Presente) o
  // ×2,5 (última ronda). En Pasado, premia con ×1,15 haber ganado sin ver la oculta.
  if (bjTarotAplica("luna-pr-n")) mult *= 2;
  if (bjTarotAplica("luna-fu-n")) mult *= 2.5;
  if (bjTarotAplica("luna-pa-n") && jugador.ganoACiegas) mult *= 1.15;

  // Los arcanos que premian DOBLAR: la Fuerza (×1,1) y el Diablo (×2).
  const doblo = ronda.manos.some((mano) => mano.doblo);
  if (doblo && (bjTarotAplica("fuerza-pa-n") || bjTarotAplica("fuerza-fu-n"))) mult *= 1.1;
  if (doblo && bjTarotAplica("diablo-fu-n")) mult *= 2;
  if (doblo && bjTarotAplica("diablo-pa-n") && jugador.dobloYGano) mult *= 2;

  // La Rueda normal (Pasado): tras ganar una mano, la próxima ganancia lleva el ×1–×3
  // que se le sorteó al cobrarla (bjArcadeAjustesDeRonda lo guarda en multRueda).
  if (bjTarotAplica("rueda-pa-n")) mult *= jugador.multRueda;

  // El Juicio invertido: los multiplicadores no se van. En Presente quedan fijos toda
  // la partida; en Pasado se arrastran de una ronda a la siguiente. En ambos casos el
  // jugador conserva el mejor multiplicador que haya tenido (el `multFijo` lo guarda
  // bjArcadeAjustesDeRonda: esta función NO muta nada, porque el display la llama en
  // cada repintado de la mesa).
  if (bjTarotAplica("juicio-pr-i") || bjTarotAplica("juicio-pa-i")) {
    mult = Math.max(mult, jugador.multFijo);
  }

  return mult;
}

// Texto del multiplicador para el display de la mesa: "×1", "×2,5"… (coma decimal,
// como el resto del juego). Sin multiplicador activo, siempre se ve un ×1.
function bjArcadeTextoMult(mult) {
  const redondeado = Math.round(mult * 100) / 100;
  return "×" + String(redondeado).replace(".", ",");
}

// Ajustes de pago POR MANO de los arcanos (sobre el pago neto del motor):
//   - La Emperatriz (Pasado): el natural paga ×2,5 si ya hiciste otro antes (normal)
//     o solo ×1,25 si vienes de pasarte (invertida).
//   - La Templanza normal: plantarse con muchas cartas paga como blackjack.
//   - El Mundo normal (Presente): el 21 exacto (sin ser natural) paga como blackjack.
function bjArcadeAjustarPago(res, mano, puedeNatural, opciones, jugador) {
  let pagoNatural = opciones.pagoNatural != null ? opciones.pagoNatural : 1.5;
  let pago = res.pago;
  const esNatural = puedeNatural && bjEsBlackjackNatural(mano.cartas);

  // La Emperatriz de Pasado retoca cuánto vale ESTE natural (bonus acumulado o
  // castigo por haberte pasado). Al cambiar el pago del natural hay que reaplicarlo.
  if (esNatural && res.resultado === "jugador") {
    if (bjTarotAplica("emperatriz-pa-n") && jugador.blackjacksPrevios > 0) pagoNatural = 2.5;
    if (bjTarotAplica("emperatriz-pa-i") && jugador.bustPrevio) pagoNatural = 1.25;
    pago = pagoNatural;
  }

  if (res.resultado === "jugador" && !esNatural) {
    const cartas = mano.cartas.length;
    // La Templanza normal: 5+ cartas en Presente, 4+ en la última ronda (Futuro).
    if (bjTarotAplica("templanza-pr-n") && cartas >= 5) pago = Math.max(pago, pagoNatural);
    if (bjTarotAplica("templanza-fu-n") && cartas >= 4) pago = Math.max(pago, pagoNatural);
    // El Mundo normal (Presente): el 21 exacto paga como blackjack.
    if (bjTarotAplica("mundo-pr-n") && bjValorMano(mano.cartas) === 21) {
      pago = Math.max(pago, pagoNatural);
    }
  }
  return pago;
}

// Ajustes DE RONDA tras pagar las manos. Aquí caen todos los arcanos que no son un
// multiplicador de ganancias: bonus y castigos en fichas, multiplicadores sobre la
// pila entera, recargos permanentes de la apuesta mínima, los trasvases del Diablo,
// las banderas de mesa que encienden los arcanos de Pasado y el rastro (racha,
// bustPrevio, ganoPrevio…) que la ronda siguiente consultará.
function bjArcadeAjustesDeRonda() {
  const c = bjArcade;

  // Delta de cada jugador ANTES de bonus/trasvases: define ganadores y perdedores.
  const deltas = c.jugadores.map((jugador, i) => jugador.pila - c.jugadoresRonda[i].pilaInicio);
  const dealerNatural = bjEsBlackjackNatural(c.manoDealer);
  const ultima = bjTarotEsUltimaRonda();
  const todosGanaron = deltas.every((delta) => delta > 0);
  const dealerArraso = deltas.every((delta) => delta < 0);

  c.jugadores.forEach((jugador, i) => {
    const ronda = c.jugadoresRonda[i];
    const gano = deltas[i] > 0;
    const perdio = deltas[i] < 0;
    const sePaso = ronda.manos.some((mano) => bjEsBust(mano.cartas));
    const doblo = ronda.manos.some((mano) => mano.doblo);
    const natural = ronda.manos.length === 1 && bjEsBlackjackNatural(ronda.manos[0].cartas);
    const veintiuno = ronda.manos.some(
      (mano) => bjValorMano(mano.cartas) === 21 && !bjEsBlackjackNatural(mano.cartas)
    );
    // «Usó regla opcional» = dividió, dobló o se rindió (lo mira el Hierofante).
    const usoOpcional = ronda.manos.length > 1 || doblo || ronda.manos.some((mano) => mano.rendido);

    // Racha y victorias (las leen el Carro, los Enamorados y el Juicio).
    if (gano) {
      jugador.racha++;
      jugador.victorias++;
    } else if (perdio) {
      jugador.racha = 0;
    }

    // --- Bonus en fichas ---
    // El Carro normal (Pasado): +5 por cada racha de 2 victorias seguidas.
    if (gano && bjTarotAplica("carro-pa-n") && jugador.racha >= 2) jugador.pila += 5;
    // El Hierofante (Pasado): +3 por ganar sin usar opcionales (normal) o usándolas (invertida).
    if (gano && bjTarotAplica("hierofante-pa-n") && !usoOpcional) jugador.pila += 3;
    if (gano && bjTarotAplica("hierofante-pa-i") && usoOpcional) jugador.pila += 3;
    // La Templanza normal (Pasado): +3 por ganar plantándose con 4 o más cartas.
    if (gano && bjTarotAplica("templanza-pa-n") &&
        ronda.manos.some((mano) => !bjEsBust(mano.cartas) && mano.cartas.length >= 4)) {
      jugador.pila += 3;
    }
    // El Mundo (Pasado): +10 por cada 21 exacto, −10 por cada blackjack natural.
    if (bjTarotAplica("mundo-pa-n") && veintiuno) jugador.pila += 10;
    if (bjTarotAplica("mundo-pa-i") && natural) jugador.pila -= 10;

    // --- Castigos en fichas ---
    // La Fuerza invertida (Pasado): doblar y perder cuesta 5 fichas más.
    if (perdio && doblo && bjTarotAplica("fuerza-pa-i")) jugador.pila -= 5;
    // El Colgado normal (Pasado): recuperas el 10 % de lo que has perdido.
    if (perdio && bjTarotAplica("colgado-pa-n")) jugador.pila += Math.round(-deltas[i] * 0.1);
    // El Sol invertido (Presente): cada blackjack del dealer te quita 10 fichas.
    if (dealerNatural && bjTarotAplica("sol-pr-i")) jugador.pila -= 10;

    // --- Multiplicadores sobre la PILA ENTERA (no sobre la ganancia) ---
    if (ultima && perdio && doblo && bjTarotAplica("fuerza-fu-n")) jugador.pila = Math.round(jugador.pila * 0.9);
    if (ultima && sePaso && bjTarotAplica("muerte-fu-i")) jugador.pila = Math.round(jugador.pila * 0.8);
    if (ultima && natural && bjTarotAplica("emperatriz-fu-i")) jugador.pila = Math.round(jugador.pila / 2);

    // --- Recargos permanentes sobre la apuesta mínima ---
    // El Loco invertido (Pasado): cada vez que te pasas, +5 de mínima el resto de la partida.
    if (sePaso && bjTarotAplica("loco-pa-i")) jugador.recargoMin += BJ_APUESTA_PASO;
    // La Templanza invertida (Pasado): plantarte con la mano inicial cuesta +5 de mínima.
    if (bjTarotAplica("templanza-pa-i") &&
        ronda.manos.some((mano) => !mano.rendido && !bjEsBust(mano.cartas) && mano.cartas.length === 2)) {
      jugador.recargoMin += BJ_APUESTA_PASO;
    }

    // El Juicio invertido: el multiplicador que ha tenido esta ronda ya no se le va
    // (Presente lo fija para toda la partida; Pasado lo arrastra a la siguiente).
    if (bjTarotAplica("juicio-pr-i") || bjTarotAplica("juicio-pa-i")) {
      jugador.multFijo = Math.max(jugador.multFijo, ronda.mult || 1);
    }

    // --- Rastro para la ronda siguiente ---
    jugador.ganoPrevio = gano;
    jugador.bustPrevio = sePaso;
    jugador.perdidasSeguidas = perdio ? jugador.perdidasSeguidas + 1 : 0;
    jugador.dobloYGano = gano && doblo;
    jugador.ganoACiegas = gano && !c.ocultaEraVisible;
    if (natural) jugador.blackjacksPrevios++;
    // La Rueda normal (Pasado): tras ganar se sortea el ×1–×3 de tu PRÓXIMA ganancia.
    if (bjTarotAplica("rueda-pa-n")) jugador.multRueda = gano ? 1 + Math.floor(Math.random() * 3) : 1;
  });

  // El Emperador normal (Pasado): el líder cobra +2 fichas por cada ronda en cabeza.
  if (bjTarotAplica("emperador-pa-n")) {
    c.jugadores.forEach((jugador) => {
      if (bjArcadeEsLider(jugador)) {
        jugador.rondasLider++;
        jugador.pila += 2 * jugador.rondasLider;
      }
    });
  }

  // El Carro invertido (Presente): la mínima de la mesa sube +5 cada vez que alguien
  // encadena 2 victorias.
  if (bjTarotAplica("carro-pr-i") && c.jugadores.some((jugador) => jugador.racha >= 2)) {
    c.jugadores.forEach((jugador) => {
      jugador.recargoMin += BJ_APUESTA_PASO;
    });
  }

  // El Diablo: los trasvases de fichas entre ganadores y perdedores.
  bjArcadeTrasvasesDiablo(deltas, ultima);

  // El Sol invertido (Futuro): si el dealer os gana a todos en la última, −15 a cada uno.
  if (ultima && dealerArraso && bjTarotAplica("sol-fu-i")) {
    c.jugadores.forEach((jugador) => {
      jugador.pila -= 15;
    });
  }

  // --- Banderas de mesa que leerá la ronda siguiente ---
  c.dealerRevelado = todosGanaron;  // El Sol normal (Pasado): revela su oculta
  c.dealerArraso = dealerArraso;    // El Sol invertido (Pasado): juega con las dos tapadas
  c.dealerBlando = dealerArraso;    // La Torre normal (Pasado): se ablanda a 16
  c.contadorOculto = c.jugadoresRonda.some((ronda) => ronda.manos.some((mano) => bjEsBust(mano.cartas)));
  // El Mago invertido (Pasado): si el dealer hace blackjack, se acabó doblar.
  if (dealerNatural && bjTarotAplica("mago-pa-i")) c.magoNoDoblar = true;
}

// Los trasvases del Diablo: fichas que cambian de mano entre ganadores y perdedores
// de la ronda. Solo tienen sentido con 2+ jugadores.
//   - Pasado invertido: cada perdedor entrega 2 fichas a cada ganador.
//   - Presente invertido: cada ganador roba 3 fichas a cada perdedor.
//   - Futuro invertido: en la última ronda, cada ganador roba 5 a cada perdedor.
function bjArcadeTrasvasesDiablo(deltas, ultima) {
  const c = bjArcade;
  if (c.jugadores.length <= 1) return;

  let fichas = 0;
  if (bjTarotAplica("diablo-pa-i")) fichas = 2;
  if (bjTarotAplica("diablo-pr-i")) fichas = 3;
  if (bjTarotAplica("diablo-fu-i") && ultima) fichas = 5;
  if (!fichas) return;

  const ganadores = [];
  const perdedores = [];
  deltas.forEach((delta, i) => {
    if (delta > 0) ganadores.push(i);
    else if (delta < 0) perdedores.push(i);
  });

  ganadores.forEach((g) => {
    c.jugadores[g].pila += fichas * perdedores.length;
  });
  perdedores.forEach((p) => {
    c.jugadores[p].pila -= fichas * ganadores.length;
  });
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

// Solitario: puntuación final = pila; la partida entra en el leaderboard (si da) y se
// muestra el récord vigente con su ruleset.
function bjArcadeFinSolitario() {
  const puntuacion = bjArcade.jugadores[0].pila;
  const mejorAnterior = bjArcadeCargarRecords()[0] || null;

  // La marca se guarda con el ruleset EFECTIVO con el que se ha jugado (si el
  // Hierofante lo cambió, el récord refleja las reglas reales) y con la tirada que le
  // tocó, para poder enseñarla luego en el leaderboard.
  const records = bjArcadeRegistrarRecord({
    puntuacion,
    ruleset: Object.assign({}, bjArcade.ruleset),
    tarot: bjEstado.tarot.map((entrada) => ({
      slug: entrada.slug,
      nombre: entrada.nombre,
      invertida: entrada.invertida,
      posicion: entrada.posicion,
    })),
  });

  const esRecord = !mejorAnterior || puntuacion > mejorAnterior.puntuacion;
  const rulesetMostrado = records[0].ruleset;

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

  // Récord vigente: la primera marca del leaderboard (puede ser la de esta partida).
  document.getElementById("bj-fin-record").textContent =
    `Récord: 🪙${bjFormatearFichas(records[0].puntuacion)} (reglas: ${bjArcadeTextoRuleset(rulesetMostrado)}).`;
}

// Texto con las reglas opcionales activas de un ruleset (para acompañar el récord).
function bjArcadeTextoRuleset(ruleset) {
  const activas = BJ_REGLAS
    .filter((regla) => regla.disponible && ruleset && ruleset[regla.clave])
    .map((regla) => regla.nombre.toLowerCase());
  return activas.length ? activas.join(", ") : "reglas de casino";
}

// ============================================================
//  Leaderboard del solitario (persistente)
// ============================================================
//
// Solo se guardan las BJ_ARCADE_RECORDS_MAX mejores marcas: lo que sale del podio se
// borra de localStorage. Cada marca lleva las fichas finales, el ruleset efectivo y la
// tirada de tarot con la que se jugó (la pantalla de estadísticas la enseña).

// Mete una partida en el leaderboard, lo recorta al máximo y lo guarda. En caso de
// empate la marca nueva queda por DETRÁS de las que ya tenían esa puntuación (sort
// estable): un empate no destrona al que llegó antes. Devuelve el leaderboard guardado.
function bjArcadeRegistrarRecord(entrada) {
  const records = bjArcadeCargarRecords();
  records.push(entrada);
  records.sort((a, b) => b.puntuacion - a.puntuacion);
  const podio = records.slice(0, BJ_ARCADE_RECORDS_MAX);
  bjArcadeGuardarRecords(podio);
  return podio;
}

// Lee el leaderboard (de mejor a peor). Si aún no existe, migra el récord ÚNICO de la
// versión anterior (`blackjack_arcade_record`, sin tarot) para no perderlo; su clave se
// borra en el primer guardado. Defensivo: descarta lo que no sea una marca válida.
function bjArcadeCargarRecords() {
  const guardado = bjArcadeLeerJSON(BJ_ARCADE_RECORDS_CLAVE);
  const lista = Array.isArray(guardado)
    ? guardado
    : [bjArcadeLeerJSON(BJ_ARCADE_RECORD_CLAVE)];

  return lista
    .map(bjArcadeNormalizarRecord)
    .filter((record) => record !== null)
    .slice(0, BJ_ARCADE_RECORDS_MAX);
}

// Deja una marca en su forma canónica, o null si no lo es (guardado corrupto, o de una
// versión anterior sin tarot: entonces se queda sin cartas que enseñar).
function bjArcadeNormalizarRecord(entrada) {
  if (!entrada || typeof entrada.puntuacion !== "number") return null;
  return {
    puntuacion: entrada.puntuacion,
    ruleset: entrada.ruleset && typeof entrada.ruleset === "object" ? entrada.ruleset : null,
    tarot: Array.isArray(entrada.tarot) ? entrada.tarot : [],
  };
}

function bjArcadeGuardarRecords(records) {
  try {
    localStorage.setItem(BJ_ARCADE_RECORDS_CLAVE, JSON.stringify(records));
    localStorage.removeItem(BJ_ARCADE_RECORD_CLAVE); // ya migrado: la clave vieja sobra
  } catch (e) {
    console.warn("No se pudo guardar el leaderboard del Arcade:", e);
  }
}

// Lee y parsea una clave de localStorage; null si no está o está corrupta.
function bjArcadeLeerJSON(clave) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch (e) {
    return null;
  }
}

// ============================================================
//  Pintado
// ============================================================

// --- Visibilidad de la mano del dealer (Ermitaño, Luna, Sol) ---
// Dos preguntas distintas: si se tapa incluso la carta VISIBLE (la primera) y si
// este jugador llega a ver la OCULTA (la segunda). Ambas dependen del ranking, así
// que se resuelven por jugador.

// ¿Se tapa también la carta visible del dealer para este jugador?
function bjArcadeTapaVisible(jugador) {
  // El Ermitaño invertido (Presente/Futuro): la visible no se muestra.
  if (bjTarotAplica("ermitano-pr-i") || bjTarotAplica("ermitano-fu-i")) return true;
  // La Luna invertida: las DOS cartas del dealer están ocultas.
  if (bjTarotAplica("luna-pr-i") || bjTarotAplica("luna-fu-i")) return true;
  // El Sol invertido (Pasado): tras ganarles a todos, el dealer juega la ronda
  // siguiente con sus dos cartas tapadas.
  if (bjTarotAplica("sol-pa-i") && bjArcade.dealerArraso) return true;
  // El Ermitaño invertido (Pasado): quien va primero juega a ciegas.
  if (bjTarotAplica("ermitano-pa-i") && jugador && bjArcadeEsLider(jugador)) return true;
  return false;
}

// ¿Ve este jugador la carta oculta del dealer?
function bjArcadeVeOculta(jugador) {
  if (!bjArcade.dealerOculta) return true; // el Sol normal ya la repartió boca arriba
  // El Ermitaño normal: en Presente/Futuro la ve todo el mundo…
  if (bjTarotAplica("ermitano-pr-n") || bjTarotAplica("ermitano-fu-n")) return true;
  // …y en Pasado solo quien va último del ranking.
  if (bjTarotAplica("ermitano-pa-n") && jugador && bjArcadeEsUltimo(jugador)) return true;
  // El Sol normal (Pasado): tras perder contra todos, el dealer la revela.
  if (bjTarotAplica("sol-pa-n") && bjArcade.dealerRevelado) return true;
  return false;
}

// Texto del contador de cartas restantes: la Sacerdotisa lo oculta (invertida) o le
// añade cuántos ases quedan (normal, Presente).
function bjArcadeContadorTexto() {
  const c = bjArcade;
  const oculto =
    bjTarotAplica("sacerdotisa-pr-i") ||
    bjTarotAplica("sacerdotisa-fu-i") ||
    (bjTarotAplica("sacerdotisa-pa-i") && c.contadorOculto);
  if (oculto) return "?";

  const restantes = bjCartasRestantes(c.mazo);
  if (bjTarotAplica("sacerdotisa-pr-n")) {
    const ases = c.mazo.filter((carta) => carta.valor === "A").length;
    return restantes + " · " + ases + " A";
  }
  return String(restantes);
}

// Pinta la carta visible del dealer (su primera carta) en un contenedor.
function bjArcadeRenderUpcard(idContenedor) {
  const cont = document.getElementById(idContenedor);
  cont.innerHTML = "";
  if (bjArcade.manoDealer.length) {
    const tapada = bjArcadeTapaVisible(bjArcadeJugadorActual());
    cont.appendChild(bjCrearCartaImg(bjArcade.manoDealer[0], tapada));
  }
}

// Pinta la mesa del jugador de turno: cabecera, dealer (con carta oculta), sus
// manos y los botones de acción según el ruleset y su pila.
function bjArcadeRenderMesa() {
  const c = bjArcade;
  document.getElementById("bj-arcade-turno-nombre").textContent = bjArcadeJugadorActual().nombre;
  document.getElementById("bj-arcade-pila").textContent = bjFormatearFichas(bjArcadeJugadorActual().pila);
  document.getElementById("bj-arcade-restantes").textContent = bjArcadeContadorTexto();

  // Display del multiplicador de ganancias del jugador de turno. Sin arcanos que lo
  // toquen sale un ×1; se recalcula en cada repintado porque doblar puede cambiarlo.
  const mult = bjArcadeMultJugador(bjArcadeIndiceActual());
  const chip = document.getElementById("bj-arcade-mult");
  chip.textContent = bjArcadeTextoMult(mult);
  chip.parentElement.classList.toggle("activo", mult !== 1);

  // Visibilidad de la mano del dealer para el jugador de turno (Ermitaño, Luna, Sol).
  const jugador = bjArcadeJugadorActual();
  const veOculta = bjArcadeVeOculta(jugador);
  const tapaVisible = bjArcadeTapaVisible(jugador);

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

    // Su multiplicador de ganancias (×1 si ningún arcano le afecta), en pequeño.
    const multJug = bjArcadeMultJugador(idx);
    if (multJug !== 1) {
      const chipMult = document.createElement("span");
      chipMult.className = "bj-mesa-jug-mult";
      chipMult.textContent = bjArcadeTextoMult(multJug);
      cab.appendChild(chipMult);
    }

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
    const trozos = [`Apostó 🪙${bjFormatearFichas(ronda.apuesta)}`];
    if (ronda.mult && ronda.mult !== 1) trozos.push(bjArcadeTextoMult(ronda.mult));
    trozos.push(bjArcadeResumenManos(ronda.manos));
    detalle.textContent = trozos.join(" · ");
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

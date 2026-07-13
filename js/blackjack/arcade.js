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
// Modo fiesta 🍻: al cerrar cada ronda se cuentan los tragos que bebe y reparte cada
// jugador, sumando las reglas base de la mesa y los arcanos de la tirada que hayan
// disparado de verdad esa ronda (ver «Contabilidad de tragos» al final del archivo).
// Reutiliza helpers globales del Clásico (bjCrearCartaImg,
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
  valoresCero: [],      // valores de carta que cuentan 0 esta ronda (Rueda invertida)
  eligiendo: null,      // modo «elige una carta» activo (Mago/Enamorados) o null
  manoDealer: [],
  dealerOculta: true,
  orden: [],            // orden de juego de la ronda (índices de jugadores, barajado)
  turnoIndex: 0,        // posición dentro de `orden` (no índice de jugador directo)
  apuestaActual: BJ_APUESTA_MIN, // apuesta que está fijando el jugador de turno
  apuestaMin: BJ_APUESTA_MIN,    // límites de esa apuesta (bjArcadeLimitesApuesta)
  apuestaMax: BJ_APUESTA_MIN,
  // Por jugador y ronda: { apuesta, manos, manoActiva, pilaInicio, cartasIniciales }
  jugadoresRonda: [],
  // Contabilidad de tragos de la ronda recién cerrada (modo fiesta), o null: la
  // calcula bjArcadeContarTragos y la pinta bjArcadeRenderFiesta.
  tragos: null,
  // true mientras una carta está girando y su pausa de lectura no ha terminado
  // (bjTrasAnimacion): bloquea las acciones de turno para que no se pueda pedir/
  // doblar/etc. dos veces sobre la misma carta a medio revelar.
  animando: false,
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
    empatoPrevio: false,  // La Justicia (Pasado): empataste la ronda anterior
    empates: 0,           // La Justicia (Futuro): empates acumulados en la partida
    arcanosUsados: {},    // acciones especiales de una vez POR PARTIDA ya gastadas
    ganoSinPedir: false,  // La Sacerdotisa (Pasado): ganaste sin pedir cartas
    naturalPrevio: false, // El Mago (Pasado): hiciste blackjack la ronda anterior
    veintiunos: 0,        // El Mundo (Futuro): cuenta de 21 exactos de la partida
  }));

  // Banderas de mesa que encienden los arcanos de Pasado a mitad de partida.
  c.magoNoDoblar = false;   // El Mago invertido: el dealer hizo blackjack
  c.dealerArraso = false;   // El Sol invertido: el dealer ganó a todos
  c.dealerRevelado = false; // El Sol normal: todos ganaron al dealer
  c.contadorOculto = false; // La Sacerdotisa invertida: alguien se pasó
  c.dealerBlando = false;   // La Torre normal: el dealer arrasó y se ablanda
  c.magoDealerUso = false;  // El Mago invertido (Presente): su cambio de carta, gastado
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

  // La Rueda invertida: valores de carta que cuentan como 0 esta ronda para las
  // manos de los jugadores. En Presente se sortea uno cada ronda; en Futuro, dos
  // distintos en la última. (Solo hay una Rueda en la tirada: no se pisan.)
  c.valoresCero = [];
  if (bjTarotAplica("rueda-pr-i")) c.valoresCero = bjArcadeSortearValores(1);
  if (bjTarotAplica("rueda-fu-i")) c.valoresCero = bjArcadeSortearValores(2);

  c.jugadoresRonda = c.jugadores.map((jugador) => {
    const cartasIniciales = [bjRobar(c.mazo), bjRobar(c.mazo)];

    // Los Enamorados invertidos (Presente, o Futuro en la última ronda): al recibir
    // la mano, una de tus dos cartas iniciales (al azar) se cambia a ciegas por la
    // superior del mazo. La cambiada queda fuera del juego.
    if (bjTarotAplica("enamorados-pr-i") || bjTarotAplica("enamorados-fu-i")) {
      const nueva = bjRobar(c.mazo);
      if (nueva) cartasIniciales[Math.floor(Math.random() * 2)] = nueva;
    }

    // Los Enamorados normal (Futuro): en la última ronda se reparte una SEGUNDA
    // mano inicial por jugador; en su turno elige cuál de las dos juega.
    let cartasAlt = null;
    if (bjTarotAplica("enamorados-fu-n")) {
      cartasAlt = [bjRobar(c.mazo), bjRobar(c.mazo)].filter((carta) => carta);
      if (cartasAlt.length < 2) cartasAlt = null; // zapato corto: sin mano B
    }

    return {
      apuesta: 0,
      manos: [],
      manoActiva: 0,
      pilaInicio: jugador.pila,
      cartasIniciales,
      cartasAlt,
      // La Rueda invertida (Pasado): tras perder una ronda, una de tus dos cartas
      // iniciales (al azar) cuenta como 0 en esta. Se guarda la carta en sí (no el
      // índice) para reconocerla aunque la mano crezca o se divida.
      cartaCero:
        bjTarotAplica("rueda-pa-i") && jugador.perdidasSeguidas > 0
          ? cartasIniciales[Math.floor(Math.random() * 2)]
          : null,
      arcanosUsados: {}, // acciones especiales de una vez POR RONDA ya gastadas
      // Acciones especiales que el jugador ha usado ESTA ronda (cuente o no como
      // «una vez por partida»): lo lee la contabilidad de tragos del modo fiesta,
      // que necesita saber si el arcano disparó en esta ronda concreta.
      usos: {},
    };
  });
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
  c.eligiendo = null; // el modo «elige una carta» no cruza de un turno a otro
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

// Avisos para la pantalla de apuesta sobre los arcanos que cambian el valor de las
// cartas o el reparto de ESTA ronda (la Estrella de Pasado, la Rueda invertida y la
// Luna): condicionan cuánto arriesgar, así que se avisan antes de apostar. Las
// versiones de Presente/Futuro de la Estrella no se repiten aquí: son reglas de mesa
// fijas que ya están en el panel del tarot.
function bjArcadeNotasCartas(jugador) {
  const c = bjArcade;
  const ronda = bjArcadeRondaActual();
  const notas = [];
  if (c.valoresCero.length === 1) {
    notas.push(`Esta ronda las cartas de valor ${c.valoresCero[0]} cuentan como 0.`);
  } else if (c.valoresCero.length > 1) {
    notas.push(`Esta ronda las cartas de valor ${c.valoresCero.join(" y ")} cuentan como 0.`);
  }
  if (ronda.cartaCero) {
    notas.push("Perdiste la ronda anterior: una de tus cartas iniciales cuenta como 0.");
  }
  if (bjTarotAplica("estrella-pa-n") && jugador.perdidasSeguidas > 0) {
    notas.push("Perdiste la ronda anterior: tus ases valen siempre 11 esta ronda.");
  }
  if (bjTarotAplica("estrella-pa-i") && jugador.ganoPrevio) {
    notas.push("Ganaste la ronda anterior: tus ases valen solo 1 esta ronda.");
  }
  if (bjArcadeSegundaTapada(bjArcadeIndiceActual())) {
    notas.push("Tu segunda carta se reparte boca abajo: jugarás sin verla.");
  }
  return notas;
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

  // Avisos: restricciones de los arcanos, deuda, multiplicador de la ronda y los
  // arcanos que tocan el valor de las cartas o el reparto (Estrella, Rueda, Luna).
  const notas = limites.notas.slice();
  if (c.multRonda > 1) notas.push(`Esta ronda las ganancias valen ×${c.multRonda}.`);
  notas.push.apply(notas, bjArcadeNotasCartas(jugador));
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

  // El Loco invertido (Futuro): en la última ronda TODOS descartan su mano inicial
  // y juegan una nueva a ciegas que se planta sola: el turno pasa de largo.
  if (bjTarotAplica("loco-fu-i")) {
    bjArcadeLocoDescartar(bjArcadeCtx(), true);
    return;
  }

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
// partida terminará al acabar la ronda. Si se pasa, la carta se ve (con su volteo)
// antes de avanzar de mano/jugador; mientras gira, `animando` bloquea el resto de
// acciones para que no se pueda pedir dos veces sobre la misma carta a medio girar.
function bjArcadePedir() {
  const c = bjArcade;
  if (c.animando) return;
  const mano = bjArcadeManoActiva();
  const mod = bjArcadeModActual();
  if (bjValorMano(mano.cartas, mod) >= 21) return; // con 21 ya no se pide
  if (bjArcadeDebeDoblar()) return; // el Mago (Futuro): estás obligado a doblar
  c.eligiendo = null;
  const carta = bjRobar(c.mazo);
  if (!carta) {
    // Sin carta que robar no hay nada que animar: se planta directamente.
    c.mazoAgotado = true;
    mano.terminada = true;
    bjArcadeAvanzarMano();
    return;
  }
  mano.cartas.push(carta);
  bjArcadeRondaActual().espiando = false; // robar gasta la espiada de la Sacerdotisa

  if (bjEsBust(mano.cartas, mod)) {
    const jugador = bjArcadeJugadorActual();
    const ronda = bjArcadeRondaActual();
    // El Juicio: una «segunda oportunidad» puede descartar la carta del bust, pero
    // solo DESPUÉS de que se haya visto (si no, el efecto no se entiende): se
    // comprueba aquí si aplicaría, y se aplica de verdad al final de la pausa.
    const segundaOportunidad = bjArcadeSegundaOportunidadEfecto(jugador, ronda);
    mano.terminada = !segundaOportunidad;
    c.animando = true;
    const esperaMs = bjArcadeRenderMesa(); // se ve la carta del bust antes de nada
    bjTrasAnimacion(esperaMs, () => {
      c.animando = false;
      if (segundaOportunidad) {
        bjArcadeSegundaOportunidadAplicar(mano, jugador, ronda, segundaOportunidad);
        bjArcadeRenderMesa(); // repinta ya sin la carta descartada; el turno sigue
      } else {
        bjArcadeAvanzarMano();
      }
    });
  } else {
    bjArcadeRenderMesa();
  }
}

// El Juicio: ¿aplicaría la segunda oportunidad a la mano que se acaba de pasar?
// Normal en Presente (una vez por partida y jugador) o en Pasado (viniendo de
// perder dos rondas seguidas, una por ronda). Solo comprueba condiciones, sin
// marcar el uso ni tocar la mano (bjArcadeSegundaOportunidadAplicar hace eso,
// después de que la carta del bust se haya visto). Devuelve la clave del efecto
// aplicable, o null.
function bjArcadeSegundaOportunidadEfecto(jugador, ronda) {
  if (bjTarotAplica("juicio-pr-n") && !jugador.arcanosUsados["juicio-pr-n"]) return "juicio-pr-n";
  if (
    bjTarotAplica("juicio-pa-n") &&
    jugador.perdidasSeguidas >= 2 &&
    !ronda.arcanosUsados["juicio-pa-n"]
  ) {
    return "juicio-pa-n";
  }
  return null;
}

// Marca el uso del efecto y descarta la carta del bust: la mano sigue jugándose
// como si nada. Se llama tras la pausa de lectura, cuando la carta ya se ha visto.
function bjArcadeSegundaOportunidadAplicar(mano, jugador, ronda, efecto) {
  if (efecto === "juicio-pr-n") jugador.arcanosUsados[efecto] = true;
  else ronda.arcanosUsados[efecto] = true;
  bjArcadeApuntarUso(ronda, efecto);
  mano.cartas.pop(); // la carta del bust queda fuera del juego
}

// "Plantarse": la mano activa queda como está. La Templanza invertida lo prohíbe
// con menos de 14 (el botón ya va deshabilitado; esto es el cinturón). No roba
// carta, así que no hay nada que animar: avanza directamente.
function bjArcadePlantarse() {
  if (bjArcade.animando) return;
  if (!bjArcadePuedePlantarse()) return;
  bjArcade.eligiendo = null;
  bjArcadeManoActiva().terminada = true;
  bjArcadeAvanzarMano();
}

// "Doblar": paga otra apuesta sobre la mano activa, roba UNA carta y la planta. La
// carta se ve (con su volteo) antes de avanzar de mano/jugador.
function bjArcadeDoblar() {
  const c = bjArcade;
  if (c.animando) return;
  if (!bjArcadePuedeDoblar()) return;
  c.eligiendo = null;
  const mano = bjArcadeManoActiva();
  bjArcadeJugadorActual().pila -= mano.apuesta;
  mano.doblo = true;
  mano.terminada = true;
  const carta = bjRobar(c.mazo);
  if (!carta) {
    // Sin carta que robar no hay nada que animar: se planta directamente.
    c.mazoAgotado = true;
    bjArcadeAvanzarMano();
    return;
  }
  mano.cartas.push(carta);
  bjArcadeRondaActual().espiando = false; // robar gasta la espiada de la Sacerdotisa
  c.animando = true;
  const esperaMs = bjArcadeRenderMesa();
  bjTrasAnimacion(esperaMs, () => {
    c.animando = false;
    bjArcadeAvanzarMano();
  });
}

// "Dividir" (split): separa un par en dos manos con su apuesta (máximo dos manos).
function bjArcadeDividir() {
  if (bjArcade.animando) return;
  if (!bjArcadePuedeDividir()) return;
  bjArcade.eligiendo = null;
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
// No roba carta, así que no hay nada que animar.
function bjArcadeRendirse() {
  if (bjArcade.animando) return;
  if (!bjArcadePuedeRendirse()) return;
  bjArcade.eligiendo = null;
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
// los ases divididos reciben una carta y se plantan solos. Al ser mano nueva
// (mostradas=0), sus dos cartas entran con la animación simple si el jugador sigue
// jugándola (se ve de sobra sin pausa); pero los ases divididos se plantan SOLOS sin
// que el jugador toque nada, así que aquí sí hace falta esperar a que se vea la 2.ª
// carta antes de avanzar (si no, "pasa el móvil" saltaría sin enseñarla nunca).
function bjArcadeActivarMano(i) {
  const c = bjArcade;
  const ronda = bjArcadeRondaActual();
  ronda.manoActiva = i;
  const mano = ronda.manos[i];
  const repartida = mano.cartas.length === 1;
  if (repartida) {
    const carta = bjRobar(c.mazo);
    if (!carta) {
      // Sin carta que robar no hay nada que animar: se planta directamente.
      c.mazoAgotado = true;
      mano.terminada = true;
      bjArcadeAvanzarMano();
      return;
    }
    mano.cartas.push(carta);
  }
  if (mano.deAses) {
    mano.terminada = true;
    if (repartida) {
      c.animando = true;
      const esperaMs = bjArcadeRenderMesa(); // se ve la 2.ª carta antes de plantarse sola
      bjTrasAnimacion(esperaMs, () => {
        c.animando = false;
        bjArcadeAvanzarMano();
      });
    } else {
      bjArcadeAvanzarMano();
    }
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

// Regla opcional efectiva AHORA MISMO: el ruleset congelado de la partida, salvo
// que el Hierofante de Futuro mande en la última ronda (normal: todas las
// opcionales fuera; invertida: todas dentro menos dividir). Su versión de Presente
// ya está horneada en bjArcade.ruleset (bjTarotRulesetEfectivo).
function bjArcadeReglaActiva(clave) {
  if (bjTarotAplica("hierofante-fu-n")) return false;
  if (bjTarotAplica("hierofante-fu-i")) return clave !== "dividir";
  return !!bjArcade.ruleset[clave];
}

// El Mago normal (Futuro): en la última ronda todos DEBEN doblar con su mano
// inicial (salvo blackjack natural). Mientras la obligación siga viva bloquea
// pedir/plantarse/dividir/rendirse; si no hay fondos o cartas para doblar, decae
// (nadie puede quedarse sin jugada posible).
function bjArcadeDebeDoblar() {
  if (!bjTarotAplica("mago-fu-n")) return false;
  const ronda = bjArcadeRondaActual();
  const mano = bjArcadeManoActiva();
  const jugador = bjArcadeJugadorActual();
  if (ronda.manos.length !== 1 || mano.cartas.length !== 2 || mano.doblo) return false;
  if (bjEsBlackjackNatural(mano.cartas, bjArcadeModActual())) return false;
  return jugador.pila >= mano.apuesta && bjCartasRestantes(bjArcade.mazo) >= 1;
}

// Plantarse: la Muerte y la Templanza invertidas ponen suelos a lo que puedes dejar
// en la mesa (te obligan a seguir pidiendo).
function bjArcadePuedePlantarse() {
  if (bjArcade.animando) return false; // una carta está girando: nada es jugable todavía
  const mano = bjArcadeManoActiva();
  const total = bjValorMano(mano.cartas, bjArcadeModActual());
  const inicial = mano.cartas.length <= 2;

  // El Mago normal (Futuro): estás obligado a doblar tu mano inicial.
  if (bjArcadeDebeDoblar()) return false;
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
  if (c.animando) return false; // una carta está girando: nada es jugable todavía
  const mano = bjArcadeManoActiva();
  const jugador = bjArcadeJugadorActual();

  // El Mago normal (Futuro): doblar es OBLIGATORIO, así que siempre se puede (la
  // obligación ya comprueba fondos y cartas, y pisa al ruleset y a la Fuerza).
  if (bjArcadeDebeDoblar()) return true;

  // El Mago invertido: en Pasado, si el dealer hizo blackjack ya nadie dobla el resto
  // de la partida (flag `magoNoDoblar`); en Futuro, nadie dobla en la última ronda.
  if (c.magoNoDoblar || bjTarotAplica("mago-fu-i")) return false;

  // La Fuerza: normal (Presente), se dobla con cualquier nº de cartas; invertida
  // (Presente o Futuro), solo con un total de 9, 10 u 11.
  const cartasOk = bjTarotAplica("fuerza-pr-n") || mano.cartas.length === 2;
  const soloDuros = bjTarotAplica("fuerza-pr-i") || bjTarotAplica("fuerza-fu-i");
  const totalOk = !soloDuros || [9, 10, 11].includes(bjValorMano(mano.cartas, bjArcadeModActual()));

  // El Emperador invertido (Presente): el último del ranking puede doblar aunque la
  // regla esté desactivada. El Hierofante de Futuro puede pisar el ruleset entero.
  const permitido =
    bjArcadeReglaActiva("doblar") || (bjTarotAplica("emperador-pr-i") && bjArcadeEsUltimo(jugador));

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
  if (bjArcade.animando) return false; // una carta está girando: nada es jugable todavía
  const ronda = bjArcadeRondaActual();
  // En multijugador no se permite dividir, para no añadir complejidad al torneo.
  if (bjArcade.jugadores.length > 1) return false;
  // Con la 2.ª carta boca abajo (la Luna) no se divide: no ves si tienes pareja.
  if (bjArcadeSegundaTapada(bjArcadeIndiceActual())) return false;
  // El Mago normal (Futuro): estás obligado a doblar tu mano inicial.
  if (bjArcadeDebeDoblar()) return false;
  if (!bjArcadeReglaActiva("dividir") || ronda.manos.length !== 1) return false;
  const cartas = ronda.manos[0].cartas;
  if (cartas.length !== 2) return false;
  if (bjValorCarta(cartas[0].valor) !== bjValorCarta(cartas[1].valor)) return false;
  return bjArcadeJugadorActual().pila >= ronda.apuesta && bjCartasRestantes(bjArcade.mazo) >= 2;
}

// ¿Puede rendirse? El Colgado abre o cierra la puerta, el Emperador normal se la
// cierra al líder y el Colgado invertido (Pasado) a quien viene de ganar.
function bjArcadePuedeRendirse() {
  if (bjArcade.animando) return false; // una carta está girando: nada es jugable todavía
  const ronda = bjArcadeRondaActual();
  const jugador = bjArcadeJugadorActual();

  // El Mago normal (Futuro): estás obligado a doblar tu mano inicial.
  if (bjArcadeDebeDoblar()) return false;
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
    bjArcadeReglaActiva("rendirse") &&
    ronda.manos.length === 1 &&
    cartasOk &&
    jugador.pila >= 0
  );
}

// ============================================================
//  Acciones especiales del tarot (Fase 9.5)
// ============================================================
//
// Algunos arcanos no son una regla pasiva sino una ACCIÓN que el jugador decide
// usar (descartar la mano, cambiar una carta, espiar el mazo…). Cada una se
// registra en BJ_ARCADE_ESPECIALES y la mesa pinta un botón con la miniatura de
// la carta del arcano cuando (1) el efecto está en la tirada y aplica ahora
// (bjTarotAplica), (2) no se ha gastado ya su uso y (3) su `disponible(ctx)`
// dice que puede usarse en este preciso momento.
//
// Forma de una entrada:
//   - efecto: clave del efecto en la tirada ("loco-pr-n"…).
//   - etiqueta: texto corto del botón (la explicación completa va en el title).
//   - unaVez: "partida" (se apunta en jugador.arcanosUsados) o "ronda" (en
//     jugadoresRonda[i].arcanosUsados). Sin `unaVez`, usable sin límite.
//   - disponible(ctx): ¿puede usarse ahora? (además de las condiciones de arriba).
//   - usar(ctx): ejecuta el efecto. Debe dejar la mesa repintada (o avanzar el
//     turno). El uso se marca ANTES de llamar a usar().
//
// ctx = { c: bjArcade, indice, jugador, ronda, mano } (bjArcadeCtx), siempre del
// jugador de turno: las acciones especiales solo existen durante tu propio turno.

function bjArcadeCtx() {
  return {
    c: bjArcade,
    indice: bjArcadeIndiceActual(),
    jugador: bjArcadeJugadorActual(),
    ronda: bjArcadeRondaActual(),
    mano: bjArcadeManoActiva(),
  };
}

// Apunta que el jugador ha usado ESTE efecto en la ronda en curso. `arcanosUsados`
// solo dice si el uso está gastado (y el de «una vez por partida» sobrevive a la
// ronda), así que la contabilidad de tragos necesita este rastro aparte.
function bjArcadeApuntarUso(ronda, efecto) {
  ronda.usos[efecto] = (ronda.usos[efecto] || 0) + 1;
}

// ¿Puede usarse esta acción especial ahora mismo?
function bjArcadeEspecialUsable(entrada, ctx) {
  if (!bjTarotAplica(entrada.efecto)) return false;
  if (entrada.unaVez === "partida" && ctx.jugador.arcanosUsados[entrada.efecto]) return false;
  if (entrada.unaVez === "ronda" && ctx.ronda.arcanosUsados[entrada.efecto]) return false;
  return entrada.disponible(ctx);
}

// ¿Sigue el jugador con su mano inicial POR JUGAR? (2 cartas, sin doblar, dividir,
// rendirse ni plantarse): condición común de los descartes del Loco/Enamorados.
function bjArcadeConManoInicial(ctx) {
  return (
    ctx.ronda.manos.length === 1 &&
    ctx.mano.cartas.length === 2 &&
    !ctx.mano.doblo &&
    !ctx.mano.terminada
  );
}

// --- El Loco: descartar la mano inicial y robar otra ---

// Descarta la mano inicial del jugador de turno y le reparte una nueva de 2
// cartas (las descartadas quedan fuera del juego, no vuelven al zapato). Con
// `aCiegas`, la mano nueva va boca abajo y se planta sola, sin poder pedir (el
// Loco invertido). Si con el descarte se va la carta a 0 de la Rueda (Pasado),
// el castigo se va con ella: descartar es una forma legítima de librarse.
function bjArcadeLocoDescartar(ctx, aCiegas) {
  const c = bjArcade;
  const cartas = [bjRobar(c.mazo), bjRobar(c.mazo)].filter((carta) => carta);
  if (cartas.length < 2) c.mazoAgotado = true;
  const mano = bjArcadeNuevaMano(cartas, ctx.ronda.apuesta, false);
  mano.aCiegas = aCiegas;
  ctx.ronda.manos = [mano];
  ctx.ronda.manoActiva = 0;
  ctx.ronda.cartasIniciales = cartas; // lo que la mesa compartida enseña tapado
  ctx.ronda.cartaCero = null;
  if (aCiegas || cartas.length < 2) {
    mano.terminada = true;
    bjArcadeAvanzarMano();
  } else {
    bjArcadeRenderMesa();
  }
}

// --- El Diablo (Presente): tentar al diablo con una 4.ª carta ---

// Pide una 4.ª carta con 3 en mano; la mano queda marcada (`diablo`) y, si acaba
// ganando sin pasarse, cobra ×2 (lo aplica bjArcadeMultJugador). Un bust pierde
// como siempre: el multiplicador solo toca ganancias.
function bjArcadeTentarDiablo(ctx) {
  const carta = bjRobar(bjArcade.mazo);
  if (!carta) {
    bjArcade.mazoAgotado = true;
    ctx.mano.terminada = true;
    bjArcadeAvanzarMano();
    return;
  }
  ctx.mano.cartas.push(carta);
  ctx.mano.diablo = true;
  ctx.ronda.espiando = false; // robar carta gasta la espiada de la Sacerdotisa
  if (bjEsBust(ctx.mano.cartas, bjArcadeMod(ctx.indice))) {
    ctx.mano.terminada = true;
    bjArcadeAvanzarMano();
  } else {
    bjArcadeRenderMesa();
  }
}

// --- El Mago / Los Enamorados: cambiar una carta de la mano ---

// Modo «elige una carta»: el botón lo activa (o lo cancela con un segundo toque) y
// bjArcadeRenderManos pinta las cartas elegibles pulsables; al tocar una se marca
// el uso y se cambia (bjArcadeCambiarCarta). Las entradas del registro con
// `eligeCarta: true` entran por aquí en vez de por `usar`.
function bjArcadeElegirCarta(ctx, entrada) {
  const c = bjArcade;
  c.eligiendo =
    c.eligiendo && c.eligiendo.efecto === entrada.efecto
      ? null
      : { efecto: entrada.efecto, unaVez: entrada.unaVez, indices: bjArcadeIndicesCambiables(ctx) };
  bjArcadeRenderMesa();
}

// ¿Qué cartas de la mano activa pueden cambiarse? Todas menos la tapada de la
// Luna: cambiar a ciegas tu carta oculta delataría lo que era al ver la nueva.
function bjArcadeIndicesCambiables(ctx) {
  const tapada = bjArcadeSegundaTapada(ctx.indice);
  return ctx.mano.cartas
    .map((carta, idx) => idx)
    .filter((idx) => !(tapada && idx === 1));
}

// ¿Puede el jugador de turno cambiar una carta ahora? (condición común del Mago y
// de los Enamorados, además de las suyas propias).
function bjArcadePuedeCambiarCarta(ctx) {
  return (
    !ctx.mano.terminada &&
    !ctx.mano.aCiegas &&
    bjCartasRestantes(ctx.c.mazo) >= 1 &&
    bjArcadeIndicesCambiables(ctx).length > 0
  );
}

// Cambia la carta `idx` de la mano activa por la superior del mazo (la cambiada
// queda fuera del juego). Si el cambio provoca un bust, la mano termina como con
// cualquier carta pedida. La carta a 0 de la Rueda se va si era la cambiada.
function bjArcadeCambiarCarta(ctx, idx) {
  const c = bjArcade;
  const nueva = bjRobar(c.mazo);
  if (!nueva) {
    c.mazoAgotado = true;
    bjArcadeRenderMesa();
    return;
  }
  if (ctx.mano.cartas[idx] === ctx.ronda.cartaCero) ctx.ronda.cartaCero = null;
  ctx.mano.cartas[idx] = nueva;
  // Se reanima desde la carta cambiada (volteo reverso→frente al repintar).
  ctx.mano.mostradas = Math.min(ctx.mano.mostradas || 0, idx);
  if (bjEsBust(ctx.mano.cartas, bjArcadeMod(ctx.indice))) {
    ctx.mano.terminada = true;
    bjArcadeAvanzarMano();
  } else {
    bjArcadeRenderMesa();
  }
}

const BJ_ARCADE_ESPECIALES = [
  // El Loco normal (Presente): una vez por partida, nueva mano inicial.
  {
    efecto: "loco-pr-n",
    etiqueta: "Nueva mano",
    unaVez: "partida",
    disponible: bjArcadeConManoInicial,
    usar: (ctx) => bjArcadeLocoDescartar(ctx, false),
  },
  // El Loco invertido (Presente): una vez por partida, nueva mano… a ciegas.
  {
    efecto: "loco-pr-i",
    etiqueta: "Nueva mano a ciegas",
    unaVez: "partida",
    disponible: bjArcadeConManoInicial,
    usar: (ctx) => bjArcadeLocoDescartar(ctx, true),
  },
  // El Loco normal (Futuro): en la última ronda, todos pueden cambiar de mano
  // (bjTarotAplica ya filtra que sea la última; una vez por ronda y jugador).
  {
    efecto: "loco-fu-n",
    etiqueta: "Nueva mano",
    unaVez: "ronda",
    disponible: bjArcadeConManoInicial,
    usar: (ctx) => bjArcadeLocoDescartar(ctx, false),
  },
  // El Diablo normal (Presente): con 3 cartas, pide una 4.ª; si no te pasas, ×2.
  {
    efecto: "diablo-pr-n",
    etiqueta: "Tentar al diablo",
    unaVez: "partida",
    disponible: (ctx) =>
      ctx.mano.cartas.length === 3 &&
      !ctx.mano.terminada &&
      bjCartasRestantes(ctx.c.mazo) >= 1,
    usar: bjArcadeTentarDiablo,
  },
  // El Carro normal (Presente): apuesta lateral por el líder actual. Si la mano
  // del líder gana la ronda, cobras +3 aunque la tuya pierda (bjArcadeAjustesDeRonda).
  {
    efecto: "carro-pr-n",
    etiqueta: "Apostar por el líder",
    unaVez: "ronda",
    disponible: (ctx) =>
      ctx.c.jugadores.length > 1 && !bjArcadeEsLider(ctx.jugador) && !ctx.mano.terminada,
    usar: (ctx) => {
      // Se apunta QUIÉNES van líderes al apostar (puede haber empate en cabeza):
      // cobras si cualquiera de ellos acaba ganando su mano.
      ctx.ronda.liderApostado = ctx.c.jugadores
        .map((jugador, i) => i)
        .filter((i) => bjArcadeEsLider(ctx.c.jugadores[i]));
      bjArcadeRenderMesa();
    },
  },
  // La Sacerdotisa normal (Pasado): tras ganar sin pedir cartas, espía la carta
  // superior del mazo antes de tu próxima decisión (se apaga al robar).
  {
    efecto: "sacerdotisa-pa-n",
    etiqueta: "Espiar el mazo",
    unaVez: "ronda",
    disponible: (ctx) =>
      ctx.jugador.ganoSinPedir && !ctx.mano.terminada && bjCartasRestantes(ctx.c.mazo) >= 1,
    usar: (ctx) => {
      ctx.ronda.espiando = true;
      bjArcadeRenderMesa();
    },
  },
  // El Mago normal (Presente): una vez por partida, cambia una carta de tu mano.
  {
    efecto: "mago-pr-n",
    etiqueta: "Cambiar una carta",
    unaVez: "partida",
    disponible: bjArcadePuedeCambiarCarta,
    eligeCarta: true,
  },
  // El Mago normal (Pasado): tras un blackjack, cambias una carta la ronda siguiente.
  {
    efecto: "mago-pa-n",
    etiqueta: "Cambiar una carta",
    unaVez: "ronda",
    disponible: (ctx) => ctx.jugador.naturalPrevio && bjArcadePuedeCambiarCarta(ctx),
    eligeCarta: true,
  },
  // Los Enamorados normal (Presente): una vez por partida, cambia una de tus dos
  // cartas iniciales por la superior del mazo.
  {
    efecto: "enamorados-pr-n",
    etiqueta: "Cambiar una carta",
    unaVez: "partida",
    disponible: (ctx) => bjArcadeConManoInicial(ctx) && bjArcadePuedeCambiarCarta(ctx),
    eligeCarta: true,
  },
  // Los Enamorados normal (Pasado): tras perder dos rondas seguidas, descarta una
  // carta inicial de tu mano y roba otra.
  {
    efecto: "enamorados-pa-n",
    etiqueta: "Cambiar una carta",
    unaVez: "ronda",
    disponible: (ctx) =>
      ctx.jugador.perdidasSeguidas >= 2 &&
      bjArcadeConManoInicial(ctx) &&
      bjArcadePuedeCambiarCarta(ctx),
    eligeCarta: true,
  },
  // Los Enamorados normal (Futuro): en la última ronda eliges entre dos manos
  // iniciales. El botón enseña la mano alternativa (campo `cartas`); puedes ir y
  // volver mientras no hayas jugado la mano.
  {
    efecto: "enamorados-fu-n",
    etiqueta: "Jugar la otra mano",
    cartas: (ctx) => ctx.ronda.cartasAlt,
    disponible: (ctx) => !!ctx.ronda.cartasAlt && bjArcadeConManoInicial(ctx),
    usar: (ctx) => {
      const otra = ctx.ronda.cartasAlt;
      ctx.ronda.cartasAlt = ctx.ronda.cartasIniciales;
      ctx.ronda.cartasIniciales = otra;
      ctx.ronda.manos = [bjArcadeNuevaMano(otra, ctx.ronda.apuesta, false)];
      ctx.ronda.manoActiva = 0;
      ctx.ronda.cartaCero = null; // la carta a 0 de la Rueda era de la mano dejada
      bjArcadeRenderMesa();
    },
  },
];

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
//  Valor de las cartas bajo los arcanos (Estrella, Rueda inv., Luna)
// ============================================================
//
// La Estrella y la Rueda invertida cambian cuánto SUMAN las cartas de los
// jugadores. El motor lo soporta con el parámetro `mod` de bjValorMano /
// bjEsBust / bjEsBlackjackNatural (y `opciones.modJugador` de bjResolverMano);
// aquí se construye ese modificador según la tirada. El dealer cuenta SIEMPRE
// con los valores estándar: los arcanos retuercen la suerte de los jugadores.

// Sortea `n` valores de carta distintos (la Rueda invertida los pone a 0).
function bjArcadeSortearValores(n) {
  return barajar(BJ_VALORES).slice(0, n);
}

// Escala de valores del as según la Estrella (de mayor a menor; bjValorMano va
// rebajando por ella mientras la mano se pase). Las posiciones de Pasado dependen
// de cómo acabó la ronda anterior de ESE jugador. Sin Estrella activa, null (el
// motor usa la escala estándar [11, 1]). Solo puede haber una Estrella en la
// tirada, así que las claves no compiten entre sí.
function bjArcadeValoresAs(jugador) {
  if (bjTarotAplica("estrella-pa-n") && jugador.perdidasSeguidas > 0) return [11];
  if (bjTarotAplica("estrella-pa-i") && jugador.ganoPrevio) return [1];
  if (bjTarotAplica("estrella-pr-n")) return [12, 1];
  if (bjTarotAplica("estrella-pr-i")) return [1];
  if (bjTarotAplica("estrella-fu-n")) return [12, 11, 1];
  if (bjTarotAplica("estrella-fu-i")) return [0];
  return null;
}

// Modificador de valor de la mano del jugador `indice` en la ronda en curso, o
// null si ningún arcano toca sus valores (el caso normal: el motor va más ligero).
function bjArcadeMod(indice) {
  const c = bjArcade;
  const jugador = c.jugadores[indice];
  const ronda = c.jugadoresRonda[indice];

  const valoresAs = bjArcadeValoresAs(jugador);
  const cartaCero = ronda ? ronda.cartaCero : null;
  const hayCeros = (c.valoresCero && c.valoresCero.length > 0) || cartaCero;

  // La Muerte normal: pasarse con 22 exacto no pierde (Presente) o cualquier bust
  // cuenta 12 (Futuro, última ronda): el total «resucita» y se sigue jugando. Solo
  // para los jugadores: un dealer que no puede pasarse sería imbatible.
  let transformarTotal = null;
  if (bjTarotAplica("muerte-pr-n")) transformarTotal = (total) => (total === 22 ? 12 : total);
  if (bjTarotAplica("muerte-fu-n")) transformarTotal = (total) => (total > 21 ? 12 : total);

  if (!valoresAs && !hayCeros && !transformarTotal) return null;

  const mod = {};
  if (valoresAs) mod.valoresAs = valoresAs;
  if (hayCeros) {
    mod.valorCero = (carta) =>
      carta === cartaCero || (c.valoresCero && c.valoresCero.indexOf(carta.valor) !== -1);
  }
  if (transformarTotal) mod.transformarTotal = transformarTotal;
  return mod;
}

// Modificador del jugador de turno (atajo para las comprobaciones de su mano).
function bjArcadeModActual() {
  return bjArcadeMod(bjArcadeIndiceActual());
}

// ¿Juega este jugador con su SEGUNDA carta boca abajo? La Luna normal la tapa a
// todos (Presente toda la partida, Futuro solo la última ronda); la invertida en
// Pasado, solo a quien viene de perder. Mientras esté tapada, el jugador no la ve
// ni en su mano ni en el total (y tampoco puede dividir); se revela al resolver.
function bjArcadeSegundaTapada(indice) {
  if (bjTarotAplica("luna-pr-n") || bjTarotAplica("luna-fu-n")) return true;
  if (bjTarotAplica("luna-pa-i") && bjArcade.jugadores[indice].perdidasSeguidas > 0) return true;
  return false;
}

// Texto del total de una mano con la 2.ª carta tapada: suma solo lo visible y deja
// un "+?" (mismo patrón que el total del dealer con su oculta).
function bjArcadeTotalConTapada(cartas, mod) {
  const visibles = cartas.filter((carta, idx) => idx !== 1);
  return bjValorMano(visibles, mod) + "+?";
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
  c.magoDealerCambio = false; // ¿ha cambiado el dealer una carta ESTA ronda? (Mago inv.)
  const opciones = bjTarotOpcionesMotor();

  // La Torre en posición Pasado retoca el límite del dealer SOLO en esta ronda:
  // normal, tras haber arrasado se ablanda a 16; invertida, si alguien ha logrado 21
  // se enfurece y roba hasta 18.
  if (bjTarotAplica("torre-pa-n") && c.dealerBlando) opciones.limiteDealer = 16;
  if (bjTarotAplica("torre-pa-i") && bjArcadeAlguien21()) opciones.limiteDealer = 18;

  const algunaViva = c.jugadoresRonda.some((ronda, i) =>
    ronda.manos.some((mano) => !mano.rendido && !bjEsBust(mano.cartas, bjArcadeMod(i)))
  );
  if (algunaViva) {
    bjJugarDealer(c.manoDealer, c.mazo, opciones);

    // El Mago invertido (Presente): una vez por partida, si la mano final del
    // dealer suma 17 justo, cambia su peor carta (la más baja) por otra del mazo
    // y termina su turno con la mano nueva (puede mejorar… o pasarse).
    if (bjTarotAplica("mago-pr-i") && !c.magoDealerUso && bjValorMano(c.manoDealer) === 17) {
      c.magoDealerUso = true;
      const nueva = bjRobar(c.mazo);
      if (nueva) {
        let peor = 0;
        c.manoDealer.forEach((carta, idx) => {
          if (bjValorCarta(carta.valor) < bjValorCarta(c.manoDealer[peor].valor)) peor = idx;
        });
        c.manoDealer[peor] = nueva;
        c.magoDealerCambio = true;
        bjJugarDealer(c.manoDealer, c.mazo, opciones); // por si el cambio lo deja corto
      }
    }
  }

  c.jugadoresRonda.forEach((ronda, i) => {
    const jugador = c.jugadores[i];
    const puedeNatural = ronda.manos.length === 1; // un 21 tras split no es blackjack
    const mod = bjArcadeMod(i); // la Estrella / la Rueda inv. sobre SUS cartas

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
        Object.assign({ jugadorPuedeNatural: puedeNatural, modJugador: mod }, opciones)
      );
      let pago = bjArcadeAjustarPago(res, mano, puedeNatural, opciones, jugador, mod);
      // El multiplicador solo toca lo que se GANA, nunca las pérdidas ni los empates.
      if (pago > 0) pago *= mult;
      const stake = mano.apuesta * (mano.doblo ? 2 : 1);
      jugador.pila += stake * (1 + pago);
      mano.resultado = res.resultado;
    });
  });

  // Los tragos se cuentan AQUÍ, antes de los ajustes de ronda: muchos arcanos leen
  // el rastro de la ronda ANTERIOR (ganoPrevio, racha, blackjacksPrevios…) y
  // bjArcadeAjustesDeRonda lo pisa con el de esta.
  c.tragos = c.config.fiesta ? bjArcadeContarTragos() : null;

  bjArcadeAjustesDeRonda();
  bjArcadeRenderRonda();
  mostrarPantalla("bj-arcade-ronda");
}

// ¿Ha logrado alguien un 21 esta ronda? (La Torre invertida, en Pasado, lo castiga.)
function bjArcadeAlguien21() {
  return bjArcade.jugadoresRonda.some((ronda, i) =>
    ronda.manos.some((mano) => bjValorMano(mano.cartas, bjArcadeMod(i)) === 21)
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

  // El Loco normal (Pasado): ganar plantándote con tu mano inicial paga ×1,5. Como
  // todo lo de esta función, solo multiplica GANANCIAS: si esa mano pierde, no hace
  // nada (y el display lo enseña como el ×N al que optas mientras no pidas carta).
  if (bjTarotAplica("loco-pa-n") && bjArcadeManoInicialIntacta(ronda)) mult *= 1.5;

  // El Diablo normal (Presente): tentaste al diablo con una 4.ª carta y no te
  // pasaste: tu ganancia cobra ×2 (un bust pierde igual: esto solo toca ganancias).
  if (bjTarotAplica("diablo-pr-n") && ronda.manos.some((mano) => mano.diablo)) mult *= 2;

  // Los arcanos que premian DOBLAR: la Fuerza (×1,1) y el Diablo (×2).
  const doblo = ronda.manos.some((mano) => mano.doblo);
  if (doblo && (bjTarotAplica("fuerza-pa-n") || bjTarotAplica("fuerza-fu-n"))) mult *= 1.1;
  if (doblo && bjTarotAplica("diablo-fu-n")) mult *= 2;
  if (doblo && bjTarotAplica("diablo-pa-n") && jugador.dobloYGano) mult *= 2;

  // La Rueda normal (Pasado): tras ganar una mano, la próxima ganancia lleva el ×1–×3
  // que se le sorteó al cobrarla (bjArcadeAjustesDeRonda lo guarda en multRueda).
  if (bjTarotAplica("rueda-pa-n")) mult *= jugador.multRueda;

  // La Justicia (Pasado): venir de un empate retoca las ganancias de esta ronda,
  // ×1,1 (normal) o ×0,9 (invertida).
  if (bjTarotAplica("justicia-pa-n") && jugador.empatoPrevio) mult *= 1.1;
  if (bjTarotAplica("justicia-pa-i") && jugador.empatoPrevio) mult *= 0.9;

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

// ¿Conserva el jugador su mano inicial tal cual? (2 cartas, sin doblar, dividir ni
// rendirse: lo que premia el Loco normal de Pasado si además esa mano gana.)
function bjArcadeManoInicialIntacta(ronda) {
  return (
    ronda.manos.length === 1 &&
    ronda.manos[0].cartas.length === 2 &&
    !ronda.manos[0].doblo &&
    !ronda.manos[0].rendido
  );
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
function bjArcadeAjustarPago(res, mano, puedeNatural, opciones, jugador, mod) {
  let pagoNatural = opciones.pagoNatural != null ? opciones.pagoNatural : 1.5;
  let pago = res.pago;
  const esNatural = puedeNatural && bjEsBlackjackNatural(mano.cartas, mod);

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
    if (bjTarotAplica("mundo-pr-n") && bjValorMano(mano.cartas, mod) === 21) {
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
    const mod = bjArcadeMod(i);
    const gano = deltas[i] > 0;
    const perdio = deltas[i] < 0;
    const sePaso = ronda.manos.some((mano) => bjEsBust(mano.cartas, mod));
    const doblo = ronda.manos.some((mano) => mano.doblo);
    const natural = ronda.manos.length === 1 && bjEsBlackjackNatural(ronda.manos[0].cartas, mod);
    const veintiuno = ronda.manos.some(
      (mano) => bjValorMano(mano.cartas, mod) === 21 && !bjEsBlackjackNatural(mano.cartas, mod)
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
    // El Carro normal (Presente): apostaste por el líder y su mano ganó: +3 fichas
    // aunque la tuya perdiera. `liderApostado` guarda quiénes iban en cabeza al apostar.
    if (bjTarotAplica("carro-pr-n") && ronda.liderApostado &&
        ronda.liderApostado.some((li) => deltas[li] > 0)) {
      jugador.pila += 3;
    }
    // El Hierofante (Pasado): +3 por ganar sin usar opcionales (normal) o usándolas (invertida).
    if (gano && bjTarotAplica("hierofante-pa-n") && !usoOpcional) jugador.pila += 3;
    if (gano && bjTarotAplica("hierofante-pa-i") && usoOpcional) jugador.pila += 3;
    // La Templanza normal (Pasado): +3 por ganar plantándose con 4 o más cartas.
    if (gano && bjTarotAplica("templanza-pa-n") &&
        ronda.manos.some((mano) => !bjEsBust(mano.cartas, mod) && mano.cartas.length >= 4)) {
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
        ronda.manos.some((mano) => !mano.rendido && !bjEsBust(mano.cartas, mod) && mano.cartas.length === 2)) {
      jugador.recargoMin += BJ_APUESTA_PASO;
    }

    // El Juicio invertido: el multiplicador que ha tenido esta ronda ya no se le va
    // (Presente lo fija para toda la partida; Pasado lo arrastra a la siguiente).
    if (bjTarotAplica("juicio-pr-i") || bjTarotAplica("juicio-pa-i")) {
      jugador.multFijo = Math.max(jugador.multFijo, ronda.mult || 1);
    }

    // --- Rastro para la ronda siguiente ---
    const empato = ronda.manos.some((mano) => mano.resultado === "empate");
    jugador.ganoPrevio = gano;
    jugador.bustPrevio = sePaso;
    jugador.perdidasSeguidas = perdio ? jugador.perdidasSeguidas + 1 : 0;
    jugador.dobloYGano = gano && doblo;
    jugador.ganoACiegas = gano && !c.ocultaEraVisible;
    // La Justicia: Pasado mira si vienes de empatar; Futuro cuenta los empates de
    // toda la partida para el ajuste final (bjArcadeJusticiaFinal).
    jugador.empatoPrevio = empato;
    if (empato) jugador.empates++;
    if (natural) jugador.blackjacksPrevios++;
    // La Sacerdotisa (Pasado): ganar sin pedir cartas da una espiada de mazo.
    jugador.ganoSinPedir = gano && ronda.manos.every((mano) => mano.cartas.length === 2);
    // El Mago (Pasado): un blackjack da un cambio de carta la ronda siguiente.
    jugador.naturalPrevio = natural;
    // El Mundo (Futuro): cuenta de 21 exactos de toda la partida (+15 al final).
    jugador.veintiunos += ronda.manos.filter(
      (mano) => bjValorMano(mano.cartas, mod) === 21 && !bjEsBlackjackNatural(mano.cartas, mod)
    ).length;
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
  c.contadorOculto = c.jugadoresRonda.some((ronda, i) =>
    ronda.manos.some((mano) => bjEsBust(mano.cartas, bjArcadeMod(i)))
  );
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
  bjArcadeMundoFinal(); // antes que la Justicia: su ×1,2 multiplica el total final
  bjArcadeJusticiaFinal();
  if (bjArcade.jugadores.length === 1) {
    bjArcadeFinSolitario();
  } else {
    bjArcadeFinRanking();
  }
  mostrarPantalla("bj-fin");
}

// El Mundo (Futuro): al acabar la partida, cada 21 exacto logrado suma +15 fichas
// (normal) o cada blackjack natural resta 15 (invertida). Como la Justicia final,
// usa bjTarotTiene: es un ajuste de fin de partida aunque el zapato la corte antes.
function bjArcadeMundoFinal() {
  if (bjTarotTiene("mundo-fu-n")) {
    bjArcade.jugadores.forEach((jugador) => {
      jugador.pila += 15 * jugador.veintiunos;
    });
  }
  if (bjTarotTiene("mundo-fu-i")) {
    bjArcade.jugadores.forEach((jugador) => {
      jugador.pila -= 15 * jugador.blackjacksPrevios;
    });
  }
}

// La Justicia (Futuro): al acabar la partida, quien más empates acumule cobra ×1,2
// sobre toda su pila (normal) o pierde 15 fichas (invertida). Si nadie ha empatado
// no dispara; con empate a empates, lo reciben todos los que compartan el máximo.
// Se usa bjTarotTiene (no bjTarotAplica): es un ajuste «al final de la partida»,
// también si el zapato la corta antes de la última ronda prevista.
function bjArcadeJusticiaFinal() {
  const normal = bjTarotTiene("justicia-fu-n");
  const invertida = bjTarotTiene("justicia-fu-i");
  if (!normal && !invertida) return;

  const max = Math.max.apply(null, bjArcade.jugadores.map((j) => j.empates));
  if (max === 0) return;

  bjArcade.jugadores.forEach((jugador) => {
    if (jugador.empates !== max) return;
    // La bonificación solo multiplica pilas positivas: agrandar una deuda no premia.
    if (normal && jugador.pila > 0) jugador.pila = Math.round(jugador.pila * 1.2);
    if (invertida) jugador.pila -= 15;
  });
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
  // El total de la mano activa se refresca al terminar el volteo, no antes (ver
  // bjArcadeRenderManos): esta espera es la que usan bjArcadePedir/Doblar/
  // ActivarMano para saber cuándo avanzar de turno sin adelantar el resultado.
  const esperaMs = bjArcadeRenderManos();
  bjArcadeRenderEspeciales();
  bjArcadeRenderProxima();

  document.getElementById("bj-arcade-btn-pedir").disabled =
    bjArcade.animando ||
    bjValorMano(bjArcadeManoActiva().cartas, bjArcadeModActual()) >= 21 ||
    bjArcadeDebeDoblar();
  document.getElementById("bj-arcade-btn-plantarse").disabled = !bjArcadePuedePlantarse();
  document.getElementById("bj-arcade-btn-doblar").disabled = !bjArcadePuedeDoblar();
  document.getElementById("bj-arcade-btn-dividir").disabled = !bjArcadePuedeDividir();
  document.getElementById("bj-arcade-btn-rendirse").disabled = !bjArcadePuedeRendirse();

  return esperaMs;
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

    // La Luna: su 2.ª carta sigue boca abajo también para el resto de la mesa hasta
    // la resolución (si no, bastaría preguntar a un rival qué carta tienes). Una
    // mano a ciegas del Loco invertido va entera tapada, también para los demás.
    const modJug = bjArcadeMod(idx);
    const tapadaSegunda = bjArcadeSegundaTapada(idx);
    const aCiegas = ronda.manos.some((m) => m.aCiegas);

    if (yaJugo) {
      const total = document.createElement("span");
      if (aCiegas) {
        total.className = "bj-mesa-jug-total";
        total.textContent = "?";
      } else if (tapadaSegunda) {
        total.className = "bj-mesa-jug-total";
        total.textContent = bjArcadeTotalConTapada(mano, modJug);
      } else {
        total.className = "bj-mesa-jug-total" + (bjEsBust(mano, modJug) ? " bj-total-bust" : "");
        total.textContent = bjValorMano(mano, modJug);
      }
      cab.appendChild(total);
    }

    const cartas = document.createElement("div");
    cartas.className = "bj-mesa-jug-cartas";
    mano.forEach((carta, i) => {
      const oculta = !yaJugo || aCiegas || (tapadaSegunda && i === 1);
      const img = bjCrearCartaImg(carta, oculta);
      if (!oculta && modJug && modJug.valorCero && modJug.valorCero(carta)) {
        img.classList.add("bj-carta-cero");
      }
      cartas.appendChild(img);
    });

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

// Pinta los botones de acciones especiales del tarot que el jugador de turno puede
// usar AHORA (ver BJ_ARCADE_ESPECIALES). Cada botón lleva la miniatura de la carta
// del arcano y una etiqueta; el texto completo del efecto va en el title. Se
// repinta con la mesa: los botones aparecen y desaparecen según el estado.
function bjArcadeRenderEspeciales() {
  const cont = document.getElementById("bj-arcade-especiales");
  cont.innerHTML = "";
  // Mientras una carta está girando no hay acciones especiales disponibles: usarlas
  // a medio volteo (cambiar una carta, tentar al Diablo…) rompería la secuencia.
  if (bjArcade.animando) {
    cont.hidden = true;
    return;
  }
  const ctx = bjArcadeCtx();

  BJ_ARCADE_ESPECIALES.forEach((entrada) => {
    if (!bjArcadeEspecialUsable(entrada, ctx)) return;
    const arcano = bjEstado.tarot.find((e) => e.efecto === entrada.efecto);
    const eligiendo = bjArcade.eligiendo && bjArcade.eligiendo.efecto === entrada.efecto;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "bj-btn-especial";
    boton.title = arcano.texto;

    const img = document.createElement("img");
    img.src = bjTarotImagen(arcano);
    img.alt = "";
    boton.appendChild(img);

    // Algunas acciones enseñan cartas dentro del botón (los Enamorados de Futuro:
    // la mano alternativa entre la miniatura del arcano y la etiqueta).
    if (entrada.cartas) {
      entrada.cartas(ctx).forEach((carta) => {
        const mini = bjCrearCartaImg(carta, false);
        boton.appendChild(mini);
      });
    }

    const texto = document.createElement("span");
    texto.textContent = eligiendo ? "Toca la carta a cambiar…" : entrada.etiqueta;
    boton.appendChild(texto);

    boton.addEventListener("click", () => {
      // Se reevalúa al pulsar: el estado puede haber cambiado desde el pintado.
      const ahora = bjArcadeCtx();
      if (!bjArcadeEspecialUsable(entrada, ahora)) return;
      // Modo «elige una carta» (el Mago / los Enamorados): el uso NO se marca
      // aquí sino al completar la selección (bjArcadeRenderManos).
      if (entrada.eligeCarta) {
        bjArcadeElegirCarta(ahora, entrada);
        return;
      }
      bjArcade.eligiendo = null; // otra acción cancela el modo «elige una carta»
      if (entrada.unaVez === "partida") ahora.jugador.arcanosUsados[entrada.efecto] = true;
      if (entrada.unaVez === "ronda") ahora.ronda.arcanosUsados[entrada.efecto] = true;
      bjArcadeApuntarUso(ahora.ronda, entrada.efecto);
      entrada.usar(ahora); // repinta la mesa o avanza el turno, según el efecto
    });

    cont.appendChild(boton);
  });

  cont.hidden = cont.children.length === 0;
}

// La Sacerdotisa: pinta (o esconde) la carta superior del mazo. La ven todos en la
// última ronda (Futuro normal) o quien haya gastado su espiada del Pasado normal
// (`ronda.espiando`, que se apaga al robar la siguiente carta).
function bjArcadeRenderProxima() {
  const c = bjArcade;
  const cont = document.getElementById("bj-arcade-proxima");
  const ronda = bjArcadeRondaActual();
  const carta = c.mazo[c.mazo.length - 1]; // bjRobar saca por el final: esa es la próxima
  const ver = bjTarotAplica("sacerdotisa-fu-n") || (ronda && ronda.espiando);
  if (!ver || !carta) {
    cont.hidden = true;
    return;
  }
  const zona = document.getElementById("bj-arcade-proxima-carta");
  zona.innerHTML = "";
  const img = bjCrearCartaImg(carta, false);
  img.classList.add("bj-sin-entrada");
  zona.appendChild(img);
  cont.hidden = false;
}

// Pinta el total de una mano hasta la carta `hasta` (mano.cartas.length para verla
// entera): compartido por el pintado inmediato y por el diferido tras el volteo, así
// que ambos calculan el total exactamente igual (bjArcadeRenderManos).
function bjArcadePintarTotalMano(el, mano, mod, tapada, hasta) {
  const cartas = mano.cartas.slice(0, hasta);
  if (mano.aCiegas) {
    el.className = "bj-total";
    el.textContent = "?";
  } else if (tapada) {
    el.className = "bj-total";
    el.textContent = bjArcadeTotalConTapada(cartas, mod);
  } else {
    el.className = "bj-total" + (bjEsBust(cartas, mod) ? " bj-total-bust" : "");
    el.textContent = bjValorMano(cartas, mod);
  }
}

// Pinta la(s) mano(s) del jugador de turno (una, o dos al dividir). La Luna tapa la
// 2.ª carta (se pinta el reverso y el total lleva "+?"); las cartas que cuentan 0
// (la Rueda invertida) se atenúan con .bj-carta-cero para que se vean de un vistazo.
// El total de cada mano se congela en el valor que tenía ANTES de la carta que
// acaba de entrar mientras esa carta gira, y salta al valor real cuando termina de
// revelarse (bjTrasAnimacion): así nunca delata un bust antes de verlo. Devuelve
// los ms que faltan para que la última carta revelada termine su volteo (0 si
// ninguna mano ha animado nada), que es lo que esperan bjArcadePedir/Doblar/
// ActivarMano antes de avanzar de turno.
function bjArcadeRenderManos() {
  const ronda = bjArcadeRondaActual();
  const cont = document.getElementById("bj-arcade-manos");
  cont.innerHTML = "";
  const split = ronda.manos.length > 1;
  const mod = bjArcadeModActual();
  // Con la 2.ª tapada no hay split posible, así que la carta oculta es siempre la
  // cartas[1] de la única mano.
  const tapada = bjArcadeSegundaTapada(bjArcadeIndiceActual());
  let esperaTotalMs = 0;

  ronda.manos.forEach((mano, indice) => {
    const bloque = document.createElement("div");
    bloque.className = "bj-mano";
    if (split) bloque.classList.add("bj-mano-multi");
    if (split && indice === ronda.manoActiva) bloque.classList.add("activa");

    const cartas = document.createElement("div");
    cartas.className = "bj-cartas";
    // Cuántas cartas se veían YA antes de este repintado: si la nueva se anima con
    // volteo, el total se queda en este número hasta que termine de revelarse.
    const cartasYaVisibles = mano.mostradas || 0;
    // Reparto inicial con entrada simple; cada carta pedida/doblada después, con
    // volteo reverso→frente (bjPintarCartasMano lleva la cuenta en mano.mostradas).
    // Una mano a ciegas (el Loco invertido) va entera boca abajo; con la Luna solo
    // se tapa la 2.ª carta.
    const ocultas = mano.aCiegas ? () => true : tapada ? (idx) => idx === 1 : null;
    const esperaMs = bjPintarCartasMano(cartas, mano, ocultas);
    if (mod && mod.valorCero && !mano.aCiegas) {
      Array.from(cartas.children).forEach((img, idx) => {
        // La tapada no se señala aunque cuente 0: delataría qué carta es.
        if (!(tapada && idx === 1) && mod.valorCero(mano.cartas[idx])) {
          img.classList.add("bj-carta-cero");
        }
      });
    }

    // Modo «elige una carta» (el Mago / los Enamorados): las cartas elegibles de la
    // mano ACTIVA se vuelven pulsables; al tocar una se gasta el uso y se cambia.
    const eligiendo = bjArcade.eligiendo;
    if (eligiendo && indice === ronda.manoActiva) {
      Array.from(cartas.children).forEach((img, idx) => {
        if (eligiendo.indices.indexOf(idx) === -1) return;
        img.classList.add("bj-carta-elegible");
        img.addEventListener("click", () => {
          const ctx = bjArcadeCtx();
          bjArcade.eligiendo = null;
          if (eligiendo.unaVez === "partida") ctx.jugador.arcanosUsados[eligiendo.efecto] = true;
          if (eligiendo.unaVez === "ronda") ctx.ronda.arcanosUsados[eligiendo.efecto] = true;
          bjArcadeApuntarUso(ctx.ronda, eligiendo.efecto);
          bjArcadeCambiarCarta(ctx, idx);
        });
      });
    }
    bloque.appendChild(cartas);

    const info = document.createElement("div");
    info.className = "bj-mano-info";
    const total = document.createElement("span");
    const hastaInicial = esperaMs > 0 ? cartasYaVisibles : mano.cartas.length;
    bjArcadePintarTotalMano(total, mano, mod, tapada, hastaInicial);
    info.appendChild(total);
    if (esperaMs > 0) {
      esperaTotalMs = Math.max(esperaTotalMs, esperaMs);
      bjTrasAnimacion(esperaMs, () => bjArcadePintarTotalMano(total, mano, mod, tapada, mano.cartas.length));
    }
    if (split) {
      const apuesta = document.createElement("span");
      apuesta.className = "bj-mano-apuesta";
      apuesta.textContent = "🪙" + bjFormatearFichas(mano.apuesta * (mano.doblo ? 2 : 1));
      info.appendChild(apuesta);
    }
    bloque.appendChild(info);
    cont.appendChild(bloque);
  });

  return esperaTotalMs;
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
    trozos.push(bjArcadeResumenManos(ronda.manos, bjArcadeMod(i)));
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

// ============================================================
//  Modo fiesta 🍻: contabilidad de tragos de la ronda
// ============================================================
//
// Al cerrar la ronda se cuenta, POR JUGADOR, cuántos tragos bebe y cuántos reparte.
// El saldo sale de dos fuentes:
//   1. Las reglas base de la mesa (blackjack, bust, deuda…), siempre activas.
//   2. Los arcanos de la tirada que llevan línea `fiesta` (data/blackjack/tarot.js)
//      Y que han disparado DE VERDAD esta ronda: cada uno tiene su detector en
//      BJ_ARCADE_TRAGOS, que mira los hechos de la ronda. Un arcano que no ha
//      disparado no aparece.
//
// Se calcula en bjArcadeResolverRonda ANTES de bjArcadeAjustesDeRonda, porque
// muchos detectores leen el rastro de la ronda anterior (ganoPrevio, racha,
// blackjacksPrevios…) que los ajustes están a punto de pisar.

// ¿«Resucitó» alguna mano? (la Muerte normal: un bust que el mod convierte en ≤21).
// Se compara el total con y sin el transformarTotal del mod.
function bjArcadeResucito(ronda, mod) {
  if (!mod || !mod.transformarTotal) return false;
  const crudo = Object.assign({}, mod);
  delete crudo.transformarTotal;
  return ronda.manos.some(
    (mano) => bjValorMano(mano.cartas, crudo) > 21 && bjValorMano(mano.cartas, mod) <= 21
  );
}

// ¿Contó algún as por su valor más alto? (la Estrella: el as a 12). Se fuerza el as
// a ese valor y se compara: si el total no cambia, es que el as no se rebajó.
function bjArcadeUsoAsAlto(ronda, mod, valor) {
  if (!mod || !mod.valoresAs || mod.valoresAs[0] !== valor) return false;
  const alto = Object.assign({}, mod, { valoresAs: [valor] });
  return ronda.manos.some(
    (mano) =>
      mano.cartas.some((carta) => carta.valor === "A") &&
      !bjEsBust(mano.cartas, mod) &&
      bjValorMano(mano.cartas, mod) === bjValorMano(mano.cartas, alto)
  );
}

// Hechos de la ronda que consultan los detectores. `mesa` son los de la mesa entera
// y `jugadores[i]` los de cada jugador. Los campos que empiezan por «previo»/«racha»
// son el rastro de la ronda ANTERIOR (aún sin pisar).
function bjArcadeHechosRonda() {
  const c = bjArcade;
  const totalDealer = bjValorMano(c.manoDealer);
  const deltas = c.jugadores.map((jugador, i) => jugador.pila - c.jugadoresRonda[i].pilaInicio);

  const mesa = {
    deltas,
    dealerNatural: bjEsBlackjackNatural(c.manoDealer),
    dealerSePaso: totalDealer > 21,
    totalDealer,
    dealerArraso: deltas.every((delta) => delta < 0),
    todosGanaron: deltas.every((delta) => delta > 0),
    multRonda: c.multRonda,
    magoDealerCambio: !!c.magoDealerCambio,
    // El Carro invertido (Presente): la mínima sube si alguien encadena 2 victorias.
    // La racha aún no se ha incrementado, así que se mira la de antes + la de ahora.
    subeLaMinima: c.jugadores.some((jugador, i) => deltas[i] > 0 && jugador.racha >= 1),
  };

  // Máximo de empates de la partida (la Justicia de Futuro premia/castiga a quien
  // más lleve). El empate de ESTA ronda aún no está contado en jugador.empates.
  const empatesTotales = c.jugadores.map((jugador, i) =>
    jugador.empates + (c.jugadoresRonda[i].manos.some((mano) => mano.resultado === "empate") ? 1 : 0)
  );
  const maxEmpates = Math.max.apply(null, empatesTotales);

  mesa.jugadores = c.jugadores.map((jugador, i) => {
    const ronda = c.jugadoresRonda[i];
    const mod = bjArcadeMod(i);
    const manos = ronda.manos;
    const natural = manos.length === 1 && bjEsBlackjackNatural(manos[0].cartas, mod);

    return {
      indice: i,
      jugador,
      ronda,
      mod,
      nombre: jugador.nombre,
      gano: deltas[i] > 0,
      perdio: deltas[i] < 0,
      sePaso: manos.some((mano) => bjEsBust(mano.cartas, mod)),
      doblo: manos.some((mano) => mano.doblo),
      dividio: manos.length > 1,
      seRindio: manos.some((mano) => mano.rendido),
      // «Usó regla opcional» = dividió, dobló o se rindió (lo mira el Hierofante).
      usoOpcional: manos.length > 1 || manos.some((mano) => mano.doblo || mano.rendido),
      natural,
      naturalGanador: natural && manos[0].resultado === "jugador",
      veintiunos: manos.filter(
        (mano) => bjValorMano(mano.cartas, mod) === 21 && !bjEsBlackjackNatural(mano.cartas, mod)
      ).length,
      resucito: bjArcadeResucito(ronda, mod),
      tieneAs: manos.some((mano) => mano.cartas.some((carta) => carta.valor === "A")),
      asA12: bjArcadeUsoAsAlto(ronda, mod, 12),
      // Empate NUMÉRICO: tu total igualó al del dealer. Quién se lo lleva depende de
      // la Justicia (Presente), así que el hecho se guarda aparte del resultado.
      empatoEnNumeros: manos.some(
        (mano) =>
          !mano.rendido &&
          !bjEsBust(mano.cartas, mod) &&
          !mesa.dealerSePaso &&
          bjValorMano(mano.cartas, mod) === totalDealer
      ),
      cartaCero: !!ronda.cartaCero || (c.valoresCero.length > 0 &&
        manos.some((mano) => mano.cartas.some((carta) => c.valoresCero.indexOf(carta.valor) !== -1))),
      mult: ronda.mult || 1,
      usos: ronda.usos,
      // Puesto ANTES de la ronda (por pilaInicio: la apuesta ya descontada
      // castigaría a quien apostó fuerte).
      liderInicio: bjArcadePuestoInicio(i, true),
      ultimoInicio: bjArcadePuestoInicio(i, false),
      lider: bjArcadeEsLider(jugador),
      primeroEnOrden: c.orden[0] === i,
      apuesta: ronda.apuesta,
      pilaInicio: ronda.pilaInicio,
      maxEmpates: empatesTotales[i] === maxEmpates && maxEmpates > 0,
      cobroPorElLider:
        !!ronda.liderApostado && ronda.liderApostado.some((li) => deltas[li] > 0),
    };
  });

  return mesa;
}

// Detector de cada arcano con línea `fiesta`: dado el jugador (p) y la mesa (m),
// devuelve { bebe } / { reparte } si el efecto le ha tocado ESTA ronda, o nada.
// Las claves "-fu-" solo se consultan en la última ronda (bjTarotAplica lo filtra).
const BJ_ARCADE_TRAGOS = {
  // --- El Loco ---
  "loco-pa-n": (p) => p.gano && bjArcadeManoInicialIntacta(p.ronda) && { reparte: 1 },
  "loco-pa-i": (p) => p.sePaso && { bebe: 1 },
  "loco-pr-n": (p) => p.usos["loco-pr-n"] && { bebe: 1 },
  "loco-pr-i": (p) => p.usos["loco-pr-i"] && { bebe: 2 },
  "loco-fu-n": (p) => p.usos["loco-fu-n"] && { bebe: 1 },
  "loco-fu-i": () => ({ bebe: 1 }), // en la última ronda le toca a todo el mundo

  // --- El Mago ---
  "mago-pa-n": (p) => p.usos["mago-pa-n"] && { bebe: 1 },
  "mago-pa-i": (p, m) => m.dealerNatural && { bebe: 1 },
  "mago-pr-n": (p) => p.usos["mago-pr-n"] && { bebe: 1 },
  "mago-pr-i": (p, m) => m.magoDealerCambio && { bebe: 1 },
  "mago-fu-n": (p) => !p.doblo && !p.natural && { bebe: 2 },

  // --- La Sacerdotisa ---
  "sacerdotisa-pa-n": (p) => p.usos["sacerdotisa-pa-n"] && { bebe: 1 },
  "sacerdotisa-pa-i": (p) => p.sePaso && { bebe: 1 },
  "sacerdotisa-fu-n": () => ({ bebe: 1 }),
  "sacerdotisa-fu-i": () => ({ bebe: 1 }),

  // --- La Emperatriz ---
  "emperatriz-pa-n": (p) => p.naturalGanador && p.jugador.blackjacksPrevios > 0 && { reparte: 2 },
  "emperatriz-pa-i": (p) => p.sePaso && { bebe: 1 },
  "emperatriz-pr-i": (p) => p.apuesta === 10 && { bebe: 1 }, // apuesta topada
  "emperatriz-fu-i": (p) => p.natural && { bebe: 2 },

  // --- El Emperador ---
  "emperador-pa-n": (p) => p.lider && { reparte: 1 },
  "emperador-pa-i": (p) => p.ultimoInicio && p.gano && { reparte: 2 },
  "emperador-pr-i": (p) => p.ultimoInicio && p.doblo && { bebe: 1 },
  "emperador-fu-n": (p) => p.liderInicio && p.gano && { reparte: 2 },
  "emperador-fu-i": (p) => p.ultimoInicio && p.gano && { reparte: 2 },

  // --- El Hierofante ---
  "hierofante-pa-n": (p) => p.gano && !p.usoOpcional && { reparte: 1 },
  "hierofante-pa-i": (p) => p.gano && p.usoOpcional && { reparte: 1 },
  "hierofante-pr-i": (p) => p.usoOpcional && { bebe: 1 },
  "hierofante-fu-i": (p) => p.usoOpcional && { bebe: 1 },

  // --- Los Enamorados ---
  "enamorados-pa-n": (p) => p.usos["enamorados-pa-n"] && { bebe: 1 },
  "enamorados-pa-i": (p) => p.jugador.racha >= 2 && { bebe: 1 }, // le tocó doblar apuesta
  "enamorados-pr-n": (p) => p.usos["enamorados-pr-n"] && { bebe: 1 },
  "enamorados-pr-i": () => ({ bebe: 1 }), // a todos les cambian una carta a ciegas
  "enamorados-fu-n": (p) => p.usos["enamorados-fu-n"] && { bebe: 1 },
  "enamorados-fu-i": () => ({ bebe: 1 }),

  // --- El Carro ---
  "carro-pa-n": (p) => p.gano && p.jugador.racha >= 1 && { reparte: 1 }, // racha de 2+
  "carro-pa-i": (p) => p.jugador.ganoPrevio && { bebe: 1 },              // le subió la mínima
  "carro-pr-n": (p) => p.cobroPorElLider && { reparte: 1 },
  "carro-pr-i": (p, m) => m.subeLaMinima && { bebe: 1 },
  "carro-fu-n": (p) => p.jugador.racha >= 1 && { reparte: 2 },
  "carro-fu-i": (p) => bjArcadeLideraVictorias(p.jugador) && { reparte: 2 },

  // --- La Fuerza ---
  "fuerza-pa-n": (p) => p.doblo && p.gano && { reparte: 1 },
  "fuerza-pa-i": (p) => p.doblo && p.perdio && { bebe: 2 },
  "fuerza-pr-n": (p) =>
    p.ronda.manos.some((mano) => mano.doblo && mano.cartas.length >= 4) && { bebe: 1 },
  "fuerza-fu-n": (p) => p.doblo && p.perdio && { bebe: 2 },

  // --- El Ermitaño ---
  "ermitano-pa-n": (p) => p.ultimoInicio && { bebe: 1 },   // el último ve la oculta
  "ermitano-pa-i": (p) => p.primeroEnOrden && { bebe: 1 }, // el primero juega a ciegas
  "ermitano-pr-n": () => ({ bebe: 1 }),
  "ermitano-pr-i": () => ({ bebe: 1 }),
  "ermitano-fu-n": () => ({ bebe: 1 }),
  "ermitano-fu-i": () => ({ bebe: 1 }),

  // --- La Rueda de la Fortuna ---
  "rueda-pa-n": (p) => p.gano && p.jugador.multRueda > 1 && { reparte: 1 },
  "rueda-pa-i": (p) => p.cartaCero && { bebe: 1 },
  "rueda-pr-n": (p, m) => p.gano && m.multRonda >= 2 && { reparte: 1 },
  "rueda-pr-i": (p) => p.cartaCero && { bebe: 1 },
  "rueda-fu-n": (p, m) => p.gano && m.multRonda >= 3 && { reparte: 2 },
  "rueda-fu-i": (p) => p.cartaCero && { bebe: 1 },

  // --- La Justicia ---
  "justicia-pa-n": (p) => p.gano && p.jugador.empatoPrevio && { reparte: 1 },
  "justicia-pa-i": (p) => p.gano && p.jugador.empatoPrevio && { bebe: 1 },
  "justicia-pr-n": (p) => p.empatoEnNumeros && { reparte: 1 }, // el empate te lo llevas tú
  "justicia-pr-i": (p) => p.empatoEnNumeros && { bebe: 1 },    // …o se lo lleva el dealer
  "justicia-fu-n": (p) => p.maxEmpates && { reparte: 2 },
  "justicia-fu-i": (p) => p.maxEmpates && { bebe: 2 },

  // --- El Colgado ---
  "colgado-pa-n": (p) => p.perdio && { bebe: 1 }, // recuperas el 10 % de lo perdido
  "colgado-pa-i": (p) => p.jugador.ganoPrevio && { bebe: 1 }, // no podías rendirte
  "colgado-pr-n": (p) =>
    p.ronda.manos.some((mano) => mano.rendido && mano.cartas.length > 2) && { bebe: 1 },
  "colgado-fu-n": (p) =>
    p.ronda.manos.some((mano) => mano.rendido && mano.cartas.length > 2) && { bebe: 1 },

  // --- La Muerte ---
  "muerte-pa-n": (p) => p.sePaso && { bebe: 1 },
  "muerte-pa-i": (p) => p.sePaso && { bebe: 1 },
  "muerte-pr-n": (p) => p.resucito && { reparte: 2 },
  "muerte-pr-i": (p) => p.sePaso && { bebe: 1 },
  "muerte-fu-n": (p) => p.resucito && { reparte: 1 },
  "muerte-fu-i": (p) => p.sePaso && { bebe: 2 },

  // --- La Templanza ---
  "templanza-pa-n": (p) =>
    p.gano &&
    p.ronda.manos.some((mano) => !bjEsBust(mano.cartas, p.mod) && mano.cartas.length >= 4) && {
      reparte: 1,
    },
  "templanza-pa-i": (p) =>
    p.ronda.manos.some(
      (mano) => !mano.rendido && !bjEsBust(mano.cartas, p.mod) && mano.cartas.length === 2
    ) && { bebe: 1 },
  "templanza-pr-n": (p) =>
    p.ronda.manos.some(
      (mano) => mano.resultado === "jugador" && mano.cartas.length >= 5
    ) && { reparte: 2 },
  "templanza-pr-i": (p) => p.sePaso && { bebe: 1 },
  "templanza-fu-n": (p) =>
    p.ronda.manos.some(
      (mano) => mano.resultado === "jugador" && mano.cartas.length >= 4
    ) && { reparte: 2 },
  "templanza-fu-i": (p) => p.sePaso && { bebe: 1 },

  // --- El Diablo ---
  "diablo-pa-n": (p) => p.doblo && p.gano && p.jugador.dobloYGano && { reparte: 1 },
  "diablo-pa-i": (p) => p.perdio && { bebe: 1 },
  "diablo-pr-n": (p) => p.ronda.manos.some((mano) => mano.diablo) && { reparte: 2 },
  "diablo-pr-i": (p) => p.perdio && { bebe: 1 },
  "diablo-fu-n": (p) => p.doblo && { reparte: 1 },
  "diablo-fu-i": (p) => p.perdio && { bebe: 2 },

  // --- La Torre ---
  "torre-pa-n": (p, m) => m.dealerArraso && { bebe: 1 },
  "torre-pa-i": (p) => p.veintiunos > 0 && { bebe: 1 }, // tu 21 enfureció al dealer
  "torre-pr-n": (p) => p.gano && { reparte: 1 },
  "torre-pr-i": (p) => p.perdio && !p.sePaso && { bebe: 1 }, // caíste ante el dealer
  "torre-fu-n": (p) => p.gano && { reparte: 1 },
  "torre-fu-i": (p) => p.perdio && !p.sePaso && { bebe: 1 },

  // --- La Estrella ---
  "estrella-pa-n": (p) => p.jugador.perdidasSeguidas > 0 && p.tieneAs && { reparte: 1 },
  "estrella-pa-i": (p) => p.jugador.ganoPrevio && p.tieneAs && { bebe: 1 },
  "estrella-pr-n": (p) => p.asA12 && { reparte: 1 },
  "estrella-pr-i": (p) => p.tieneAs && { bebe: 1 },
  "estrella-fu-n": (p) => p.asA12 && { reparte: 1 },
  "estrella-fu-i": (p) => p.tieneAs && { bebe: 2 },

  // --- La Luna ---
  "luna-pa-n": (p) => p.gano && p.jugador.ganoACiegas && { reparte: 1 },
  "luna-pa-i": (p) => p.jugador.perdidasSeguidas > 0 && { bebe: 1 }, // jugaste a ciegas
  "luna-pr-n": (p) => p.gano && { reparte: 2 },
  "luna-pr-i": () => ({ bebe: 1 }),
  "luna-fu-n": (p) => p.gano && { reparte: 2 },
  "luna-fu-i": () => ({ bebe: 1 }),

  // --- El Sol ---
  "sol-pa-n": (p, m) => m.todosGanaron && { reparte: 1 },
  "sol-pa-i": (p, m) => m.dealerArraso && { bebe: 1 },
  "sol-pr-i": (p, m) => m.dealerNatural && { bebe: 1 },
  "sol-fu-i": (p, m) => m.dealerArraso && { bebe: 2 },

  // --- El Juicio ---
  "juicio-pa-n": (p) => p.usos["juicio-pa-n"] && { reparte: 1 },
  "juicio-pa-i": (p) => p.mult > 1 && { reparte: 1 },
  "juicio-pr-n": (p) => p.usos["juicio-pr-n"] && { bebe: 1 },
  "juicio-pr-i": (p) => p.mult > 1 && { reparte: 1 },
  "juicio-fu-n": (p) => p.gano && { reparte: 2 },
  "juicio-fu-i": (p) => p.pilaInicio > 0 && p.apuesta >= Math.ceil(p.pilaInicio / 2) && { bebe: 1 },

  // --- El Mundo ---
  "mundo-pa-n": (p) => p.veintiunos > 0 && { reparte: p.veintiunos },
  "mundo-pa-i": (p) => p.natural && { bebe: 1 },
  "mundo-pr-n": (p) => p.veintiunos > 0 && { reparte: 2 * p.veintiunos },
  "mundo-pr-i": (p) => p.natural && { reparte: 1 },
  "mundo-fu-n": (p) => p.veintiunos > 0 && { reparte: p.veintiunos },
  "mundo-fu-i": (p) => p.natural && { bebe: 1 },
};

// Reglas base del modo fiesta (§7): las que no dependen del tarot. Devuelve los
// apuntes de tragos de un jugador.
function bjArcadeApuntesBase(p, m) {
  const apuntes = [];
  if (p.naturalGanador) apuntes.push({ texto: "Blackjack natural.", reparte: 3 });
  if (p.sePaso) apuntes.push({ texto: "Se pasó.", bebe: 1 });
  if (m.dealerNatural && p.perdio) {
    apuntes.push({ texto: "Cayó ante el blackjack del dealer.", bebe: 1 });
  }
  if (m.hayUltimo && p.jugador.pila === m.minPila) {
    apuntes.push({ texto: "Cierra el ranking.", bebe: 1 });
  }
  if (p.jugador.pila < 0) apuntes.push({ texto: "Está en deuda.", bebe: 1 });
  return apuntes;
}

// Apuntes de tragos que le meten al jugador los arcanos de la tirada: solo los que
// llevan línea `fiesta`, aplican ahora y cuyo detector dice que han disparado.
function bjArcadeApuntesTarot(p, m) {
  const apuntes = [];
  bjEstado.tarot.forEach((arcano) => {
    if (!arcano.fiesta || !bjTarotAplica(arcano.efecto)) return;
    const detector = BJ_ARCADE_TRAGOS[arcano.efecto];
    if (!detector) return;
    const saldo = detector(p, m);
    if (!saldo) return;
    apuntes.push({
      texto: arcano.fiesta,
      arcano: arcano.nombre + (arcano.invertida ? " (invertida)" : ""),
      bebe: saldo.bebe,
      reparte: saldo.reparte,
    });
  });
  return apuntes;
}

// Contabilidad completa de la ronda: por cada jugador con algún trago, su saldo
// (bebe / reparte) y el desglose de por qué. Los jugadores que se salvan no salen.
function bjArcadeContarTragos() {
  const m = bjArcadeHechosRonda();

  // «Último del ranking» (regla base): solo con 2+ jugadores y si no van todos
  // igualados (si no, serían todos los últimos a la vez y beberían todos).
  const pilas = bjArcade.jugadores.map((jugador) => jugador.pila);
  m.minPila = Math.min.apply(null, pilas);
  m.hayUltimo = bjArcade.jugadores.length > 1 && m.minPila !== Math.max.apply(null, pilas);

  return m.jugadores
    .map((p) => {
      const apuntes = bjArcadeApuntesBase(p, m).concat(bjArcadeApuntesTarot(p, m));
      return {
        nombre: p.nombre,
        apuntes,
        bebe: apuntes.reduce((suma, apunte) => suma + (apunte.bebe || 0), 0),
        reparte: apuntes.reduce((suma, apunte) => suma + (apunte.reparte || 0), 0),
      };
    })
    .filter((saldo) => saldo.apuntes.length > 0);
}

// Pinta la contabilidad de tragos bajo la resolución de la ronda (solo con el modo
// fiesta activo): una ficha por jugador con su saldo y el desglose de cada apunte.
function bjArcadeRenderFiesta() {
  const seccion = document.getElementById("bj-ronda-fiesta");
  const tragos = bjArcade.tragos;
  if (!bjArcade.config.fiesta) {
    seccion.hidden = true;
    return;
  }

  const lista = document.getElementById("bj-ronda-fiesta-lista");
  lista.innerHTML = "";

  if (!tragos || !tragos.length) {
    const vacio = document.createElement("li");
    vacio.className = "bj-fiesta-vacio";
    vacio.textContent = "Esta ronda se salva todo el mundo… por ahora.";
    lista.appendChild(vacio);
  } else {
    tragos.forEach((saldo) => lista.appendChild(bjArcadeCrearFichaTragos(saldo)));
  }

  seccion.hidden = false;
}

// Ficha de tragos de un jugador: cabecera con el saldo (bebe / reparte) y la lista
// de apuntes que lo justifican (los del tarot llevan el nombre del arcano).
function bjArcadeCrearFichaTragos(saldo) {
  const item = document.createElement("li");
  item.className = "bj-fiesta-jugador";

  const cabecera = document.createElement("div");
  cabecera.className = "bj-fiesta-cabecera";

  const nombre = document.createElement("span");
  nombre.className = "bj-fiesta-nombre";
  nombre.textContent = saldo.nombre;
  cabecera.appendChild(nombre);

  const marcador = document.createElement("span");
  marcador.className = "bj-fiesta-saldo";
  if (saldo.bebe) marcador.appendChild(bjArcadeCrearSaldo(`🍺 bebe ${saldo.bebe}`, "bj-fiesta-bebe"));
  if (saldo.reparte) {
    marcador.appendChild(bjArcadeCrearSaldo(`🥂 reparte ${saldo.reparte}`, "bj-fiesta-reparte"));
  }
  cabecera.appendChild(marcador);
  item.appendChild(cabecera);

  const motivos = document.createElement("ul");
  motivos.className = "bj-fiesta-motivos";
  saldo.apuntes.forEach((apunte) => {
    const motivo = document.createElement("li");
    motivo.className = apunte.arcano ? "bj-fiesta-motivo bj-fiesta-arcano" : "bj-fiesta-motivo";
    motivo.textContent = apunte.arcano ? `🔮 ${apunte.arcano}: ${apunte.texto}` : apunte.texto;
    motivos.appendChild(motivo);
  });
  item.appendChild(motivos);

  return item;
}

function bjArcadeCrearSaldo(texto, clase) {
  const span = document.createElement("span");
  span.className = clase;
  span.textContent = texto;
  return span;
}

// Resumen textual de las manos de un jugador: "18✓ · 22✗" (total + símbolo).
// `mod`: el modificador de valor de ese jugador (Estrella / Rueda invertida), para
// que el total mostrado sea el mismo con el que se resolvió la mano.
function bjArcadeResumenManos(manos, mod) {
  const simbolos = { jugador: "✓", dealer: "✗", empate: "=", rendido: "🏳️" };
  return manos
    .map((mano) => bjValorMano(mano.cartas, mod) + (simbolos[mano.resultado] || ""))
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

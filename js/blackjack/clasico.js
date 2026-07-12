// 21 Arcanos — Modo Clásico: tú contra la banca, con banca de fichas persistente.
//
// Usa el motor puro (js/blackjack/motor.js) para toda la lógica de cartas y el
// ruleset (bjEstado.ruleset, en main.js) para las reglas opcionales. Aquí vive el
// FLUJO de una mano (apostar → repartir → seguro → jugar → resolver → siguiente),
// el pintado de la mesa y la persistencia de banca, récord y estadísticas.
//
// El jugador puede tener MÁS DE UNA MANO a la vez (split, Fase 5): por eso las
// cartas del jugador viven en `bjClasico.manos` (un array de manos), y las
// acciones del turno actúan sobre la mano activa (`bjClasico.manoActiva`). Sin
// dividir, `manos` tiene un único elemento y todo se comporta como antes.
//
// El Clásico no tiene tarot (plan §4): las llamadas al motor van sin hooks de
// tarot, así que es blackjack de casino estándar (natural 3:2, empates push).

// Parámetros del modo (plan §1/§4).
const BJ_BANCA_INICIAL = 100;   // fichas al empezar y al reiniciar tras banca rota
const BJ_APUESTA_MIN = 5;       // apuesta mínima
const BJ_APUESTA_PASO = 5;      // salto del stepper de apuesta
const BJ_REBARAJAR_UMBRAL = 15; // si quedan menos cartas, se rebaraja antes de repartir
const BJ_CLASICO_CLAVE = "blackjack_clasico"; // banca + récord + stats en localStorage

// Estado del Clásico. Los tres primeros campos son PERSISTENTES (se guardan); el
// resto es transitorio: se reinicia en cada mano.
const bjClasico = {
  // --- Persistente ---
  banca: BJ_BANCA_INICIAL,
  bancaMax: BJ_BANCA_INICIAL,
  stats: { manos: 0, victorias: 0, rachaActual: 0, mejorRacha: 0 },
  // --- Transitorio (una mano repartida) ---
  apuesta: BJ_APUESTA_MIN,
  mazo: [],              // el mazo de 52 vivo durante la sesión (se rebaraja al agotarse)
  manos: [],             // manos del jugador: [{ cartas, apuesta, doblo, deAses, terminada, resultado }]
  manoActiva: 0,         // índice de la mano que se está jugando ahora
  manoDealer: [],
  seguro: 0,             // fichas puestas al seguro esta mano (0 si no se contrató)
  dealerOculta: true,    // ¿la 2.ª carta del dealer está boca abajo?
  fase: "apostando",     // "apostando" | "seguro" | "jugando" | "resuelto"
  bancaInicioMano: BJ_BANCA_INICIAL, // banca antes de apostar (para el "+X / −X")
  repartiendo: false,    // true durante la pausa de "rebarajando" (evita repartir 2 veces)
};

// ============================================================
//  Entrada y wiring
// ============================================================

// Entra al Clásico desde el menú: carga los datos guardados, asegura un mazo y
// deja la mesa lista para apostar. Si no llega ni a la apuesta mínima, banca rota.
function bjEntrarClasico() {
  bjEstado.modo = "clasico";
  bjClasicoCargar();
  if (bjClasico.mazo.length === 0) bjClasico.mazo = bjConstruirMazo(1);
  bjOlvidarDealerAnimado("clasico"); // repartir desde cero, sin comparar con una sesión anterior
  bjNuevaManoEstado();
  mostrarPantalla("bj-clasico");
  if (bjClasico.banca < BJ_APUESTA_MIN) bjMostrarBancaRota();
}

// Engancha todos los botones de la mesa. Se llama una vez al cargar la página.
function bjClasicoConectar() {
  // Stepper de apuesta.
  const stepper = document.querySelector('[data-stepper="bj-apuesta"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => bjCambiarApuesta(Number(boton.dataset.paso)));
  });

  // Acciones de cada fase.
  document.getElementById("bj-btn-repartir").addEventListener("click", bjRepartir);
  document.getElementById("bj-btn-seguro-si").addEventListener("click", () => bjResponderSeguro(true));
  document.getElementById("bj-btn-seguro-no").addEventListener("click", () => bjResponderSeguro(false));
  document.getElementById("bj-btn-pedir").addEventListener("click", bjPedir);
  document.getElementById("bj-btn-plantarse").addEventListener("click", bjPlantarse);
  document.getElementById("bj-btn-doblar").addEventListener("click", bjDoblar);
  document.getElementById("bj-btn-dividir").addEventListener("click", bjDividir);
  document.getElementById("bj-btn-rendirse").addEventListener("click", bjRendirse);
  document.getElementById("bj-btn-siguiente-mano").addEventListener("click", bjSiguienteMano);

  // Estadísticas: abrir con el botón, cerrar tocando el fondo del overlay.
  document.getElementById("bj-btn-stats").addEventListener("click", bjAbrirStats);
  const overlayStats = document.getElementById("bj-stats");
  overlayStats.addEventListener("click", (evento) => {
    if (evento.target === overlayStats) overlayStats.hidden = true;
  });

  // Banca rota: solo se sale reiniciando (el overlay NO se cierra tocando el fondo).
  document.getElementById("bj-btn-reiniciar-banca").addEventListener("click", bjReiniciarBanca);
}

// La mano que se está jugando ahora mismo.
function bjManoActiva() {
  return bjClasico.manos[bjClasico.manoActiva];
}

// ============================================================
//  Apuesta (fase "apostando")
// ============================================================

// Sube/baja la apuesta con el stepper, acotada entre el mínimo y la banca actual
// (no puedes apostar más de lo que tienes). `paso` es −1 o +1.
function bjCambiarApuesta(paso) {
  if (bjClasico.fase !== "apostando") return;
  const nueva = bjClasico.apuesta + paso * BJ_APUESTA_PASO;
  const maximo = Math.max(BJ_APUESTA_MIN, bjClasico.banca);
  if (nueva < BJ_APUESTA_MIN || nueva > maximo) return; // fuera de rango: topa sin hacer nada
  bjClasico.apuesta = nueva;
  bjActualizarControles();
}

// "Repartir": comprueba fondos, rebaraja si el mazo está bajo y reparte la mano.
function bjRepartir() {
  const c = bjClasico;
  if (c.fase !== "apostando" || c.repartiendo) return;
  if (c.apuesta < BJ_APUESTA_MIN || c.apuesta > c.banca) return; // el stepper ya lo evita
  bjLimpiarResultado();

  // Rebarajado al agotarse: un mazo nuevo de 52 con una breve pausa de "🔀".
  // Durante la pausa, `repartiendo` bloquea un segundo toque en "Repartir".
  if (bjCartasRestantes(c.mazo) < BJ_REBARAJAR_UMBRAL) {
    c.mazo = bjConstruirMazo(1);
    c.repartiendo = true;
    bjMostrarRebarajando(bjRepartirAhora);
  } else {
    bjRepartirAhora();
  }
}

// Reparto real (tras el posible rebarajado): descuenta la apuesta, reparte 2+2 y
// decide el siguiente paso (ofrecer seguro, resolver un natural, o jugar).
function bjRepartirAhora() {
  const c = bjClasico;
  c.repartiendo = false;
  c.bancaInicioMano = c.banca;
  c.banca -= c.apuesta; // la apuesta queda comprometida; se devuelve al resolver
  c.seguro = 0;
  c.dealerOculta = true;

  const reparto = bjRepartirInicial(c.mazo);
  c.manos = [bjNuevaMano(reparto.jugador, c.apuesta, false)];
  c.manoActiva = 0;
  c.manoDealer = reparto.dealer;

  // Seguro: solo si la regla está activa, el dealer enseña un As y hay fichas.
  const upcard = c.manoDealer[0];
  if (bjEstado.ruleset.seguro && upcard.valor === "A" && c.banca >= c.apuesta / 2) {
    c.fase = "seguro";
    bjClasicoRender();
  } else {
    bjTrasSeguro();
  }
}

// Crea el objeto de una mano del jugador. `mostradas` = cuántas de sus cartas ya se
// han pintado (lo usa bjPintarCartasMano para animar solo las nuevas).
function bjNuevaMano(cartas, apuesta, deAses) {
  return { cartas, apuesta, doblo: false, deAses, terminada: false, resultado: null, mostradas: 0 };
}

// ============================================================
//  Seguro (fase "seguro")
// ============================================================

// Respuesta al seguro: si lo contrata, paga la mitad de la apuesta; luego, en
// ambos casos, se comprueba si la mano se resuelve ya por blackjack (peek).
function bjResponderSeguro(contrata) {
  const c = bjClasico;
  if (c.fase !== "seguro") return;
  if (contrata) {
    c.seguro = c.apuesta / 2;
    c.banca -= c.seguro;
  }
  bjTrasSeguro();
}

// El dealer "mira" su carta (peek): si hay blackjack natural (suyo o del jugador),
// la mano se resuelve al instante; si no, empieza el turno del jugador.
function bjTrasSeguro() {
  const c = bjClasico;
  if (bjEsBlackjackNatural(c.manoDealer) || bjEsBlackjackNatural(c.manos[0].cartas)) {
    bjResolver(false);
  } else {
    c.fase = "jugando";
    bjClasicoRender();
  }
}

// ============================================================
//  Turno del jugador (fase "jugando")
// ============================================================

// "Pedir": roba una carta a la mano activa; si se pasa, esa mano termina y se
// pasa a la siguiente (o al dealer si no queda ninguna).
function bjPedir() {
  const c = bjClasico;
  if (c.fase !== "jugando") return;
  const mano = bjManoActiva();
  mano.cartas.push(bjRobar(c.mazo));
  if (bjEsBust(mano.cartas)) {
    mano.terminada = true;
    bjAvanzarMano();
  } else {
    bjClasicoRender(); // doblar/dividir dejan de estar disponibles con 3+ cartas
  }
}

// "Plantarse": la mano activa queda como está y se pasa a la siguiente.
function bjPlantarse() {
  if (bjClasico.fase !== "jugando") return;
  bjManoActiva().terminada = true;
  bjAvanzarMano();
}

// "Doblar": paga otra apuesta sobre la mano activa, roba UNA carta y la planta.
function bjDoblar() {
  const c = bjClasico;
  if (!bjPuedeDoblar()) return;
  const mano = bjManoActiva();
  c.banca -= mano.apuesta; // la segunda apuesta de esta mano
  mano.doblo = true;
  mano.cartas.push(bjRobar(c.mazo));
  mano.terminada = true;
  bjAvanzarMano();
}

// "Dividir" (split): separa un par en dos manos, cada una con su apuesta. No se
// permite re-dividir (máximo dos manos). Los ases divididos reciben una sola carta.
function bjDividir() {
  const c = bjClasico;
  if (!bjPuedeDividir()) return;
  const original = c.manos[0];
  c.banca -= c.apuesta; // segunda apuesta, igual a la primera
  const esAses = original.cartas[0].valor === "A";
  c.manos = [
    bjNuevaMano([original.cartas[0]], c.apuesta, esAses),
    bjNuevaMano([original.cartas[1]], c.apuesta, esAses),
  ];
  c.manoActiva = 0;
  bjActivarMano(0); // reparte la 2.ª carta a la primera mano y sigue
}

// "Rendirse": abandona la mano y recupera la mitad de la apuesta (el dealer no juega).
function bjRendirse() {
  if (!bjPuedeRendirse()) return;
  bjResolver(true);
}

// Pasa a la siguiente mano sin terminar; si no queda ninguna, juega el dealer.
function bjAvanzarMano() {
  const c = bjClasico;
  const siguiente = c.manoActiva + 1;
  if (siguiente < c.manos.length && !c.manos[siguiente].terminada) {
    bjActivarMano(siguiente);
  } else {
    bjTerminarTurnoJugador();
  }
}

// Activa la mano `i`: si aún tiene una sola carta (recién dividida), le reparte la
// segunda. Los ases divididos se plantan solos (una carta y a la siguiente mano).
function bjActivarMano(i) {
  const c = bjClasico;
  c.manoActiva = i;
  const mano = c.manos[i];
  if (mano.cartas.length === 1) {
    mano.cartas.push(bjRobar(c.mazo));
  }
  if (mano.deAses) {
    mano.terminada = true;
    bjAvanzarMano();
  } else {
    bjClasicoRender();
  }
}

// ¿Se puede doblar la mano activa? Regla activa, 2 cartas (no ases divididos) y
// fondos para la segunda apuesta.
function bjPuedeDoblar() {
  const c = bjClasico;
  if (c.fase !== "jugando" || !bjEstado.ruleset.doblar) return false;
  const mano = bjManoActiva();
  return mano.cartas.length === 2 && !mano.deAses && c.banca >= mano.apuesta;
}

// ¿Se puede dividir? Regla activa, una sola mano (sin re-split) de 2 cartas del
// mismo valor, y fondos para la segunda apuesta.
function bjPuedeDividir() {
  const c = bjClasico;
  if (c.fase !== "jugando" || !bjEstado.ruleset.dividir) return false;
  if (c.manos.length !== 1) return false;
  const cartas = c.manos[0].cartas;
  if (cartas.length !== 2) return false;
  if (bjValorCarta(cartas[0].valor) !== bjValorCarta(cartas[1].valor)) return false;
  return c.banca >= c.apuesta;
}

// ¿Se puede rendir? Regla activa, una sola mano (no tras dividir) y primera decisión.
function bjPuedeRendirse() {
  const c = bjClasico;
  return (
    c.fase === "jugando" &&
    bjEstado.ruleset.rendirse &&
    c.manos.length === 1 &&
    c.manos[0].cartas.length === 2
  );
}

// ============================================================
//  Resolución de la mano
// ============================================================

// Revela la carta oculta, juega el dealer (si alguna mano sigue viva) y resuelve.
function bjTerminarTurnoJugador() {
  const c = bjClasico;
  c.dealerOculta = false;
  // Si TODAS las manos se han pasado, el dealer no necesita robar (ya ha ganado).
  const algunaViva = c.manos.some((mano) => !bjEsBust(mano.cartas));
  if (algunaViva) bjJugarDealer(c.manoDealer, c.mazo); // sin hooks: dealer hasta 17
  bjResolver(false);
}

// Resuelve la mano: revela, calcula el pago de cada mano (+ el seguro), actualiza
// banca, récord y estadísticas, muestra el resultado con su animación y comprueba
// si la banca queda rota. `rendido` = true cuando el jugador se ha rendido.
function bjResolver(rendido) {
  const c = bjClasico;
  c.dealerOculta = false;

  if (rendido) {
    c.banca += c.apuesta * 0.5; // recupera la mitad de la (única) apuesta
    c.manos[0].resultado = "rendido";
  } else {
    // Una mano dividida no puede ser blackjack natural (un 21 tras split paga 1:1).
    const puedeNatural = c.manos.length === 1;
    c.manos.forEach((mano) => {
      const res = bjResolverMano(mano.cartas, c.manoDealer, { jugadorPuedeNatural: puedeNatural });
      const stake = mano.apuesta * (mano.doblo ? 2 : 1);
      // Se le devuelve al jugador stake · (1 + pago): 2· si gana, 2,5· blackjack,
      // 1· si empata (push), 0 si pierde.
      c.banca += stake * (1 + res.pago);
      mano.resultado = res.resultado;
    });
  }

  // Seguro: paga 2:1 solo si el dealer tenía blackjack natural. El coste ya se
  // descontó al contratarlo; aquí se devuelve triple (coste + ganancia 2·coste).
  if (c.seguro > 0 && bjEsBlackjackNatural(c.manoDealer)) {
    c.banca += c.seguro * 3;
  }

  bjActualizarStats(rendido);
  c.bancaMax = Math.max(c.bancaMax, c.banca);
  bjClasicoGuardar();

  c.fase = "resuelto";
  bjClasicoRender();
  bjMostrarResultado(c.banca - c.bancaInicioMano);
}

// Actualiza las estadísticas persistentes: cada mano jugada cuenta por separado
// (al dividir, dos manos = dos manos jugadas).
function bjActualizarStats(rendido) {
  const s = bjClasico.stats;
  if (rendido) {
    s.manos++;
    s.rachaActual = 0; // rendirse corta la racha
    return;
  }
  bjClasico.manos.forEach((mano) => {
    s.manos++;
    if (mano.resultado === "jugador") {
      s.victorias++;
      s.rachaActual++;
      s.mejorRacha = Math.max(s.mejorRacha, s.rachaActual);
    } else if (mano.resultado === "dealer") {
      s.rachaActual = 0; // una derrota corta la racha
    }
    // Empate (push): ni cuenta como victoria ni corta la racha.
  });
}

// "Siguiente mano": prepara una mano nueva; si ya no llega al mínimo, banca rota.
function bjSiguienteMano() {
  bjNuevaManoEstado();
  if (bjClasico.banca < BJ_APUESTA_MIN) bjMostrarBancaRota();
}

// Reinicia el estado transitorio para empezar a apostar una mano nueva.
function bjNuevaManoEstado() {
  const c = bjClasico;
  c.manos = [];
  c.manoActiva = 0;
  c.manoDealer = [];
  c.seguro = 0;
  c.dealerOculta = true;
  c.fase = "apostando";
  // La apuesta se acota a lo que quede en banca (nunca por debajo del mínimo).
  c.apuesta = Math.min(Math.max(c.apuesta, BJ_APUESTA_MIN), Math.max(BJ_APUESTA_MIN, c.banca));
  bjLimpiarResultado();
  bjClasicoRender();
}

// ============================================================
//  Banca rota
// ============================================================

function bjMostrarBancaRota() {
  document.getElementById("bj-banca-rota").hidden = false;
}

// Reinicia la banca a 100 conservando récord y estadísticas (son logros de siempre).
function bjReiniciarBanca() {
  bjClasico.banca = BJ_BANCA_INICIAL;
  bjClasico.bancaMax = Math.max(bjClasico.bancaMax, BJ_BANCA_INICIAL);
  bjClasicoGuardar();
  document.getElementById("bj-banca-rota").hidden = true;
  bjNuevaManoEstado();
}

// ============================================================
//  Pintado de la mesa
// ============================================================

// Repinta toda la mesa según el estado actual.
function bjClasicoRender() {
  bjActualizarCabecera();
  bjRenderDealer();
  bjActualizarTotalDealer();
  bjRenderManosJugador();
  bjActualizarControles();
}

// Cabecera: banca y cartas restantes del mazo.
function bjActualizarCabecera() {
  document.getElementById("bj-banca").textContent = bjFormatearFichas(bjClasico.banca);
  document.getElementById("bj-restantes").textContent = bjCartasRestantes(bjClasico.mazo);
}

// Crea el <img> de una carta (o del reverso, si va oculta).
function bjCrearCartaImg(carta, oculta) {
  const img = document.createElement("img");
  img.src = oculta ? BJ_IMAGEN_REVERSO : bjImagenCarta(carta);
  img.alt = oculta ? "Carta boca abajo" : `${carta.valor} de ${carta.palo}`;
  return img;
}

// Pinta la mano del dealer (su 2.ª carta boca abajo mientras dealerOculta), con el
// reparto y el revelado escalonados en volteo (Fase 9.1: js/blackjack/animaciones.js
// solo anima lo que cambió desde el último repintado).
function bjRenderDealer() {
  bjRenderDealerAnimado("bj-cartas-dealer", bjClasico.manoDealer, bjClasico.dealerOculta, "clasico");
}

// Total del dealer: solo la carta visible mientras tenga una oculta (así el
// contador no delata la mano). Vacío si aún no hay cartas.
function bjActualizarTotalDealer() {
  const c = bjClasico;
  const total = document.getElementById("bj-total-dealer");
  if (!c.manoDealer.length) {
    total.textContent = "";
  } else if (c.dealerOculta) {
    total.textContent = bjValorMano([c.manoDealer[0]]);
  } else {
    total.textContent = bjValorMano(c.manoDealer);
  }
}

// Pinta la(s) mano(s) del jugador. Al dividir, se ven dos manos y se resalta la
// activa; cada mano muestra su total y (al dividir) su apuesta y su resultado.
function bjRenderManosJugador() {
  const c = bjClasico;
  const cont = document.getElementById("bj-manos-jugador");
  cont.innerHTML = "";
  const split = c.manos.length > 1;

  c.manos.forEach((mano, indice) => {
    const bloque = document.createElement("div");
    bloque.className = "bj-mano";
    if (split) bloque.classList.add("bj-mano-multi");
    if (split && c.fase === "jugando" && indice === c.manoActiva) bloque.classList.add("activa");

    const cartas = document.createElement("div");
    cartas.className = "bj-cartas";
    // Reparto inicial con entrada simple; cada carta pedida/doblada después, con
    // volteo reverso→frente. bjPintarCartasMano lleva la cuenta (mano.mostradas).
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

      if (c.fase === "resuelto" && mano.resultado) {
        const res = document.createElement("span");
        res.className = "bj-mano-res " + bjClaseResultado(mano.resultado);
        res.textContent = BJ_TEXTO_RESULTADO_CORTO[mano.resultado];
        info.appendChild(res);
      }
    }

    bloque.appendChild(info);
    cont.appendChild(bloque);
  });
}

// Muestra solo el bloque de controles de la fase actual y ajusta sus botones.
function bjActualizarControles() {
  const c = bjClasico;
  const zonas = ["bj-zona-apuesta", "bj-zona-seguro", "bj-zona-acciones", "bj-zona-siguiente"];
  zonas.forEach((id) => (document.getElementById(id).hidden = true));

  if (c.fase === "apostando") {
    document.getElementById("bj-zona-apuesta").hidden = false;
    document.getElementById("bj-valor-apuesta").textContent = bjFormatearFichas(c.apuesta);
  } else if (c.fase === "seguro") {
    document.getElementById("bj-zona-seguro").hidden = false;
    document.getElementById("bj-seguro-coste").textContent = bjFormatearFichas(c.apuesta / 2);
  } else if (c.fase === "jugando") {
    document.getElementById("bj-zona-acciones").hidden = false;
    document.getElementById("bj-btn-doblar").disabled = !bjPuedeDoblar();
    document.getElementById("bj-btn-dividir").disabled = !bjPuedeDividir();
    document.getElementById("bj-btn-rendirse").disabled = !bjPuedeRendirse();
  } else if (c.fase === "resuelto") {
    document.getElementById("bj-zona-siguiente").hidden = false;
  }
}

// ============================================================
//  Banner de resultado y animaciones
// ============================================================

// Textos del banner según el desenlace (desde el punto de vista del jugador).
const BJ_TEXTO_RESULTADO = {
  jugador: "¡Ganas!",
  dealer: "Gana el dealer",
  empate: "Empate",
  rendido: "Te rindes",
};

// Versión corta, para la etiqueta de cada mano dividida.
const BJ_TEXTO_RESULTADO_CORTO = {
  jugador: "Ganas",
  dealer: "Pierdes",
  empate: "Empate",
  rendido: "Rendida",
};

// Muestra el resultado y la variación de fichas de la mano (+X gana / −X pierde),
// con una pequeña animación "pop" en el delta. Con split, el banner resume cada mano.
function bjMostrarResultado(delta) {
  const c = bjClasico;
  const banner = document.getElementById("bj-resultado");

  if (c.manos.length === 1) {
    const resultado = c.manos[0].resultado;
    const esNatural = resultado === "jugador" && bjEsBlackjackNatural(c.manos[0].cartas);
    banner.textContent = esNatural ? "¡Blackjack!" : BJ_TEXTO_RESULTADO[resultado];
    banner.className = "bj-resultado " + bjClaseResultado(resultado);
  } else {
    banner.textContent = c.manos.map((m) => BJ_TEXTO_RESULTADO_CORTO[m.resultado]).join("  ·  ");
    banner.className = "bj-resultado";
  }

  const el = document.getElementById("bj-delta");
  if (delta > 0) {
    el.textContent = "+" + bjFormatearFichas(delta);
    el.className = "bj-delta gana pop";
  } else if (delta < 0) {
    el.textContent = "−" + bjFormatearFichas(-delta);
    el.className = "bj-delta pierde pop";
  } else {
    el.textContent = "±0";
    el.className = "bj-delta pop";
  }
}

// Clase de color según quién gana.
function bjClaseResultado(resultado) {
  if (resultado === "jugador") return "gana";
  if (resultado === "dealer" || resultado === "rendido") return "pierde";
  return "empate";
}

// Limpia el banner de resultado y el delta (al empezar una mano nueva).
function bjLimpiarResultado() {
  const banner = document.getElementById("bj-resultado");
  banner.textContent = "";
  banner.className = "bj-resultado";
  const el = document.getElementById("bj-delta");
  el.textContent = "";
  el.className = "bj-delta";
}

// Enseña un aviso breve de "rebarajando" y, al terminar, ejecuta `cb` (el reparto).
function bjMostrarRebarajando(cb) {
  const banner = document.getElementById("bj-resultado");
  banner.textContent = "🔀 Rebarajando…";
  banner.className = "bj-resultado empate";
  bjActualizarCabecera(); // el contador ya muestra 52
  setTimeout(() => {
    bjLimpiarResultado();
    cb();
  }, 700);
}

// ============================================================
//  Estadísticas
// ============================================================

// Abre el overlay de estadísticas con los datos actuales.
function bjAbrirStats() {
  const s = bjClasico.stats;
  const pct = s.manos ? Math.round((s.victorias / s.manos) * 100) : 0;
  const filas = [
    ["Banca actual", bjFormatearFichas(bjClasico.banca)],
    ["Récord de banca", bjFormatearFichas(bjClasico.bancaMax)],
    ["Manos jugadas", s.manos],
    ["Victorias", pct + "%"],
    ["Mejor racha", s.mejorRacha],
  ];
  const panel = document.getElementById("bj-stats-panel");
  panel.innerHTML = "<h2>Estadísticas</h2>";
  filas.forEach(([etiqueta, valor]) => {
    const fila = document.createElement("div");
    fila.className = "bj-stats-fila";
    const izq = document.createElement("span");
    izq.textContent = etiqueta;
    const der = document.createElement("span");
    der.textContent = valor;
    fila.append(izq, der);
    panel.appendChild(fila);
  });
  document.getElementById("bj-stats").hidden = false;
}

// ============================================================
//  Persistencia (banca + récord + estadísticas)
// ============================================================

// Guarda solo los campos persistentes (no el mazo ni la mano en curso).
function bjClasicoGuardar() {
  try {
    localStorage.setItem(
      BJ_CLASICO_CLAVE,
      JSON.stringify({
        banca: bjClasico.banca,
        bancaMax: bjClasico.bancaMax,
        stats: bjClasico.stats,
      })
    );
  } catch (e) {
    console.warn("No se pudo guardar el Clásico:", e);
  }
}

// Carga banca, récord y estadísticas si los hay. Defensivo: valida cada campo para
// no romper si el guardado está corrupto o es de una versión anterior.
function bjClasicoCargar() {
  let datos = null;
  try {
    const texto = localStorage.getItem(BJ_CLASICO_CLAVE);
    if (texto) datos = JSON.parse(texto);
  } catch (e) {
    return;
  }
  if (!datos || typeof datos !== "object") return;

  if (typeof datos.banca === "number") bjClasico.banca = datos.banca;
  if (typeof datos.bancaMax === "number") bjClasico.bancaMax = datos.bancaMax;
  if (datos.stats && typeof datos.stats === "object") {
    bjClasico.stats = {
      manos: datos.stats.manos || 0,
      victorias: datos.stats.victorias || 0,
      rachaActual: datos.stats.rachaActual || 0,
      mejorRacha: datos.stats.mejorRacha || 0,
    };
  }
}

// ============================================================
//  Utilidad
// ============================================================

// Formatea fichas: entero tal cual; si hay media ficha (los 3:2 y los seguros dan
// medios), con un decimal y coma decimal (formato español).
function bjFormatearFichas(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

// Registra el wiring de la mesa cuando el DOM está listo.
document.addEventListener("DOMContentLoaded", bjClasicoConectar);

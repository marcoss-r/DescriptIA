// 21 Arcanos — tarot: la tirada del destino y los hooks sobre el motor.
//
// Al empezar una partida de Arcade se sacan 3 arcanos al azar y se colocan como
// Pasado — Presente — Futuro. La POSICIÓN condiciona el efecto: cada arcano tiene
// un efecto distinto por posición (plan §9.4), y cada uno normal o invertido al
// 50 %. Quedan toda la partida como REGLAS DE MESA globales (plan §6).
//
// Este archivo contiene:
//   - La tirada (bjTarotTirada) y su revelado animado (bjTarotMostrar).
//   - Los helpers que consulta arcade.js para aplicar los efectos: bjTarotTiene
//     (¿está activa esta clave?), bjTarotOpcionesMotor (hooks del motor: límite
//     del dealer, pago del natural, empates) y bjTarotRulesetEfectivo (el
//     Hierofante pisa el ruleset elegido).
//   - El panel «Reglas de mesa» desplegable en la mesa del Arcade.
//
// TODOS los efectos se aplican por código (plan §9.3): no hay reglas «de palabra».

// Ritmo del revelado: una carta cada tanto, y el texto al terminar.
const BJ_TAROT_RITMO = 650; // ms entre carta y carta

// Posición de cada slot de la tirada: etiqueta visible + clave en los datos.
const BJ_TAROT_POSICIONES = [
  { etiqueta: "Pasado", clave: "pasado" },
  { etiqueta: "Presente", clave: "presente" },
  { etiqueta: "Futuro", clave: "futuro" },
];

// ============================================================
//  La tirada
// ============================================================

// Orientaciones JUGABLES de un arcano en una posición. Normalmente son las dos
// (normal e invertida), pero en solitario se descartan las marcadas `soloMulti`:
// dependen del ranking de jugadores (líder, último, robar fichas a los demás) y no
// harían nada jugando solo. Devuelve [] si en esa posición no queda ninguna viva.
function bjTarotOrientacionesVivas(carta, posClave, solitario) {
  const par = carta.posiciones[posClave];
  const vivas = [];
  if (!solitario || !par.normal.soloMulti) vivas.push({ invertida: false, datos: par.normal });
  if (!solitario || !par.invertida.soloMulti) vivas.push({ invertida: true, datos: par.invertida });
  return vivas;
}

// Saca 3 arcanos distintos del pool y los coloca en Pasado, Presente y Futuro. Cada
// uno toma el efecto de SU posición (plan §9.4), normal o invertido al 50 %, y se
// deja en bjEstado.tarot con la clave de efecto que consultan los hooks.
//
// En SOLITARIO la tirada esquiva los efectos que dependen del ranking: para cada
// posición solo se considera un arcano si le queda alguna orientación viva ahí, y la
// orientación se sortea entre las vivas. Así no se malgasta una carta de la tirada en
// un efecto que no puede disparar (El Emperador entero, el Diablo invertido, el
// Ermitaño de Pasado y el Carro en Presente normal / Futuro invertido).
function bjTarotTirada() {
  const solitario = bjArcade.jugadores.length === 1;
  const pool = barajar(BJ_TAROT);
  const usados = [];

  bjEstado.tarot = BJ_TAROT_POSICIONES.map((posicion) => {
    const carta = pool.find(
      (candidata) =>
        usados.indexOf(candidata) === -1 &&
        bjTarotOrientacionesVivas(candidata, posicion.clave, solitario).length > 0
    );
    usados.push(carta);

    const vivas = bjTarotOrientacionesVivas(carta, posicion.clave, solitario);
    const elegida = vivas[Math.floor(Math.random() * vivas.length)];

    return {
      slug: carta.slug,
      numeral: carta.numeral,
      nombre: carta.nombre,
      invertida: elegida.invertida,
      posicion: posicion.etiqueta,
      posClave: posicion.clave,
      efecto: elegida.datos.efecto,
      texto: elegida.datos.texto,
      fiesta: elegida.datos.fiesta || null,
    };
  });
}

// Ruta del arte de una carta de la tirada (invertida = sprite rotado 180°).
function bjTarotImagen(entrada) {
  return `img/21arc/tarot-bj-${entrada.slug}${entrada.invertida ? "-invertida" : ""}.png`;
}

// ¿Está esta clave de efecto en la tirada de la partida actual?
function bjTarotTiene(clave) {
  return bjEstado.tarot.some((e) => e.efecto === clave);
}

// ¿Es la última ronda del Arcade? Las profecías (efectos de posición Futuro) solo
// se aplican en ella.
function bjTarotEsUltimaRonda() {
  return bjArcade.ronda >= bjArcade.rondasTotal;
}

// ¿Se APLICA este efecto ahora? Igual que bjTarotTiene, pero los efectos de Futuro
// (clave "…-fu-…") solo cuentan en la última ronda. Los de Presente valen toda la
// partida y los de Pasado siempre están activos (su lógica es un rastro entre
// rondas). Es el helper que deben usar los hooks salvo que necesiten el matiz de
// posición por su cuenta.
function bjTarotAplica(clave) {
  if (!bjTarotTiene(clave)) return false;
  if (clave.indexOf("-fu-") !== -1) return bjTarotEsUltimaRonda();
  return true;
}

// ============================================================
//  Hooks sobre el motor y el ruleset
// ============================================================

// Opciones que se pasan a bjJugarDealer/bjResolverMano según los arcanos activos.
// Reúne los efectos que el motor ya sabe aplicar: límite del dealer (Torre), pago
// del blackjack natural (Emperatriz, Mundo invertido) y a quién van los empates
// (Justicia). Cada uno en sus posiciones Presente y Futuro.
function bjTarotOpcionesMotor() {
  const opciones = {};

  // La Torre: se planta antes (16) o roba más (18). Presente = toda la partida;
  // Futuro = solo la última ronda (bjTarotAplica ya lo filtra).
  if (bjTarotAplica("torre-pr-n") || bjTarotAplica("torre-fu-n")) opciones.limiteDealer = 16;
  if (bjTarotAplica("torre-pr-i") || bjTarotAplica("torre-fu-i")) opciones.limiteDealer = 18;

  // La Emperatriz sube el pago del natural (×2 toda la partida, ×3 en la última);
  // el Mundo invertido lo baja a ×1.
  if (bjTarotAplica("emperatriz-pr-n")) opciones.pagoNatural = 2;
  if (bjTarotAplica("emperatriz-fu-n")) opciones.pagoNatural = 3;
  if (bjTarotAplica("mundo-pr-i")) opciones.pagoNatural = 1;

  // La Justicia decide los empates a favor del jugador o del dealer.
  if (bjTarotAplica("justicia-pr-n") || bjTarotAplica("justicia-fu-n")) opciones.empate = "jugador";
  if (bjTarotAplica("justicia-pr-i") || bjTarotAplica("justicia-fu-i")) opciones.empate = "dealer";

  return opciones;
}

// Ruleset efectivo de la partida: el elegido por el usuario, salvo que el
// Hierofante PRESENTE mande (normal: todas las opcionales fuera; invertida: todas
// dentro). Se congela al empezar la partida (bjArcadeEmpezar); el Hierofante Futuro
// —que solo actúa en la última ronda— se resuelve aparte en las comprobaciones de
// acción, no aquí.
function bjTarotRulesetEfectivo(base) {
  if (bjTarotTiene("hierofante-pr-n") || bjTarotTiene("hierofante-pr-i")) {
    const valor = bjTarotTiene("hierofante-pr-i"); // true = todas ON, false = todas OFF
    const ruleset = {};
    BJ_REGLAS.forEach((regla) => {
      ruleset[regla.clave] = regla.disponible ? valor : regla.pordefecto;
    });
    return ruleset;
  }
  return base;
}

// ============================================================
//  Pantalla bj-tarot: el revelado
// ============================================================

// Pinta y muestra la tirada. Las cartas entran boca "ocultas" y se revelan una a
// una (CSS .revelada); al acabar aparecen los textos y el botón de continuar.
function bjTarotMostrar() {
  const cont = document.getElementById("bj-tarot-cartas");
  cont.innerHTML = "";

  bjEstado.tarot.forEach((entrada) => {
    const bloque = document.createElement("div");
    bloque.className = "bj-tarot-carta";

    const posicion = document.createElement("span");
    posicion.className = "bj-tarot-posicion";
    posicion.textContent = entrada.posicion;

    const img = document.createElement("img");
    img.src = bjTarotImagen(entrada);
    img.alt = entrada.nombre + (entrada.invertida ? " (invertida)" : "");

    const nombre = document.createElement("span");
    nombre.className = "bj-tarot-nombre";
    nombre.textContent = entrada.nombre + (entrada.invertida ? " ↓" : "");

    bloque.append(posicion, img, nombre);
    cont.appendChild(bloque);
  });

  document.getElementById("bj-tarot-textos").innerHTML = "";
  document.getElementById("bj-btn-tarot-continuar").hidden = true;
  mostrarPantalla("bj-tarot");

  // Revelado escalonado: cada carta gana .revelada con un retardo; tras la última,
  // los textos de los efectos y el botón.
  const bloques = cont.querySelectorAll(".bj-tarot-carta");
  bloques.forEach((bloque, i) => {
    setTimeout(() => bloque.classList.add("revelada"), 300 + i * BJ_TAROT_RITMO);
  });
  setTimeout(bjTarotMostrarTextos, 300 + bloques.length * BJ_TAROT_RITMO);
}

// Lista de los 3 efectos bajo las cartas (+ botón de continuar).
function bjTarotMostrarTextos() {
  const cont = document.getElementById("bj-tarot-textos");
  cont.innerHTML = "";
  bjEstado.tarot.forEach((entrada) => {
    cont.appendChild(bjTarotCrearFilaEfecto(entrada));
  });
  document.getElementById("bj-btn-tarot-continuar").hidden = false;
}

// Fila de un efecto (se usa en el revelado y en el panel de la mesa): nombre,
// texto, etiqueta de regla manual y línea de tragos si el modo fiesta está activo.
function bjTarotCrearFilaEfecto(entrada) {
  const fila = document.createElement("div");
  fila.className = "bj-tarot-efecto";

  const titulo = document.createElement("span");
  titulo.className = "bj-tarot-efecto-nombre";
  titulo.textContent =
    entrada.nombre + " · " + entrada.posicion + (entrada.invertida ? " (invertida)" : "");
  fila.appendChild(titulo);

  const texto = document.createElement("span");
  texto.className = "bj-tarot-efecto-texto";
  texto.textContent = entrada.texto;
  fila.appendChild(texto);

  if (entrada.fiesta && bjArcade.config.fiesta) {
    const fiesta = document.createElement("span");
    fiesta.className = "bj-tarot-fiesta";
    fiesta.textContent = entrada.fiesta;
    fila.appendChild(fiesta);
  }

  return fila;
}

// ============================================================
//  Panel «Reglas de mesa» en la mesa del Arcade
// ============================================================

// Engancha el chip y el overlay (una vez, al cargar). El overlay se cierra
// tocando en cualquier parte (mismo patrón que los efectos de Cartas).
function bjTarotConectarPanel() {
  const overlay = document.getElementById("bj-tarot-panel");
  document.getElementById("bj-btn-tarot-chip").addEventListener("click", () => {
    const lista = document.getElementById("bj-tarot-panel-lista");
    lista.innerHTML = "";
    bjEstado.tarot.forEach((entrada) => {
      const item = document.createElement("div");
      item.className = "bj-tarot-panel-item";
      const img = document.createElement("img");
      img.src = bjTarotImagen(entrada);
      img.alt = "";
      item.appendChild(img);
      item.appendChild(bjTarotCrearFilaEfecto(entrada));
      lista.appendChild(item);
    });
    overlay.hidden = false;
  });
  overlay.addEventListener("click", () => {
    overlay.hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", bjTarotConectarPanel);

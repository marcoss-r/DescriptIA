// 21 Arcanos — tarot: la tirada del destino y los hooks sobre el motor.
//
// Al empezar una partida de Arcade se sacan 3 arcanos al azar (cada uno normal o
// invertido al 50 %), se revelan como Pasado — Presente — Futuro en la pantalla
// `bj-tarot` y quedan toda la partida como REGLAS DE MESA globales (plan §6).
//
// Este archivo contiene:
//   - La tirada (bjTarotTirada) y su revelado animado (bjTarotMostrar).
//   - Los helpers que consulta arcade.js para aplicar los efectos: bjTarotTiene
//     (¿está activa esta clave?), bjTarotOpcionesMotor (hooks del motor: límite
//     del dealer, pago del natural, empates) y bjTarotRulesetEfectivo (el
//     Hierofante pisa el ruleset elegido).
//   - El panel «Reglas de mesa» desplegable en la mesa del Arcade.
//
// Los efectos con `implementado: false` en los datos son reglas manuales: la app
// solo las muestra (aquí y en el panel) y los jugadores las aplican de palabra.

// Ritmo del revelado: una carta cada tanto, y el texto al terminar.
const BJ_TAROT_RITMO = 650; // ms entre carta y carta

const BJ_TAROT_POSICIONES = ["Pasado", "Presente", "Futuro"];

// ============================================================
//  La tirada
// ============================================================

// Saca 3 arcanos distintos del pool, cada uno normal o invertido (50 %), y los
// deja en bjEstado.tarot con su posición temática (por ahora no condiciona el
// efecto, pero el dato se guarda por si en el futuro lo hace, plan §6).
function bjTarotTirada() {
  const cartas = barajar(BJ_TAROT).slice(0, 3);
  bjEstado.tarot = cartas.map((carta, i) => {
    const invertida = Math.random() < 0.5;
    const datos = invertida ? carta.invertida : carta.normal;
    return {
      slug: carta.slug,
      numeral: carta.numeral,
      nombre: carta.nombre,
      invertida,
      posicion: BJ_TAROT_POSICIONES[i],
      efecto: datos.efecto,
      texto: datos.texto,
      implementado: datos.implementado,
      fiesta: datos.fiesta || null,
    };
  });
}

// Ruta del arte de una carta de la tirada (invertida = sprite rotado 180°).
function bjTarotImagen(entrada) {
  return `img/21arc/tarot-bj-${entrada.slug}${entrada.invertida ? "-invertida" : ""}.png`;
}

// ¿Está activa esta clave de efecto en la partida actual? Solo cuenta si además
// está implementada (las manuales nunca activan código).
function bjTarotTiene(clave) {
  return bjEstado.tarot.some((e) => e.efecto === clave && e.implementado);
}

// ============================================================
//  Hooks sobre el motor y el ruleset
// ============================================================

// Opciones que se pasan a bjJugarDealer/bjResolverMano según los arcanos activos.
function bjTarotOpcionesMotor() {
  const opciones = {};
  if (bjTarotTiene("torre-n")) opciones.limiteDealer = 16;
  if (bjTarotTiene("torre-i")) opciones.limiteDealer = 18;
  if (bjTarotTiene("emperatriz-n")) opciones.pagoNatural = 2;
  if (bjTarotTiene("mundo-i")) opciones.pagoNatural = 1;
  if (bjTarotTiene("justicia-n")) opciones.empate = "jugador";
  if (bjTarotTiene("justicia-i")) opciones.empate = "dealer";
  return opciones;
}

// Ruleset efectivo de la partida: el elegido por el usuario, salvo que el
// Hierofante mande (normal: todas las opcionales fuera; invertida: todas dentro).
function bjTarotRulesetEfectivo(base) {
  if (bjTarotTiene("hierofante-n") || bjTarotTiene("hierofante-i")) {
    const valor = bjTarotTiene("hierofante-i"); // true = todas ON, false = todas OFF
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
  titulo.textContent = entrada.nombre + (entrada.invertida ? " (invertida)" : "");
  fila.appendChild(titulo);

  const texto = document.createElement("span");
  texto.className = "bj-tarot-efecto-texto";
  texto.textContent = entrada.texto;
  fila.appendChild(texto);

  if (!entrada.implementado) {
    const manual = document.createElement("span");
    manual.className = "bj-tarot-manual";
    manual.textContent = "📜 Regla manual: la aplicáis vosotros.";
    fila.appendChild(manual);
  }

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

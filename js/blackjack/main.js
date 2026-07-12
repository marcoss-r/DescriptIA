// 21 Arcanos (blackjack): arranque del juego, navegación y pantalla de reglas.
//
// Blackjack para FIEsta con dos modos: Clásico (1 jugador contra la banca, con
// banca de fichas persistente; ver js/blackjack/clasico.js) y Modo Arcade («El
// Torneo»: hasta 5 jugadores hotseat, apuestas secretas y arcanos de tarot que
// fijan reglas de mesa). Ver el plan completo en md/PLAN_21_ARCANOS.md.
//
// Este archivo es el "wiring" común: la entrada desde el hub, el menú de modos,
// el estado global `bjEstado`, el ruleset (reglas opcionales que comparten ambos
// modos) y la pantalla `bj-reglas`. La lógica de cada modo vive en su propio .js.
//
// Namespacing: todo cuelga de `bjEstado` y de funciones/constantes con prefijo
// (bj… / BJ_…), porque todos los .js comparten el mismo espacio global y una
// variable con el mismo nombre que otra de DescriptIA (`estado`), Cartas
// (`cfEstado`) o La Ruleta (`rlEstado`) se pisaría. (bj = blackjack, 21 Arcanos.)

// Límites de jugadores del juego (máximo 5 en todo el juego, ver plan §1).
const BJ_MIN_JUGADORES = 1;
const BJ_MAX_JUGADORES = 5;

// Clave del ruleset en localStorage: se recuerda entre sesiones para no tener que
// reconfigurar las reglas cada vez. Los récords y la banca se guardan aparte.
const BJ_RULESET_CLAVE = "blackjack_ruleset";

// Estado del juego. Al tenerlo todo dentro de un único objeto, los cinco juegos
// no se estorban. `ruleset` lo comparten ambos modos; `jugadores` y `tarot` son
// del Arcade (Fases 6–7); el estado del Clásico vive en su propio archivo.
const bjEstado = {
  modo: null,        // "clasico" | "arcade" (lo fija el menú al elegir)
  ruleset: null,     // { doblar, rendirse, seguro, dividir } (se carga al arrancar)
  jugadores: [],     // { nombre, fichas, ... } (se rellena en el Arcade, Fase 6)
  tarot: [],         // los 3 arcanos revelados de la partida (Fase 7)
};

// Engancha los botones de este juego. Se llama una vez, al cargar la página.
function bjConectar() {
  // El ruleset se carga antes que nada: el Clásico ya lo consulta en su primera mano.
  bjEstado.ruleset = bjCargarRuleset();

  // La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que la navegación
  // se hace por código. Los botones "Atrás" usan data-volver y los resuelve el
  // núcleo (conectarNavegacionGenerica), sin código aquí.
  document
    .getElementById("btn-juego-blackjack")
    .addEventListener("click", bjEntrarMenu);

  bjConectarMenu();
  bjConectarReglas();
}

// Prepara y muestra el menú de modos (se llama al entrar desde el hub).
function bjEntrarMenu() {
  bjEstado.modo = null;
  mostrarPantalla("bj-menu");
}

// Engancha los botones del menú de modos. Se llama una vez al cargar.
// bjEntrarClasico vive en clasico.js y bjEntrarArcade en arcade.js; ambos existen
// ya cuando se dispara el click (sus .js se cargan antes que main.js).
function bjConectarMenu() {
  document.getElementById("bj-btn-clasico").addEventListener("click", bjEntrarClasico);
  document.getElementById("bj-btn-arcade").addEventListener("click", bjEntrarArcade);
  document.getElementById("bj-btn-reglas").addEventListener("click", bjEntrarReglas);
}

// ============================================================
//  Pantalla de reglas (ruleset compartido por ambos modos)
// ============================================================

// Prepara y muestra la pantalla de reglas: pinta un toggle por regla y el resumen.
function bjEntrarReglas() {
  bjRenderReglas();
  bjActualizarResumenReglas();
  mostrarPantalla("bj-reglas");
}

// Engancha (una vez) lo que no cambia entre visitas. Los toggles se crean en cada
// bjRenderReglas, así que su listener se pone allí; aquí no hay nada permanente,
// pero mantenemos la función por simetría con el resto de pantallas.
function bjConectarReglas() {
  // Sin controles fijos: la lista de toggles se reconstruye en bjRenderReglas.
}

// Pinta una fila por regla del catálogo BJ_REGLAS: nombre, descripción e
// interruptor. Las reglas no disponibles (dividir, Fase 5) salen deshabilitadas
// con su nota. El interruptor refleja y edita bjEstado.ruleset.
function bjRenderReglas() {
  const cont = document.getElementById("bj-reglas-lista");
  cont.innerHTML = "";

  BJ_REGLAS.forEach((regla) => {
    const fila = document.createElement("div");
    fila.className = "bj-regla" + (regla.disponible ? "" : " deshabilitada");

    const txt = document.createElement("div");
    txt.className = "bj-regla-txt";
    const nombre = document.createElement("span");
    nombre.className = "bj-regla-nombre";
    nombre.textContent = regla.nombre;
    const desc = document.createElement("span");
    desc.className = "bj-regla-desc";
    desc.textContent = regla.disponible ? regla.desc : regla.nota;
    txt.append(nombre, desc);

    // Interruptor estilo iOS (misma técnica que Zona Tensionada): un checkbox
    // real oculto + una pista deslizante que reacciona con CSS a :checked.
    const label = document.createElement("label");
    label.className = "bj-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = bjEstado.ruleset[regla.clave];
    input.disabled = !regla.disponible;
    input.addEventListener("change", () => {
      bjEstado.ruleset[regla.clave] = input.checked;
      bjGuardarRuleset();
      bjActualizarResumenReglas();
    });
    const pista = document.createElement("span");
    pista.className = "bj-switch-pista";
    label.append(input, pista);

    fila.append(txt, label);
    cont.appendChild(fila);
  });
}

// Frase-resumen con las reglas opcionales activas (las que el motor aplicará).
function bjActualizarResumenReglas() {
  const activas = BJ_REGLAS
    .filter((regla) => regla.disponible && bjEstado.ruleset[regla.clave])
    .map((regla) => regla.nombre.toLowerCase());
  const texto = activas.length
    ? "Activas: " + activas.join(", ") + "."
    : "Solo las reglas de casino (ninguna opcional activa).";
  document.getElementById("bj-reglas-resumen").textContent = texto;
}

// ============================================================
//  Persistencia del ruleset
// ============================================================

// Guarda el ruleset elegido. Genérico salvo la clave (mismo patrón que el resto).
function bjGuardarRuleset() {
  try {
    localStorage.setItem(BJ_RULESET_CLAVE, JSON.stringify(bjEstado.ruleset));
  } catch (e) {
    console.warn("No se pudo guardar el ruleset:", e);
  }
}

// Carga el ruleset guardado o, si no hay, devuelve el de por defecto. Parte del de
// por defecto y le encima las claves guardadas: así, si en el futuro se añade una
// regla nueva, aparece con su valor por defecto en vez de quedar `undefined`.
function bjCargarRuleset() {
  const ruleset = bjRulesetPorDefecto();
  let datos = null;
  try {
    const texto = localStorage.getItem(BJ_RULESET_CLAVE);
    if (texto) datos = JSON.parse(texto);
  } catch (e) {
    return ruleset;
  }
  if (datos && typeof datos === "object") {
    BJ_REGLAS.forEach((regla) => {
      if (typeof datos[regla.clave] === "boolean") {
        ruleset[regla.clave] = datos[regla.clave];
      }
    });
  }
  return ruleset;
}

// Cada juego registra su propio wiring cuando el DOM está listo (igual que el
// resto). El núcleo, aparte, arranca mostrando el hub.
document.addEventListener("DOMContentLoaded", bjConectar);

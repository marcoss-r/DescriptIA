// Zona Tensionada: arranque del juego y (en fases próximas) su lógica.
//
// Parodia de *El Pueblo Duerme* con temática de crisis de la vivienda: el pueblo
// es el barrio, los lobos son fondos buitre, morir es ser desahuciado y el
// linchamiento es una asamblea de vecinos. Juegan 5–14 personas con carta, más
// una persona narradora (sin carta) que maneja el móvil durante la noche.
//
// Namespacing: todo cuelga de `ztEstado` y de funciones/constantes con prefijo
// (zt… / ZT_…). Los .js comparten el mismo espacio global, así que una variable
// llamada `estado` pisaría la de DescriptIA, y `jugadores` la de cualquiera.
// (zt = Zona Tensionada.)

// Límites de jugadores que reciben carta (la narradora no cuenta). Al entrar
// se parte siempre del mínimo y desde ahí se sube.
const ZT_MIN_JUGADORES = 5;
const ZT_MAX_JUGADORES = 14;

// Estado de la partida. Igual que en los otros juegos, TODO vive dentro de un
// único objeto: así los cuatro juegos no se estorban y, cuando llegue la Fase 8,
// guardar la partida es serializar este objeto y ya está (nada de rebuscar
// variables sueltas por el archivo).
//
// Se declara entero desde ya —aunque casi todos los campos estén vacíos— para
// que sirva de mapa de lo que el juego necesita recordar. Las fases lo van
// rellenando; ninguna añade campos nuevos por sorpresa.
const ztEstado = {
  // [{ nombre, rol, vivo, cartaVecino, identidad, sinVotoHoy, parejaCon }] — Fase 3
  jugadores: [],

  // Lo que se elige en zt-jugadores y zt-config (Fase 2).
  config: {
    numJugadores: ZT_MIN_JUGADORES,
    numBuitres: 2,
    // Un interruptor por carta especial. El preset según el nº de jugadores
    // decide los valores iniciales (ztAplicarPreset, más abajo).
    especiales: {
      hacienda: true,
      sindicato: true,
      plataforma: false,
      okupa: false,
      tasador: false,
      influencer: false,
      inmobiliaria: false,
    },
  },

  concejalIndex: null,  // índice del Concejal en `jugadores` (o null) — Fase 4
  noche: 0,             // nº de la noche actual (la primera es la 1) — Fase 5
  colaTurnos: [],       // claves de rol con turno esta noche (ztConstruirColaTurnos) — Fase 5
  turnoIndex: 0,        // por qué turno de la cola vamos — Fase 5

  // Intenciones de la noche en curso: se recogen en los turnos y se convierten
  // en resultado al acabar la cola (ztResolverNoche). El pisoturista no necesita
  // campo aquí: se marca directo en jugador.sinVotoHoy.
  victimaNoche: null,   // índice elegido por los buitres (o null) — Fase 5
  salvadaNoche: false,  // ¿el Sindicato gastó la cacerolada ESTA noche? — Fase 5
  resultadoNoche: null, // { tipo: "desahucio"|"salvado"|"okupa"|"nadie", victima } — Fase 5

  // Los dos poderes que se gastan y NO deben poder repetirse. Viven en el estado
  // (no en el DOM) para que sobrevivan a un re-render y a la persistencia.
  sindicatoDisponible: true, // el uso único de la cacerolada — Fase 5
  okupaResistio: false,      // si el Okupa ya gastó su vida extra — Fase 5

  tasadorPendiente: null, // Tasador caído que aún debe vengarse (índice o null) — Fase 6
  influencerGano: false,  // victoria personal conseguida (mención en el fin) — Fase 6
  ganador: null,          // "buitres" | "vecinos" | "pareja" — Fase 7

  fase: "config",       // "config" | "noche" | "dia" | "fin" (persistencia) — Fase 8
};

// ============================================================
//  Registro del juego en el hub
// ============================================================

// Punto de entrada del juego: se ejecuta UNA vez, cuando el DOM está listo (por
// el addEventListener del final de este archivo). Aquí solo se enganchan botones;
// la navegación la hacen las funciones que se llaman al pulsarlos.
//
// La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que su navegación se
// hace por código. Los botones «Atrás» de las pantallas zt-* usan data-volver y
// los resuelve el núcleo (conectarNavegacionGenerica, js/nucleo/arranque.js:8),
// sin código aquí. Cada pantalla registra su propio wiring en su ztConectarXxx().
function ztConectar() {
  document
    .getElementById("btn-juego-zona")
    .addEventListener("click", ztEntrarJugadores);

  ztConectarJugadores();
  ztConectarConfig();
  ztConectarReparto();
  ztConectarConcejal();
  // «Continuar partida» (Fase 8): oculto hasta que ztHayPartidaGuardada diga
  // que hay algo que reanudar (lo decide ztEntrarJugadores al entrar).
  document
    .getElementById("zt-btn-continuar")
    .addEventListener("click", ztReanudar);
}

// ============================================================
//  Pantalla: número y nombres de jugadores (5–14)
// ============================================================

// Entra a jugadores desde el hub. Igual que rlEntrarConfig() (js/ruleta/main.js:63):
// PREPARA la pantalla (nº inicial, lista de nombres, error limpio) y LUEGO la
// muestra. Al ser una entrada nueva, bajamos ztConfigTocada para que el preset del
// §5 vuelva a mandar en la config (ver ztAplicarPreset).
function ztEntrarJugadores() {
  ztEstado.config.numJugadores = ZT_MIN_JUGADORES;
  ztConfigTocada = false;
  ztSincronizarJugadores();
  ztRenderNombres();
  document.getElementById("zt-valor-num-jugadores").textContent =
    ztEstado.config.numJugadores;
  document.getElementById("zt-error-jugadores").textContent = "";
  // Ofrecer «Continuar» solo si hay una partida guardada reanudable.
  document.getElementById("zt-btn-continuar").hidden = !ztHayPartidaGuardada();
  mostrarPantalla("zt-jugadores");
}

// Engancha el stepper (5–14) y el botón «Siguiente». Se llama una vez al cargar.
function ztConectarJugadores() {
  const stepper = document.querySelector('[data-stepper="zt-jugadores"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso); // −1 o +1
      const nuevo = ztEstado.config.numJugadores + paso;
      // Fuera de rango: no hacer nada (los extremos "topan" sin deshabilitar botón).
      if (nuevo < ZT_MIN_JUGADORES || nuevo > ZT_MAX_JUGADORES) return;
      ztEstado.config.numJugadores = nuevo;
      // Cambió el nº de jugadores → el preset del rango debe volver a aplicarse en
      // la config (§5): cualquier ajuste manual anterior se descarta.
      ztConfigTocada = false;
      document.getElementById("zt-valor-num-jugadores").textContent = nuevo;
      // Re-sincronizamos y repintamos: la lista crece/mengua conservando nombres.
      ztSincronizarJugadores();
      ztRenderNombres();
    });
  });

  document
    .getElementById("zt-btn-jugadores-siguiente")
    .addEventListener("click", () => {
      const error = document.getElementById("zt-error-jugadores");
      const problema = ztValidarNombres();
      if (problema) {
        error.textContent = problema;
        return;
      }
      error.textContent = "";
      ztEntrarConfig();
    });
}

// Mantiene ztEstado.jugadores con EXACTAMENTE numJugadores elementos, conservando
// los nombres ya escritos. Aquí cada jugador es solo { nombre }; el resto de campos
// (rol, vivo, identidad…) los añade el reparto en la Fase 3.
function ztSincronizarJugadores() {
  const actuales = ztEstado.jugadores;
  const nuevos = [];
  for (let i = 0; i < ztEstado.config.numJugadores; i++) {
    nuevos.push({ nombre: actuales[i] ? actuales[i].nombre : "" });
  }
  ztEstado.jugadores = nuevos;
}

// Pinta un <input> por jugador y mantiene su nombre sincronizado con el estado
// (el DOM refleja los datos: al escribir, copiamos el valor de vuelta a ztEstado).
function ztRenderNombres() {
  const cont = document.getElementById("zt-lista-nombres");
  cont.innerHTML = ""; // partimos de cero cada vez que cambia el número

  ztEstado.jugadores.forEach((jugador, indice) => {
    const fila = document.createElement("div");
    fila.className = "campo";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Jugador ${indice + 1}`;
    input.value = jugador.nombre;
    input.maxLength = 20;
    input.addEventListener("input", () => {
      ztEstado.jugadores[indice].nombre = input.value;
    });

    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// Devuelve un mensaje de error si los nombres no valen, o "" si están bien.
// Reglas: ninguno vacío y ninguno repetido (ignorando mayúsculas y espacios).
function ztValidarNombres() {
  const nombres = ztEstado.jugadores.map((j) => j.nombre.trim());
  if (nombres.some((n) => n === "")) {
    return "Todos los jugadores necesitan un nombre.";
  }
  // Un Set de nombres ya vistos (en minúsculas) detecta el primer repetido.
  const vistos = new Set();
  for (const n of nombres) {
    const clave = n.toLowerCase();
    if (vistos.has(clave)) return "Hay nombres repetidos.";
    vistos.add(clave);
  }
  return "";
}

// ============================================================
//  Pantalla: configuración de la partida (buitres + especiales)
// ============================================================

// Mínimo de fondos buitre. El máximo depende del nº de jugadores (numJugadores − 1
// como tope duro del stepper; la validación de "no lleguen a la mitad" es Fase 3).
const ZT_MIN_BUITRES = 1;

// Presets del §5: para cada rango (por su tope `hasta`), cuántos buitres y qué
// especiales vienen activadas por defecto. Las listas son acumulativas (cada rango
// añade cartas al anterior), pero se escriben enteras para leerlas de un vistazo.
// ztPresetPara() elige el primer rango cuyo `hasta` cubre al nº dado.
const ZT_PRESETS = [
  { hasta: 6,  numBuitres: 1, especiales: ["hacienda", "sindicato"] },
  { hasta: 8,  numBuitres: 2, especiales: ["hacienda", "sindicato", "plataforma", "okupa"] },
  { hasta: 10, numBuitres: 2, especiales: ["hacienda", "sindicato", "plataforma", "okupa", "tasador", "influencer"] },
  { hasta: 12, numBuitres: 3, especiales: ["hacienda", "sindicato", "plataforma", "okupa", "tasador", "influencer", "inmobiliaria"] },
  { hasta: 14, numBuitres: 4, especiales: ["hacienda", "sindicato", "plataforma", "okupa", "tasador", "influencer", "inmobiliaria"] },
];

// ¿Ha tocado el usuario la config a mano? Si es así, el preset ya no la pisa.
// Es estado de UI transitorio (la partida termina de configurarse antes de la
// noche), así que vive como variable de módulo, no dentro de ztEstado.
let ztConfigTocada = false;

// Entra a la config desde «Siguiente». Si el usuario no ha tocado nada, carga el
// preset del rango; luego vuelca el estado en los controles y muestra la pantalla.
function ztEntrarConfig() {
  if (!ztConfigTocada) {
    ztAplicarPreset();
  }
  ztRenderConfig();
  document.getElementById("zt-error-config").textContent = "";
  mostrarPantalla("zt-config");
}

// Engancha el stepper de buitres, los siete interruptores y «Repartir cartas».
function ztConectarConfig() {
  const stepper = document.querySelector('[data-stepper="zt-buitres"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso);
      const nuevo = ztEstado.config.numBuitres + paso;
      const max = ztEstado.config.numJugadores - 1; // tope duro; la validación fina es Fase 3
      if (nuevo < ZT_MIN_BUITRES || nuevo > max) return;
      ztEstado.config.numBuitres = nuevo;
      ztConfigTocada = true; // ajuste manual: manda sobre el preset
      document.getElementById("zt-valor-num-buitres").textContent = nuevo;
    });
  });

  // Un ÚNICO listener para los siete interruptores: cada checkbox lleva
  // data-especial con su clave, así sabemos cuál de ztEstado.config.especiales
  // actualizar sin escribir siete handlers casi idénticos.
  document
    .getElementById("zt-lista-especiales")
    .querySelectorAll('input[type="checkbox"][data-especial]')
    .forEach((chk) => {
      chk.addEventListener("change", () => {
        ztEstado.config.especiales[chk.dataset.especial] = chk.checked;
        ztConfigTocada = true;
      });
    });

  document.getElementById("zt-btn-repartir").addEventListener("click", () => {
    const error = document.getElementById("zt-error-config");
    const problema = ztValidarConfig();
    if (problema) {
      error.textContent = problema;
      return;
    }
    error.textContent = "";
    // Partida nueva: resetear lo que una anterior pudiera haber dejado. (Así
    // ztRepartirCartas solo se ocupa del mazo y la asignación.)
    ztEstado.concejalIndex = null;
    ztEstado.noche = 0;
    ztEstado.colaTurnos = [];
    ztEstado.turnoIndex = 0;
    ztEstado.victimaNoche = null;
    ztEstado.salvadaNoche = false;
    ztEstado.resultadoNoche = null;
    ztEstado.sindicatoDisponible = true;
    ztEstado.okupaResistio = false;
    ztEstado.tasadorPendiente = null;
    ztEstado.influencerGano = false;
    ztEstado.ganador = null;

    ztRepartirCartas();
    ztEntrarReparto(); // Fase 4: el móvil empieza a pasar de mano en mano
  });
}

// Vuelca ztEstado.config en los controles (stepper + checkboxes). Es lo contrario
// de los listeners: aquí el DOM se pone al día con el estado, no al revés.
function ztRenderConfig() {
  document.getElementById("zt-valor-num-buitres").textContent =
    ztEstado.config.numBuitres;
  document
    .getElementById("zt-lista-especiales")
    .querySelectorAll('input[type="checkbox"][data-especial]')
    .forEach((chk) => {
      chk.checked = ztEstado.config.especiales[chk.dataset.especial];
    });
}

// Presets por rango (§5): al entrar en config sin haber tocado nada, el nº de
// buitres y los interruptores se rellenan con la fila que corresponde al nº de
// jugadores. El "sin pisar lo que el usuario ya tocó" lo resuelve la bandera
// ztConfigTocada (ztEntrarConfig solo llama a ztAplicarPreset cuando es false);
// estas dos funciones solo ELIGEN el preset y lo VUELCAN en el estado.

// Busca en ZT_PRESETS el primer elemento cuyo `hasta` cubre numJugadores (los
// rangos están ordenados de menor a mayor, así que el primero que lo cubre es
// el suyo). Si ninguno encaja (no debería pasar dentro de 5–14), el último
// preset actúa de red de seguridad.
function ztPresetPara(numJugadores) {
  return ZT_PRESETS.find((p) => p.hasta >= numJugadores) || ZT_PRESETS[ZT_PRESETS.length - 1];
}

// Copia el preset del nº de jugadores actual en ztEstado.config: numBuitres
// directo, y cada carta de especiales a true solo si su clave está en la lista
// `especiales` del preset. No toca el DOM: de reflejarlo en los controles se
// encarga ztRenderConfig() después.
function ztAplicarPreset() {
  const preset = ztPresetPara(ztEstado.config.numJugadores);
  ztEstado.config.numBuitres = preset.numBuitres;
  Object.keys(ztEstado.config.especiales).forEach((clave) => {
    ztEstado.config.especiales[clave] = preset.especiales.includes(clave);
  });
}

// ============================================================
//  Helpers compartidos (los usan reparto, concejal, noche y día)
// ============================================================

function ztNombre(indice) {
  return ztEstado.jugadores[indice].nombre;
}

// Índices de los jugadores vivos que cumplen el filtro (si se pasa uno).
// Ej.: ztIndicesVivos()                      → todos los vivos
//      ztIndicesVivos((j) => !j.sinVotoHoy)  → vivos con derecho a voto hoy
function ztIndicesVivos(filtro) {
  const indices = [];
  ztEstado.jugadores.forEach((j, i) => {
    if (j.vivo && (!filtro || filtro(j, i))) indices.push(i);
  });
  return indices;
}

// Pinta botones con los nombres de los jugadores `indices` dentro de #contId.
// Al pulsar uno llama a alElegir(indice, boton). Vacía el contenedor antes.
function ztPintarLista(contId, indices, alElegir) {
  const cont = document.getElementById(contId);
  cont.innerHTML = "";
  indices.forEach((i) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = ztNombre(i);
    boton.addEventListener("click", () => alElegir(i, boton));
    cont.appendChild(boton);
  });
}

// ============================================================
//  Mazo y reparto (Fase 3)
// ============================================================

// Construye el mazo LEYENDO la configuración como datos: devuelve un array de
// claves de rol (las de ZT_ROLES) con EXACTAMENTE numJugadores elementos —
// buitres, una carta por cada especial activada y relleno de vecinos. La
// clave del interruptor YA ES la clave del rol en ZT_ROLES: esa es la gracia
// de modelar los roles como datos, ni un solo if por rol repartido por el
// código. Aquí no se baraja ni se valida: solo se compone (una función, un
// trabajo); barajar y validar viven en sus propias funciones.
function ztConstruirMazo() {
  const { numJugadores, numBuitres } = ztEstado.config;
  let mazo = [];

  // Añadir buitres
  for (let i = 0; i < numBuitres; i++) {
    mazo.push("buitre");
  }

  // Añadir cartas especiales activadas
  Object.keys(ztEstado.config.especiales).forEach((rol) => {
    if (ztEstado.config.especiales[rol]) {
      mazo.push(rol);
    }
  });

  // Rellenar con vecinos
  while (mazo.length < numJugadores) {
    mazo.push("vecino");
  }

  return mazo;
}

// Valida la configuración antes de repartir (casos borde §8): devuelve "" si
// todo está bien, o el mensaje de error si no. Comprueba EN ORDEN que quepan
// las cartas especiales activadas (numBuitres + especiales no puede superar
// numJugadores) y que los buitres no lleguen a la mitad del barrio (la
// partida no puede nacer decidida). El preset evita ambos casos por defecto,
// pero el usuario puede forzarlos a mano, así que se valida igual. El botón
// «Repartir cartas» llama a esto y pinta el mensaje en el error.
function ztValidarConfig() {
  const { numJugadores, numBuitres, especiales } = ztEstado.config;
  const numEspeciales = Object.values(especiales).filter(Boolean).length;

  if (numBuitres + numEspeciales > numJugadores) {
    return "No caben tantas cartas especiales para tan pocos vecinos.";
  }
  if (numBuitres * 2 >= numJugadores) {
    return "Demasiados buitres para tan poco barrio.";
  }
  return "";
}

// Reparte: baraja el mazo y lo asigna a los jugadores. barajar() (de
// js/nucleo/util.js, Fisher–Yates) devuelve una COPIA, así que barajar el
// MAZO equivale a repartir al azar sin barajar a las personas. A cada vecino
// raso se le asigna además su arte (vecino-1..5) y una identidad ACORDE con
// ese arte, por BOLSAS barajadas: se saca con .pop() y solo se rebaraja una
// bolsa al agotarse. Así con 3 vecinos salen 3 cartas distintas (solo se
// repite arte cuando ya han salido los cinco) y la identidad siempre pega
// con el dibujo. El botón «Repartir cartas» ya ha validado y reseteado el
// resto del estado.
function ztRepartirCartas() {
  const mazo = barajar(ztConstruirMazo());
  let artesVecino = [];   // bolsa de artes pendientes (números 1..5)
  const identidades = {}; // bolsa de identidades pendientes, POR arte

  ztEstado.jugadores.forEach((jugador, i) => {
    jugador.rol = mazo[i];
    jugador.vivo = true;
    jugador.sinVotoHoy = false;
    jugador.parejaCon = null;
    jugador.cartaVecino = null;
    jugador.identidad = null;

    if (jugador.rol === "vecino") {
      if (artesVecino.length === 0) artesVecino = barajar([1, 2, 3, 4, 5]);
      const arte = artesVecino.pop();
      jugador.cartaVecino = arte;
      if (!identidades[arte] || identidades[arte].length === 0) {
        identidades[arte] = barajar(ZT_IDENTIDADES[arte]);
      }
      jugador.identidad = identidades[arte].pop();
    }
  });
}

// ============================================================
//  Revelación de roles: el móvil pasa de mano en mano (Fase 4)
// ============================================================

// Índice del jugador que tiene el móvil ahora mismo. Es estado de UI
// transitorio (el reparto nunca se guarda a medias, §8), por eso vive aquí
// fuera de ztEstado.
let ztRepartoIndex = 0;

function ztEntrarReparto() {
  ztRepartoIndex = 0;
  ztRenderRepartoNombre();
  mostrarPantalla("zt-reparto");
}

function ztConectarReparto() {
  document
    .getElementById("zt-btn-ver-carta")
    .addEventListener("click", ztRepartoVerCarta);
  document
    .getElementById("zt-btn-ocultar-carta")
    .addEventListener("click", ztRepartoOcultarYPasar);
}

// Sub-vista A (sin secretos): «NOMBRE, coge el móvil».
function ztRenderRepartoNombre() {
  document.getElementById("zt-reparto-nombre").textContent =
    ztNombre(ztRepartoIndex);
  document.getElementById("zt-reparto-vista-nombre").hidden = false;
  document.getElementById("zt-reparto-vista-carta").hidden = true;
}

// Sub-vista B: compone la carta DESDE LOS DATOS del catálogo. Un único render
// vale para los 9 roles; si mañana hay un rol nuevo, esta función ni se toca
// (nada de un HTML por rol). ztCartaDeJugador (data/zona/roles.js) resuelve el
// arte, incluido elegir entre los 5 vecinos; a los vecinos se les añade además
// su identidad decorativa al texto del efecto.
function ztRepartoVerCarta() {
  const jugador = ztEstado.jugadores[ztRepartoIndex];
  const datos = ZT_ROLES[jugador.rol];

  document.getElementById("zt-carta-img").src = ztCartaDeJugador(jugador);
  document.getElementById("zt-rol-nombre").textContent = datos.nombre;
  document.getElementById("zt-rol-efecto").textContent = datos.efecto;

  if (jugador.rol === "vecino") {
    document.getElementById("zt-rol-efecto").textContent += ` — Eres ${jugador.identidad}.`;
  }

  document.getElementById("zt-reparto-vista-nombre").hidden = true;
  document.getElementById("zt-reparto-vista-carta").hidden = false;
}

// «Ocultar y pasar»: LIMPIA el contenido sensible del DOM antes de avanzar
// (criterio §6: los secretos no se tapan con CSS, se eliminan). Si solo se
// ocultara la vista, un «inspeccionar elemento» (o un parpadeo al volver)
// delataría la carta al siguiente jugador. Tras vaciarlo, avanza el índice y
// decide si queda alguien por ver su carta o si toca elegir Concejal.
function ztRepartoOcultarYPasar() {
  // removeAttribute y no src = "": un <img> con src vacío intenta cargar la
  // propia página, falla y pinta el icono de imagen rota.
  document.getElementById("zt-carta-img").removeAttribute("src");
  document.getElementById("zt-rol-nombre").textContent = "";
  document.getElementById("zt-rol-efecto").textContent = "";

  ztRepartoIndex += 1;
  if (ztRepartoIndex < ztEstado.jugadores.length) {
    ztRenderRepartoNombre();
  } else {
    ztEntrarConcejal();
  }
}

// ============================================================
//  Concejal de Urbanismo (Fase 4; reutilizada para el sucesor en Fase 6)
// ============================================================

// Qué hacer al registrar al Concejal: tras el reparto → primera noche; si el
// día reelige a un sucesor, se vuelve al día. Por eso es configurable.
let ztConcejalDespues = null;

function ztEntrarConcejal(despues, texto) {
  ztConcejalDespues = despues || ztEmpezarNoche;
  document.getElementById("zt-concejal-texto").textContent =
    texto ||
    "Votad a mano alzada quién es el Concejal de Urbanismo y registradlo aquí. " +
      "Su voto vale doble y desempata (lo aplicáis vosotros al contar manos).";
  ztPintarLista("zt-concejal-lista", ztIndicesVivos(), (i) => {
    ztEstado.concejalIndex = i;
    ztConcejalDespues();
  });
  mostrarPantalla("zt-concejal");
}

function ztConectarConcejal() {
  document
    .getElementById("zt-btn-concejal-nadie")
    .addEventListener("click", () => {
      ztEstado.concejalIndex = null;
      ztConcejalDespues();
    });
}

// ============================================================
//  Persistencia: continuar partida (Fase 8)
// ============================================================

// Clave propia para no chocar con "descriptia_partida", "cartas_partida" ni
// "ruleta_partida".
const ZT_CLAVE_GUARDADO = "zona_partida";

// Persistencia (mismo patrón que rlGuardar/rlCargar/rlHayPartidaGuardada/rlBorrar
// en js/ruleta/main.js:631): cinco funciones cortas y casi idénticas entre
// juegos; lo específico de Zona Tensionada son LOS PUNTOS de guardado en una
// partida con información secreta:
//
//   - Se guarda al EMPEZAR cada noche y cada día (llamadas a ztGuardar() ya
//     colocadas en ztEmpezarNoche y ztEmpezarDia). Nunca se guarda a mitad de
//     un turno nocturno: una recarga reanuda al INICIO de esa noche y las
//     intenciones a medias se descartan (§8) — ni estado corrupto ni secretos
//     a medias en pantalla.
//   - Se borra al terminar (llamada ya colocada en ztTerminarPartida).
//   - El botón «Continuar» de zt-jugadores está conectado a ztReanudar() y se
//     enseña según ztHayPartidaGuardada().
//   - ztReanudar(), según ztEstado.fase: "noche" resta 1 a ztEstado.noche antes
//     de llamar a ztEmpezarNoche() (compensa el += 1 de esa función: se repite
//     la MISMA noche desde cero); "dia" llama a ztEmpezarDia() (rehace el
//     amanecer desde el resultadoNoche guardado, que se guardó ANTES de
//     aplicar nada); cualquier otra fase no tiene nada jugable a medias.
function ztGuardar() {
  try {
    localStorage.setItem(ZT_CLAVE_GUARDADO, JSON.stringify(ztEstado));
  } catch (error) {
    console.error("Error al guardar la partida:", error);
  }
}

function ztCargar() {
  try {
    const datos = localStorage.getItem(ZT_CLAVE_GUARDADO);
    if (datos) {
      const parseado = JSON.parse(datos);
      // Si el JSON es válido pero no es un objeto (p. ej. la partida guardada
      // se corrompió a "null"), Object.assign con null/undefined no lanzaría
      // error: sería un no-op silencioso que devolvería true sin haber cargado
      // nada. Se valida antes de asignar, como hace rlCargar (js/ruleta/main.js:655).
      if (parseado && typeof parseado === "object") {
        Object.assign(ztEstado, parseado);
        return true;
      }
    }
  } catch (error) {
    console.error("Error al cargar la partida:", error);
  }
  return false;
}

function ztHayPartidaGuardada() {
  try {
    return localStorage.getItem(ZT_CLAVE_GUARDADO) !== null;
  } catch (error) {
    console.error("Error al comprobar la partida guardada:", error);
    return false;
  }
}

function ztBorrar() {
  try {
    localStorage.removeItem(ZT_CLAVE_GUARDADO);
  } catch (error) {
    console.error("Error al borrar la partida:", error);
  }
}

function ztReanudar() {
  if (ztCargar()) {
    if (ztEstado.fase === "noche") {
      ztEstado.noche -= 1; // Compensa el incremento de ztEmpezarNoche
      ztEmpezarNoche();
    } else if (ztEstado.fase === "dia") {
      ztEmpezarDia();
    } else {
      console.warn("No hay fase jugable para reanudar:", ztEstado.fase);
    }
  } else {
    console.warn("No se pudo cargar la partida guardada.");
  }
}

// Este juego registra su propio wiring cuando el DOM está listo, igual que los
// otros tres. El núcleo (arranque.js) no sabe que Zona Tensionada existe: son los
// juegos los que se apuntan solos.
document.addEventListener("DOMContentLoaded", ztConectar);

// La Ruleta: arranque del juego y (en fases próximas) su lógica.
//
// Versión con un solo móvil de *Wavelength*: un jugador adivina dónde cae un
// concepto dentro de un espectro entre dos polos, guiándose por una pista verbal
// que le da el resto del grupo.
//
// Namespacing: todo cuelga de `rlEstado` y de funciones/constantes con prefijo
// (rl… / RL_…), porque todos los .js comparten el mismo espacio global y una
// variable con el mismo nombre que otra de DescriptIA (`estado`) o Cartas
// (`cfEstado`) se pisaría. (rl = La Ruleta.)

// Límites de jugadores para este juego (sin equipos).
const RL_MIN_JUGADORES = 2;
const RL_MAX_JUGADORES = 6;
const RL_JUGADORES_INICIAL = 2;

// Geometría del sector de puntuación. El semicírculo se modela con ángulos de 0°
// (extremo izquierdo) a 180° (extremo derecho); el sector se define por su ángulo
// central. Estas dos fronteras (con nombre para poder ajustarlas tras probar) son
// las distancias, en grados, desde ese centro:
const RL_SECTOR_3PTS = 6;   // a ≤ 6° del centro → 3 puntos (sector central, 12° de ancho)
const RL_SECTOR_1PT = 18;   // a ≤ 18° del centro → 1 punto (laterales, 12° cada uno)

// Geometría del dibujo SVG (coordenadas del viewBox 200×120). El semicírculo va
// centrado en (cx, cy) con radio r, "boca arriba" (la base abajo).
const RL_SVG_CX = 100;
const RL_SVG_CY = 100;
const RL_SVG_R = 90;
const RL_SVG_ANCHO = 200; // ancho del viewBox (para convertir píxeles → coords del SVG)
const RL_SVG_ALTO = 120;  // alto del viewBox

// Estado del juego. Al tenerlo todo dentro de un único objeto, los tres juegos no
// se estorban. Se irá rellenando a lo largo de las fases.
const rlEstado = {
  numJugadores: RL_JUGADORES_INICIAL, // cuántos jugadores hay ahora mismo
  jugadores: [],       // [{ nombre, puntos }] en orden barajado
  tematicas: [],       // las 3 temáticas elegidas para esta partida
  tematicaIndex: 0,    // 0..2: qué temática se está jugando
  turnoIndex: 0,       // quién adivina dentro de la temática actual
  centroSector: 90,    // ángulo central del sector (se regenera cada turno)
  anguloAguja: 90,     // posición actual de la aguja (grados, 0..180)
  subEstado: "pista",  // "pista" | "adivinando" | "resultado"
};

// Engancha los botones de este juego. Se llama una vez, al cargar la página.
function rlConectar() {
  // La tarjeta del hub ENTRA al juego (no "vuelve" atrás), así que la navegación
  // se hace por código. Los botones "Atrás" usan data-volver="fiesta" y los
  // resuelve el núcleo (conectarNavegacionGenerica), sin código aquí.
  document
    .getElementById("btn-juego-ruleta")
    .addEventListener("click", rlEntrarConfig);

  rlConectarConfig();
  rlConectarJuego();
}

// ============================================================
//  Configuración de jugadores (2–6)
// ============================================================

// Prepara y muestra la pantalla de configuración (se llama al entrar desde el hub).
function rlEntrarConfig() {
  rlEstado.numJugadores = RL_JUGADORES_INICIAL;
  rlSincronizarJugadores();
  rlRenderNombres();
  document.getElementById("rl-valor-num-jugadores").textContent = rlEstado.numJugadores;
  document.getElementById("rl-error-jugadores").textContent = "";
  // Ofrecemos "Continuar" solo si hay una partida guardada reanudable.
  document.getElementById("rl-btn-continuar").hidden = !rlHayPartidaGuardada();
  mostrarPantalla("rl-config");
}

// Engancha el stepper (− nº +) y el botón "Empezar". Se llama una vez al cargar.
function rlConectarConfig() {
  const stepper = document.querySelector('[data-stepper="rl-jugadores"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso); // -1 o +1
      const nuevo = rlEstado.numJugadores + paso;
      // Fuera de rango: no hacer nada (los extremos "topan" sin deshabilitar botones).
      if (nuevo < RL_MIN_JUGADORES || nuevo > RL_MAX_JUGADORES) return;
      rlEstado.numJugadores = nuevo;
      document.getElementById("rl-valor-num-jugadores").textContent = nuevo;
      // Re-sincronizamos datos y repintamos: la lista crece/mengua conservando nombres.
      rlSincronizarJugadores();
      rlRenderNombres();
    });
  });

  document.getElementById("rl-btn-empezar").addEventListener("click", rlEmpezar);
  document.getElementById("rl-btn-continuar").addEventListener("click", rlReanudar);
}

// Mantiene rlEstado.jugadores con EXACTAMENTE rlEstado.numJugadores elementos,
// conservando los nombres ya escritos.
function rlSincronizarJugadores() {
  // Conservamos los nombres ya tecleados y construimos un array nuevo con
  // exactamente numJugadores elementos (los que falten entran con nombre "").
  // Aquí solo manejamos `nombre`; los `puntos` los añade rlEmpezar al arrancar.
  const actuales = rlEstado.jugadores;
  const nuevos = [];
  for (let i = 0; i < rlEstado.numJugadores; i++) {
    nuevos.push({ nombre: actuales[i] ? actuales[i].nombre : "" });
  }
  rlEstado.jugadores = nuevos;
}

// Pinta un <input> por jugador dentro de #rl-lista-nombres y mantiene sus nombres
// sincronizados con rlEstado a medida que se escribe.
function rlRenderNombres() {
  const cont = document.getElementById("rl-lista-nombres");
  cont.innerHTML = ""; // partimos de cero cada vez que cambia el número

  // Una fila con un <input> por jugador. En el evento "input" escribimos el valor
  // de vuelta en rlEstado (el DOM refleja los datos, no al revés).
  rlEstado.jugadores.forEach((jugador, indice) => {
    const fila = document.createElement("div");
    fila.className = "campo";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Jugador ${indice + 1}`;
    input.value = jugador.nombre;
    input.maxLength = 20;

    input.addEventListener("input", () => {
      rlEstado.jugadores[indice].nombre = input.value;
    });

    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// Valida los nombres, baraja el orden de turno, elige 3 temáticas y arranca.
function rlEmpezar() {
  const error = document.getElementById("rl-error-jugadores");
  const hayVacios = rlEstado.jugadores.some((j) => j.nombre.trim() === "");
  if (hayVacios) {
    error.textContent = "Todos los jugadores necesitan un nombre.";
    return;
  }
  error.textContent = "";

  // Orden de turno al azar + puntuación a 0. barajar() (js/nucleo/util.js) devuelve
  // una copia mezclada sin tocar el original; añadimos `puntos: 0` a cada jugador.
  rlEstado.jugadores = barajar(rlEstado.jugadores).map((j) => ({
    nombre: j.nombre,
    puntos: 0,
  }));

  // 3 temáticas al azar del banco, sin repetir (ver rlElegirTematicas).
  rlEstado.tematicas = rlElegirTematicas(3);

  // Índices de partida a cero: primera temática, primer jugador.
  rlEstado.tematicaIndex = 0;
  rlEstado.turnoIndex = 0;

  rlIrATurno();
}

// Devuelve `cuantas` temáticas distintas elegidas al azar del banco RL_TEMATICAS.
function rlElegirTematicas(cuantas) {
  // El banco se crea en la Fase 3; hasta entonces usamos [] para no romper nada.
  const banco = typeof RL_TEMATICAS !== "undefined" ? RL_TEMATICAS : [];

  // Barajamos una COPIA del banco (barajar es Fisher–Yates y no muta el original)
  // y nos quedamos con las primeras `cuantas`. Al ser una permutación, esas
  // primeras son necesariamente distintas entre sí: nunca repite, a diferencia de
  // sortear `cuantas` veces por separado. Si el banco tiene menos de `cuantas`,
  // slice devuelve solo las que haya (correcto, no rompe).
  return barajar(banco).slice(0, cuantas);
}

// ============================================================
//  Modelo de ángulos: posición del sector y puntuación
// ============================================================

// Genera una posición nueva del sector para el turno actual: un ángulo central
// aleatorio guardado en rlEstado.centroSector. Se llama en CADA turno (aunque la
// temática se repita) para que quien ya vio la revelación anterior no tenga ventaja.
function rlNuevaPosicion() {
  // Para que TODO el sector quepa dentro del semicírculo, el centro no puede
  // pegarse a los extremos: debe quedar a RL_SECTOR_1PT (18°) de cada borde. Por
  // eso el rango válido es [18°, 162°] (= [RL_SECTOR_1PT, 180 − RL_SECTOR_1PT]).
  const min = RL_SECTOR_1PT;
  const max = 180 - RL_SECTOR_1PT;

  // Aleatorio en [min, max]: Math.random() da [0, 1); lo estiramos por el ancho del
  // rango y lo desplazamos con el mínimo. Puede ser decimal (no hace falta redondear).
  rlEstado.centroSector = min + Math.random() * (max - min);
}

// Puntos que se lleva la aguja: 3 si cayó en el sector central, 1 si en un lateral,
// 0 fuera. `aguja` y `centro` son ángulos en grados (0..180).
function rlCalcularPuntos(aguja, centro) {
  // Cuánto se separó la aguja del centro del sector, sin importar el lado: por eso
  // el valor absoluto.
  const distancia = Math.abs(aguja - centro);

  // Comprobamos de la frontera más estricta a la más laxa, con <= (la frontera
  // cuenta para el sector de MÁS puntos): un ángulo a 4° cumple ambas y gana el 3.
  if (distancia <= RL_SECTOR_3PTS) {
    return 3;
  } else if (distancia <= RL_SECTOR_1PT) {
    return 1;
  } else {
    return 0;
  }
}

// ============================================================
//  Dibujo de la media ruleta (SVG)
// ============================================================

// Traduce un ángulo del semicírculo (0..180°) a un punto {x, y} del viewBox, a la
// distancia `radio` del centro. Es la pieza que convierte "ángulo 137°" en algo
// dibujable; la usan el sector, los números y la aguja.
function rlPolarACartesiano(angulo, radio) {
  // Math.cos/Math.sin trabajan en radianes, así que primero convertimos. El signo −
  // en ambos ejes deja el semicírculo boca arriba (0°→izq, 90°→arriba, 180°→der).
  const rad = angulo * Math.PI / 180;
  return { x: RL_SVG_CX - radio * Math.cos(rad), y: RL_SVG_CY - radio * Math.sin(rad) };
}

// Construye el atributo `d` de UNA cuña (porción de tarta) entre los ángulos
// `desde` y `hasta`, del centro al borde (radio RL_SVG_R).
function rlPathSector(desde, hasta) {
  const p1 = rlPolarACartesiano(desde, RL_SVG_R); // borde donde empieza la cuña
  const p2 = rlPolarACartesiano(hasta, RL_SVG_R); // borde donde acaba la cuña

  // Centro → borde (L) → arco por el filo (A) → cierre al centro (Z). Flags del
  // arco: rotación 0, large-arc 0 (la cuña es <180°), sweep 1 (sentido en que crece
  // el ángulo con nuestro convenio).
  return `M ${RL_SVG_CX} ${RL_SVG_CY} L ${p1.x} ${p1.y} A ${RL_SVG_R} ${RL_SVG_R} 0 0 1 ${p2.x} ${p2.y} Z`;
}

// Crea un elemento SVG (necesitan createElementNS, no createElement) con atributos.
function rlCrearElementoSVG(tag, atributos) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [clave, valor] of Object.entries(atributos)) {
    el.setAttribute(clave, valor);
  }
  return el;
}

// Pinta toda la ruleta según el estado actual: palabras, sector, aguja y botones.
function rlPintarRuleta() {
  const tematica = rlEstado.tematicas[rlEstado.tematicaIndex];
  rlPintarPalabras(tematica);
  rlPintarSector();
  rlPintarTapa();
  rlPintarAguja();
  rlActualizarControles();
}

// Máquina de sub-estados: un ÚNICO sitio que decide qué controles se ven, según
// rlEstado.subEstado (en vez de repartir hidden = true/false por cada handler).
function rlActualizarControles() {
  const nombre = rlNombreActual();
  const ocultar = document.getElementById("rl-btn-ocultar");
  const confirmar = document.getElementById("rl-btn-confirmar");
  const siguiente = document.getElementById("rl-btn-siguiente");
  const resultado = document.getElementById("rl-resultado");

  // Partimos de todo oculto y sin texto; cada sub-estado enciende solo lo suyo.
  ocultar.hidden = true;
  confirmar.hidden = true;
  siguiente.hidden = true;
  resultado.textContent = "";
  resultado.className = "rl-resultado"; // limpia color/pop de la revelación anterior

  if (rlEstado.subEstado === "pista") {
    ocultar.hidden = false;
    ocultar.textContent = `Ocultar y pasar a ${nombre}`;
  } else if (rlEstado.subEstado === "adivinando") {
    confirmar.hidden = false;
  } else if (rlEstado.subEstado === "resultado") {
    siguiente.hidden = false;
    const puntos = rlCalcularPuntos(rlEstado.anguloAguja, rlEstado.centroSector);
    const palabra = puntos === 1 ? "punto" : "puntos";
    resultado.textContent = `+${puntos} ${palabra} para ${nombre}`;
    // Color según la puntuación (verde 3 / azul 1 / apagado 0).
    resultado.classList.add(puntos === 3 ? "rl-punt-3" : puntos === 1 ? "rl-punt-1" : "rl-punt-0");
    // Invisible hasta que la tapa acabe de destaparse (rlAnimarPuntos lo revela).
    resultado.classList.add("rl-resultado-espera");
  }
}

// Escribe las dos palabras (polos) de la temática a los lados de la base.
function rlPintarPalabras(tematica) {
  document.getElementById("rl-palabra-izq").textContent = tematica ? tematica.izquierda : "";
  document.getElementById("rl-palabra-der").textContent = tematica ? tematica.derecha : "";
}

// Dibuja el sector de puntuación (3 cuñas + sus números) en la posición
// rlEstado.centroSector. En el sub-estado "adivinando" NO se dibuja: el grupo
// queda vacío (fuera del DOM) para que no se intuya mirando de reojo.
function rlPintarSector() {
  const grupo = document.getElementById("rl-sector");
  grupo.innerHTML = ""; // se vacía siempre; en "adivinando" se queda así
  if (rlEstado.subEstado === "adivinando") return;

  const centro = rlEstado.centroSector;
  // Tres cuñas contiguas: lateral (1) · central (3) · lateral (1).
  const cunas = [
    { desde: centro - RL_SECTOR_1PT, hasta: centro - RL_SECTOR_3PTS, clase: "rl-sector-1" },
    { desde: centro - RL_SECTOR_3PTS, hasta: centro + RL_SECTOR_3PTS, clase: "rl-sector-3" },
    { desde: centro + RL_SECTOR_3PTS, hasta: centro + RL_SECTOR_1PT, clase: "rl-sector-1" },
  ];
  cunas.forEach((c) => {
    grupo.appendChild(rlCrearElementoSVG("path", { d: rlPathSector(c.desde, c.hasta), class: c.clase }));
  });

  // Números en el centro angular de cada cuña, a media altura del radio.
  const medioLateral = (RL_SECTOR_3PTS + RL_SECTOR_1PT) / 2; // 12° → centro de la cuña lateral
  rlPintarNumero(centro, "3", grupo);
  rlPintarNumero(centro - medioLateral, "1", grupo);
  rlPintarNumero(centro + medioLateral, "1", grupo);
}

// Coloca un número dentro de una cuña, en el ángulo dado y a 0.62·radio del centro.
function rlPintarNumero(angulo, texto, grupo) {
  const p = rlPolarACartesiano(angulo, RL_SVG_R * 0.62);
  const t = rlCrearElementoSVG("text", {
    x: p.x, y: p.y, class: "rl-numero",
    "text-anchor": "middle", "dominant-baseline": "central",
  });
  t.textContent = texto;
  grupo.appendChild(t);
}

// Dibuja la aguja (línea del centro al borde + pivote). Aparece al "adivinando"
// (arrastrable) y en "resultado" (fija); en "pista" no hay aguja.
function rlPintarAguja() {
  const grupo = document.getElementById("rl-aguja");
  grupo.innerHTML = "";
  if (rlEstado.subEstado === "pista") return;

  const punta = rlPolarACartesiano(rlEstado.anguloAguja, RL_SVG_R);
  grupo.appendChild(rlCrearElementoSVG("line", {
    x1: RL_SVG_CX, y1: RL_SVG_CY, x2: punta.x, y2: punta.y, class: "rl-aguja-linea",
  }));
  grupo.appendChild(rlCrearElementoSVG("circle", {
    cx: RL_SVG_CX, cy: RL_SVG_CY, r: 4, class: "rl-aguja-base",
  }));
}

// ============================================================
//  Animación de la tapa y de los puntos (Fase 9)
// ============================================================

const RL_TAPA_DURACION = 550; // ms que dura destapar/tapar

// Ángulo actual de la tapa (t). La tapa cubre el arco [t, 180]: t = 0 → todo tapado,
// t = 180 → todo destapado.
let rlTapaAngulo = 0;
let rlTapaAnim = null; // id del requestAnimationFrame en curso (para poder cancelarlo)

// Dibuja la tapa azul que cubre el arco [rlTapaAngulo, 180]. Reutiliza rlPathSector.
function rlPintarTapa() {
  const grupo = document.getElementById("rl-tapa");
  grupo.innerHTML = "";
  if (rlTapaAngulo >= 180) return; // totalmente destapada: no hay nada que dibujar
  grupo.appendChild(rlCrearElementoSVG("path", {
    d: rlPathSector(rlTapaAngulo, 180),
    class: "rl-tapa-forma",
  }));
}

// Anima la tapa de `desde` a `hasta` (grados) redibujándola cada frame; al terminar
// llama a `alAcabar` (si se pasó). Usa requestAnimationFrame + un easing suave.
function rlAnimarTapa(desde, hasta, alAcabar) {
  if (rlTapaAnim) cancelAnimationFrame(rlTapaAnim); // cancela una animación anterior a medias
  const inicio = performance.now();

  function paso(ahora) {
    const t = Math.min(1, (ahora - inicio) / RL_TAPA_DURACION); // progreso 0..1
    // easeInOutQuad: arranca y frena suave, en vez de a velocidad constante.
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    rlTapaAngulo = desde + (hasta - desde) * e;
    rlPintarTapa();

    if (t < 1) {
      rlTapaAnim = requestAnimationFrame(paso);
    } else {
      rlTapaAnim = null;
      rlTapaAngulo = hasta; // fijamos el valor final exacto
      rlPintarTapa();
      if (alAcabar) alAcabar();
    }
  }
  rlTapaAnim = requestAnimationFrame(paso);
}

// Reinicia la animación "pop" del texto de puntos (quitar clase + reflow + añadir).
function rlAnimarPuntos() {
  const el = document.getElementById("rl-resultado");
  el.classList.remove("rl-resultado-espera"); // ya se destapó: el texto pasa a visible
  el.classList.remove("rl-resultado-pop");
  void el.offsetWidth; // fuerza un reflow para que la animación pueda reiniciarse
  el.classList.add("rl-resultado-pop");
}

// ============================================================
//  La aguja arrastrable (pointer events)
// ============================================================

// ¿Se está arrastrando ahora mismo? Evita mover la aguja con un simple movimiento
// del ratón sin haber pulsado antes.
let rlArrastrando = false;

// Engancha el arrastre sobre el SVG y los botones de la pantalla de juego.
function rlConectarJuego() {
  const svg = document.getElementById("rl-svg");
  svg.addEventListener("pointerdown", rlArrastreInicio);
  svg.addEventListener("pointermove", rlArrastreMover);
  svg.addEventListener("pointerup", rlArrastreFin);
  svg.addEventListener("pointercancel", rlArrastreFin);

  // Un handler por transición del turno (ver la sección "Flujo de turnos").
  document.getElementById("rl-btn-ver-ruleta").addEventListener("click", rlVerRuleta);
  document.getElementById("rl-btn-ocultar").addEventListener("click", rlOcultar);
  document.getElementById("rl-btn-confirmar").addEventListener("click", rlConfirmar);
  document.getElementById("rl-btn-siguiente").addEventListener("click", rlSiguiente);
}

// Empieza el arrastre (solo tiene sentido cuando el jugador está adivinando).
function rlArrastreInicio(evento) {
  if (rlEstado.subEstado !== "adivinando") return;
  rlArrastrando = true;

  // Capturamos el puntero en el SVG: los siguientes pointermove/up le siguen
  // llegando aunque el dedo se salga del semicírculo (si no, el gesto se cortaría).
  evento.currentTarget.setPointerCapture(evento.pointerId);

  rlActualizarAguja(evento); // mover ya al punto pulsado, sin esperar a arrastrar
}

// Durante el arrastre, seguir la posición del puntero.
function rlArrastreMover(evento) {
  if (!rlArrastrando) return;
  rlActualizarAguja(evento);
}

// Fin del arrastre (al soltar o si el sistema cancela el gesto).
function rlArrastreFin() {
  rlArrastrando = false;
}

// Mueve la aguja al ángulo correspondiente a la posición del puntero y repinta.
function rlActualizarAguja(evento) {
  const p = rlPuntoSVG(evento);
  rlEstado.anguloAguja = rlAnguloDesdePunto(p.x, p.y);
  rlPintarAguja();
}

// Convierte un evento de puntero (píxeles de pantalla) a coordenadas del viewBox.
// Regla de tres: la posición dentro del rectángulo del SVG (0..1) escalada al viewBox.
function rlPuntoSVG(evento) {
  const rect = document.getElementById("rl-svg").getBoundingClientRect();
  return {
    x: ((evento.clientX - rect.left) / rect.width) * RL_SVG_ANCHO,
    y: ((evento.clientY - rect.top) / rect.height) * RL_SVG_ALTO,
  };
}

// Ángulo (0..180°) del punto (x, y) respecto al centro del semicírculo. Es la
// inversa de rlPolarACartesiano.
function rlAnguloDesdePunto(x, y) {
  // Vector del centro al punto, con el MISMO signo que en rlPolarACartesiano.
  // Cuadramos dy a ≥ 0 para que un dedo por debajo de la base cuente como el
  // extremo más cercano y no como un ángulo raro. atan2 da radianes → grados, y
  // acotamos a [0, 180] por seguridad.
  const dx = RL_SVG_CX - x;
  const dy = Math.max(0, RL_SVG_CY - y);
  const angulo = Math.atan2(dy, dx) * 180 / Math.PI;
  return Math.max(0, Math.min(180, angulo));
}

// ============================================================
//  Flujo de turnos y puntuación
// ============================================================

// Jugador al que le toca adivinar ahora (turnoIndex indexa la lista ya barajada).
function rlJugadorActual() {
  return rlEstado.jugadores[rlEstado.turnoIndex];
}
function rlNombreActual() {
  return rlJugadorActual().nombre;
}

// Prepara un turno nuevo: posición NUEVA del sector (aunque la temática se repita),
// sub-estado "pista", y muestra la pantalla de cambio de jugador con quién adivina.
function rlIrATurno() {
  rlNuevaPosicion();
  rlEstado.subEstado = "pista";
  document.getElementById("rl-turno-nombre").textContent = rlNombreActual();
  mostrarPantalla("rl-turno");
  // Guardamos con el sector aún sin revelar: "Continuar" siempre reanuda en un
  // turno limpio, nunca a mitad de una adivinanza.
  rlGuardar();
}

// "Ver ruleta": el grupo ve el sector (sub-estado pista) para pensar la pista.
function rlVerRuleta() {
  rlEstado.subEstado = "pista";
  rlTapaAngulo = 0;      // arranca tapada...
  rlPintarRuleta();      // ...con el sector dibujado debajo
  mostrarPantalla("rl-juego");
  rlAnimarTapa(0, 180);  // se destapa (0° → 180°)
}

// "Ocultar y pasar a NOMBRE": tapa el sector y pasa a que el jugador adivine.
function rlOcultar() {
  rlEstado.anguloAguja = 90; // la aguja arranca centrada para adivinar
  // Cerramos la tapa sobre el sector aún visible (180° → 0°, inverso al destapado);
  // al acabar entramos en "adivinando", que quita el sector del DOM (ya oculto).
  rlAnimarTapa(180, 0, () => {
    rlEstado.subEstado = "adivinando";
    rlPintarRuleta();
  });
}

// "Confirmar": calcula los puntos, se los suma al jugador y revela el resultado.
function rlConfirmar() {
  const puntos = rlCalcularPuntos(rlEstado.anguloAguja, rlEstado.centroSector);
  rlJugadorActual().puntos += puntos;
  rlEstado.subEstado = "resultado";
  rlTapaAngulo = 0;                     // el sector está tapado...
  rlPintarRuleta();                     // ...se dibuja debajo, con la aguja fija encima
  rlAnimarTapa(0, 180, rlAnimarPuntos); // se destapa y luego "pop" en los puntos
}

// "Siguiente": avanza al siguiente jugador/temática, o termina la partida.
function rlSiguiente() {
  // Doble rotación: el módulo hace que el turno vuelva a 0 tras el último jugador.
  rlEstado.turnoIndex = (rlEstado.turnoIndex + 1) % rlEstado.jugadores.length;
  // Al volver a 0, todos adivinaron esta temática → pasamos a la siguiente; si ya
  // no quedan, la partida termina.
  if (rlEstado.turnoIndex === 0) {
    rlEstado.tematicaIndex++;
    if (rlEstado.tematicaIndex >= rlEstado.tematicas.length) {
      rlTerminar();
      return;
    }
  }
  rlIrATurno();
}

// Fin de la partida: pinta el ranking y muestra la pantalla final.
function rlTerminar() {
  rlBorrar(); // la partida acabó: ya no hay nada que reanudar
  rlRenderRanking();
  mostrarPantalla("rl-fin");
}

// ============================================================
//  Pantalla final: ranking con medallas
// ============================================================

// Medallas y clases de color por puesto (0 = oro). Reutilizamos las clases .podio-*
// del CSS de DescriptIA. Prefijadas (RL_) para no chocar con las suyas (MEDALLAS…).
const RL_MEDALLAS = ["🥇", "🥈", "🥉"];
const RL_CLASES_PODIO = ["podio-oro", "podio-plata", "podio-bronce"];

// Pinta el ranking final: jugadores ordenados por puntos, con medallas y empates.
function rlRenderRanking() {
  const cont = document.getElementById("rl-ranking");
  cont.innerHTML = "";

  // Copia y ordena de mayor a menor (slice() no toca el array original; b − a =
  // descendente). El `puesto` solo salta a `i` cuando cambian los puntos respecto al
  // anterior; si empatan, se arrastra el mismo puesto → comparten medalla.
  const ordenados = rlEstado.jugadores.slice().sort((a, b) => b.puntos - a.puntos);
  let puesto = 0;
  for (let i = 0; i < ordenados.length; i++) {
    if (i > 0 && ordenados[i].puntos !== ordenados[i - 1].puntos) {
      puesto = i;
    }
    rlPintarFilaRanking(ordenados[i], puesto, cont);
  }
}

// Crea una fila del ranking (medalla + nombre + puntos) reutilizando las clases
// .podio-* de DescriptIA. `puesto` 0/1/2 = oro/plata/bronce; del 3 en adelante, sin medalla.
function rlPintarFilaRanking(jugador, puesto, cont) {
  const medalla = RL_MEDALLAS[puesto] || "";
  const clase = RL_CLASES_PODIO[puesto] || "podio-resto";

  const fila = document.createElement("div");
  fila.className = `podio-fila ${clase}`;

  const info = document.createElement("div");
  info.className = "podio-info";

  const emoji = document.createElement("span");
  emoji.className = "podio-medalla";
  emoji.textContent = medalla || "•"; // un punto si no hay medalla

  const nombre = document.createElement("span");
  nombre.className = "podio-nombre";
  nombre.textContent = jugador.nombre;

  info.append(emoji, nombre);

  const puntos = document.createElement("span");
  puntos.className = "podio-aciertos";
  puntos.textContent = jugador.puntos;

  fila.append(info, puntos);
  cont.appendChild(fila);
}

// ============================================================
//  Continuar partida (persistencia en localStorage)
// ============================================================

// Clave bajo la que se guarda la partida. Prefijada (ruleta_) para no chocar con
// las de DescriptIA ("descriptia_partida") ni Cartas ("cartas_partida").
const RL_CLAVE_GUARDADO = "ruleta_partida";

// Mismo patrón que Cartas (cfGuardar / cfCargar / cfHayPartidaGuardada): lo único
// específico es la clave (RL_CLAVE_GUARDADO) y el objeto (rlEstado); el resto
// (try/catch + JSON) es genérico y algún día podría subir a js/nucleo/.

// Guarda rlEstado en localStorage. localStorage solo almacena TEXTO, por eso
// JSON.stringify. El try/catch cubre el modo privado o sin espacio (si falla, no se
// guarda, pero el juego sigue).
function rlGuardar() {
  try {
    localStorage.setItem(RL_CLAVE_GUARDADO, JSON.stringify(rlEstado));
  } catch (e) {
    console.warn("No se pudo guardar la partida:", e);
  }
}

// Carga la partida guardada DENTRO de rlEstado. Devuelve true si había una válida.
function rlCargar() {
  let texto = null;
  try {
    texto = localStorage.getItem(RL_CLAVE_GUARDADO);
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

  // Object.assign copia las propiedades de `datos` encima de rlEstado, dejándolo
  // igual que cuando se guardó (jugadores, puntos, tematicas, índices de turno...).
  Object.assign(rlEstado, datos);
  return true;
}

// ¿Hay una partida guardada? (solo comprueba, sin tocar rlEstado). Decide si se
// muestra el botón "Continuar" en la configuración.
function rlHayPartidaGuardada() {
  try {
    return localStorage.getItem(RL_CLAVE_GUARDADO) !== null;
  } catch (e) {
    return false;
  }
}

// Borra la partida guardada (al terminar). Genérico salvo la clave.
function rlBorrar() {
  try {
    localStorage.removeItem(RL_CLAVE_GUARDADO);
  } catch (e) {
    // Si no se puede borrar, tampoco es crítico.
  }
}

// Reanuda la partida guardada: la carga en rlEstado y reinicia su turno (con posición
// NUEVA, para que nadie recuerde la revelación anterior). Enganchado a "Continuar".
function rlReanudar() {
  if (rlCargar()) {
    rlIrATurno();
  }
}

// Cada juego registra su propio wiring cuando el DOM está listo (igual que Cartas
// y DescriptIA). El núcleo, aparte, arranca mostrando el hub.
document.addEventListener("DOMContentLoaded", rlConectar);

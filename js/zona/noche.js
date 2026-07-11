// Zona Tensionada: la noche (Fase 5).
//
// La maneja la PERSONA NARRADORA: lee en alto la instrucción de cada turno y
// pulsa según los gestos silenciosos de cada rol; el resto tiene los ojos
// cerrados. Cada pantalla de turno muestra la carta del rol + su efecto arriba
// y la acción (lista de objetivos / botones) debajo.
//
// Se carga DESPUÉS de js/zona/main.js (usa ztEstado y los helpers de allí) y
// ANTES de js/nucleo/arranque.js. Las funciones se llaman en tiempo de
// ejecución, así que también puede usar las de js/zona/dia.js sin problema.

// ============================================================
//  Arranque y cola de turnos
// ============================================================

// Empieza una noche nueva. También la usa ztReanudar() para repetir la MISMA
// noche tras una recarga (restando 1 a `noche` antes de llamar).
function ztEmpezarNoche() {
  ztEstado.noche += 1;
  ztEstado.fase = "noche";
  // Se descartan las intenciones de la noche anterior (o de una reanudación).
  ztEstado.victimaNoche = null;
  ztEstado.salvadaNoche = false;
  ztEstado.resultadoNoche = null;
  ztEstado.jugadores.forEach((j) => {
    j.sinVotoHoy = false; // el castigo del pisoturista dura UN día
  });
  // La cola se RECONSTRUYE cada noche (ztConstruirColaTurnos): así los turnos
  // de los roles eliminados desaparecen solos y la Inmobiliaria solo sale la
  // noche 1, sin andar escondiendo pantallas a mano.
  ztEstado.colaTurnos = ztConstruirColaTurnos();
  ztEstado.turnoIndex = 0;
  ztGuardar(); // punto de guardado seguro (§8): inicio de noche, sin intenciones
  ztRenderNocheIntro();
  mostrarPantalla("zt-noche");
}

// La cola de turnos como máquina de estados: se RECONSTRUYE desde cero cada
// noche (en vez de esconder pantallas a mano) recorriendo ZT_ROLES y
// quedándose con los roles que tengan `ordenNoche` (los pasivos no tienen
// turno) y algún jugador VIVO con ese rol (para los buitres basta con que
// quede uno: el turno es del grupo); los `soloNoche1` solo entran la primera
// noche. Se ordena por `ordenNoche` ascendente. Al calcularse desde el ESTADO
// actual (quién vive, qué noche es), nunca se desincroniza: no hay nada que
// "acordarse de ocultar" cuando alguien muere.
function ztConstruirColaTurnos() {
  const cola = [];
  Object.keys(ZT_ROLES).forEach((clave) => {
    const rol = ZT_ROLES[clave];
    if (rol.ordenNoche !== undefined) {
      if (ztIndicesVivos((j) => j.rol === clave).length > 0) {
        if (!(rol.soloNoche1 && ztEstado.noche !== 1)) {
          cola.push(clave);
        }
      }
    }
  });
  return cola.sort((a, b) => ZT_ROLES[a].ordenNoche - ZT_ROLES[b].ordenNoche);
}

// ============================================================
//  Render de la noche
// ============================================================

// Portada de la noche: texto ambiental y un botón para arrancar los turnos
// (da tiempo a que la narradora coja el móvil y el barrio cierre los ojos).
function ztRenderNocheIntro() {
  ztLimpiarNoche();
  document.getElementById("zt-noche-titulo").textContent =
    `Noche ${ztEstado.noche} 🌙`;
  document.getElementById("zt-noche-efecto").textContent = ztTexto("noche");
  document.getElementById("zt-noche-instruccion").textContent =
    "Narradora: pide al barrio que cierre los ojos y lee cada turno en voz alta.";
  ztBotonNoche("Empezar los turnos", ztRenderTurno);
}

// Pinta el turno actual de la cola; si no quedan, resuelve la noche y amanece.
function ztRenderTurno() {
  // Limpiar las zonas del turno anterior.
  document.getElementById("zt-noche-objetivos").innerHTML = "";
  document.getElementById("zt-noche-acciones").innerHTML = "";
  document.getElementById("zt-noche-resultado").textContent = "";

  const rol = ztEstado.colaTurnos[ztEstado.turnoIndex];
  if (rol === undefined) {
    // Se acabaron los turnos: convertir intenciones en resultado y amanecer.
    ztResolverNoche();
    ztEmpezarDia(); // js/zona/dia.js
    return;
  }

  // Cabecera del turno: carta + efecto + instrucción, todo desde el catálogo.
  const datos = ZT_ROLES[rol];
  document.getElementById("zt-noche-titulo").textContent =
    `Noche ${ztEstado.noche} 🌙`;
  const carta = document.getElementById("zt-noche-carta");
  carta.src = datos.carta;
  carta.hidden = false;
  document.getElementById("zt-noche-efecto").textContent = datos.efecto;
  // La Plataforma NO abre los ojos con los buitres: ni ella sabe quiénes son
  // ni ellos la conocen (decisión v3.9, cambia la del §4.2 del plan).
  document.getElementById("zt-noche-instruccion").textContent = datos.instruccion;

  // La acción de cada turno sí es un despacho por rol: es el único sitio donde
  // los roles se comportan DISTINTO de verdad (qué se pulsa y qué pasa). Las
  // banderas del catálogo ya decidieron QUIÉN sale y CUÁNDO (ztConstruirColaTurnos).
  if (rol === "inmobiliaria") ztTurnoInmobiliaria();
  else if (rol === "buitre") ztTurnoBuitres();
  else if (rol === "plataforma") ztTurnoPlataforma();
  else if (rol === "hacienda") ztTurnoHacienda();
  else if (rol === "sindicato") ztTurnoSindicato();
}

function ztAvanzarTurno() {
  ztEstado.turnoIndex += 1;
  ztRenderTurno();
}

// Vacía TODO el contenido de la pantalla de noche. Se llama al amanecer y al
// pintar la portada: criterio §6, la información sensible (resultado de una
// inspección, la víctima que vio el Sindicato) no debe quedar en el DOM.
function ztLimpiarNoche() {
  const carta = document.getElementById("zt-noche-carta");
  carta.removeAttribute("src"); // src="" pintaría el icono de imagen rota
  carta.hidden = true;
  document.getElementById("zt-noche-efecto").textContent = "";
  document.getElementById("zt-noche-instruccion").textContent = "";
  document.getElementById("zt-noche-objetivos").innerHTML = "";
  document.getElementById("zt-noche-resultado").textContent = "";
  document.getElementById("zt-noche-acciones").innerHTML = "";
}

// Crea un botón en la zona de acciones de la noche y lo devuelve.
function ztBotonNoche(texto, accion, secundario) {
  const boton = document.createElement("button");
  boton.type = "button";
  if (secundario) boton.className = "secundario";
  boton.textContent = texto;
  boton.addEventListener("click", accion);
  document.getElementById("zt-noche-acciones").appendChild(boton);
  return boton;
}

// ============================================================
//  Los turnos, uno a uno (recogen INTENCIONES; nadie muere aún)
// ============================================================

// Buitres: eligen víctima. La narradora pulsa el nombre que señalen (pueden
// señalar a cualquiera vivo, también a la Plataforma si quieren traicionarla).
function ztTurnoBuitres() {
  ztPintarLista("zt-noche-objetivos", ztIndicesVivos(), (i) => {
    ztEstado.victimaNoche = i;
    ztAvanzarTurno();
  });
}

// Plataforma: elige quién se queda sin voto mañana. Se marca directamente en el
// jugador (no hay nada que "resolver": el efecto no depende de nadie más).
function ztTurnoPlataforma() {
  ztPintarLista("zt-noche-objetivos", ztIndicesVivos(), (i) => {
    ztEstado.jugadores[i].sinVotoHoy = true;
    ztAvanzarTurno();
  });
}

// Hacienda: inspecciona y ve el resultado al momento. La Plataforma sale
// "inocente" (como el traidor clásico): solo el rol exacto "buitre" delata.
function ztTurnoHacienda() {
  ztPintarLista("zt-noche-objetivos", ztIndicesVivos(), (i) => {
    const jugador = ztEstado.jugadores[i];
    const clave =
      jugador.rol === "buitre" ? "inspeccionCulpable" : "inspeccionInocente";
    document.getElementById("zt-noche-resultado").textContent =
      ztTexto(clave, jugador.nombre);
    // Elección hecha: fuera la lista, y un botón para cerrar el turno.
    document.getElementById("zt-noche-objetivos").innerHTML = "";
    ztBotonNoche("Hacienda cierra los ojos", ztAvanzarTurno);
  });
}

// Sindicato: ve quién ha caído y decide si gasta su ÚNICO uso. El turno sale
// aunque la cacerolada esté gastada (decisión §3: el botón deshabilitado no
// delata nada; que el turno desapareciera, sí).
function ztTurnoSindicato() {
  const v = ztEstado.victimaNoche;
  document.getElementById("zt-noche-resultado").textContent =
    v === null
      ? "Esta noche los buitres no han señalado a nadie."
      : `Los buitres han ido a por: ${ztNombre(v)}.`;

  const cacerolada = ztBotonNoche("🍲 Convocar la cacerolada (salvar)", () => {
    ztEstado.sindicatoDisponible = false; // se gasta PARA SIEMPRE
    ztEstado.salvadaNoche = true;         // esta noche hay salvación
    ztAvanzarTurno();
  });
  ztActualizarBotonCacerolada(cacerolada);
  ztBotonNoche("No intervenir", ztAvanzarTurno, true);
}

// El botón de un solo uso: manda el ESTADO, no el DOM. El botón se CREA nuevo
// en cada render del turno, así que si el "gastado" viviera en el DOM (el
// atributo disabled del botón de ayer) se perdería en cada re-render y al
// recargar la página. Como vive en ztEstado.sindicatoDisponible, cualquier
// render futuro (y la partida guardada de la Fase 8) lo reflejan solos. Es la
// misma idea que rlActualizarControles() en js/ruleta/main.js:260: el estado
// decide, el DOM obedece.
function ztActualizarBotonCacerolada(boton) {
  if (ztEstado.sindicatoDisponible) {
    boton.disabled = false;
    boton.textContent = "🍲 Convocar la cacerolada (salvar)";
  } else {
    boton.disabled = true;
    boton.textContent = "🍲 Cacerolada (ya usada)";
  }
}

// Inmobiliaria (solo noche 1): elige DOS personas. La primera pulsación marca
// (clase .zt-seleccionado); la segunda, si es otra persona, cierra la pareja.
let ztParejaPrimera = null;

function ztTurnoInmobiliaria() {
  ztParejaPrimera = null;
  ztPintarLista("zt-noche-objetivos", ztIndicesVivos(), (i, boton) => {
    if (ztParejaPrimera === null) {
      ztParejaPrimera = i;
      boton.classList.add("zt-seleccionado");
      return;
    }
    if (i === ztParejaPrimera) return; // nadie comparte piso consigo mismo
    // Pareja simétrica: cada uno guarda el índice del otro (lo lee ztEliminar).
    ztEstado.jugadores[ztParejaPrimera].parejaCon = i;
    ztEstado.jugadores[i].parejaCon = ztParejaPrimera;
    ztAvanzarTurno();
  });
}

// ============================================================
//  Resolución (al acabar la cola, antes de amanecer)
// ============================================================

// Resuelve la noche: convierte las intenciones recogidas en los turnos en un
// resultado, sin eliminar a nadie todavía (eso lo hace el amanecer con
// ztEliminar(), con el móvil ya en la mesa). Deja en ztEstado.resultadoNoche
// un { tipo, victima } con tipo "nadie" (sin víctima), "salvado" (el Sindicato
// gastó la cacerolada — se comprueba ANTES que el Okupa, para que si salvan
// al Okupa no gaste su resistencia), "okupa" (resiste la primera vez) o
// "desahucio" en cualquier otro caso. Separar "recoger intenciones" (los
// turnos) de "aplicar efectos" (amanecer) hace explícito este orden, en vez de
// repartirlo entre pantallas.
function ztResolverNoche() {
  ztEstado.resultadoNoche = { victima: ztEstado.victimaNoche, tipo: null };
  if (ztEstado.victimaNoche === null) {
    ztEstado.resultadoNoche.tipo = "nadie";
  } else if (ztEstado.salvadaNoche) {
    ztEstado.resultadoNoche.tipo = "salvado";
  } else {
    const victima = ztEstado.jugadores[ztEstado.victimaNoche];
    if (victima.rol === "okupa" && !ztEstado.okupaResistio) {
      ztEstado.okupaResistio = true;
      ztEstado.resultadoNoche.tipo = "okupa";
    } else {
      ztEstado.resultadoNoche.tipo = "desahucio";
    }
  }
}

// Zona Tensionada: el día (Fase 6) y el fin de partida (Fase 7).
//
// El día tiene dos momentos: AMANECER (la app aplica y anuncia el resultado de
// la noche) y VOTACIÓN (tras el debate libre, sin app, se registra a quién
// expulsa la asamblea). Entre medias pueden colarse pasos pendientes: la
// venganza del Tasador (elige una persona) y la elección de sucesor si cae el
// Concejal. ztContinuarDia() es quien decide, tras cada paso, qué toca ahora.
//
// Se carga después de main.js y noche.js.

// En qué momento del día estamos: decide el botón final que ofrece
// ztContinuarDia() (ir a la asamblea / volver a dormir). Estado de UI
// transitorio: si se recarga a mitad de día, se reanuda desde el amanecer (§8).
let ztDiaMomento = "amanecer"; // "amanecer" | "votacion"

// ============================================================
//  Amanecer: aplicar la noche y anunciarla
// ============================================================

function ztEmpezarDia() {
  ztEstado.fase = "dia";
  // Punto de guardado seguro (§8): se guarda ANTES de aplicar nada, con el
  // resultadoNoche ya calculado. Reanudar re-ejecuta este amanecer entero.
  ztGuardar();
  ztLimpiarNoche(); // que no quede información sensible en la pantalla de noche
  ztDiaMomento = "amanecer";
  ztRenderDia("Amanece en el barrio ☀️");
  mostrarPantalla("zt-dia");

  const r = ztEstado.resultadoNoche || { tipo: "nadie", victima: null };
  if (r.tipo === "desahucio") {
    ztAnadirAnuncio(ztTexto("desahucio", ztNombre(r.victima)));
    // AQUÍ muere de verdad la víctima, con sus cascadas (ztEliminar).
    ztAnunciarCascadas(ztEliminar(r.victima), r.victima);
  } else if (r.tipo === "salvado") {
    ztAnadirAnuncio(ztTexto("salvacion", ztNombre(r.victima)));
  } else if (r.tipo === "okupa") {
    ztAnadirAnuncio(ztTexto("okupa")); // sin nombre: no delatar al Okupa
  } else {
    ztAnadirAnuncio(ztTexto("nadie"));
  }

  // Quién se queda hoy sin voto (lo marcó la Plataforma esta noche).
  ztEstado.jugadores.forEach((j) => {
    if (j.vivo && j.sinVotoHoy) ztAnadirAnuncio(ztTexto("pisoturista", j.nombre));
  });

  ztContinuarDia();
}

// ============================================================
//  El "director de orquesta" del día
// ============================================================

// Tras CADA paso del día (amanecer aplicado, venganza resuelta, expulsión
// registrada…) se vuelve aquí, que revisa pendientes EN ESTE ORDEN:
function ztContinuarDia() {
  // 1. ¿Hay un Tasador caído sin vengarse? Su venganza es una ELECCIÓN humana:
  //    hay que parar y esperarla (ztEliminar solo deja la señal).
  if (ztEstado.tasadorPendiente !== null) {
    ztElegirVenganza();
    return;
  }

  // 2. ¿Alguien ha ganado ya? La victoria se comprueba después de cada tanda de
  //    eliminaciones: tras aplicar la noche y tras la votación. Este punto
  //    único (ztComprobarVictoria) cubre ambas porque las dos pasan por aquí.
  const ganador = ztComprobarVictoria();
  if (ganador) {
    ztTerminarPartida(ganador);
    return;
  }

  // 3. Nada pendiente: el botón que toque según el momento del día. Si ha
  //    caído el Concejal, su relevo se decide AL PULSAR el botón (ztAvanzarDia):
  //    así el resumen se lee entero antes de interrumpir con la elección.
  document.getElementById("zt-dia-acciones").innerHTML = "";
  if (ztDiaMomento === "amanecer") {
    ztBotonDia("Hemos debatido: ¡a la asamblea! 🗳️", () =>
      ztAvanzarDia(ztIrAVotacion)
    );
  } else {
    ztBotonDia("La ciudad vuelve a dormir 🌙", () =>
      ztAvanzarDia(ztEmpezarNoche)
    );
  }
}

// Avanza al siguiente momento (la asamblea o la noche) pasando antes, si el
// Concejal ha caído, por la elección de su sucesor a mano alzada (decisión §3:
// se reutiliza su pantalla, o «Sin Concejal»). Se hace aquí y no nada más caer
// para que primero se vea el resumen completo (del amanecer o de la asamblea)
// y la elección llegue justo antes del momento en que el voto doble importa.
function ztAvanzarDia(destino) {
  if (
    ztEstado.concejalIndex !== null &&
    !ztEstado.jugadores[ztEstado.concejalIndex].vivo
  ) {
    ztEstado.concejalIndex = null;
    ztEntrarConcejal(
      destino,
      "El Concejal ha caído. Votad a mano alzada a su sucesor (o seguid sin Concejal)."
    );
    return;
  }
  destino();
}

// El Tasador caído elige a quién se lleva por delante.
function ztElegirVenganza() {
  const t = ztEstado.tasadorPendiente;
  document.getElementById("zt-dia-acciones").innerHTML = "";
  document.getElementById("zt-dia-ayuda").textContent =
    `${ztNombre(t)} era el Tasador: que elija a quién se lleva por delante.`;
  ztPintarLista("zt-dia-lista", ztIndicesVivos(), (i) => {
    ztEstado.tasadorPendiente = null; // venganza consumida
    document.getElementById("zt-dia-lista").innerHTML = "";
    document.getElementById("zt-dia-ayuda").textContent = "";
    ztAnadirAnuncio(ztTexto("venganzaTasador", ztNombre(i)));
    ztAnunciarCascadas(ztEliminar(i), i);
    ztContinuarDia(); // puede haber ganador nuevo, o el Concejal cayó ahora…
  });
}

// ============================================================
//  Votación de la asamblea (a mano alzada; aquí solo se registra)
// ============================================================

function ztIrAVotacion() {
  ztDiaMomento = "votacion";
  ztRenderDia("Asamblea de vecinos 🗳️");
  // Puede llegarse aquí desde la pantalla del Concejal (ztAvanzarDia eligió
  // sucesor por el camino): asegurar que se vuelve a la del día.
  mostrarPantalla("zt-dia");
  const recordatorio =
    ztEstado.concejalIndex !== null
      ? `El voto de ${ztNombre(ztEstado.concejalIndex)} (Concejal) vale doble y desempata. `
      : "";
  document.getElementById("zt-dia-ayuda").textContent =
    recordatorio +
    "Votad a mano alzada y registrad aquí el resultado. Quien es pisoturista hoy no vota.";
  // Lista de candidatos a EXPULSIÓN: todos los vivos. El pisoturista pierde su
  // voto (§4.3), pero sigue pudiendo ser expulsado; si quedara fuera de esta
  // lista, un buitre señalado por la Plataforma sería inexpulsable.
  ztPintarLista("zt-dia-lista", ztIndicesVivos(), (i) =>
    ztRegistrarExpulsion(i)
  );
  ztBotonDia("Nadie ha sido expulsado", () => ztRegistrarExpulsion(null), true);
}

function ztRegistrarExpulsion(indice) {
  ztRenderDia("La asamblea ha hablado");

  if (indice === null) {
    ztAnadirAnuncio(ztTexto("expulsionNadie"));
    ztContinuarDia();
    return;
  }

  const jugador = ztEstado.jugadores[indice];

  // El Influencer QUERÍA esto: victoria personal, eliminado, y la partida sigue.
  if (jugador.rol === "influencer") {
    ztEstado.influencerGano = true;
    ztAnadirAnuncio(ztTexto("influencer", jugador.nombre));
    ztAnunciarCascadas(ztEliminar(indice), indice);
    ztContinuarDia();
    return;
  }

  ztAnadirAnuncio(ztTexto("expulsion", jugador.nombre));
  // Decisión §4.3 (propuesta aceptada): se revela el rol EXACTO, como en el clásico.
  ztAnadirAnuncio(`${jugador.nombre} era: ${ZT_ROLES[jugador.rol].nombre}.`);
  ztAnunciarCascadas(ztEliminar(indice), indice);
  ztContinuarDia();
}

// ============================================================
//  Render del día (anuncios y botones)
// ============================================================

// Deja la pantalla del día limpia con su título; los anuncios se van añadiendo.
function ztRenderDia(titulo) {
  document.getElementById("zt-dia-titulo").textContent = titulo;
  document.getElementById("zt-dia-anuncios").innerHTML = "";
  document.getElementById("zt-dia-lista").innerHTML = "";
  document.getElementById("zt-dia-acciones").innerHTML = "";
  document.getElementById("zt-dia-ayuda").textContent = "";
}

function ztAnadirAnuncio(texto) {
  const p = document.createElement("p");
  p.className = "zt-anuncio";
  p.textContent = texto;
  document.getElementById("zt-dia-anuncios").appendChild(p);
}

// Anuncia a los caídos EN CASCADA: todos los de `caidos` menos `primero`, que
// ya tuvo su propio anuncio (desahucio/expulsión/venganza).
function ztAnunciarCascadas(caidos, primero) {
  (caidos || []).forEach((i) => {
    if (i !== primero) ztAnadirAnuncio(ztTexto("pareja", ztNombre(i)));
  });
}

function ztBotonDia(texto, accion, secundario) {
  const boton = document.createElement("button");
  boton.type = "button";
  if (secundario) boton.className = "secundario";
  boton.textContent = texto;
  boton.addEventListener("click", accion);
  document.getElementById("zt-dia-acciones").appendChild(boton);
  return boton;
}

// ============================================================
//  Eliminar (con cascadas) y comprobar la victoria
// ============================================================

// ztEliminar: UNA función de eliminación para todo el juego, con una COLA (no
// recursión ciega). La usan el amanecer (víctima de la noche), la votación
// (expulsado) y la venganza del Tasador; si cada sitio repitiera las cascadas,
// la pareja funcionaría en uno y se olvidaría en otro (caso borde §8). Elimina
// al jugador `indice` y procesa TODAS las consecuencias encadenadas (pareja de
// piso, venganza del Tasador dejada pendiente para una elección humana), y
// devuelve un array con los índices caídos en orden (el primero es `indice`).
// Saltar a quien ya no está vivo corta los bucles (la pareja A↔B se meterían
// el uno al otro eternamente si no). Con una sola carta de Tasador en v1,
// tasadorPendiente no puede pisarse; el caso «la pareja era OTRO Tasador» del
// §8 no existe todavía.
function ztEliminar(indice) {
  const cola = [indice];
  const caidos = [];

  while (cola.length > 0) {
    const actual = cola.shift();
    const jugador = ztEstado.jugadores[actual];

    if (!jugador.vivo) continue; // ya eliminado, saltar

    jugador.vivo = false;
    caidos.push(actual);

    // Si tiene pareja viva, añadirla a la cola
    if (jugador.parejaCon !== null) {
      const parejaIndice = jugador.parejaCon;
      const parejaJugador = ztEstado.jugadores[parejaIndice];
      if (parejaJugador.vivo) {
        cola.push(parejaIndice);
      }
    }

    // Si es Tasador, marcar venganza pendiente
    if (jugador.rol === "tasador") {
      ztEstado.tasadorPendiente = actual;
    }
  }

  return caidos;
}

// ztComprobarVictoria: cuenta vivos y decide. Devuelve "pareja", "buitres",
// "vecinos" o null (nadie gana aún); la llama ztContinuarDia() tras cada
// tanda de eliminaciones (después de aplicar la noche y después de la
// votación: los dos momentos del §4.1). El ORDEN importa (§8): la pareja
// mixta se comprueba ANTES que el empate de buitres, porque «1 buitre + 1
// vecino emparejados, solos» también cumpliría el empate y ganarían los
// buitres por error. Para el empate solo cuenta el rol exacto "buitre" (la
// Plataforma ayuda, pero no desahucia).
function ztComprobarVictoria() {
  const vivos = ztIndicesVivos();
  if (vivos.length === 2) {
    const [a, b] = vivos;
    const jugadorA = ztEstado.jugadores[a];
    const jugadorB = ztEstado.jugadores[b];
    if (
      jugadorA.parejaCon === b &&
      jugadorB.parejaCon === a &&
      ZT_ROLES[jugadorA.rol].bando !== ZT_ROLES[jugadorB.rol].bando
    ) {
      return "pareja";
    }
  }
  
  const buitresVivos = vivos.filter((i) => ztEstado.jugadores[i].rol === "buitre");
  if (buitresVivos.length === 0) {
    return "vecinos";
  }
  if (buitresVivos.length >= vivos.length - buitresVivos.length) {
    return "buitres";
  }
  return null;
}

// ============================================================
//  Fin de la partida (Fase 7)
// ============================================================

function ztTerminarPartida(ganador) {
  ztEstado.ganador = ganador;
  ztEstado.fase = "fin";
  ztBorrar(); // la partida acabó: ya no hay nada que reanudar

  // Titular CORTO (un h1 largo se desborda en móvil); la frase paródica de
  // ZT_TEXTOS va debajo, en su propio párrafo.
  const titulos = {
    buitres: "Ganan los Fondos Buitre 🏦",
    vecinos: "¡Gana el barrio! 🏘️",
    pareja: "¡Gana la pareja! 🤝",
  };
  const claves = {
    buitres: "victoriaBuitres",
    vecinos: "victoriaVecinos",
    pareja: "victoriaPareja",
  };
  document.getElementById("zt-fin-titulo").textContent = titulos[ganador];
  document.getElementById("zt-fin-frase").textContent = ztTexto(claves[ganador]);

  // Menciones especiales bajo el titular.
  const menciones = [];
  if (ztEstado.influencerGano) {
    menciones.push(
      "📱 El Influencer ya había ganado por su cuenta: doble ración de stories esta noche."
    );
  }
  if (ganador === "pareja") {
    menciones.push(
      `🤝 Compañeros de piso hasta el final: ${ztIndicesVivos().map(ztNombre).join(" y ")}.`
    );
  }
  document.getElementById("zt-fin-menciones").textContent = menciones.join(" ");

  ztRenderListaFinal();
  mostrarPantalla("zt-fin");
}

// La lista final: pinta en #zt-fin-lista una fila por jugador con su nombre en
// negrita, el nombre de su rol (sacado de ZT_ROLES, sin duplicar textos que ya
// viven en el catálogo) y su estado con color (ztEstadoFinal). Como
// ztRenderNombres() (js/zona/main.js): createElement + textContent en vez de
// innerHTML, para que un nombre con caracteres tipo "<" no rompa la fila.
function ztRenderListaFinal() {
  const contenedor = document.getElementById("zt-fin-lista");
  contenedor.innerHTML = "";

  ztEstado.jugadores.forEach((jugador) => {
    const fila = document.createElement("div");
    fila.className = "zt-anuncio";

    const nombre = document.createElement("strong");
    nombre.textContent = jugador.nombre;

    const rol = document.createTextNode(
      ` — ${ZT_ROLES[jugador.rol].nombre} — `
    );

    const resultado = ztEstadoFinal(jugador);
    const estado = document.createElement("span");
    estado.className = resultado.clase;
    estado.textContent = resultado.texto;

    fila.append(nombre, rol, estado);
    contenedor.appendChild(fila);
  });
}

// Estado final de un jugador: { texto, clase } para la lista del fin. Ganador
// en verde y desahuciado en rojo; en ámbar los términos medios: la victoria
// personal del Influencer (aunque la partida la acabara ganando otro bando),
// quien ganó con su bando pero cayó por el camino, y quien acabó en pie pero
// en el bando perdedor.
function ztEstadoFinal(jugador) {
  if (jugador.rol === "influencer" && ztEstado.influencerGano) {
    return { texto: "Victoria personal", clase: "zt-fin-estado-medio" };
  }

  // Si ganó la pareja, los ganadores son sus dos miembros (los únicos vivos);
  // si ganó un bando, gana todo su bando (la Plataforma cuenta como buitres).
  const gano =
    ztEstado.ganador === "pareja"
      ? jugador.vivo
      : ZT_ROLES[jugador.rol].bando === ztEstado.ganador;

  if (gano) {
    return jugador.vivo
      ? { texto: "Ganador", clase: "zt-fin-estado-ganador" }
      : { texto: "Ganador (desahuciado)", clase: "zt-fin-estado-medio" };
  }
  return jugador.vivo
    ? { texto: "Derrotado", clase: "zt-fin-estado-medio" }
    : { texto: "Desahuciado", clase: "zt-fin-estado-desahuciado" };
}
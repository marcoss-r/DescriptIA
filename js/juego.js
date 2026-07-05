// El motor del juego: turnos, temporizador, rondas y puntuación.

const DURACION_TURNO = 40; // segundos por turno
const PENALIZACION_PASAR = 5; // segundos que resta pasar (solo Ronda 1)
const TITULOS_RONDA = ["Descripción ilimitada", "Una palabra", "Gestos"];

// Estado interno del motor que no vive en `estado`.
let tarjetaActual = null; // id de la tarjeta que se muestra ahora
let intervaloTimer = null; // referencia al setInterval del temporizador

// Calcula el orden de juego intercalando equipos (round-robin):
// 1º jugador de cada equipo, luego 2º de cada equipo, etc.
// - El orden dentro de cada equipo es aleatorio.
// - Si un equipo se queda sin jugadores en una vuelta, se salta.
// Guarda el resultado en estado.ordenTurnos y lo devuelve.
function calcularOrdenTurnos() {
  // Ids de jugadores agrupados por equipo (en el orden de estado.equipos),
  // barajados dentro de cada equipo.
  const porEquipo = estado.equipos.map((equipo) =>
    barajar(
      estado.jugadores
        .filter((jugador) => jugador.equipoId === equipo.id)
        .map((jugador) => jugador.id)
    )
  );

  const maxTam = porEquipo.reduce((m, grupo) => Math.max(m, grupo.length), 0);

  const orden = [];
  for (let vuelta = 0; vuelta < maxTam; vuelta++) {
    porEquipo.forEach((grupo) => {
      if (vuelta < grupo.length) orden.push(grupo[vuelta]);
    });
  }

  estado.ordenTurnos = orden;
  estado.turnoIndex = 0;
  return orden;
}

// ============================================================
//  Consultas de apoyo
// ============================================================
function jugadorActual() {
  const id = estado.ordenTurnos[estado.turnoIndex];
  return estado.jugadores.find((j) => j.id === id);
}

function equipoDe(jugador) {
  return estado.equipos.find((e) => e.id === jugador.equipoId);
}

function tarjetaPorId(id) {
  return estado.tarjetasPartida.find((t) => t.id === id);
}

// Resultado registrado este turno para una tarjeta ("acierto"/"pasada"), o null.
function resultadoDe(tarjetaId) {
  const entrada = estado.minironda.resultados.find(
    (r) => r.tarjetaId === tarjetaId
  );
  return entrada ? entrada.resultado : null;
}

// ============================================================
//  Arranque de partida / ronda / turno
// ============================================================

// Inicia la partida desde la primera ronda con el pool completo.
function iniciarPartida() {
  estado.rondaActual = 0;
  estado.turnoIndex = 0;
  reponerPool();
  estado.tiempoRestante = DURACION_TURNO;
  mostrarPreparado();
}

// Pantalla de "prepárate": anuncia de quién es el turno antes de arrancar
// el reloj. El turno solo empieza (y corre el tiempo) al pulsar "¡Empezar!".
function mostrarPreparado() {
  estado.fase = "preparado";
  guardarEstado();

  const jugador = jugadorActual();
  const equipo = equipoDe(jugador);
  document.getElementById("prep-ronda").textContent = `Ronda ${
    estado.rondaActual + 1
  }: ${TITULOS_RONDA[estado.rondaActual]}`;
  document.getElementById("prep-jugador").textContent = jugador.nombre;
  document.getElementById("prep-equipo").textContent = equipo.nombre;

  mostrarPantalla("preparado");
}

// Rellena el pool con las 40 tarjetas de la partida (al empezar cada ronda).
function reponerPool() {
  estado.pool = estado.tarjetasPartida.map((t) => t.id);
}

// Prepara y arranca el turno del jugador actual con estado.tiempoRestante.
function iniciarTurno() {
  estado.minironda = { vistasEnEsteTurno: [], resultados: [] };
  tarjetaActual = null;
  estado.fase = "juego";
  // Guardamos al INICIO del turno: si se recarga a mitad, se reanuda
  // este turno desde el principio (mismo jugador y su tiempo de inicio),
  // evitando trampas con el temporizador.
  guardarEstado();

  renderCabeceraJuego();
  renderTimer();
  habilitarBotonesJuego(true);
  mostrarPantalla("juego");

  avanzarTarjeta(); // saca la primera tarjeta
  arrancarTimer();
}

// ============================================================
//  Temporizador
// ============================================================
function arrancarTimer() {
  detenerTimer();
  intervaloTimer = setInterval(() => {
    estado.tiempoRestante -= 1;
    if (estado.tiempoRestante <= 0) {
      estado.tiempoRestante = 0;
      renderTimer();
      terminarTurno();
    } else {
      renderTimer();
    }
  }, 1000);
}

function detenerTimer() {
  if (intervaloTimer !== null) {
    clearInterval(intervaloTimer);
    intervaloTimer = null;
  }
}

// Resta segundos al reloj. Devuelve true si con ello se acabó el turno.
function restarTiempo(segundos) {
  estado.tiempoRestante -= segundos;
  if (estado.tiempoRestante <= 0) {
    estado.tiempoRestante = 0;
    renderTimer();
    terminarTurno();
    return true;
  }
  renderTimer();
  return false;
}

// ============================================================
//  Interacción: acertar / pasar
// ============================================================
function pulsarAcierto() {
  registrarResultado("acierto");
  avanzarTarjeta();
}

function pulsarPasar() {
  registrarResultado("pasada");
  // Solo en la Ronda 1 (rondaActual === 0) pasar penaliza tiempo.
  if (estado.rondaActual === 0) {
    if (restarTiempo(PENALIZACION_PASAR)) return; // el turno terminó
  }
  avanzarTarjeta();
}

// Guarda (o actualiza) el resultado de la tarjeta actual este turno.
function registrarResultado(resultado) {
  if (tarjetaActual === null) return;
  const existente = estado.minironda.resultados.find(
    (r) => r.tarjetaId === tarjetaActual
  );
  if (existente) {
    existente.resultado = resultado;
  } else {
    estado.minironda.resultados.push({ tarjetaId: tarjetaActual, resultado });
  }
}

// Elige la siguiente tarjeta a mostrar respetando la regla de no-repetición.
// Devuelve un id, o null si ya no hay ninguna que mostrar este turno.
function elegirSiguienteTarjetaId() {
  const acertadas = new Set(
    estado.minironda.resultados
      .filter((r) => r.resultado === "acierto")
      .map((r) => r.tarjetaId)
  );
  const vistas = new Set(estado.minironda.vistasEnEsteTurno);

  // Preferencia: tarjetas del pool que aún no han salido este turno.
  let candidatos = estado.pool.filter((id) => !vistas.has(id));

  // Si ya salieron todas, permitir que reaparezcan las pasadas (no las acertadas).
  if (candidatos.length === 0) {
    candidatos = estado.pool.filter((id) => !acertadas.has(id));
  }

  if (candidatos.length === 0) return null;

  // Evita repetir justo la misma tarjeta si hay alternativas.
  if (candidatos.length > 1 && tarjetaActual !== null) {
    candidatos = candidatos.filter((id) => id !== tarjetaActual);
  }

  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

// Muestra la siguiente tarjeta, o termina el turno si no queda ninguna.
function avanzarTarjeta() {
  const id = elegirSiguienteTarjetaId();
  if (id === null) {
    terminarTurno();
    return;
  }
  tarjetaActual = id;
  if (!estado.minironda.vistasEnEsteTurno.includes(id)) {
    estado.minironda.vistasEnEsteTurno.push(id);
  }
  renderTarjeta();
}

// Fin del turno: para el reloj y va al resumen corregible.
function terminarTurno() {
  detenerTimer();
  habilitarBotonesJuego(false);
  estado.fase = "resumen-turno";
  guardarEstado();
  renderResumenTurno();
  mostrarPantalla("resumen-turno");
}

// ============================================================
//  Resumen de la minironda (Fase 6): corrección y cierre
// ============================================================

// Cambia el resultado marcado para una tarjeta (corrección del usuario).
function corregirResultado(tarjetaId, resultado) {
  const entrada = estado.minironda.resultados.find(
    (r) => r.tarjetaId === tarjetaId
  );
  if (entrada) entrada.resultado = resultado;
  guardarEstado(); // conserva las correcciones si se recarga en el resumen
}

// Al confirmar: aplica correcciones al pool y a los aciertos, y avanza.
function terminarResumen() {
  aplicarCorreccionesAlEstado();
  if (estado.pool.length === 0) {
    finDeRonda();
  } else {
    pasarAlSiguienteJugador();
  }
}

// Vuelca el resultado FINAL del turno al estado:
// - las acertadas salen del pool (las pasadas se quedan),
// - el equipo del jugador suma sus aciertos.
function aplicarCorreccionesAlEstado() {
  const equipo = equipoDe(jugadorActual());
  const idsAcierto = new Set(
    estado.minironda.resultados
      .filter((r) => r.resultado === "acierto")
      .map((r) => r.tarjetaId)
  );
  estado.pool = estado.pool.filter((id) => !idsAcierto.has(id));
  equipo.aciertos += idsAcierto.size;
}

function pasarAlSiguienteJugador() {
  estado.turnoIndex = (estado.turnoIndex + 1) % estado.ordenTurnos.length;
  estado.tiempoRestante = DURACION_TURNO;
  mostrarPreparado();
}

// Fin de ronda (el pool se ha vaciado). Avanza de ronda o termina la partida.
function finDeRonda() {
  const esUltimaRonda = estado.rondaActual >= TITULOS_RONDA.length - 1;
  if (esUltimaRonda) {
    terminarPartida();
    return;
  }

  estado.rondaActual += 1;
  reponerPool();

  if (estado.tiempoRestante > 0) {
    // Tiempo arrastrado: sigue EL MISMO jugador con el tiempo que le quedaba.
    mostrarPreparado();
  } else {
    // Sin tiempo: empieza el siguiente jugador con el turno completo.
    estado.turnoIndex = (estado.turnoIndex + 1) % estado.ordenTurnos.length;
    estado.tiempoRestante = DURACION_TURNO;
    mostrarPreparado();
  }
}

// Fin de la partida: calcula el podio y lo muestra.
function terminarPartida() {
  detenerTimer();
  estado.fase = "final";
  guardarEstado();
  renderPodio();
  mostrarPantalla("final");
}

const MEDALLAS = ["🥇", "🥈", "🥉"];
const CLASES_PODIO = ["podio-oro", "podio-plata", "podio-bronce"];

// Ordena los equipos por aciertos (desc) y les asigna medalla por "escalón"
// de puntuación: los equipos con la MISMA puntuación comparten medalla.
function renderPodio() {
  const cont = document.getElementById("resultado-final");
  cont.innerHTML = "";

  const ordenados = estado.equipos
    .slice()
    .sort((a, b) => b.aciertos - a.aciertos);

  // Puntuaciones distintas de mayor a menor: su índice es el escalón (0=oro…).
  const escalones = [];
  ordenados.forEach((e) => {
    if (!escalones.includes(e.aciertos)) escalones.push(e.aciertos);
  });

  ordenados.forEach((equipo) => {
    const escalon = escalones.indexOf(equipo.aciertos);
    const medalla = MEDALLAS[escalon] || "";
    const clase = CLASES_PODIO[escalon] || "podio-resto";

    const fila = document.createElement("div");
    fila.className = `podio-fila ${clase}`;

    const info = document.createElement("div");
    info.className = "podio-info";

    const emoji = document.createElement("span");
    emoji.className = "podio-medalla";
    emoji.textContent = medalla || "•";

    const nombre = document.createElement("span");
    nombre.className = "podio-nombre";
    nombre.textContent = equipo.nombre;

    info.appendChild(emoji);
    info.appendChild(nombre);

    const aciertos = document.createElement("span");
    aciertos.className = "podio-aciertos";
    aciertos.textContent = equipo.aciertos;

    fila.appendChild(info);
    fila.appendChild(aciertos);
    cont.appendChild(fila);
  });
}

// ============================================================
//  Render de la pantalla de juego
// ============================================================
function renderCabeceraJuego() {
  const jugador = jugadorActual();
  const equipo = equipoDe(jugador);
  document.getElementById("juego-ronda").textContent =
    TITULOS_RONDA[estado.rondaActual];
  document.getElementById("juego-turno").textContent = `Turno de ${jugador.nombre} · ${equipo.nombre}`;
}

function renderTimer() {
  document.getElementById("juego-timer").textContent = estado.tiempoRestante;
}

function renderTarjeta() {
  const tarjeta = tarjetaPorId(tarjetaActual);
  const elTarjeta = document.getElementById("tarjeta");
  document.getElementById("tarjeta-categoria").textContent = tarjeta.categoria;
  document.getElementById("tarjeta-texto").textContent = tarjeta.texto;
  // Reinicia la animación de aparición.
  elTarjeta.classList.remove("aparece");
  void elTarjeta.offsetWidth;
  elTarjeta.classList.add("aparece");
}

function habilitarBotonesJuego(habilitar) {
  document.getElementById("btn-acierto").disabled = !habilitar;
  document.getElementById("btn-pasar").disabled = !habilitar;
}

function renderResumenTurno() {
  const jugador = jugadorActual();
  const equipo = equipoDe(jugador);
  document.getElementById("resumen-turno-jugador").textContent =
    `${jugador.nombre} · ${equipo.nombre} — corrige si hace falta y confirma`;

  const cont = document.getElementById("resumen-turno-datos");
  cont.innerHTML = "";

  if (estado.minironda.resultados.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "ayuda";
    vacio.textContent = "No salió ninguna tarjeta este turno.";
    cont.appendChild(vacio);
    return;
  }

  estado.minironda.resultados.forEach((r) => {
    const tarjeta = tarjetaPorId(r.tarjetaId);

    const fila = document.createElement("div");
    fila.className = "resumen-tarjeta";

    const btnAcierto = document.createElement("button");
    btnAcierto.type = "button";
    btnAcierto.className = "mini-btn mini-verde";
    btnAcierto.textContent = "✓";

    const btnPasada = document.createElement("button");
    btnPasada.type = "button";
    btnPasada.className = "mini-btn mini-rojo";
    btnPasada.textContent = "✗";

    const centro = document.createElement("div");
    centro.className = "resumen-tarjeta-centro";
    const texto = document.createElement("span");
    texto.className = "resumen-tarjeta-texto";
    texto.textContent = tarjeta.texto;
    const cat = document.createElement("span");
    cat.className = "resumen-tarjeta-cat";
    cat.textContent = tarjeta.categoria;
    centro.appendChild(texto);
    centro.appendChild(cat);

    // Resalta el resultado seleccionado y atenúa el otro.
    function pintar() {
      const res = resultadoDe(r.tarjetaId);
      btnAcierto.classList.toggle("seleccionado", res === "acierto");
      btnPasada.classList.toggle("seleccionado", res === "pasada");
    }

    btnAcierto.addEventListener("click", () => {
      corregirResultado(r.tarjetaId, "acierto");
      pintar();
    });
    btnPasada.addEventListener("click", () => {
      corregirResultado(r.tarjetaId, "pasada");
      pintar();
    });

    fila.appendChild(btnAcierto);
    fila.appendChild(centro);
    fila.appendChild(btnPasada);
    cont.appendChild(fila);
    pintar();
  });
}

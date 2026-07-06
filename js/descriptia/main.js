// DescriptIA: arranque del juego y asistente de configuración de la partida.
// (Lo común a todos los juegos vive en js/nucleo/.)

// --- Límites de la partida ---
const MIN_JUGADORES = 4;
const MAX_JUGADORES = 16; // 4 equipos × 4 jugadores
const MIN_EQUIPOS = 2;
const MAX_EQUIPOS = 4;
const MIN_POR_EQUIPO = 2;
const MAX_POR_EQUIPO = 4;

// Datos temporales del asistente (se vuelcan al `estado` al terminar).
const cfg = {
  numJugadores: MIN_JUGADORES,
  jugadores: [], // { id, nombre }
  numEquipos: MIN_EQUIPOS,
  asignacion: {}, // { jugadorId: equipoId }
  equipos: [], // { id, nombre, aciertos }
};

document.addEventListener("DOMContentLoaded", () => {
  conectarEntradaDescriptia();
  conectarInicio();
  conectarPantallaJugadores();
  conectarPantallaEquipos();
  conectarPantallaNombresEquipos();
  conectarPantallaCategorias();
  conectarPantallaListo();
  conectarPantallaJuego();
  conectarGestionCategorias();

  // Si hay una partida guardada, ofrecemos continuarla.
  if (cargarEstado()) {
    document.getElementById("btn-continuar").hidden = false;
  }
});

// ============================================================
//  Entrada desde el hub FIEsta hacia DescriptIA
// ============================================================
function conectarEntradaDescriptia() {
  document
    .getElementById("btn-juego-descriptia")
    .addEventListener("click", () => mostrarPantalla("inicio"));
}

// ============================================================
//  Inicio
// ============================================================
function conectarInicio() {
  document.getElementById("btn-nueva-partida").addEventListener("click", () => {
    borrarEstado(); // empezar de cero descarta la partida guardada
    reiniciarEstado();
    document.getElementById("btn-continuar").hidden = true;
    cfg.numJugadores = MIN_JUGADORES;
    cfg.jugadores = [];
    cfg.numEquipos = MIN_EQUIPOS;
    cfg.asignacion = {};
    cfg.equipos = [];
    sincronizarJugadores();
    renderNombresJugadores();
    document.getElementById("valor-num-jugadores").textContent = cfg.numJugadores;
    document.getElementById("error-jugadores").textContent = "";
    mostrarPantalla("config-jugadores");
  });

  document
    .getElementById("btn-continuar")
    .addEventListener("click", reanudarPartida);
}

// Reanuda la partida cargada según en qué fase se guardó.
function reanudarPartida() {
  switch (estado.fase) {
    case "preparado":
      mostrarPreparado();
      break;
    case "juego":
      // Si se recarga con el reloj en marcha, volvemos a la pantalla de
      // "prepárate": el turno se reinicia desde el principio (sin tiempo extra).
      mostrarPreparado();
      break;
    case "resumen-turno":
      renderResumenTurno();
      mostrarPantalla("resumen-turno");
      break;
    case "final":
      renderPodio();
      mostrarPantalla("final");
      break;
    case "listo":
    default:
      entrarPantallaListo();
      break;
  }
}

// ============================================================
//  Pantalla: número y nombres de jugadores
// ============================================================
function conectarPantallaJugadores() {
  const stepper = document.querySelector('[data-stepper="jugadores"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso);
      const nuevo = cfg.numJugadores + paso;
      if (nuevo < MIN_JUGADORES || nuevo > MAX_JUGADORES) return;
      cfg.numJugadores = nuevo;
      document.getElementById("valor-num-jugadores").textContent = nuevo;
      sincronizarJugadores();
      renderNombresJugadores();
    });
  });

  document
    .getElementById("btn-jugadores-siguiente")
    .addEventListener("click", () => {
      const error = document.getElementById("error-jugadores");
      const vacios = cfg.jugadores.some((j) => j.nombre.trim() === "");
      if (vacios) {
        error.textContent = "Todos los jugadores necesitan un nombre.";
        return;
      }
      error.textContent = "";
      entrarPantallaEquipos();
    });
}

// Mantiene cfg.jugadores con exactamente cfg.numJugadores elementos,
// conservando los nombres ya escritos.
function sincronizarJugadores() {
  const actuales = cfg.jugadores;
  const nuevos = [];
  for (let i = 0; i < cfg.numJugadores; i++) {
    nuevos.push({ id: i + 1, nombre: actuales[i] ? actuales[i].nombre : "" });
  }
  cfg.jugadores = nuevos;
}

function renderNombresJugadores() {
  const cont = document.getElementById("lista-nombres-jugadores");
  cont.innerHTML = "";
  cfg.jugadores.forEach((jugador, indice) => {
    const fila = document.createElement("div");
    fila.className = "campo";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Jugador ${indice + 1}`;
    input.value = jugador.nombre;
    input.maxLength = 20;
    input.addEventListener("input", () => {
      cfg.jugadores[indice].nombre = input.value;
    });

    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// ============================================================
//  Pantalla: número de equipos y reparto
// ============================================================
function conectarPantallaEquipos() {
  const stepper = document.querySelector('[data-stepper="equipos"]');
  stepper.querySelectorAll(".stepper-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
      const paso = Number(boton.dataset.paso);
      const { min, max } = rangoEquipos();
      const nuevo = cfg.numEquipos + paso;
      if (nuevo < min || nuevo > max) return;
      cfg.numEquipos = nuevo;
      document.getElementById("valor-num-equipos").textContent = nuevo;
      repartirJugadores();
      renderReparto();
      actualizarAyudaEquipos();
    });
  });

  document.getElementById("btn-rebarajar").addEventListener("click", () => {
    repartirJugadores();
    renderReparto();
  });

  document
    .getElementById("btn-equipos-siguiente")
    .addEventListener("click", () => {
      entrarPantallaNombresEquipos();
    });
}

// Rango válido de equipos según el nº de jugadores:
// cada equipo entre MIN_POR_EQUIPO y MAX_POR_EQUIPO jugadores.
function rangoEquipos() {
  const min = Math.max(MIN_EQUIPOS, Math.ceil(cfg.numJugadores / MAX_POR_EQUIPO));
  const max = Math.min(MAX_EQUIPOS, Math.floor(cfg.numJugadores / MIN_POR_EQUIPO));
  return { min, max };
}

function entrarPantallaEquipos() {
  const { min, max } = rangoEquipos();
  cfg.numEquipos = Math.min(Math.max(cfg.numEquipos, min), max);
  document.getElementById("valor-num-equipos").textContent = cfg.numEquipos;
  repartirJugadores();
  renderReparto();
  actualizarAyudaEquipos();
  mostrarPantalla("config-equipos");
}

function actualizarAyudaEquipos() {
  const { min, max } = rangoEquipos();
  const ayuda = document.getElementById("ayuda-equipos");
  ayuda.textContent =
    min === max
      ? `Con ${cfg.numJugadores} jugadores solo caben ${min} equipos.`
      : `Con ${cfg.numJugadores} jugadores: entre ${min} y ${max} equipos.`;
}

// Reparte los jugadores al azar y de forma equilibrada entre los equipos.
function repartirJugadores() {
  // Asegura que existen los objetos de equipo, conservando nombres previos.
  const previos = cfg.equipos;
  cfg.equipos = [];
  for (let i = 0; i < cfg.numEquipos; i++) {
    cfg.equipos.push({
      id: i + 1,
      nombre: previos[i] ? previos[i].nombre : "",
      aciertos: 0,
    });
  }

  const orden = barajar(cfg.jugadores.map((j) => j.id));
  cfg.asignacion = {};
  orden.forEach((jugadorId, indice) => {
    const equipoId = (indice % cfg.numEquipos) + 1;
    cfg.asignacion[jugadorId] = equipoId;
  });
}

function renderReparto() {
  const cont = document.getElementById("reparto-equipos");
  cont.innerHTML = "";
  cfg.equipos.forEach((equipo) => {
    const grupo = document.createElement("div");
    grupo.className = "grupo-equipo";

    const titulo = document.createElement("div");
    titulo.className = "grupo-equipo-titulo";
    titulo.textContent = equipo.nombre || `Equipo ${equipo.id}`;
    grupo.appendChild(titulo);

    const miembros = cfg.jugadores.filter(
      (j) => cfg.asignacion[j.id] === equipo.id
    );
    miembros.forEach((jugador) => {
      const chip = document.createElement("span");
      chip.className = "chip-jugador";
      chip.textContent = jugador.nombre.trim() || `Jugador ${jugador.id}`;
      grupo.appendChild(chip);
    });

    cont.appendChild(grupo);
  });
}

// ============================================================
//  Pantalla: nombres de los equipos
// ============================================================
function conectarPantallaNombresEquipos() {
  document
    .getElementById("btn-nombres-equipos-siguiente")
    .addEventListener("click", () => {
      const error = document.getElementById("error-nombres-equipos");
      const vacios = cfg.equipos.some((e) => e.nombre.trim() === "");
      if (vacios) {
        error.textContent = "Todos los equipos necesitan un nombre.";
        return;
      }
      error.textContent = "";
      entrarPantallaCategorias();
    });
}

function entrarPantallaNombresEquipos() {
  cfg.equipos.forEach((equipo) => {
    if (equipo.nombre.trim() === "") equipo.nombre = `Equipo ${equipo.id}`;
  });
  renderNombresEquipos();
  document.getElementById("error-nombres-equipos").textContent = "";
  mostrarPantalla("config-nombres-equipos");
}

function renderNombresEquipos() {
  const cont = document.getElementById("lista-nombres-equipos");
  cont.innerHTML = "";
  cfg.equipos.forEach((equipo) => {
    const fila = document.createElement("div");
    fila.className = "campo";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Equipo ${equipo.id}`;
    input.value = equipo.nombre;
    input.maxLength = 20;
    input.addEventListener("input", () => {
      equipo.nombre = input.value;
    });

    fila.appendChild(input);
    cont.appendChild(fila);
  });
}

// ============================================================
//  Pantalla: categorías
// ============================================================
function conectarPantallaCategorias() {
  document
    .getElementById("btn-categorias-siguiente")
    .addEventListener("click", confirmarCategorias);
}

function entrarPantallaCategorias() {
  renderCategorias();
  actualizarInfoCategorias();
  mostrarPantalla("config-categorias");
}

function categoriasSeleccionadas() {
  return Array.from(
    document.querySelectorAll('#lista-categorias input[type="checkbox"]:checked')
  ).map((c) => c.value);
}

function renderCategorias() {
  const cont = document.getElementById("lista-categorias");
  cont.innerHTML = "";
  Object.keys(bancoTarjetas).forEach((categoria) => {
    const etiqueta = document.createElement("label");
    etiqueta.className = "opcion-categoria";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = categoria;
    check.addEventListener("change", actualizarInfoCategorias);

    const texto = document.createElement("span");
    texto.className = "opcion-categoria-texto";
    texto.textContent = categoria;

    const cuenta = document.createElement("span");
    cuenta.className = "opcion-categoria-cuenta";
    cuenta.textContent = bancoTarjetas[categoria].length;

    etiqueta.appendChild(check);
    etiqueta.appendChild(texto);
    etiqueta.appendChild(cuenta);
    cont.appendChild(etiqueta);
  });
}

// Muestra en vivo cuántas tarjetas hay seleccionadas (de las 40 necesarias).
function actualizarInfoCategorias() {
  const sel = categoriasSeleccionadas();
  const disponibles = contarTarjetasDisponibles(sel);
  const error = document.getElementById("error-categorias");
  if (sel.length === 0) {
    error.className = "error";
    error.textContent = "Elige al menos una categoría.";
  } else if (disponibles < TOTAL_TARJETAS_PARTIDA) {
    error.className = "error";
    error.textContent = `Solo hay ${disponibles} tarjetas. Necesitas ${TOTAL_TARJETAS_PARTIDA}: añade más categorías.`;
  } else {
    error.className = "ayuda";
    error.textContent = `${disponibles} tarjetas disponibles. ¡Listo!`;
  }
}

function confirmarCategorias() {
  const sel = categoriasSeleccionadas();
  const error = document.getElementById("error-categorias");

  if (sel.length === 0) {
    error.className = "error";
    error.textContent = "Elige al menos una categoría.";
    return;
  }
  if (!hayTarjetasSuficientes(sel)) {
    const disponibles = contarTarjetasDisponibles(sel);
    error.className = "error";
    error.textContent = `Solo hay ${disponibles} tarjetas. Necesitas ${TOTAL_TARJETAS_PARTIDA}: añade más categorías.`;
    return;
  }

  volcarConfiguracionAlEstado(sel);
  entrarPantallaListo();
}

// ============================================================
//  Volcado al estado + pantalla provisional "listo"
// ============================================================
function volcarConfiguracionAlEstado(categoriasElegidas) {
  estado.jugadores = cfg.jugadores.map((j) => ({
    id: j.id,
    nombre: j.nombre.trim(),
    equipoId: cfg.asignacion[j.id],
  }));
  estado.equipos = cfg.equipos.map((e) => ({
    id: e.id,
    nombre: e.nombre.trim(),
    aciertos: 0,
  }));
  estado.categoriasElegidas = categoriasElegidas.slice();
  estado.tarjetasPartida = elegir40(categoriasElegidas);
  calcularOrdenTurnos();
  estado.fase = "listo";
}

function conectarPantallaListo() {
  document.getElementById("btn-reiniciar").addEventListener("click", () => {
    mostrarPantalla("inicio");
  });
  document.getElementById("btn-empezar-juego").addEventListener("click", () => {
    iniciarPartida();
  });
}

function conectarPantallaJuego() {
  document.getElementById("btn-empezar-turno").addEventListener("click", iniciarTurno);
  document.getElementById("btn-acierto").addEventListener("click", pulsarAcierto);
  document.getElementById("btn-pasar").addEventListener("click", pulsarPasar);
  document
    .getElementById("btn-confirmar-turno")
    .addEventListener("click", terminarResumen);
  document.getElementById("btn-final-nueva").addEventListener("click", () => {
    borrarEstado();
    reiniciarEstado();
    document.getElementById("btn-continuar").hidden = true;
    mostrarPantalla("inicio");
  });
}

function entrarPantallaListo() {
  const cont = document.getElementById("resumen-listo");
  cont.innerHTML = "";

  const nombrePorId = {};
  estado.jugadores.forEach((j) => (nombrePorId[j.id] = j));
  const nombreEquipo = {};
  estado.equipos.forEach((e) => (nombreEquipo[e.id] = e.nombre));
  const orden = estado.ordenTurnos
    .map((id) => {
      const j = nombrePorId[id];
      return `${j.nombre} (${nombreEquipo[j.equipoId]})`;
    })
    .join(" → ");

  const lineas = [
    `${estado.jugadores.length} jugadores`,
    `${estado.equipos.length} equipos: ${estado.equipos
      .map((e) => e.nombre)
      .join(", ")}`,
    `Categorías: ${estado.categoriasElegidas.join(", ")}`,
    `${estado.tarjetasPartida.length} tarjetas preparadas`,
    `Orden de turnos: ${orden}`,
  ];
  lineas.forEach((texto) => {
    const p = document.createElement("p");
    p.textContent = texto;
    cont.appendChild(p);
  });

  guardarEstado();
  console.log("Estado de la partida:", estado);
  mostrarPantalla("listo");
}

// ============================================================
//  Gestión de categorías y tarjetas (ver / crear / editar / borrar)
// ============================================================
let categoriaDetalle = null; // categoría abierta en la pantalla de detalle
let editandoCategoria = false; // ¿estamos en modo edición?

function conectarGestionCategorias() {
  document.getElementById("btn-categorias-menu").addEventListener("click", () => {
    document.getElementById("input-nueva-categoria").value = "";
    document.getElementById("lista-cat-error").textContent = "";
    renderListaCategoriasGestion();
    mostrarPantalla("categorias-lista");
  });

  document.getElementById("btn-detalle-atras").addEventListener("click", () => {
    renderListaCategoriasGestion(); // refleja recuentos tras editar
    mostrarPantalla("categorias-lista");
  });

  document.getElementById("btn-editar-categoria").addEventListener("click", () => {
    editandoCategoria = !editandoCategoria;
    mostrarErrorDetalle("");
    renderDetalleCategoria();
  });

  const inputNuevaCat = document.getElementById("input-nueva-categoria");
  const anadirCat = () => {
    const r = agregarCategoria(inputNuevaCat.value);
    const error = document.getElementById("lista-cat-error");
    if (!r.ok) {
      error.textContent =
        r.motivo === "duplicada" ? "Esa categoría ya existe." : "Escribe un nombre.";
      return;
    }
    error.textContent = "";
    inputNuevaCat.value = "";
    renderListaCategoriasGestion();
    inputNuevaCat.focus();
  };
  document.getElementById("btn-anadir-categoria").addEventListener("click", anadirCat);
  inputNuevaCat.addEventListener("keydown", (e) => {
    if (e.key === "Enter") anadirCat();
  });
}

function renderListaCategoriasGestion() {
  const cont = document.getElementById("lista-categorias-gestion");
  cont.innerHTML = "";

  const categorias = Object.keys(bancoTarjetas);
  if (categorias.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "ayuda";
    vacio.textContent = "No hay categorías. Añade una arriba.";
    cont.appendChild(vacio);
    return;
  }

  categorias.forEach((cat) => {
    const fila = document.createElement("div");
    fila.className = "fila-categoria";

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "item-lista";

    const nombre = document.createElement("span");
    nombre.className = "item-lista-texto";
    nombre.textContent = cat;

    const cuenta = document.createElement("span");
    cuenta.className = "opcion-categoria-cuenta";
    cuenta.textContent = bancoTarjetas[cat].length;

    boton.appendChild(nombre);
    boton.appendChild(cuenta);
    boton.addEventListener("click", () => abrirCategoria(cat));

    const btnBorrar = document.createElement("button");
    btnBorrar.type = "button";
    btnBorrar.className = "mini-btn mini-borrar";
    btnBorrar.textContent = "🗑";
    btnBorrar.addEventListener("click", () => {
      const n = bancoTarjetas[cat].length;
      const aviso =
        n > 0
          ? `¿Eliminar la categoría "${cat}" y sus ${n} tarjetas?`
          : `¿Eliminar la categoría "${cat}"?`;
      if (window.confirm(aviso)) {
        eliminarCategoria(cat);
        renderListaCategoriasGestion();
      }
    });

    fila.appendChild(boton);
    fila.appendChild(btnBorrar);
    cont.appendChild(fila);
  });
}

function abrirCategoria(cat) {
  categoriaDetalle = cat;
  editandoCategoria = false;
  mostrarErrorDetalle("");
  renderDetalleCategoria();
  mostrarPantalla("categoria-detalle");
}

function mostrarErrorDetalle(mensaje) {
  document.getElementById("detalle-error").textContent = mensaje;
}

function renderDetalleCategoria() {
  const cat = categoriaDetalle;
  const lista = bancoTarjetas[cat] || [];

  document.getElementById("detalle-titulo").textContent = cat;
  document.getElementById("btn-editar-categoria").textContent = editandoCategoria
    ? "Hecho"
    : "Editar";

  const cont = document.getElementById("detalle-tarjetas");
  cont.innerHTML = "";

  // En modo edición, primero la fila para añadir una tarjeta nueva.
  if (editandoCategoria) {
    cont.appendChild(crearFilaAnadir(cat));
  }

  if (lista.length === 0 && !editandoCategoria) {
    const vacio = document.createElement("p");
    vacio.className = "ayuda";
    vacio.textContent = "(sin tarjetas)";
    cont.appendChild(vacio);
    return;
  }

  lista.forEach((texto, indice) => {
    cont.appendChild(
      editandoCategoria
        ? crearFilaEditar(cat, indice, texto)
        : crearFilaVista(texto)
    );
  });
}

function crearFilaVista(texto) {
  const fila = document.createElement("div");
  fila.className = "item-tarjeta";
  fila.textContent = texto;
  return fila;
}

function crearFilaEditar(cat, indice, texto) {
  const fila = document.createElement("div");
  fila.className = "fila-editar";

  const input = document.createElement("input");
  input.type = "text";
  input.value = texto;
  input.maxLength = 60;
  input.addEventListener("change", () => {
    const r = editarTarjeta(cat, indice, input.value);
    if (!r.ok) {
      mostrarErrorDetalle(
        r.motivo === "duplicada" ? "Ya existe otra tarjeta igual." : "No puede quedar vacía."
      );
      input.value = bancoTarjetas[cat][indice]; // revertir
    } else {
      mostrarErrorDetalle("");
    }
  });

  const btnBorrar = document.createElement("button");
  btnBorrar.type = "button";
  btnBorrar.className = "mini-btn mini-borrar";
  btnBorrar.textContent = "🗑";
  btnBorrar.addEventListener("click", () => {
    eliminarTarjeta(cat, indice);
    mostrarErrorDetalle("");
    renderDetalleCategoria();
  });

  fila.appendChild(input);
  fila.appendChild(btnBorrar);
  return fila;
}

function crearFilaAnadir(cat) {
  const fila = document.createElement("div");
  fila.className = "fila-editar fila-anadir";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Nueva tarjeta…";
  input.maxLength = 60;

  const btnAnadir = document.createElement("button");
  btnAnadir.type = "button";
  btnAnadir.className = "boton-anadir";
  btnAnadir.textContent = "＋";

  function anadir() {
    const r = agregarTarjeta(cat, input.value);
    if (!r.ok) {
      mostrarErrorDetalle(
        r.motivo === "duplicada" ? "Esa tarjeta ya existe." : "Escribe algo primero."
      );
      return;
    }
    mostrarErrorDetalle("");
    renderDetalleCategoria();
    // Devuelve el foco al campo de añadir para meter varias seguidas.
    const nuevoInput = document.querySelector(".fila-anadir input");
    if (nuevoInput) nuevoInput.focus();
  }

  btnAnadir.addEventListener("click", anadir);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") anadir();
  });

  fila.appendChild(input);
  fila.appendChild(btnAnadir);
  return fila;
}

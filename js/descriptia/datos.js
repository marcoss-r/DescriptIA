// Utilidades sobre las tarjetas: banco de datos + barajar y repartir las 40.
// El banco parte de TARJETAS (semilla en data/descriptia/tarjetas.js) y se sobrescribe
// con las ediciones que el usuario guarde en localStorage.

const TOTAL_TARJETAS_PARTIDA = 40;

// ============================================================
//  Banco de tarjetas (semilla + ediciones del usuario)
// ============================================================
const CLAVE_TARJETAS = "descriptia_tarjetas";

// Copia profunda del banco semilla definido en data/descriptia/tarjetas.js.
function clonarSemilla() {
  const copia = {};
  Object.keys(TARJETAS).forEach((cat) => {
    copia[cat] = TARJETAS[cat].slice();
  });
  return copia;
}

// Carga el banco guardado (si existe) o parte de la semilla.
function cargarBanco() {
  let texto = null;
  try {
    texto = localStorage.getItem(CLAVE_TARJETAS);
  } catch (e) {
    /* localStorage no disponible */
  }
  if (texto) {
    try {
      const datos = JSON.parse(texto);
      if (datos && typeof datos === "object") return datos;
    } catch (e) {
      /* JSON corrupto: se ignora y se usa la semilla */
    }
  }
  return clonarSemilla();
}

function guardarBanco() {
  try {
    localStorage.setItem(CLAVE_TARJETAS, JSON.stringify(bancoTarjetas));
  } catch (e) {
    console.warn("No se pudo guardar el banco de tarjetas:", e);
  }
}

// El banco que usa TODA la app (juego y gestión de categorías).
let bancoTarjetas = cargarBanco();

// --- Altas / bajas de categorías (persisten en localStorage) ---

function agregarCategoria(nombre) {
  const n = nombre.trim();
  if (!n) return { ok: false, motivo: "vacia" };
  if (Object.prototype.hasOwnProperty.call(bancoTarjetas, n)) {
    return { ok: false, motivo: "duplicada" };
  }
  bancoTarjetas[n] = [];
  guardarBanco();
  return { ok: true };
}

function eliminarCategoria(nombre) {
  if (Object.prototype.hasOwnProperty.call(bancoTarjetas, nombre)) {
    delete bancoTarjetas[nombre];
    guardarBanco();
  }
}

// --- Altas / ediciones / bajas de tarjetas (persisten en localStorage) ---

// Devuelve { ok, motivo } donde motivo puede ser "vacia" o "duplicada".
function agregarTarjeta(categoria, texto) {
  const t = texto.trim();
  if (!t) return { ok: false, motivo: "vacia" };
  if (!Array.isArray(bancoTarjetas[categoria])) bancoTarjetas[categoria] = [];
  if (bancoTarjetas[categoria].includes(t)) return { ok: false, motivo: "duplicada" };
  bancoTarjetas[categoria].push(t);
  guardarBanco();
  return { ok: true };
}

function editarTarjeta(categoria, indice, textoNuevo) {
  const lista = bancoTarjetas[categoria];
  if (!Array.isArray(lista) || indice < 0 || indice >= lista.length) {
    return { ok: false };
  }
  const t = textoNuevo.trim();
  if (!t) return { ok: false, motivo: "vacia" };
  if (lista.some((x, i) => i !== indice && x === t)) {
    return { ok: false, motivo: "duplicada" };
  }
  lista[indice] = t;
  guardarBanco();
  return { ok: true };
}

function eliminarTarjeta(categoria, indice) {
  const lista = bancoTarjetas[categoria];
  if (!Array.isArray(lista) || indice < 0 || indice >= lista.length) return;
  lista.splice(indice, 1);
  guardarBanco();
}

// Fisher–Yates: devuelve una COPIA de la lista en orden aleatorio.
function barajar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function crearTarjeta(texto, categoria, id) {
  return { id: `t${id}`, texto, categoria };
}

// Cuenta cuántas tarjetas hay disponibles en total en las categorías dadas.
// La pantalla de Categorías (Fase 3) lo usa para avisar si no llegan a 40.
function contarTarjetasDisponibles(categoriasElegidas) {
  return categoriasElegidas.reduce((total, cat) => {
    return total + (Array.isArray(bancoTarjetas[cat]) ? bancoTarjetas[cat].length : 0);
  }, 0);
}

// ¿Hay al menos 40 tarjetas entre las categorías elegidas?
function hayTarjetasSuficientes(categoriasElegidas) {
  return contarTarjetasDisponibles(categoriasElegidas) >= TOTAL_TARJETAS_PARTIDA;
}

// Elige TOTAL_TARJETAS_PARTIDA tarjetas repartidas entre las categorías dadas.
// - Reparto base equitativo + sobrantes a categorías al azar.
// - Selección aleatoria dentro de cada categoría.
// - Si una categoría no tiene suficientes, rellena con tarjetas de otras
//   categorías elegidas que sí tengan de sobra.
// - Si en total no hay 40 disponibles, devuelve el máximo posible.
function elegir40(categoriasElegidas) {
  const categorias = categoriasElegidas.filter((cat) => Array.isArray(bancoTarjetas[cat]));
  if (categorias.length === 0) return [];

  const pools = {};
  categorias.forEach((cat) => {
    pools[cat] = barajar(bancoTarjetas[cat]);
  });

  const base = Math.floor(TOTAL_TARJETAS_PARTIDA / categorias.length);
  const sobran = TOTAL_TARJETAS_PARTIDA % categorias.length;
  const cantidadPorCategoria = {};
  categorias.forEach((cat) => (cantidadPorCategoria[cat] = base));

  const categoriasParaSobras = barajar(categorias);
  for (let i = 0; i < sobran; i++) {
    cantidadPorCategoria[categoriasParaSobras[i]] += 1;
  }

  const seleccion = [];
  let idContador = 1;

  categorias.forEach((cat) => {
    const cantidad = Math.min(cantidadPorCategoria[cat], pools[cat].length);
    for (let i = 0; i < cantidad; i++) {
      seleccion.push(crearTarjeta(pools[cat][i], cat, idContador++));
    }
    pools[cat] = pools[cat].slice(cantidad);
  });

  const faltan = TOTAL_TARJETAS_PARTIDA - seleccion.length;
  if (faltan > 0) {
    let restante = [];
    categorias.forEach((cat) => {
      pools[cat].forEach((texto) => restante.push({ texto, categoria: cat }));
    });
    restante = barajar(restante);
    for (let i = 0; i < faltan && i < restante.length; i++) {
      seleccion.push(crearTarjeta(restante[i].texto, restante[i].categoria, idContador++));
    }
  }

  return barajar(seleccion);
}

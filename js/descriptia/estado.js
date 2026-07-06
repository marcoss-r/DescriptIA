// El "estado" del juego: un único objeto con TODA la situación de la partida.
// La pantalla siempre es un reflejo de este objeto. (El guardado/carga en
// localStorage se añadirá en la Fase 9.)

const estado = {
  fase: "inicio", // en qué pantalla estamos
  jugadores: [], // { id, nombre, equipoId }
  equipos: [], // { id, nombre, aciertos }
  categoriasElegidas: [],
  tarjetasPartida: [], // las 40 elegidas para toda la partida
  rondaActual: 0, // 0=ilimitada, 1=una palabra, 2=gestos
  ordenTurnos: [], // ids de jugadores intercalando equipos
  turnoIndex: 0, // a quién le toca dentro de ordenTurnos
  pool: [], // ids de tarjetas disponibles esta ronda
  tiempoRestante: 40, // segundos (se arrastra entre rondas)
  minironda: {
    vistasEnEsteTurno: [], // para no repetir tarjeta al mismo jugador
    resultados: [], // { tarjetaId, resultado: "acierto" | "pasada" }
  },
};

// --- Guardado y carga en localStorage ---
const CLAVE_GUARDADO = "descriptia_partida";

// Fases desde las que tiene sentido ofrecer "Continuar partida".
const FASES_REANUDABLES = ["listo", "preparado", "juego", "resumen-turno", "final"];

function guardarEstado() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
  } catch (e) {
    // En modo privado o sin espacio puede fallar: no rompemos el juego.
    console.warn("No se pudo guardar la partida:", e);
  }
}

// Carga la partida guardada en `estado`. Devuelve true si había una
// partida reanudable (y en ese caso deja `estado` con esos datos).
function cargarEstado() {
  let texto = null;
  try {
    texto = localStorage.getItem(CLAVE_GUARDADO);
  } catch (e) {
    return false;
  }
  if (!texto) return false;

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (e) {
    return false;
  }
  if (!datos || typeof datos !== "object") return false;
  if (!FASES_REANUDABLES.includes(datos.fase)) return false;

  Object.assign(estado, datos);
  return true;
}

function borrarEstado() {
  try {
    localStorage.removeItem(CLAVE_GUARDADO);
  } catch (e) {
    // Ignorar: si no se puede borrar, tampoco es crítico.
  }
}

// Deja el estado como recién empezado (para "Nueva partida").
function reiniciarEstado() {
  estado.fase = "inicio";
  estado.jugadores = [];
  estado.equipos = [];
  estado.categoriasElegidas = [];
  estado.tarjetasPartida = [];
  estado.rondaActual = 0;
  estado.ordenTurnos = [];
  estado.turnoIndex = 0;
  estado.pool = [];
  estado.tiempoRestante = 40;
  estado.minironda = { vistasEnEsteTurno: [], resultados: [] };
}

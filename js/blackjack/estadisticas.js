// 21 Arcanos — Estadísticas: el menú de estadísticas y sus dos pantallas.
//
// Se entra desde el menú del juego (botón «Estadísticas») y de ahí a uno de los dos
// modos:
//   - Clásico  (bj-stats-clasico): las mismas cifras que el overlay 📊 de la mesa
//     (banca, récord de banca, manos, % de victorias y mejor racha), pero leídas de lo
//     GUARDADO (bjClasicoDatosGuardados), sin tocar una mano en curso.
//   - Arcade   (bj-stats-arcade): el leaderboard del solitario, 4 posiciones como
//     mucho. De cada marca: las fichas, las reglas con las que se jugó y la tirada de
//     tarot que le tocó, en miniatura. Lo que no cabe en el podio se borra al guardar
//     (ver bjArcadeRegistrarRecord en arcade.js).
//
// El multijugador del Arcade no tiene estadísticas persistentes (plan §5): el ranking
// se ve al terminar la partida y ahí muere.

// Engancha los botones de las tres pantallas. Se llama una vez al cargar la página; el
// botón «Estadísticas» del menú del juego lo engancha bjConectarMenu (main.js).
function bjStatsConectar() {
  document.getElementById("bj-btn-stats-clasico").addEventListener("click", bjEntrarStatsClasico);
  document.getElementById("bj-btn-stats-arcade").addEventListener("click", bjEntrarStatsArcade);
}

// Menú de estadísticas: elegir modo.
function bjEntrarStats() {
  mostrarPantalla("bj-stats-menu");
}

// ============================================================
//  Estadísticas del Clásico
// ============================================================

function bjEntrarStatsClasico() {
  const cont = document.getElementById("bj-stats-clasico-lista");
  cont.innerHTML = "";
  bjClasicoStatsFilas(bjClasicoDatosGuardados()).forEach(([etiqueta, valor]) => {
    cont.appendChild(bjClasicoCrearStatsFila(etiqueta, valor));
  });
  mostrarPantalla("bj-stats-clasico");
}

// ============================================================
//  Leaderboard del Arcade (solitario)
// ============================================================

function bjEntrarStatsArcade() {
  const cont = document.getElementById("bj-stats-arcade-lista");
  cont.innerHTML = "";

  const records = bjArcadeCargarRecords();
  if (records.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "ayuda";
    vacio.textContent = "Aún no hay marcas: juega una partida de Arcade en solitario.";
    cont.appendChild(vacio);
  } else {
    records.forEach((record, puesto) => {
      cont.appendChild(bjStatsCrearFilaRecord(record, puesto));
    });
  }

  mostrarPantalla("bj-stats-arcade");
}

// Fila del leaderboard: medalla y fichas arriba, las reglas de esa partida debajo y su
// tirada de tarot en miniatura. Reutiliza las medallas y los colores de podio del
// ranking del Arcade (BJ_MEDALLAS / BJ_CLASES_PODIO, en arcade.js).
function bjStatsCrearFilaRecord(record, puesto) {
  const fila = document.createElement("div");
  fila.className = "bj-lb-fila " + (BJ_CLASES_PODIO[puesto] || "podio-resto");

  const cabecera = document.createElement("div");
  cabecera.className = "bj-lb-cabecera";
  const medalla = document.createElement("span");
  medalla.className = "podio-medalla";
  medalla.textContent = BJ_MEDALLAS[puesto] || "•";
  const fichas = document.createElement("span");
  fichas.className = "podio-aciertos" + (record.puntuacion < 0 ? " bj-pila-neg" : "");
  fichas.textContent = "🪙" + bjFormatearFichas(record.puntuacion);
  cabecera.append(medalla, fichas);

  const reglas = document.createElement("span");
  reglas.className = "bj-lb-reglas";
  reglas.textContent = "Reglas: " + bjArcadeTextoRuleset(record.ruleset);

  fila.append(cabecera, reglas);

  // Las marcas migradas de la versión anterior no guardaron la tirada: se quedan sin
  // cartas en vez de fingirlas.
  if (record.tarot.length > 0) {
    const cartas = document.createElement("div");
    cartas.className = "bj-lb-cartas";
    record.tarot.forEach((entrada) => {
      const img = document.createElement("img");
      img.src = bjTarotImagen(entrada);
      img.alt = entrada.nombre + (entrada.invertida ? " (invertida)" : "");
      img.title = entrada.posicion + ": " + img.alt;
      cartas.appendChild(img);
    });
    fila.appendChild(cartas);
  }

  return fila;
}

document.addEventListener("DOMContentLoaded", bjStatsConectar);

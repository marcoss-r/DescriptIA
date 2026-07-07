// Cartas de la Fortuna — modelo de la baraja: palos, valores y efectos.
//
// Este fichero es SOLO DATOS (constantes globales) + un ayudante para construir
// el mazo. Se carga en index.html ANTES que js/cartas/main.js, para que main.js
// pueda usar estas constantes y funciones.

// Los 4 palos de la baraja española. El palo es SOLO estético: dos cartas con el
// mismo valor hacen lo mismo aunque sean de palos distintos.
const CF_PALOS = ["oros", "copas", "espadas", "bastos"];

// Los 10 valores. Usamos los MISMOS nombres que los archivos de imagen
// (img/cartas/<palo>-<valor>.png), así en la Fase 4 la ruta saldrá directa:
//   `img/cartas/${palo}-${valor}.png`  ->  "img/cartas/oros-sota.png"
const CF_VALORES = [1, 2, 3, 4, 5, 6, 7, "sota", "caballo", "rey"];

// Diccionario de efectos: UN texto por VALOR (10 en total). El palo no influye,
// por eso la clave es el valor y no la carta entera. Ojo: 1..7 son NÚMEROS, pero
// "sota"/"caballo"/"rey" son CADENAS (las claves coinciden con CF_VALORES).
const CF_EFECTOS_POR_VALOR = {
  1: "As: Bebe un solo trago.",
  2: "Dos: Bebe dos tragos.",
  3: "Tres: Bebe tres tragos.",
  4: "Cuatro: Los jugadores deben decir a la vez un número del 1 al 4. Si otro jugador coincide con el que ha sacado la carta, bebe cuatro tragos. Si nadie coincide, el jugador que ha sacado la carta bebe un trago por jugador en la partida.",
  5: "Cinco: Todos los jugadores deben poner la mano en la mesa, el último en hacerlo bebe dos tragos.",
  6: "Seis: El jugador deberá ser ignorado durante una ronda, quien lo incumpla, deberá beber un trago.",
  7: "Siete: El jugador elige a otro jugador que deberá cada vez que él lo tenga que hacer.",
  "sota": "Sota: El jugador elige un tema. Todos deben decir una palabra relacionada con ese tema. El primero que se quede sin ideas o repita una palabra, bebe dos tragos.",
  "caballo": "Caballo: El jugador que ha sacado la carta comienza a beber y el jugador a su derecha debe seguirlo hasta que pare y así sucesivamente hasta que todos los jugadores hayan dejado de beber.",
  "rey": "Rey: El jugador echa un trago de su bebida en un vaso en el centro de la mesa. Si ya han salido todos los reyes, el jugador que saque el cuarto rey debe beberse el contenido del vaso central.",
};

// Construye y DEVUELVE un mazo nuevo: un array con las 40 cartas, cada una un
// objeto { origen, palo, valor }. `origen` distingue baraja española de tarot
// (de momento solo "espanola"; el tarot llegará en una fase posterior).
//
// Dos bucles anidados (cada palo x cada valor) generan las 40 cartas: 4 x 10 = 40.
function cfConstruirMazo() {
  const mazo = [];
  for (const palo of CF_PALOS) {
    for (const valor of CF_VALORES) {
      mazo.push({ origen: "espanola", palo, valor });
    }
  }
  return mazo;
}

// ============================================================
//  Tarot (6 cartas: 3 arcanos x 2 orientaciones)
// ============================================================

// Los 3 arcanos que tenemos en pixel art. El nombre coincide con el archivo de
// imagen: img/cartas/tarot-<nombre>.png (y su variante -invertida.png).
const CF_TAROT_NOMBRES = ["diablo", "loco", "rueda"];

// Cada arcano puede salir en dos ORIENTACIONES; para el juego "normal" e
// "invertida" son cartas distintas, cada una con su efecto.
const CF_ORIENTACIONES = ["normal", "invertida"];

// Efectos del tarot: a diferencia de la baraja española (un efecto por valor),
// aquí cada carta tiene el suyo. Clave externa = nombre del arcano; dentro, un
// efecto para "normal" y otro para "invertida".
const CF_EFECTOS_TAROT = {
  diablo: {
    normal: "El Diablo: El jugador que saque esta carta elige a otro jugador para beber por él durante una ronda.",
    invertida: "El Diablo (invertida): El jugador que saque esta carta elige a otro jugador y beberá por este último durante una ronda.",
  },
  loco: {
    normal: "El Loco: El jugador que saque esta carta debe acabar su bebida en este momento.",
    invertida: "El Loco (invertida): El jugador que saque esta carta es inmune a los efectos de las cartas durante una ronda.",
  },
  rueda: {
    normal: "La Rueda: Se generará aleatoriamente un número de tragos que el jugador repartirá a su elección entre un número de jugadores aleatorio.",
    invertida: "La Rueda (invertida): El jugador empieza una ronda de ruleta rusa. Por turnos, cada jugador dice un número; en secreto se ha seleccionado uno al azar. El jugador que coincida con dicho número bebe 3 tragos.",
  },
};

// Construye y DEVUELVE las 6 cartas de tarot como objetos
// { origen: "tarot", nombre, orientacion }. Igual que en la española, la carta
// NO guarda el efecto: se buscará luego con CF_EFECTOS_TAROT[nombre][orientacion]
// (al revelar, en la pantalla de juego).
//
// Dos bucles anidados (cada nombre x cada orientacion): 3 x 2 = 6 cartas.
function cfConstruirMazoTarot() {
  const mazo = [];
  for (const nombre of CF_TAROT_NOMBRES) {
    for (const orientacion of CF_ORIENTACIONES) {
      mazo.push({ origen: "tarot", nombre, orientacion });
    }
  }
  return mazo;
}

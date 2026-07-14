// 21 Arcanos — motor de blackjack: LÓGICA PURA, sin DOM.
//
// Todo aquí son funciones sobre datos (cartas, manos, mazo): construir el mazo o
// zapato, robar, contar restantes, calcular el valor de una mano (con el as a 1 u
// 11), detectar blackjack natural y pasarse (bust), jugar el turno del dealer y
// resolver una mano contra la del dealer. No toca la pantalla: los flujos de cada
// modo (clasico.js / arcade.js, fases próximas) usan estas piezas y pintan el DOM.
//
// Preparado para el tarot (Fase 7) y el ruleset (Fase 4): las funciones que pueden
// verse alteradas por una regla o un arcano (turno del dealer, resolución, pagos)
// reciben un objeto `opciones` con los parámetros que esos hooks sobreescriben
// (límite del dealer, pago del natural, a quién van los empates…). Sin `opciones`,
// se comportan como el blackjack de casino estándar.
//
// Namespacing: prefijo bj… / BJ… (ver cabecera de js/blackjack/main.js). Usa
// `barajar()` de js/nucleo/util.js, que se carga antes.

// Los cuatro palos y los trece valores de la baraja francesa. Los nombres de palo
// coinciden con los archivos de arte (img/21arc/poker-<palo>-<valor>.png).
const BJ_PALOS = ["picas", "corazones", "diamantes", "treboles"];
const BJ_VALORES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Imagen del reverso (carta oculta del dealer). Los frentes los da bjImagenCarta.
const BJ_IMAGEN_REVERSO = "img/21arc/poker-reverso.png";

// ============================================================
//  Cartas: representación e imagen
// ============================================================

// Una carta es un objeto { palo, valor }, p. ej. { palo: "picas", valor: "A" }.
// Ruta del arte de una carta (útil para la UI; es solo una cadena, no toca el DOM).
function bjImagenCarta(carta) {
  return `img/21arc/poker-${carta.palo}-${carta.valor}.png`;
}

// Valor numérico "de base" de una carta: figuras 10, as 11 (bjValorMano lo baja a
// 1 si hace falta), y el resto su número. Nunca se llama con el as ya ajustado:
// el ajuste 11→1 lo hace bjValorMano al sumar la mano entera.
function bjValorCarta(valor) {
  if (valor === "A") return 11;
  if (valor === "J" || valor === "Q" || valor === "K") return 10;
  return Number(valor);
}

// ============================================================
//  Mazo / zapato
// ============================================================

// Construye un mazo BARAJADO. `numBarajas` = 1 (mazo de 52, Clásico y solitario) o
// 2 (zapato de 104, Arcade con 2+ jugadores). barajar() no muta y devuelve copia.
function bjConstruirMazo(numBarajas = 1) {
  const cartas = [];
  for (let b = 0; b < numBarajas; b++) {
    for (const palo of BJ_PALOS) {
      for (const valor of BJ_VALORES) {
        cartas.push({ palo, valor });
      }
    }
  }
  return barajar(cartas);
}

// Añade `numBarajas` mazos completos a un zapato que se ha quedado corto y
// vuelve a barajar el conjunto (si no, las cartas nuevas quedarían todas
// juntas al fondo). No muta `mazo`: devuelve el zapato ampliado.
function bjAnadirBarajas(mazo, numBarajas) {
  const cartas = mazo.slice();
  for (let b = 0; b < numBarajas; b++) {
    for (const palo of BJ_PALOS) {
      for (const valor of BJ_VALORES) {
        cartas.push({ palo, valor });
      }
    }
  }
  return barajar(cartas);
}

// Roba (saca) la carta de arriba del mazo y la devuelve. MUTA el mazo. Devuelve
// undefined si el mazo está vacío: el flujo que llama decide qué hacer entonces
// (Clásico rebaraja, Arcade termina la partida). Sacamos por el final (pop) por
// eficiencia; el orden ya es aleatorio, así que "arriba" es indistinto.
function bjRobar(mazo) {
  return mazo.pop();
}

// Cuántas cartas quedan por robar (para el contador visible de la mesa).
function bjCartasRestantes(mazo) {
  return mazo.length;
}

// Reparto inicial: en el orden real del casino (jugador, dealer, jugador, dealer).
// MUTA el mazo. Devuelve { jugador: [c, c], dealer: [c, c] }.
function bjRepartirInicial(mazo) {
  const jugador = [bjRobar(mazo)];
  const dealer = [bjRobar(mazo)];
  jugador.push(bjRobar(mazo));
  dealer.push(bjRobar(mazo));
  return { jugador, dealer };
}

// ============================================================
//  Valor de una mano
// ============================================================

// Valor de una mano contando el as como 11 salvo que eso pase de 21, en cuyo caso
// baja a 1 (−10) tantos ases como haga falta. Devuelve el mejor total posible.
//
// `mod` (opcional) retuerce la cuenta para los arcanos del Arcade; sin él, la
// cuenta es la estándar de casino:
//   - valoresAs: escala de valores que puede tomar un as, de MAYOR a MENOR
//     ([11, 1] estándar; la Estrella la cambia a [12, 1], [12, 11, 1], [11],
//     [1] o [0]). Cada as entra por lo alto y, mientras la mano se pase, se va
//     rebajando un as al siguiente peldaño de la escala.
//   - valorCero(carta): true si esa carta cuenta como 0 esta ronda (la Rueda
//     invertida). Un as a 0 tampoco entra en el ajuste de la escala.
//   - transformarTotal(total): retoque final sobre el total ya ajustado (la
//     Muerte normal «resucita» un bust haciéndolo contar 12). Como se aplica al
//     total, también decide bjEsBust: un total transformado a ≤21 no es bust.
function bjValorMano(mano, mod) {
  const valoresAs = (mod && mod.valoresAs) || [11, 1];
  let total = 0;
  const nivelesAs = []; // peldaño actual (índice en valoresAs) de cada as de la mano
  for (const carta of mano) {
    if (mod && mod.valorCero && mod.valorCero(carta)) continue; // cuenta como 0
    if (carta.valor === "A") {
      nivelesAs.push(0);
      total += valoresAs[0];
    } else {
      total += bjValorCarta(carta.valor);
    }
  }
  // Mientras nos pasemos y quede algún as rebajable, se baja UN as UN peldaño de la
  // escala y se reevalúa. Al acabar, `total` es el mayor valor que no se pasa (si
  // existe); con la escala estándar [11, 1] esto es el clásico 11 → 1 (−10).
  let rebajado = true;
  while (total > 21 && rebajado) {
    rebajado = false;
    for (let i = 0; i < nivelesAs.length; i++) {
      if (nivelesAs[i] < valoresAs.length - 1) {
        total -= valoresAs[nivelesAs[i]] - valoresAs[nivelesAs[i] + 1];
        nivelesAs[i]++;
        rebajado = true;
        break;
      }
    }
  }
  if (mod && mod.transformarTotal) total = mod.transformarTotal(total);
  return total;
}

// ¿Es una mano "blanda"? (tiene un as que aún cuenta como 11). Lo necesitan la
// variante de dealer que roba con 17 blando y algunos arcanos. Se cumple si hay al
// menos un as y contar todos los ases como 1 dejaría el total 10 puntos por debajo.
function bjManoEsBlanda(mano) {
  const tieneAs = mano.some((carta) => carta.valor === "A");
  if (!tieneAs) return false;
  // "Total duro": todos los ases valiendo 1. Si el total real (bjValorMano) es 10
  // más que ese duro, es que un as se está contando como 11 → mano blanda.
  const totalDuro = mano.reduce(
    (suma, carta) => suma + (carta.valor === "A" ? 1 : bjValorCarta(carta.valor)),
    0
  );
  return bjValorMano(mano) === totalDuro + 10;
}

// Blackjack NATURAL: 21 con exactamente las dos primeras cartas (as + 10/figura).
// `mod` retuerce el valor de las cartas (ver bjValorMano): con la Estrella o la
// Rueda invertida activas, un as+figura puede dejar de sumar 21 (y no ser natural).
function bjEsBlackjackNatural(mano, mod) {
  return mano.length === 2 && bjValorMano(mano, mod) === 21;
}

// ¿La mano se ha pasado de 21? (bust: pierde de inmediato). `mod`: ver bjValorMano.
function bjEsBust(mano, mod) {
  return bjValorMano(mano, mod) > 21;
}

// ============================================================
//  Turno del dealer
// ============================================================

// Juega el turno del dealer: roba del mazo hasta alcanzar su límite (17 por
// defecto). MUTA `mano` y `mazo`. Devuelve la mano final del dealer.
//
// `opciones`:
//   - limiteDealer: umbral al que el dealer se planta (17 estándar; la Torre lo
//     baja a 16 o lo sube a 18).
//   - dealerRobaBlando17: si es true, con 17 blando (as contando 11) sigue robando
//     en vez de plantarse (variante de casino). Por defecto false (se planta en 17).
//   - modDealer: modificador de valor de las cartas del DEALER (ver bjValorMano;
//     la Rueda invertida anula el valor sorteado también en su mano). Sin él,
//     cuenta estándar.
function bjJugarDealer(mano, mazo, opciones = {}) {
  const limite = opciones.limiteDealer != null ? opciones.limiteDealer : 17;
  while (true) {
    const valor = bjValorMano(mano, opciones.modDealer);
    if (valor > limite) break;
    if (valor === limite) {
      // Justo en el límite: se planta, salvo la variante de robar con blando 17.
      const robaBlando = opciones.dealerRobaBlando17 && valor === 17 && bjManoEsBlanda(mano);
      if (!robaBlando) break;
    }
    const carta = bjRobar(mazo);
    if (!carta) break; // mazo agotado a media mano: el flujo lo gestiona
    mano.push(carta);
  }
  return mano;
}

// ============================================================
//  Resolución de una mano contra el dealer
// ============================================================

// Empaqueta el desenlace de una mano. `resultado` es quién gana ("jugador" |
// "dealer" | "empate"); `pago` es el múltiplo NETO de la apuesta que gana (+) o
// pierde (−) el jugador: +1 gana, +1,5 blackjack natural, 0 empate, −1 pierde.
function bjResultado(resultado, pago) {
  return { resultado, pago };
}

// Resuelve el empate (push) según el hook `empate`: por defecto se devuelve la
// apuesta (push, pago 0); la Justicia puede darlo al jugador (+1) o al dealer (−1).
function bjResolverEmpate(empate) {
  if (empate === "jugador") return bjResultado("jugador", 1);
  if (empate === "dealer") return bjResultado("dealer", -1);
  return bjResultado("empate", 0);
}

// Resuelve la mano del jugador contra la del dealer (ambas ya jugadas). Devuelve
// { resultado, pago } (ver bjResultado).
//
// `opciones`:
//   - pagoNatural: múltiplo del blackjack natural (1,5 = 3:2 estándar; la
//     Emperatriz lo sube a 2, el Mundo invertido lo baja a 1).
//   - empate: a quién van los empates ("empate" | "jugador" | "dealer").
//   - jugadorPuedeNatural: por defecto true; ponlo a false para una mano que NO
//     puede ser blackjack natural aunque sume 21 con 2 cartas (una mano dividida:
//     un 21 tras split paga 1:1, no 3:2).
//   - modJugador: modificador de valor de las cartas del JUGADOR (ver bjValorMano;
//     la Estrella y la Rueda invertida).
//   - modDealer: modificador de valor de las cartas del DEALER. Solo lo usa el
//     valor sorteado a 0 de la Rueda invertida (que anula ese valor para TODA la
//     mesa); el resto de arcanos (Estrella, Muerte, carta a 0 por jugador)
//     retuercen la suerte de los jugadores, no la banca.
function bjResolverMano(manoJugador, manoDealer, opciones = {}) {
  const pagoNatural = opciones.pagoNatural != null ? opciones.pagoNatural : 1.5;
  const empate = opciones.empate || "empate";
  const permitirNatural = opciones.jugadorPuedeNatural !== false;
  const modJugador = opciones.modJugador || null;
  const modDealer = opciones.modDealer || null;

  const valorJ = bjValorMano(manoJugador, modJugador);
  const valorD = bjValorMano(manoDealer, modDealer);
  const naturalJ = permitirNatural && bjEsBlackjackNatural(manoJugador, modJugador);
  const naturalD = bjEsBlackjackNatural(manoDealer, modDealer);

  // 1. El jugador se pasa: pierde siempre, aunque el dealer también se pase.
  if (valorJ > 21) return bjResultado("dealer", -1);

  // 2. Blackjacks naturales (mano de 2 cartas): mandan sobre un 21 de 3+ cartas.
  if (naturalJ && naturalD) return bjResolverEmpate(empate);
  if (naturalJ) return bjResultado("jugador", pagoNatural);
  if (naturalD) return bjResultado("dealer", -1);

  // 3. El dealer se pasa (y el jugador no): gana el jugador.
  if (valorD > 21) return bjResultado("jugador", 1);

  // 4. Comparación de totales.
  if (valorJ > valorD) return bjResultado("jugador", 1);
  if (valorJ < valorD) return bjResultado("dealer", -1);
  return bjResolverEmpate(empate);
}

// 21 Arcanos — datos: los 22 arcanos mayores del tarot, cada uno con su efecto
// normal e invertido (44 efectos). Ver plan §6.
//
// Cada carta: { numeral, nombre, slug, normal, invertida }. El slug coincide con
// el arte (img/21arc/tarot-bj-<slug>.png y …-invertida.png).
//
// Cada efecto: { efecto, texto, implementado, fiesta? }.
//   - efecto: clave única ("<slug>-n" | "<slug>-i") que el código consulta para
//     aplicar su hook (js/blackjack/tarot.js y arcade.js).
//   - implementado: true = la app lo aplica sola; false = REGLA MANUAL, la app
//     solo la muestra como recordatorio y los jugadores la aplican de palabra
//     (nunca un TODO en código: es una decisión de datos, plan §6).
//   - fiesta: línea extra de tragos que solo se muestra con el modo fiesta 🍻
//     activado (Fase 8 la reparte; el dato ya viaja desde ahora).
//
// Los textos son placeholder relacionados con el significado de cada carta; el
// usuario los redefinirá más adelante.

const BJ_TAROT = [
  {
    numeral: "0", nombre: "El Loco", slug: "loco",
    normal: {
      efecto: "loco-n", implementado: false,
      texto: "Una vez por partida, cada jugador puede descartar su mano inicial y robar dos cartas nuevas.",
    },
    invertida: {
      efecto: "loco-i", implementado: true,
      texto: "La apuesta mínima se duplica toda la partida.",
      fiesta: "Quien apueste solo la mínima, bebe 1 trago.",
    },
  },
  {
    numeral: "I", nombre: "El Mago", slug: "mago",
    normal: {
      efecto: "mago-n", implementado: false,
      texto: "Una vez por partida, cada jugador puede descartar una carta de su mano y robar otra.",
    },
    invertida: {
      efecto: "mago-i", implementado: false,
      texto: "Una vez por partida, el dealer cambia su peor carta (decididlo al revelarse).",
    },
  },
  {
    numeral: "II", nombre: "La Sacerdotisa", slug: "sacerdotisa",
    normal: {
      efecto: "sacerdotisa-n", implementado: false,
      texto: "Una vez por ronda, puedes mirar la siguiente carta del mazo antes de decidir.",
    },
    invertida: {
      efecto: "sacerdotisa-i", implementado: true,
      texto: "El contador de cartas restantes se oculta.",
    },
  },
  {
    numeral: "III", nombre: "La Emperatriz", slug: "emperatriz",
    normal: {
      efecto: "emperatriz-n", implementado: true,
      texto: "El blackjack natural paga ×2 en vez de ×1,5.",
    },
    invertida: {
      efecto: "emperatriz-i", implementado: true,
      texto: "La apuesta máxima queda limitada a 10.",
    },
  },
  {
    numeral: "IV", nombre: "El Emperador", slug: "emperador",
    normal: {
      efecto: "emperador-n", implementado: false,
      texto: "El líder anuncia su jugada («pediré hasta 17») antes de jugar y debe cumplirla.",
    },
    invertida: {
      efecto: "emperador-i", implementado: true,
      texto: "El último del ranking dobla lo que gane cada ronda.",
    },
  },
  {
    numeral: "V", nombre: "El Hierofante", slug: "hierofante",
    normal: {
      efecto: "hierofante-n", implementado: true,
      texto: "Reglas de casino puras: se desactivan las reglas opcionales de la mesa.",
    },
    invertida: {
      efecto: "hierofante-i", implementado: true,
      texto: "Todas las reglas opcionales de la mesa quedan activadas.",
    },
  },
  {
    numeral: "VI", nombre: "Los Enamorados", slug: "enamorados",
    normal: {
      efecto: "enamorados-n", implementado: false,
      texto: "Al recibir tu mano puedes cambiar una de tus dos cartas iniciales por una nueva.",
    },
    invertida: {
      efecto: "enamorados-i", implementado: false,
      texto: "Cada decisión debe tomarse en 10 segundos (contad en alto).",
      fiesta: "Quien agote los 10 segundos, bebe 1 trago.",
    },
  },
  {
    numeral: "VII", nombre: "El Carro", slug: "carro",
    normal: {
      efecto: "carro-n", implementado: true,
      texto: "Ganar dos rondas seguidas da +5 fichas de bonus.",
    },
    invertida: {
      efecto: "carro-i", implementado: true,
      texto: "Tras ganar una ronda, tu siguiente apuesta debe ser al menos el doble de la mínima.",
    },
  },
  {
    numeral: "VIII", nombre: "La Fuerza", slug: "fuerza",
    normal: {
      efecto: "fuerza-n", implementado: true,
      texto: "Se puede doblar con cualquier número de cartas.",
    },
    invertida: {
      efecto: "fuerza-i", implementado: true,
      texto: "Solo se puede doblar con 9, 10 u 11.",
    },
  },
  {
    numeral: "IX", nombre: "El Ermitaño", slug: "ermitano",
    normal: {
      efecto: "ermitano-n", implementado: true,
      texto: "El jugador con menos fichas ve la carta oculta del dealer.",
    },
    invertida: {
      efecto: "ermitano-i", implementado: true,
      texto: "La carta visible del dealer no se muestra hasta el final de la ronda.",
    },
  },
  {
    numeral: "X", nombre: "La Rueda de la Fortuna", slug: "rueda",
    normal: {
      efecto: "rueda-n", implementado: true,
      texto: "Al empezar cada ronda, un multiplicador aleatorio ×1–×3 para las ganancias de esa ronda.",
    },
    invertida: {
      efecto: "rueda-i", implementado: false,
      texto: "Cada ronda, un valor al azar (p. ej. «los 7») no vale nada (0).",
    },
  },
  {
    numeral: "XI", nombre: "La Justicia", slug: "justicia",
    normal: {
      efecto: "justicia-n", implementado: true,
      texto: "Los empates los gana el jugador.",
    },
    invertida: {
      efecto: "justicia-i", implementado: true,
      texto: "Los empates los gana el dealer.",
      fiesta: "Si empatas, bebe 1 trago por la injusticia.",
    },
  },
  {
    numeral: "XII", nombre: "El Colgado", slug: "colgado",
    normal: {
      efecto: "colgado-n", implementado: true,
      texto: "Puedes rendirte incluso después de haber pedido carta.",
    },
    invertida: {
      efecto: "colgado-i", implementado: true,
      texto: "Rendirse está prohibido.",
    },
  },
  {
    numeral: "XIII", nombre: "La Muerte", slug: "muerte",
    normal: {
      efecto: "muerte-n", implementado: false,
      texto: "Pasarse con exactamente 22 no pierde: cuenta como 12 y sigues (avisad al narrador).",
    },
    invertida: {
      efecto: "muerte-i", implementado: true,
      texto: "Si te pasas, tu siguiente apuesta es obligatoriamente la mínima.",
      fiesta: "Si te pasas, además bebe 1 trago.",
    },
  },
  {
    numeral: "XIV", nombre: "La Templanza", slug: "templanza",
    normal: {
      efecto: "templanza-n", implementado: true,
      texto: "Ganar con 5 o más cartas sin pasarse paga como blackjack.",
    },
    invertida: {
      efecto: "templanza-i", implementado: true,
      texto: "Prohibido plantarse con menos de 14.",
      fiesta: "Si te pasas por culpa de esta regla, bebe 1 trago.",
    },
  },
  {
    numeral: "XV", nombre: "El Diablo", slug: "diablo",
    normal: {
      efecto: "diablo-n", implementado: false,
      texto: "Tras plantarte puedes «tentar al diablo»: robas una carta más; si no te pasas, cobras ×2.",
    },
    invertida: {
      efecto: "diablo-i", implementado: true,
      texto: "Quien gana la ronda le quita 3 fichas a cada perdedor.",
      fiesta: "Los perdedores, además, beben 1 trago.",
    },
  },
  {
    numeral: "XVI", nombre: "La Torre", slug: "torre",
    normal: {
      efecto: "torre-n", implementado: true,
      texto: "El dealer se planta en 16 (más blando).",
    },
    invertida: {
      efecto: "torre-i", implementado: true,
      texto: "El dealer roba hasta 18 (más letal).",
    },
  },
  {
    numeral: "XVII", nombre: "La Estrella", slug: "estrella",
    normal: {
      efecto: "estrella-n", implementado: false,
      texto: "Los ases también pueden valer 12 (contadlo de palabra).",
    },
    invertida: {
      efecto: "estrella-i", implementado: false,
      texto: "Los ases solo valen 1 (contadlo de palabra).",
    },
  },
  {
    numeral: "XVIII", nombre: "La Luna", slug: "luna",
    normal: {
      efecto: "luna-n", implementado: false,
      texto: "Tu 2.ª carta se juega boca abajo; si ganas la mano «a ciegas», cobras ×2.",
    },
    invertida: {
      efecto: "luna-i", implementado: false,
      texto: "La primera carta de cada mano no se mira hasta plantarse.",
    },
  },
  {
    numeral: "XIX", nombre: "El Sol", slug: "sol",
    normal: {
      efecto: "sol-n", implementado: true,
      texto: "La carta oculta del dealer se juega boca arriba.",
    },
    invertida: {
      efecto: "sol-i", implementado: true,
      texto: "El dealer gana los blackjacks empatados.",
      fiesta: "Si el dealer te gana así, bebe 2 tragos.",
    },
  },
  {
    numeral: "XX", nombre: "El Juicio", slug: "juicio",
    normal: {
      efecto: "juicio-n", implementado: true,
      texto: "La última ronda vale doble.",
    },
    invertida: {
      efecto: "juicio-i", implementado: true,
      texto: "En la última ronda todos deben apostar al menos la mitad de su pila.",
    },
  },
  {
    numeral: "XXI", nombre: "El Mundo", slug: "mundo",
    normal: {
      efecto: "mundo-n", implementado: true,
      texto: "El 21 exacto (sin ser natural) paga como blackjack.",
    },
    invertida: {
      efecto: "mundo-i", implementado: true,
      texto: "El blackjack natural paga solo ×1.",
    },
  },
];

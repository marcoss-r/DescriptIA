// 21 Arcanos — datos: los 22 arcanos mayores del tarot. Cada arcano tiene un
// efecto DISTINTO según la POSICIÓN en la que sale en la tirada (Pasado, Presente,
// Futuro), y cada posición tiene su versión normal e invertida. En total:
// 22 arcanos × 3 posiciones × 2 orientaciones = 132 efectos. Ver plan §6 y §9.4.
//
// Filosofía de cada posición (plan «Propuesta de tarot por posición»):
//   - PASADO:   consecuencias y rastro de rondas anteriores (karma, memoria).
//   - PRESENTE: reglas que rigen toda la partida (o la ronda en curso).
//   - FUTURO:   profecías: efectos para la última ronda o el final de la partida.
//
// Estructura de un arcano:
//   { numeral, nombre, slug, posiciones: { pasado, presente, futuro } }
//   El slug coincide con el arte (img/21arc/tarot-bj-<slug>.png y …-invertida.png).
//
// Cada posición: { normal, invertida }, y cada una es un efecto:
//   { efecto, texto, fiesta }
//     - efecto: clave única "<slug>-<pa|pr|fu>-<n|i>" que el código consulta para
//       aplicar su hook (js/blackjack/tarot.js y arcade.js).
//     - texto: explicación mostrada al jugador (wording unificado; sin aclaraciones
//       entre paréntesis).
//     - fiesta: consecuencia de tragos cuando el efecto TE TOCA en una ronda. Solo
//       se usa con el modo fiesta 🍻: se suma al saldo de tragos del final de la
//       ronda (arcade.js), aparte de los tragos base (deuda, perder, blackjack…).
//     - soloMulti: el efecto depende del RANKING de jugadores (líder, último, robar
//       fichas a los demás), así que en solitario no haría nada. La tirada lo excluye
//       del pool cuando se juega solo (bjTarotTirada), para no malgastar una carta.
//
// TODOS los efectos se aplican por código (no hay reglas «de palabra»): plan §9.3.

const BJ_TAROT = [
  {
    numeral: "0", nombre: "El Loco", slug: "loco",
    posiciones: {
      pasado: {
        normal: { efecto: "loco-pa-n", texto: "Quien gane plantándose con su mano inicial cobra ×1,5.", fiesta: "Quien gane con su mano inicial reparte 1 trago." },
        invertida: { efecto: "loco-pa-i", texto: "Cada vez que un jugador se pasa, su apuesta mínima sube +5 el resto de la partida.", fiesta: "Quien se pase, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "loco-pr-n", texto: "Una vez por partida, cada jugador puede descartar su mano inicial y robar una nueva.", fiesta: "Quien descarte su mano, bebe 1 trago." },
        invertida: { efecto: "loco-pr-i", texto: "Una vez por partida, cada jugador puede descartar su mano inicial, pero la nueva se juega a ciegas: se planta sin poder pedir.", fiesta: "Quien salte al vacío, bebe 2 tragos." },
      },
      futuro: {
        normal: { efecto: "loco-fu-n", texto: "En la última ronda, todos pueden descartar su mano inicial y robar una nueva.", fiesta: "Quien descarte su mano, bebe 1 trago." },
        invertida: { efecto: "loco-fu-i", texto: "En la última ronda, todos deben descartar su mano inicial y robar una nueva a ciegas, plantándose sin poder pedir.", fiesta: "Todos beben 1 trago antes de saltar al vacío." },
      },
    },
  },
  {
    numeral: "I", nombre: "El Mago", slug: "mago",
    posiciones: {
      pasado: {
        normal: { efecto: "mago-pa-n", texto: "Tras lograr un blackjack, en la ronda siguiente el jugador puede cambiar una carta de su mano por otra del mazo.", fiesta: "Quien cambie una carta, bebe 1 trago." },
        invertida: { efecto: "mago-pa-i", texto: "Si el dealer logra blackjack, nadie puede doblar el resto de la partida.", fiesta: "Si el dealer hace blackjack, todos beben 1 trago." },
      },
      presente: {
        normal: { efecto: "mago-pr-n", texto: "Una vez por partida, cada jugador puede cambiar una carta de su mano por otra del mazo.", fiesta: "Quien cambie una carta, bebe 1 trago." },
        invertida: { efecto: "mago-pr-i", texto: "Una vez por partida, si su mano suma 17, el dealer cambia su peor carta por otra del mazo.", fiesta: "Si el dealer cambia su carta, todos beben 1 trago." },
      },
      futuro: {
        normal: { efecto: "mago-fu-n", texto: "En la última ronda, todos deben doblar salvo que logren blackjack.", fiesta: "Quien no doble, bebe 2 tragos." },
        invertida: { efecto: "mago-fu-i", texto: "En la última ronda, nadie puede doblar.", fiesta: "Quien intente doblar, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "II", nombre: "La Sacerdotisa", slug: "sacerdotisa",
    posiciones: {
      pasado: {
        normal: { efecto: "sacerdotisa-pa-n", texto: "Tras ganar una mano sin pedir cartas, el jugador puede mirar la carta superior del mazo antes de su próxima decisión.", fiesta: "Quien espíe el mazo, bebe 1 trago." },
        invertida: { efecto: "sacerdotisa-pa-i", texto: "Cada vez que un jugador se pasa, el contador de cartas se oculta durante la ronda siguiente.", fiesta: "Quien se pase, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "sacerdotisa-pr-n", texto: "El contador de cartas muestra además cuántos ases quedan, toda la partida.", fiesta: "Quien saque un as, bebe 1 trago." },
        invertida: { efecto: "sacerdotisa-pr-i", texto: "El contador de cartas permanece oculto toda la partida.", fiesta: "Si pierdes la cuenta, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "sacerdotisa-fu-n", texto: "En la última ronda, todos ven la carta superior del mazo antes de decidir.", fiesta: "Quien mire la carta superior, bebe 1 trago." },
        invertida: { efecto: "sacerdotisa-fu-i", texto: "En la última ronda, el contador de cartas permanece oculto.", fiesta: "Bebéis todos 1 trago a ciegas." },
      },
    },
  },
  {
    numeral: "III", nombre: "La Emperatriz", slug: "emperatriz",
    posiciones: {
      pasado: {
        normal: { efecto: "emperatriz-pa-n", texto: "Cada blackjack natural acumula un bonus: el próximo blackjack natural de ese jugador paga ×2,5.", fiesta: "Quien cobre el bonus reparte 2 tragos." },
        invertida: { efecto: "emperatriz-pa-i", texto: "Tras pasarse, el blackjack natural de ese jugador paga ×1,25 en vez de ×1,5.", fiesta: "Quien se pase, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "emperatriz-pr-n", texto: "El blackjack natural paga ×2 toda la partida.", fiesta: "Quien haga blackjack natural reparte 3 tragos." },
        invertida: { efecto: "emperatriz-pr-i", texto: "La apuesta máxima queda limitada a 10.", fiesta: "Quien tope su apuesta, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "emperatriz-fu-n", texto: "En la última ronda, el blackjack natural paga ×3.", fiesta: "Quien haga blackjack reparte 3 tragos." },
        invertida: { efecto: "emperatriz-fu-i", texto: "En la última ronda, un blackjack natural reduce a la mitad las fichas del jugador.", fiesta: "Quien haga blackjack, bebe 2 tragos por la ironía." },
      },
    },
  },
  {
    numeral: "IV", nombre: "El Emperador", slug: "emperador",
    posiciones: {
      pasado: {
        normal: { efecto: "emperador-pa-n", soloMulti: true, texto: "Al final de cada ronda, el líder gana +2 fichas por cada ronda que lleve en cabeza.", fiesta: "El líder reparte 1 trago cada ronda." },
        invertida: { efecto: "emperador-pa-i", soloMulti: true, texto: "Si el último del ranking gana la ronda siguiente, cobra ×2.", fiesta: "Si el último gana, reparte 2 tragos." },
      },
      presente: {
        normal: { efecto: "emperador-pr-n", soloMulti: true, texto: "Quien vaya líder no puede rendirse, toda la partida.", fiesta: "Si el líder quiere rendirse, bebe 1 trago." },
        invertida: { efecto: "emperador-pr-i", soloMulti: true, texto: "El último del ranking siempre puede doblar, aunque no esté permitido.", fiesta: "Cuando el último doble, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "emperador-fu-n", soloMulti: true, texto: "En la última ronda, si el líder gana, cobra ×2.", fiesta: "Si el líder gana, reparte 2 tragos." },
        invertida: { efecto: "emperador-fu-i", soloMulti: true, texto: "En la última ronda, si el último del ranking gana, cobra ×2.", fiesta: "Si el último gana, reparte 2 tragos." },
      },
    },
  },
  {
    numeral: "V", nombre: "El Hierofante", slug: "hierofante",
    posiciones: {
      pasado: {
        normal: { efecto: "hierofante-pa-n", texto: "Quien gane plantándose sin usar reglas opcionales gana +3 fichas.", fiesta: "Quien gane sin reglas opcionales reparte 1 trago." },
        invertida: { efecto: "hierofante-pa-i", texto: "Quien gane tras usar una regla opcional gana +3 fichas.", fiesta: "Quien gane usando una regla opcional reparte 1 trago." },
      },
      presente: {
        normal: { efecto: "hierofante-pr-n", texto: "Se desactivan todas las reglas opcionales: solo pedir y plantarse.", fiesta: "Quien eche de menos una regla opcional, bebe 1 trago." },
        invertida: { efecto: "hierofante-pr-i", texto: "Se activan todas las reglas opcionales, estén marcadas o no.", fiesta: "Quien use una regla opcional, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "hierofante-fu-n", texto: "En la última ronda se desactivan todas las reglas opcionales.", fiesta: "Quien quiera una regla opcional y no pueda, bebe 1 trago." },
        invertida: { efecto: "hierofante-fu-i", texto: "En la última ronda se activan todas las reglas opcionales.", fiesta: "Quien use una regla opcional, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "VI", nombre: "Los Enamorados", slug: "enamorados",
    posiciones: {
      pasado: {
        normal: { efecto: "enamorados-pa-n", texto: "Tras perder dos rondas seguidas, el jugador puede descartar una carta inicial de su próxima mano.", fiesta: "Quien descarte una carta, bebe 1 trago." },
        invertida: { efecto: "enamorados-pa-i", texto: "Tras ganar dos rondas seguidas, el jugador debe doblar su apuesta la próxima vez que juegue.", fiesta: "Quien deba doblar, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "enamorados-pr-n", texto: "Una vez por partida, cada jugador puede descartar una de sus dos cartas iniciales y robar otra.", fiesta: "Quien descarte una carta, bebe 1 trago." },
        invertida: { efecto: "enamorados-pr-i", texto: "Al recibir la mano, cada jugador cambia a ciegas una de sus dos cartas iniciales por la superior del mazo.", fiesta: "Todos beben 1 trago al cambiar a ciegas." },
      },
      futuro: {
        normal: { efecto: "enamorados-fu-n", texto: "En la última ronda, cada jugador elige entre dos manos iniciales; dividir queda desactivado.", fiesta: "Quien elija mano, bebe 1 trago." },
        invertida: { efecto: "enamorados-fu-i", texto: "En la última ronda, cada jugador cambia a ciegas una de sus dos cartas iniciales por la superior del mazo.", fiesta: "Todos beben 1 trago al cambiar a ciegas." },
      },
    },
  },
  {
    numeral: "VII", nombre: "El Carro", slug: "carro",
    posiciones: {
      pasado: {
        normal: { efecto: "carro-pa-n", texto: "Cada racha de 2 victorias seguidas da +5 fichas de bonus.", fiesta: "Quien cobre el bonus de racha reparte 1 trago." },
        invertida: { efecto: "carro-pa-i", texto: "Tras ganar una ronda, la siguiente apuesta debe ser al menos el doble de la mínima.", fiesta: "Quien suba su apuesta, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "carro-pr-n", soloMulti: true, texto: "En tu turno puedes apostar por el líder actual: si su mano gana la ronda, cobras +3 fichas aunque la tuya pierda.", fiesta: "Quien cobre apostando por el líder reparte 1 trago." },
        invertida: { efecto: "carro-pr-i", texto: "La apuesta mínima sube +5 cada vez que alguien encadena 2 victorias.", fiesta: "Cuando suba la mínima, todos beben 1 trago." },
      },
      futuro: {
        normal: { efecto: "carro-fu-n", texto: "Quien llegue en racha de victorias a la última ronda cobra ×2.", fiesta: "Quien llegue en racha reparte 2 tragos." },
        invertida: { efecto: "carro-fu-i", soloMulti: true, texto: "En la última ronda, quien más victorias lleve debe apostar el doble de la apuesta máxima.", fiesta: "Quien deba apostar el doble brinda con todos." },
      },
    },
  },
  {
    numeral: "VIII", nombre: "La Fuerza", slug: "fuerza",
    posiciones: {
      pasado: {
        normal: { efecto: "fuerza-pa-n", texto: "Cada vez que un jugador dobla y gana, cobra ×1,1.", fiesta: "Quien doble y gane reparte 1 trago." },
        invertida: { efecto: "fuerza-pa-i", texto: "Cada vez que un jugador dobla y pierde, pierde 5 fichas adicionales.", fiesta: "Quien doble y pierda, bebe 2 tragos." },
      },
      presente: {
        normal: { efecto: "fuerza-pr-n", texto: "Se puede doblar con cualquier número de cartas, toda la partida.", fiesta: "Quien doble con 3 o más cartas, bebe 1 trago." },
        invertida: { efecto: "fuerza-pr-i", texto: "Solo se puede doblar con 9, 10 u 11.", fiesta: "Quien quiera doblar y no pueda, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "fuerza-fu-n", texto: "En la última ronda, quien doble cobra ×1,1 si gana o ×0,9 si pierde.", fiesta: "Quien doble en la última ronda, bebe 1 trago." },
        invertida: { efecto: "fuerza-fu-i", texto: "En la última ronda, solo se puede doblar con 9, 10 u 11.", fiesta: "Quien quiera doblar y no pueda, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "IX", nombre: "El Ermitaño", slug: "ermitano",
    posiciones: {
      pasado: {
        normal: { efecto: "ermitano-pa-n", soloMulti: true, texto: "En cada ronda, quien vaya último ve la carta oculta del dealer.", fiesta: "Quien espíe la oculta, bebe 1 trago." },
        invertida: { efecto: "ermitano-pa-i", soloMulti: true, texto: "En cada ronda, quien vaya primero no ve la carta visible del dealer hasta plantarse.", fiesta: "Quien juegue a ciegas, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "ermitano-pr-n", texto: "La carta oculta del dealer está visible toda la partida.", fiesta: "Quien mire la oculta, bebe 1 trago." },
        invertida: { efecto: "ermitano-pr-i", texto: "La carta visible del dealer permanece oculta toda la partida.", fiesta: "Todos beben 1 trago a oscuras." },
      },
      futuro: {
        normal: { efecto: "ermitano-fu-n", texto: "En la última ronda, todos ven la carta oculta del dealer.", fiesta: "Todos beben 1 trago al ver la oculta." },
        invertida: { efecto: "ermitano-fu-i", texto: "En la última ronda, la carta visible del dealer permanece oculta hasta plantarse.", fiesta: "Todos beben 1 trago a oscuras." },
      },
    },
  },
  {
    numeral: "X", nombre: "La Rueda de la Fortuna", slug: "rueda",
    posiciones: {
      pasado: {
        normal: { efecto: "rueda-pa-n", texto: "Tras ganar una mano, la próxima ganancia del jugador lleva un multiplicador aleatorio ×1–×3.", fiesta: "Quien cobre con multiplicador reparte 1 trago." },
        invertida: { efecto: "rueda-pa-i", texto: "Tras perder una ronda, una carta inicial al azar del jugador vale 0 la ronda siguiente.", fiesta: "Quien tenga una carta a 0, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "rueda-pr-n", texto: "Al empezar cada ronda se sortea un multiplicador ×0,5–×3 sobre las ganancias de esa ronda.", fiesta: "Con multiplicador alto, el ganador reparte 1 trago." },
        invertida: { efecto: "rueda-pr-i", texto: "Al empezar cada ronda se sortea un valor de carta que cuenta como 0 esa ronda.", fiesta: "Quien tenga una carta a 0, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "rueda-fu-n", texto: "En la última ronda, el multiplicador sorteado puede llegar a ×5.", fiesta: "Quien cobre el multiplicador reparte 2 tragos." },
        invertida: { efecto: "rueda-fu-i", texto: "En la última ronda, dos valores de carta al azar cuentan como 0.", fiesta: "Bebéis todos 1 trago por el caos." },
      },
    },
  },
  {
    numeral: "XI", nombre: "La Justicia", slug: "justicia",
    posiciones: {
      pasado: {
        normal: { efecto: "justicia-pa-n", texto: "Si un jugador lleva más empates perdidos que ganados, gana su próximo empate.", fiesta: "Quien gane un empate reparte 1 trago." },
        invertida: { efecto: "justicia-pa-i", texto: "Si un jugador lleva más empates ganados que perdidos, pierde su próximo empate.", fiesta: "Quien pierda un empate, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "justicia-pr-n", texto: "Los empates los gana el jugador.", fiesta: "Quien gane un empate reparte 1 trago." },
        invertida: { efecto: "justicia-pr-i", texto: "Los empates los gana el dealer.", fiesta: "Si empatas, bebe 1 trago por la injusticia." },
      },
      futuro: {
        normal: { efecto: "justicia-fu-n", texto: "En la última ronda, los empates los gana el jugador.", fiesta: "Quien gane un empate reparte 1 trago." },
        invertida: { efecto: "justicia-fu-i", texto: "En la última ronda, los empates los gana el dealer.", fiesta: "Si empatas en la última ronda, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "XII", nombre: "El Colgado", slug: "colgado",
    posiciones: {
      pasado: {
        normal: { efecto: "colgado-pa-n", texto: "Tras perder una apuesta, el jugador recupera el 10 % de lo perdido.", fiesta: "Quien recupere fichas, bebe 1 trago." },
        invertida: { efecto: "colgado-pa-i", texto: "Cada mano ganada impide rendirse en la mano siguiente de ese jugador.", fiesta: "Quien no pueda rendirse, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "colgado-pr-n", texto: "Se puede rendirse incluso después de pedir carta.", fiesta: "Quien se rinda tarde, bebe 1 trago." },
        invertida: { efecto: "colgado-pr-i", texto: "Rendirse está prohibido, aunque esté habilitado.", fiesta: "Quien quiera rendirse y no pueda, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "colgado-fu-n", texto: "En la última ronda se puede rendirse incluso después de pedir carta.", fiesta: "Quien se rinda tarde, bebe 1 trago." },
        invertida: { efecto: "colgado-fu-i", texto: "En la última ronda, rendirse está prohibido.", fiesta: "Quien quiera rendirse, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "XIII", nombre: "La Muerte", slug: "muerte",
    posiciones: {
      pasado: {
        normal: { efecto: "muerte-pa-n", texto: "Cada vez que un jugador se pasa, su apuesta mínima se reduce a la mitad en su siguiente mano.", fiesta: "Quien se pase, bebe 1 trago." },
        invertida: { efecto: "muerte-pa-i", texto: "Cada vez que un jugador se pasa, su siguiente apuesta queda fijada a la mínima.", fiesta: "Si te pasas, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "muerte-pr-n", texto: "Pasarse con 22 no pierde: cuenta como 12 y sigues jugando.", fiesta: "Quien resucite con 22 reparte 2 tragos." },
        invertida: { efecto: "muerte-pr-i", texto: "Nadie puede plantarse con menos de 17, toda la partida.", fiesta: "Quien se pase por no poder plantarse, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "muerte-fu-n", texto: "En la última ronda, cualquier bust cuenta como 12.", fiesta: "Quien resucite un bust reparte 1 trago." },
        invertida: { efecto: "muerte-fu-i", texto: "En la última ronda, pasarse aplica ×0,8 a las fichas totales.", fiesta: "Si te pasas en la última ronda, bebe 2 tragos." },
      },
    },
  },
  {
    numeral: "XIV", nombre: "La Templanza", slug: "templanza",
    posiciones: {
      pasado: {
        normal: { efecto: "templanza-pa-n", texto: "Quien gane plantándose con 4 o más cartas gana +3 fichas.", fiesta: "Quien gane con 4 o más cartas reparte 1 trago." },
        invertida: { efecto: "templanza-pa-i", texto: "Quien se plante con su mano inicial sube su apuesta mínima +5 el resto de la partida.", fiesta: "Quien se plante de primeras, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "templanza-pr-n", texto: "Plantarse con 5 o más cartas sin pasarse paga como blackjack.", fiesta: "Quien cobre por 5 cartas reparte 2 tragos." },
        invertida: { efecto: "templanza-pr-i", texto: "No puedes plantarte con la mano inicial.", fiesta: "Si te pasas por culpa de esta regla, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "templanza-fu-n", texto: "En la última ronda, plantarse con 4 o más cartas sin pasarse paga como blackjack.", fiesta: "Quien cobre por 4 o más cartas reparte 2 tragos." },
        invertida: { efecto: "templanza-fu-i", texto: "En la última ronda, no puedes plantarte con la mano inicial ni con menos de 16.", fiesta: "Si te pasas por culpa de esta regla, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "XV", nombre: "El Diablo", slug: "diablo",
    posiciones: {
      pasado: {
        normal: { efecto: "diablo-pa-n", texto: "Tras doblar y ganar, el jugador cobra ×2 extra al doblar en su ronda siguiente.", fiesta: "Quien tiente al diablo reparte 1 trago." },
        invertida: { efecto: "diablo-pa-i", soloMulti: true, texto: "Cada mano perdida entrega 2 fichas a cada ganador de la ronda, dealer incluido.", fiesta: "Los perdedores, además, beben 1 trago." },
      },
      presente: {
        normal: { efecto: "diablo-pr-n", texto: "Una vez por partida, con 3 cartas en mano puedes pedir una más y, si no te pasas, cobrar ×2.", fiesta: "Quien tiente al diablo reparte 2 tragos." },
        invertida: { efecto: "diablo-pr-i", soloMulti: true, texto: "Cada ronda, los ganadores roban 3 fichas a cada perdedor.", fiesta: "Cada perdedor bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "diablo-fu-n", texto: "En la última ronda, doblar cobra ×2 extra.", fiesta: "Quien doble en la última reparte 1 trago." },
        invertida: { efecto: "diablo-fu-i", soloMulti: true, texto: "Quien gane la última ronda roba 5 fichas a cada perdedor.", fiesta: "Cada perdedor bebe 2 tragos." },
      },
    },
  },
  {
    numeral: "XVI", nombre: "La Torre", slug: "torre",
    posiciones: {
      pasado: {
        normal: { efecto: "torre-pa-n", texto: "Si el dealer gana a todos, la ronda siguiente se planta en 16.", fiesta: "Si el dealer arrasa, todos beben 1 trago." },
        invertida: { efecto: "torre-pa-i", texto: "Cuando un jugador logra 21, el dealer roba hasta 18 esa ronda.", fiesta: "Quien fuerce al dealer a 18, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "torre-pr-n", texto: "El dealer se planta en 16, toda la partida.", fiesta: "Quien gane al dealer blando reparte 1 trago." },
        invertida: { efecto: "torre-pr-i", texto: "El dealer roba hasta 18, toda la partida.", fiesta: "Quien caiga ante el dealer letal, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "torre-fu-n", texto: "En la última ronda, el dealer se planta en 16.", fiesta: "Quien gane al dealer blando reparte 1 trago." },
        invertida: { efecto: "torre-fu-i", texto: "En la última ronda, el dealer roba hasta 18.", fiesta: "Quien caiga ante el dealer letal, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "XVII", nombre: "La Estrella", slug: "estrella",
    posiciones: {
      pasado: {
        normal: { efecto: "estrella-pa-n", texto: "Tras perder una ronda, en la siguiente los ases del jugador valen siempre 11.", fiesta: "Quien saque un as afortunado reparte 1 trago." },
        invertida: { efecto: "estrella-pa-i", texto: "Tras ganar una ronda, en la siguiente los ases del jugador valen siempre 1.", fiesta: "Quien saque un as flojo, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "estrella-pr-n", texto: "Los ases valen 1 o 12, nunca 11.", fiesta: "Quien use un as a 12 reparte 1 trago." },
        invertida: { efecto: "estrella-pr-i", texto: "Los ases solo valen 1, toda la partida.", fiesta: "Quien saque un as, bebe 1 trago." },
      },
      futuro: {
        normal: { efecto: "estrella-fu-n", texto: "En la última ronda, los ases también pueden valer 12.", fiesta: "Quien use un as a 12 reparte 1 trago." },
        invertida: { efecto: "estrella-fu-i", texto: "En la última ronda, los ases valen 0.", fiesta: "Quien saque un as, bebe 2 tragos." },
      },
    },
  },
  {
    numeral: "XVIII", nombre: "La Luna", slug: "luna",
    posiciones: {
      pasado: {
        normal: { efecto: "luna-pa-n", texto: "Quien gane sin haber visto la carta oculta del dealer cobra ×1,15 la ronda siguiente.", fiesta: "Quien gane a ciegas reparte 1 trago." },
        invertida: { efecto: "luna-pa-i", texto: "Tras perder una ronda, la segunda carta del jugador se reparte boca abajo la ronda siguiente.", fiesta: "Quien juegue a ciegas, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "luna-pr-n", texto: "La segunda carta de cada jugador se reparte boca abajo; ganar cobra ×2.", fiesta: "Quien gane a ciegas reparte 2 tragos." },
        invertida: { efecto: "luna-pr-i", texto: "Las dos cartas del dealer están ocultas.", fiesta: "Todos beben 1 trago a oscuras." },
      },
      futuro: {
        normal: { efecto: "luna-fu-n", texto: "En la última ronda, la segunda carta de cada jugador se reparte boca abajo; ganar cobra ×2,5.", fiesta: "Quien gane a ciegas reparte 2 tragos." },
        invertida: { efecto: "luna-fu-i", texto: "En la última ronda, las dos cartas del dealer están ocultas.", fiesta: "Todos beben 1 trago a oscuras." },
      },
    },
  },
  {
    numeral: "XIX", nombre: "El Sol", slug: "sol",
    posiciones: {
      pasado: {
        normal: { efecto: "sol-pa-n", texto: "Si todos ganan al dealer, este revela su carta oculta la ronda siguiente.", fiesta: "Si arrasáis al dealer, repartís 1 trago." },
        invertida: { efecto: "sol-pa-i", texto: "Si el dealer gana a todos, la ronda siguiente juega con sus dos cartas ocultas.", fiesta: "Si el dealer arrasa, todos beben 1 trago." },
      },
      presente: {
        normal: { efecto: "sol-pr-n", texto: "La carta oculta del dealer se reparte boca arriba, toda la partida.", fiesta: "Quien aproveche la carta vista reparte 1 trago." },
        invertida: { efecto: "sol-pr-i", texto: "Cada blackjack del dealer quita 10 fichas a cada jugador.", fiesta: "Si el dealer hace blackjack, todos beben 1 trago." },
      },
      futuro: {
        normal: { efecto: "sol-fu-n", texto: "En la última ronda, la carta oculta del dealer es visible desde el principio.", fiesta: "Quien gane con ventaja reparte 1 trago." },
        invertida: { efecto: "sol-fu-i", texto: "Si el dealer gana a todos en la última ronda, quita 15 fichas a cada jugador.", fiesta: "Si el dealer os gana a todos, bebéis todos 2 tragos." },
      },
    },
  },
  {
    numeral: "XX", nombre: "El Juicio", slug: "juicio",
    posiciones: {
      pasado: {
        normal: { efecto: "juicio-pa-n", texto: "Tras perder dos rondas seguidas, el jugador tiene una segunda oportunidad si se pasa en su siguiente mano.", fiesta: "Quien resucite reparte 1 trago." },
        invertida: { efecto: "juicio-pa-i", texto: "Los multiplicadores activos en una ronda se mantienen en la siguiente.", fiesta: "Quien conserve un multiplicador reparte 1 trago." },
      },
      presente: {
        normal: { efecto: "juicio-pr-n", texto: "Una vez por partida, si un jugador se pasa tiene una segunda oportunidad.", fiesta: "Quien use su segunda oportunidad, bebe 1 trago." },
        invertida: { efecto: "juicio-pr-i", texto: "Cuando un multiplicador se activa, permanece toda la partida.", fiesta: "Quien fije un multiplicador reparte 1 trago." },
      },
      futuro: {
        normal: { efecto: "juicio-fu-n", texto: "La última ronda añade un ×2 a las ganancias.", fiesta: "Quien gane la última reparte 2 tragos." },
        invertida: { efecto: "juicio-fu-i", texto: "En la última ronda, todos deben apostar al menos la mitad de su pila.", fiesta: "Quien apueste medio botín, bebe 1 trago." },
      },
    },
  },
  {
    numeral: "XXI", nombre: "El Mundo", slug: "mundo",
    posiciones: {
      pasado: {
        normal: { efecto: "mundo-pa-n", texto: "Cada 21 exacto logrado da +10 fichas.", fiesta: "Quien logre un 21 exacto reparte 1 trago." },
        invertida: { efecto: "mundo-pa-i", texto: "Cada blackjack natural resta 10 fichas.", fiesta: "Quien haga blackjack, bebe 1 trago." },
      },
      presente: {
        normal: { efecto: "mundo-pr-n", texto: "El 21 exacto paga como blackjack.", fiesta: "Quien logre un 21 exacto reparte 2 tragos." },
        invertida: { efecto: "mundo-pr-i", texto: "El blackjack natural paga solo ×1.", fiesta: "Cada blackjack natural, el dealer reparte 1 trago." },
      },
      futuro: {
        normal: { efecto: "mundo-fu-n", texto: "Al final de la partida, cada 21 exacto logrado suma +15 fichas.", fiesta: "Cada 21 exacto, reparte 1 trago." },
        invertida: { efecto: "mundo-fu-i", texto: "Al final de la partida, cada blackjack natural resta 15 fichas.", fiesta: "Cada blackjack natural, bebe 1 trago." },
      },
    },
  },
];

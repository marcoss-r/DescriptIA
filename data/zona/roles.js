// Zona Tensionada: catálogo estático de roles. Solo DATOS, nada de lógica.
//
// La idea (el aprendizaje de la Fase 3): en vez de repartir
// "if (rol === 'okupa')" por todo el código, cada rol declara aquí sus
// propiedades y BANDERAS, y la lógica genérica las lee:
//
//   - ordenNoche  → ztConstruirColaTurnos() ordena los turnos con este número;
//                   un rol SIN ordenNoche no tiene turno nocturno.
//   - soloNoche1  → la cola solo lo incluye la primera noche (Inmobiliaria).
//   - usoUnico    → su acción se gasta para siempre (cacerolada del Sindicato).
//   - pasivo      → sin turno: su poder se dispara por eventos (el Okupa al ser
//                   desahuciado, el Tasador al ser eliminado, el Influencer al
//                   ser expulsado). Documenta la intención; la lógica de esos
//                   eventos vive donde ocurre el evento (noche/día).
//
// Añadir un rol mañana = añadir una entrada aquí (y, como mucho, su interacción
// en el turno de noche si la tiene). Nada de tocar veinte ifs repartidos.
//
// Campos por rol:
//   nombre      → como se enseña en pantalla.
//   bando       → "vecinos" | "buitres" | "independiente" (victoria, TODO 6.2).
//   carta       → ruta del PNG pixel art (Fase 0). El vecino tiene 5 artes:
//                 se elige con ztCartaDeJugador(), abajo.
//   efecto      → texto que ve el jugador en la revelación Y en su turno.
//   instruccion → lo que la persona narradora lee EN ALTO en su turno nocturno.

const ZT_ROLES = {
  buitre: {
    nombre: "Fondo Buitre",
    bando: "buitres",
    carta: "img/zona/buitre.png",
    efecto:
      "Cada noche, los fondos buitre abrís los ojos y elegís juntos a quién " +
      "desahuciar. Os reconocéis la primera noche.",
    instruccion:
      "Fondos buitre, abrid los ojos y señalad a quién desahuciáis esta noche.",
    ordenNoche: 2,
  },

  plataforma: {
    nombre: "Plataforma Vacacional",
    bando: "buitres",
    carta: "img/zona/plataforma.png",
    efecto:
      "Juegas para los buitres, pero no sabes quiénes son (ni ellos saben de " +
      "ti). Cada noche conviertes una casa en piso turístico y ese vecino no " +
      "vota al día siguiente. Para Hacienda, tus papeles están en regla.",
    instruccion:
      "Plataforma, abre los ojos y señala qué casa conviertes en piso turístico.",
    ordenNoche: 3,
  },

  hacienda: {
    nombre: "Hacienda",
    bando: "vecinos",
    carta: "img/zona/hacienda.png",
    efecto:
      "Cada noche inspeccionas las cuentas de alguien: la app te dice si es " +
      "un fondo buitre o no.",
    instruccion: "Hacienda, abre los ojos y señala a quién quieres inspeccionar.",
    ordenNoche: 4,
  },

  sindicato: {
    nombre: "Sindicato de Vivienda",
    bando: "vecinos",
    carta: "img/zona/sindicato.png",
    efecto:
      "Cada noche ves quién ha sido desahuciado. UNA sola vez por partida " +
      "puedes salvarlo convocando una cacerolada.",
    instruccion: "Sindicato, abre los ojos y mira quién ha caído esta noche.",
    ordenNoche: 5,
    usoUnico: true,
  },

  inmobiliaria: {
    nombre: "Inmobiliaria",
    bando: "vecinos",
    carta: "img/zona/inmobiliaria.png",
    efecto:
      "Solo la primera noche: emparejas a dos personas como compañeros de " +
      "piso. Si cae una, cae la otra. Si la pareja es vecino + buitre, ganan " +
      "ellos dos si se quedan solos.",
    instruccion:
      "Inmobiliaria, abre los ojos y señala a las DOS personas que compartirán piso.",
    ordenNoche: 1,
    soloNoche1: true,
  },

  okupa: {
    nombre: "El Okupa",
    bando: "vecinos",
    carta: "img/zona/okupa.png",
    efecto:
      "La primera vez que los buitres te desahucien, resistes y no caes. La " +
      "segunda, sí. (A la asamblea no puedes resistirte.)",
    pasivo: true,
  },

  tasador: {
    nombre: "El Tasador",
    bando: "vecinos",
    carta: "img/zona/tasador.png",
    efecto:
      "Si te eliminan —de noche o en la asamblea— te llevas a alguien por " +
      "delante: tú eliges a quién.",
    pasivo: true,
  },

  influencer: {
    nombre: "Influencer Inmobiliario",
    bando: "independiente",
    carta: "img/zona/influencer.png",
    efecto:
      "Ganas TÚ SOLO si consigues que la asamblea te expulse. Si te " +
      "desahucian de noche, no hay premio. La partida continúa sin ti.",
    pasivo: true,
  },

  vecino: {
    nombre: "Vecino del barrio",
    bando: "vecinos",
    carta: null, // hay 5 artes distintos: los elige ztCartaDeJugador()
    efecto:
      "Sin poderes: sobrevive, vota en la asamblea y sospecha de todo el mundo.",
    pasivo: true,
  },
};

// Identidades decorativas de los vecinos rasos (solo texto, sin efecto),
// AGRUPADAS por el arte de su carta (vecino-1..5) para que el texto pegue con
// el dibujo que ve el jugador (nada de carta del abuelo con identidad de "la
// del carrito"). El reparto elige una variante al azar del grupo del arte
// asignado, sin repetir. Con 13 vecinos posibles (14 jugadores − 1 buitre)
// cada arte sale como mucho 3 veces: 3 variantes por carta bastan para que
// no se repita ninguna identidad.
const ZT_IDENTIDADES = {
  // vecino-1: abuela con gafas, rebeca lila y carrito de la compra.
  1: [
    "la del 4º con el carrito de la compra",
    "la que recoge los paquetes de todo el bloque",
    "la del portal de al lado que lo sabe todo",
    "la que le da de comer a las palomas y tiene un nido en el balcón",
    "la que se pasa las noches en el bingo",
  ],
  // vecino-2: joven con gorro, auriculares y monopatín.
  2: [
    "el del 5º que hace skate y sale con el patinete",
    "el del 2ºB que ensaya con la batería",
    "el que pone lavadoras a las 3 de la mañana",
    "el que vuelve de fiesta ciego perdido y armando escándalo",
    "el que se fuma unos leños que flipas y se pone a hablar con las farolas",
  ],
  // vecino-3: vecina regando la maceta del balcón.
  3: [
    "la del 2º que riega hasta el felpudo",
    "la de las plantas que invaden la escalera",
    "la que cuelga la fregona sobre tu balcón",
    "la que tiene la casa llena de gatos",
    "la cotilla que no se pierde un vídeo de Javi Hoyos",
    "la que se pone a «aplaudir» todas las noches a las 2 de la mañana",
  ],
  // vecino-4: vecino paseando al perrillo antes de dormir.
  4: [
    "el del 1º que pasea al perro en pijama",
    "el que nunca saluda en el ascensor (su perro sí)",
    "el que se sabe el nombre de todos los perros del barrio (de los dueños, no)",
    "el del 3º cuyo perro ladra a las 4 de la mañana y no le importa",
    "el que deja que el perro mee en el felpudo de los vecinos",
  ],
  // vecino-5: abuelo de boina con bastón y periódico.
  5: [
    "el del 3º de la boina y el periódico",
    "el presidente de la comunidad (autoproclamado)",
    "el del banco de la plaza que opina de todo",
    "el viejo verde que se pasa la vida en el bar",
    "el que nunca deja a los niños jugar con la pelota pero se queja de que no sueltan el móvil"
  ],
};

// Carta de un jugador concreto. Los vecinos comparten rol pero no arte: el
// reparto (ztRepartirCartas) les asigna cartaVecino (1..5) por bolsa barajada,
// sin repetir arte hasta haberlos usado los cinco.
function ztCartaDeJugador(jugador) {
  if (jugador.rol === "vecino") {
    return `img/zona/vecino-${jugador.cartaVecino}.png`;
  }
  return ZT_ROLES[jugador.rol].carta;
}

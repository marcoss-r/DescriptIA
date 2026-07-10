// Zona Tensionada: textos paródicos por evento. Solo DATOS + un helper.
//
// Cada evento tiene un ARRAY de variantes y se elige una al azar (más gracia a
// la segunda partida). Donde aparece la palabra NOMBRE, ztTexto() la sustituye
// por el nombre del jugador.
//
// Contenido inicial de relleno (§4.5 del plan): los textos definitivos los
// escribe el usuario cuando quiera; basta editar estos arrays (añadir variantes
// es gratis: el juego elige entre las que haya).
//
// Ojo: los textos de "okupa" NO llevan NOMBRE a propósito: anunciar a quién
// intentaron desahuciar delataría quién es el Okupa.

const ZT_TEXTOS = {
  // La narradora abre la noche con esto.
  noche: [
    "La ciudad duerme. Los fondos buitre revisan sus carteras…",
    "Cae la noche en el barrio. Alguien actualiza un Excel con malas intenciones.",
    "La ciudad duerme. A lo lejos, una impresora escupe burofaxes.",
  ],

  // Amanecer: alguien ha sido desahuciado.
  desahucio: [
    "NOMBRE ha encontrado un burofax en su puerta. El piso ya está anunciado con fotos de gran angular por 1.400 €/mes.",
    "El portal de NOMBRE amanece con cerradura nueva y un candadito con código.",
    "NOMBRE ya no vive aquí: ahora es un «coliving boutique de inspiración nórdica».",
  ],

  // Amanecer: el Sindicato gastó la cacerolada.
  salvacion: [
    "Esta noche había cacerolada en el portal de NOMBRE. Los buitres no se han atrevido a entrar.",
    "Los vecinos salieron con cacerolas y pancartas: NOMBRE se queda en su casa.",
  ],

  // Amanecer: el Okupa resistió (sin nombre: no delatar).
  okupa: [
    "Lo intentaron, pero sigue dentro.",
    "La cerradura amaneció cambiada… desde dentro. Alguien resiste.",
  ],

  // Amanecer: no cayó nadie (defensivo; en v1 los buitres siempre eligen).
  nadie: [
    "Esta noche no ha caído nadie. Sospechoso.",
    "Amanece sin desahucios. Los buitres afilan las plumas.",
  ],

  // Amanecer: la casa de alguien es hoy un piso turístico (no vota).
  pisoturista: [
    "La casa de NOMBRE es ahora un piso turístico: hay tres maletas con ruedines en el portal. Hoy NO vota en la asamblea.",
    "NOMBRE ha amanecido rodeado de una despedida de soltero con altavoz. Hoy no vota.",
  ],

  // Resultado de la inspección de Hacienda.
  inspeccionCulpable: [
    "47 transferencias a una SICAV de Luxemburgo. ES un fondo buitre.",
    "Tres SOCIMIs y un yate llamado «Plusvalía». ES un fondo buitre.",
  ],
  inspeccionInocente: [
    "Todo en regla. Hasta guarda las facturas del butano.",
    "Declara hasta las propinas. NO es un fondo buitre.",
  ],

  // La asamblea expulsa a alguien.
  expulsion: [
    "La asamblea ha decidido: NOMBRE, devuelve las llaves. Todas.",
    "A mano alzada y sin acritud: NOMBRE queda expulsado del barrio.",
  ],
  expulsionNadie: [
    "La asamblea no se aclara y hoy no expulsa a nadie. El debate sigue en el grupo de WhatsApp.",
    "Empate técnico y mucho ruido: hoy no se expulsa a nadie.",
  ],

  // La asamblea expulsa al Influencer: victoria personal, la partida sigue.
  influencer: [
    "¡NOMBRE quería exactamente esto! Ya está grabando: «ME ECHAN DE MI PROPIO BARRIO (no clickbait)». Victoria personal del Influencer; la partida continúa.",
    "NOMBRE sale del barrio entre flashes: era el Influencer y acabáis de darle contenido para un mes. Gana él; la partida sigue.",
  ],

  // Cascada: cae el compañero de piso del eliminado.
  pareja: [
    "NOMBRE compartía piso con la persona caída: la fianza era conjunta, así que también se va.",
    "Sin compañero de piso no hay alquiler que valga: NOMBRE cae también.",
  ],

  // El Tasador caído se lleva a alguien por delante.
  venganzaTasador: [
    "Última tasación del Tasador: la casa de NOMBRE, valor cero. Se lo lleva por delante.",
    "El Tasador firma un último informe: NOMBRE, «ruina técnica». Fuera también.",
  ],

  // Pantalla final: frase paródica bajo el titular. CORTA a propósito: quién
  // gana ya lo dice el titular (ztTerminarPartida) y un texto largo se come
  // la pantalla en móvil.
  victoriaBuitres: [
    "El barrio entero es ya un fondo de inversión con piscina de bolas.",
    "No quedan vecinos suficientes: el barrio empieza a cotizar en bolsa.",
  ],
  victoriaVecinos: [
    "El último buitre devuelve las llaves y pide perdón en la asamblea.",
    "Se acabaron los burofaxes: el barrio respira.",
  ],
  victoriaPareja: [
    "Solo quedan ellos dos y su piso compartido. La fianza conjunta lo puede todo.",
  ],
};

// Devuelve una variante al azar del evento `clave`, sustituyendo NOMBRE si se
// pasa un nombre. Math.random basta: no hace falta barajar para elegir UNA.
function ztTexto(clave, nombre) {
  const variantes = ZT_TEXTOS[clave] || [""];
  const texto = variantes[Math.floor(Math.random() * variantes.length)];
  return nombre === undefined ? texto : texto.replaceAll("NOMBRE", nombre);
}

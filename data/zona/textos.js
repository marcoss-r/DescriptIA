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
    "El barrio duerme, pero alguien no: un fondo buitre afila las garras.",
    "Ya es de noche en el barrio. Alguien hace cuentas y se frota las manos.",
    "La ciudad duerme. Alguien hace un TikTok con la etiqueta #desahucio.",
    "La ciudad duerme. En un despacho, alguien apunta sobresueldos en una libreta manuscrita, al más puro estilo Bárcenas.",
    "Cae la noche. Los buitres fichan más que Alvise en el Parlamento Europeo, que tampoco es decir mucho.",
    "La ciudad duerme. Vito Quiles retransmite en directo desde un portal: él lo llama periodismo.",
    "El barrio duerme. Alguien emite una factura falsa por «servicios de asesoramiento» y se va a dormir tan tranquilo.",
    "La ciudad duerme. En una universidad, alguien firma una cátedra a medida para una señora sin oposición. Su marido dice que no sabía nada.",
    "La ciudad duerme. Un streamer «residente en Andorra» pide su quinta cena a domicilio del mes… en Murcia.",
  ],

  // Amanecer: alguien ha sido desahuciado.
  desahucio: [
    "NOMBRE ha encontrado un burofax en su puerta. El piso ya está anunciado con fotos de gran angular por 1.400 €/mes.",
    "El portal de NOMBRE amanece con cerradura nueva y un candadito con código.",
    "NOMBRE ya no vive aquí: ahora es un «coliving boutique de inspiración nórdica».",
    "NOMBRE ha sido desahuciado. Su piso sale en un reel de Instagram de Tecnocasa separado por habitaciones",
    "NOMBRE no dormirá esta noche en su casa: Van a convertir su piso en un Mercadona",
    "NOMBRE ha sido desahuciado. El comprador ha pagado con facturas falsas, como el novio de Ayuso. Seguro que Hacienda lo entiende.",
    "NOMBRE ya no vive aquí: su piso es ahora la sede de una consultora que solo ha emitido una factura en su vida.",
    "NOMBRE ha sido desahuciado. Su salón ya sale en un vlog de Lola Lolita como «mi nuevo set de grabación, chicos».",
    "NOMBRE se queda sin piso: lo ha comprado un eurodiputado que no pisa Bruselas pero cobra puntual cada mes.",
    "NOMBRE ha sido desahuciado: el fondo alega que ese piso les fue prometido hace 3.000 años y el juez no ha querido discutir con las escrituras divinas.",
    "NOMBRE ya no vive aquí. El nuevo dueño reside oficialmente en Andorra, aunque se le ve por el barrio más que al propio NOMBRE.",
  ],

  // Amanecer: el Sindicato gastó la cacerolada.
  salvacion: [
    "Esta noche había cacerolada en el portal de NOMBRE. Los buitres no se han atrevido a entrar.",
    "Los vecinos salieron con cacerolas y pancartas: NOMBRE se queda en su casa.",
    "NOMBRE ha amanecido con la cerradura intacta: el Sindicato ha hecho su trabajo y lo celebrará con marisco.",
    "NOMBRE seguirá en su casa: los sindicalistas por fin trabajan",
    "Cacerolada histórica en el portal de NOMBRE: más ruido que Twitter cuando salió el sorteo del sueldo de eurodiputado de Alvise.",
    "Los buitres llegaron al portal de NOMBRE, vieron más gente que en un mitin de Vito Quiles y dieron media vuelta.",
  ],

  // Amanecer: el Okupa resistió (sin nombre: no delatar).
  okupa: [
    "Lo intentaron, pero sigue dentro.",
    "La cerradura amaneció cambiada… desde dentro. Alguien resiste.",
    "Los fondos buitre llamarán a DesOkupa la próxima noche. Hoy no hay desahucio.",
    "El Okupa ha resistido hacha en mano. Los buitres se van a casa con las manos vacías.",
    "Intentaron entrar, pero dentro hay más resistencia que Bárcenas en un interrogatorio: nadie suelta nada.",
    "DesOkupa llegó, vio la pancarta del balcón y pidió refuerzos. Sigue dentro.",
  ],

  // Amanecer: no cayó nadie (defensivo; en v1 los buitres siempre eligen).
  nadie: [
    "Esta noche no ha caído nadie. Sospechoso.",
    "Amanece sin desahucios. Los buitres afilan las plumas.",
  ],

  // Amanecer: la casa de alguien es hoy un piso turístico (no vota).
  pisoturista: [
    "La casa de NOMBRE es ahora un piso turístico: hay tres maletas con ruedines en el portal. Hoy no vota en la asamblea.",
    "NOMBRE ha amanecido rodeado de una despedida de soltero con altavoz. Hoy no vota en la asamblea.",
    "NOMBRE tiene su edificio lleno de vómito por culpa de tres guiris. Hoy no vota en la asamblea.",
    "NOMBRE vio ayer a un inglés haciendo balconing partirse la crisma. Hoy no vota en la asamblea.",
    "NOMBRE ha amanecido con diez llamadas de Airbnb en el móvil. Hoy no vota en la asamblea.",
    "En el piso de NOMBRE hay ocho guiris preguntando dónde se come la «auténtica paella con chorizo». Hoy no vota en la asamblea.",
    "En el salón de NOMBRE se está grabando un pódcast de bro-emprendedores sobre libertad financiera. Hoy no vota en la asamblea.",
    "La casa de NOMBRE sale hoy en un «house tour» de Lola Lolita: «superacogedora, chicos». Hoy no vota en la asamblea.",
  ],

  // Resultado de la inspección de Hacienda.
  inspeccionCulpable: [
    "47 transferencias a un fondo de inversión de Luxemburgo. ES un fondo buitre.",
    "Tres mansiones y un yate llamado «Plusvalía». ES un fondo buitre.",
    "NOMBRE es el mejor amigo de Víctor de Aldama. ES un fondo buitre.",
    "NOMBRE cuenta con una cuenta en Suiza, otra en las Islas Caimán y otra en Andorra. ES un fondo buitre.",
    "NOMBRE ha declarado un piso en la playa como «casa de muñecas». ES un fondo buitre.",
    "Se va de cariñosas con media cúpula del PSOE. ES un fondo buitre.",
    "NOMBRE aparece en los papeles de Bárcenas, columna de la derecha, con sobresueldo y todo. ES un fondo buitre.",
    "NOMBRE cobraba comisiones de la Gürtel y lo apuntaba todo en una libreta, el muy profesional. ES un fondo buitre.",
    "NOMBRE ha presentado dos facturas falsas y una confesión retirada, el pack completo del novio de Ayuso. ES un fondo buitre.",
    "NOMBRE cobra sueldo de eurodiputado y no ha pisado Bruselas ni de Erasmus. ES un fondo buitre.",
    "NOMBRE cobra de una Oficina de Artes Escénicas que nadie ha conseguido encontrar, ni siquiera él. ES un fondo buitre.",
    "NOMBRE dirige una cátedra sin tener la carrera y recomienda empresas amigas con membrete oficial. ES un fondo buitre.",
    "NOMBRE «vive» en Andorra, pero Hacienda le ha contado más noches en España que a TheGrefg. ES un fondo buitre.",
  ],
  inspeccionInocente: [
    "Todo en regla. Guarda hasta las facturas del butano.",
    "Declara hasta las propinas. No es un fondo buitre.",
    "El inspector se va con la sensación de que NOMBRE es un vecino ejemplar.",
    "NOMBRE ha pasado la inspección de Hacienda sin problemas. No es un fondo buitre.",
    "NOMBRE no es un fondo buitre: solo se le olvidó el impuesto de sociedades del año pasado.",
    "Aunque NOMBRE no haya pagado el impuesto de sucesiones tras la muerte de su tía, Hacienda no le considera un fondo buitre.",
    "NOMBRE conoce a las amigas de Ábalos, aún así, no es un fondo buitre.",
    "NOMBRE figura como M. Rajoy en algún documento llevándose mordidas de la obra pública, pero no es un fondo buitre.",
    "A NOMBRE le pagan en su negocio por Bizum en vez de con tarjeta. Igualmente, no es un fondo buitre.",
    "NOMBRE pide todas las becas que salen en el perfil del tío de la beca MEC. No es un fondo buitre.",
    "NOMBRE le mandó un bizum a Santiago Abascal «por amor a España». Tonto sí, pero fondo buitre no.",
    "NOMBRE salió una vez de fondo en un directo de Vito Quiles. Fue sin querer: no es un fondo buitre.",
    "NOMBRE guarda todos los tickets del Mercadona desde 2019 «por si Hacienda pregunta». No es un fondo buitre.",
    "NOMBRE compró la colonia de DjMario. El mal gusto no es delito: no es un fondo buitre.",
    "NOMBRE lleva dos años sin pisar su oficina, pero es que lo suyo son las artes escénicas. No es un fondo buitre.",
    "NOMBRE fue una vez a un concierto en la taberna Garibaldi y se dejó allí la nómina entera. Rojo sí, pero fondo buitre no.",
  ],

  // La asamblea expulsa a alguien.
  expulsion: [
    "La asamblea ha decidido: NOMBRE, devuelve las llaves. Todas.",
    "A mano alzada y sin acritud: NOMBRE queda expulsado del barrio.",
    "NOMBRE, la asamblea ha hablado: fuera de nuestro barrio.",
    "NOMBRE, la asamblea ha decidido que no eres bienvenido. Devuelve las llaves.",
    "Los cayetanos y las tías xulísimas han llegado a un consenso: NOMBRE, fuera de nuestro barrio.",
    "NOMBRE pidió declarar por videollamada, como el novio de Ayuso, pero la asamblea no traga: fuera del barrio.",
    "Votación a mano alzada, sin bulos de pucherazo que valgan: NOMBRE, fuera del barrio.",
    "NOMBRE intentó defenderse sacando un adoquín en plena asamblea, a lo Albert Rivera. No coló: fuera del barrio.",
  ],
  expulsionNadie: [
    "La asamblea no se aclara y hoy no expulsa a nadie. El debate sigue en el grupo de WhatsApp.",
    "Empate técnico y mucho ruido: hoy no se expulsa a nadie.",
    "Las charos y los del fachaleco no se ponen de acuerdo: hoy no se expulsa a nadie.",
    "La asamblea casi llega a las manos, alguien ha llamado palmera a la presidenta y hoy no se expulsa a nadie.",
    "Alguien pide «pruebas notariales» y otro contesta que eso es un bulo de la ultraderecha: hoy no se expulsa a nadie.",
    "La votación se repite tres veces, como una moción de censura fallida: hoy no se expulsa a nadie.",
    "La asamblea se muda a la taberna Garibaldi «para seguir debatiendo». Tres rondas después, hoy no se expulsa a nadie.",
    "Alguien saca un adoquín en mitad del debate, a lo Albert Rivera, y ya nadie recuerda qué se votaba: hoy no se expulsa a nadie.",
  ],

  // La asamblea expulsa al Influencer: victoria personal, la partida sigue.
  influencer: [
    "¡NOMBRE quería exactamente esto! Ya está grabando: «ME ECHAN DE MI PROPIO BARRIO (no clickbait)». Victoria personal del Influencer; la partida continúa.",
    "NOMBRE sale del barrio entre flashes: era el Influencer y acabáis de darle contenido para un mes. Gana él; la partida continúa.",
    "NOMBRE sale en Javi Hoyos y hay un gran revuelo en Twitter: Era el Influencer y la asamblea lo ha echado. Victoria personal del Influencer; la partida continúa.",
    "NOMBRE es echado de su casa, siendo según él, de clase obrera, como la Rivers. Victoria personal del Influencer; la partida continúa.",
    "NOMBRE ya está grabando un storytime entre lágrimas con más guion que un vlog de Lola Lolita. Victoria personal del Influencer; la partida continúa.",
    "NOMBRE saca merchandising del desahucio en 24 horas y agota stock. Victoria personal del Influencer; la partida continúa.",
  ],

  // Cascada: cae el compañero de piso del eliminado.
  pareja: [
    "NOMBRE compartía piso con la persona caída: la fianza era conjunta, así que también se va.",
    "Sin compañero de piso no hay alquiler que valga: NOMBRE cae también.",
    "Se ha roto el nidito de amor: NOMBRE también se va.",
    "Compartir piso era un riesgo: NOMBRE también cae.",
    "NOMBRE pierde piso y compañero el mismo día: peor semana que la del asesor fiscal del novio de Ayuso.",
    "NOMBRE cae también: la fianza conjunta une más que una libreta de Bárcenas.",
  ],

  // El Tasador caído se lleva a alguien por delante.
  venganzaTasador: [
    "Última tasación del Tasador: la casa de NOMBRE, valor cero. Se lo lleva por delante.",
    "El Tasador firma un último informe: NOMBRE, «ruina técnica». Fuera también.",
    "El Tasador se despide con un último informe: NOMBRE, «piso en mal estado». Se lo lleva por delante.",
    "El Tasador establece que la viga principal de la casa de NOMBRE está comida por las termitas. Se va también del barrio.",
    "«NOMBRE, tu piso está comido por la mierda y es inhabitable», sentencia el Tasador. Se lo lleva por delante.",
    "El Tasador tasa la casa de NOMBRE como la Gürtel tasaba la obra pública: a ojo y con sobre. Valor cero, fuera también.",
  ],

  // Pantalla final: frase paródica bajo el titular. CORTA a propósito: quién
  // gana ya lo dice el titular (ztTerminarPartida) y un texto largo se come
  // la pantalla en móvil.
  victoriaBuitres: [
    "El barrio entero es ya un fondo de inversión con piscina de bolas.",
    "No quedan vecinos suficientes: el barrio empieza a cotizar en bolsa.",
    "El barrio ya tiene nombre en inglés y sede fiscal en Luxemburgo.",
    "El barrio les fue prometido hace 3.000 años. Ya tienen los papeles… divinos.",
    "Todo el barrio reside ya (fiscalmente) en Andorra.",
    "Lo celebran con canapés, sobres y una libreta manuscrita.",
  ],
  victoriaVecinos: [
    "El último buitre devuelve las llaves y pide perdón en la asamblea.",
    "Se acabaron los burofaxes: el barrio respira.",
    "Los buitres se mudan a Andorra con los youtubers. Buen viaje.",
    "Se celebra en la taberna Garibaldi. Invita el dueño, dicen que fue vicepresidente.",
    "Los buitres se van a Andorra. Volverán medio año al sol, como TheGrefg.",
    "El barrio vuelve a oler a cocido y no a coliving.",
  ],
  victoriaPareja: [
    "Solo quedan ellos dos y su piso compartido. La fianza conjunta lo puede todo.",
    "Compartían fianza y ahora comparten barrio entero. Ojo con ellos.",
  ],
};

// Devuelve una variante al azar del evento `clave`, sustituyendo NOMBRE si se
// pasa un nombre. Math.random basta: no hace falta barajar para elegir UNA.
function ztTexto(clave, nombre) {
  const variantes = ZT_TEXTOS[clave] || [""];
  const texto = variantes[Math.floor(Math.random() * variantes.length)];
  return nombre === undefined ? texto : texto.replaceAll("NOMBRE", nombre);
}

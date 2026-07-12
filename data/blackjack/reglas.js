// 21 Arcanos — datos: reglas opcionales del blackjack y ruleset por defecto.
//
// El "ruleset" es la combinación de reglas opcionales activas (+ el nº de rondas
// en el modo Arcade). Se elige en la pantalla `bj-reglas` (Fase 4), se muestra en
// la mesa y se guarda junto a los récords. Aquí viven su CATÁLOGO (qué reglas hay,
// su texto y su valor por defecto) y la fábrica del ruleset inicial; la lógica que
// las aplica está en el motor (js/blackjack/motor.js) y en los flujos de cada modo.
//
// Núcleo (siempre activo, no configurable): pedir/plantarse, dealer roba hasta 17,
// as vale 1 u 11, pasarse de 21 pierde, blackjack natural paga 3:2. Ver plan §3.

// Catálogo de reglas OPCIONALES (toggles). `disponible: false` = el toggle se
// muestra pero deshabilitado con su `nota` (aún sin implementar en su fase).
const BJ_REGLAS = [
  {
    clave: "doblar",
    nombre: "Doblar",
    desc: "Dobla la apuesta y recibe exactamente una carta más.",
    pordefecto: true,
    disponible: true,
  },
  {
    clave: "rendirse",
    nombre: "Rendirse",
    desc: "Abandona la mano y recupera la mitad de la apuesta.",
    pordefecto: false,
    disponible: true,
  },
  {
    clave: "seguro",
    nombre: "Seguro",
    desc: "Con un as visible del dealer, aseguras contra su blackjack.",
    pordefecto: false,
    disponible: true,
  },
  {
    clave: "dividir",
    nombre: "Dividir",
    desc: "Con dos cartas del mismo valor, sepáralas en dos manos independientes.",
    pordefecto: false,
    disponible: true,
  },
];

// Rondas del modo Arcade multijugador (el solitario son 8 fijas, ver plan §5).
// Rango configurable en la pantalla de configuración (Fase 6): 4 a 8.
const BJ_RONDAS_DEFECTO = 8;
const BJ_RONDAS_MIN = 4;
const BJ_RONDAS_MAX = 8;

// Construye el ruleset inicial: cada regla en su valor por defecto. Se parte de
// aquí y el usuario lo modifica con los toggles. Incluye también las no disponibles
// (siempre en su valor por defecto) para que el objeto tenga todas las claves.
function bjRulesetPorDefecto() {
  const ruleset = {};
  BJ_REGLAS.forEach((regla) => {
    ruleset[regla.clave] = regla.pordefecto;
  });
  return ruleset;
}

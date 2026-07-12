# Plan de desarrollo — «21 Arcanos» (blackjack para FIEsta)

> Plan por fases derivado de `PROPUESTAS_BLACKJACK.md` con las decisiones ya
> tomadas por el usuario (conversación 2026-07-11). Pensado para que otro chat
> de Claude Code pueda continuar sin contexto previo.

---

## 0. Metodología de ESTE juego (distinta al resto)

⚠️ **En 21 Arcanos NO se dejan TODOs de aprendizaje.** A diferencia de los
demás juegos de FIEsta (ver `PLAN_CARTAS_DE_LA_FORTUNA.md` §1), el usuario ha
pedido explícitamente que aquí **el asistente implemente el código completo**.
Se mantiene el resto de la metodología: desarrollo por fases, el usuario decide
cuándo se avanza, y el usuario prueba la UI él mismo (no abrir/servir la app).

---

## 1. Decisiones cerradas (no volver a preguntar)

| Tema | Decisión |
|------|----------|
| **Nombre** | **21 Arcanos**. Carpetas `js/blackjack/` y `data/blackjack/`, prefijo `bj` (`bjEstado`, `bjConstruirMazo()`), pantallas `data-pantalla="bj-…"`. |
| **Modos** | **Clásico** (1 jugador vs dealer, banca persistente) y **Arcade = «El Torneo»** (Idea B de las propuestas). |
| **Jugadores** | **Máximo 5 en todo el juego.** |
| **Reglas** | Núcleo siempre. Todas las opcionales (**doblar, dividir, rendirse, seguro**) implementadas como **toggles en una pantalla de configuración de reglas** («ruleset»). |
| **Mazo** | **1 mazo de 52** (que contar cartas tenga sentido), con **contador visible de cartas restantes**. En Arcade multijugador: **zapato de 2 mazos (104)**. |
| **Rondas (Arcade)** | Limitadas por las cartas. Solitario: **8 rondas o hasta agotar el mazo** (sin rebarajar). Multijugador: rondas configurables; la partida acaba antes si se agota el zapato. En Clásico el mazo **se rebaraja al agotarse** (la banca persiste indefinidamente). |
| **Clásico** | Banca inicial **100**, apuesta mínima **5**, sin máximo. Blackjack natural paga **3:2**. Se persiste banca + récord de banca máxima **+ estadísticas** (manos jugadas, % victorias, mayor racha) — opción B del punto 3. **Sin tarot.** |
| **Arcade** | El Torneo: pila inicial de fichas por jugador, **apuestas secretas** en tu turno con el móvil, reveladas al final de la ronda (opción 2B). **Sin eliminación** (opción 1A) pero con penalización: sistema de **deuda** (ver §5). En **solitario** (opción C propia): como el modo Clásico pero **sin estadísticas y con tarot**; se guarda **récord de puntuación máxima junto al ruleset** con el que se jugó. |
| **Puntos/fichas** | Pierdes **solo lo apostado**, nunca se resta extra. La pila puede quedar **en negativo (deuda)**: no te elimina, te penaliza. |
| **Tarot** | Los arcanos actúan como **rulesets**: **3 cartas reveladas al inicio de la partida** (tirada **Pasado / Presente / Futuro**) que quedan como reglas de mesa toda la partida. **Afectan a todos los jugadores por igual** (todos globales). Pool: **los 22 arcanos mayores, cada uno con normal e invertida** (44 efectos). Los efectos son **placeholders relacionados con el significado de cada carta** (§6); el usuario los redefinirá más adelante. |
| **Modo fiesta** | Interruptor «Modo fiesta 🍻» en el Arcade. La capa de tragos va en un **campo `fiesta` opcional dentro de los propios datos** (efectos de tarot y resultados). |
| **Arte** | Pixel art por script Python. Tarot: **mismo estilo que `img/cartas/generar_tarot.py`** (marco triple, medallón con numeral, panel de escena, nombre dentro de la carta abajo) pero en **negro y dorado** en vez de azul oscuro y plateado. **El diseño de las cartas es obligatoriamente la Fase 1.** |

---

## 2. Arquitectura y convenciones

Se reutiliza todo lo descrito en `PLAN_CARTAS_DE_LA_FORTUNA.md` §2 (patrón SPA
con `mostrarPantalla`, `data-volver`, hub FIEsta, stepper, `barajar()` de
`js/nucleo/util.js`, persistencia en `localStorage`).

```
js/blackjack/
  main.js      ← wiring de pantallas + entrada desde el hub + bjEstado
  motor.js     ← lógica pura de blackjack (sin DOM): mazo, valor de mano, dealer, resolución
  clasico.js   ← flujo del modo Clásico (banca, apuestas, stats)
  arcade.js    ← flujo de El Torneo (turnos, apuestas secretas, deuda, ranking)
  tarot.js     ← tirada, efectos activos y hooks sobre el motor
data/blackjack/
  reglas.js    ← definición de reglas opcionales + ruleset por defecto
  tarot.js     ← 22 arcanos × (normal|invertida): texto, efecto, campo fiesta opcional
img/21arc/           ← carpeta propia del juego (img/cartas/ es de Cartas de la Fortuna)
  generar_poker.py   ← 52 frentes + reverso propio de 21 Arcanos
  generar_tarot_bj.py← 22 arcanos negro/dorado (+ invertidas por rotación 180°)
```

- Pantallas: `bj-menu` (elegir modo), `bj-reglas` (config del ruleset),
  `bj-clasico`, `bj-arcade-config`, `bj-arcade` (mesa), `bj-tarot` (revelado),
  `bj-fin`.
- Recordatorio técnico: **añadir todas las imágenes nuevas a `sw.js` y subir la
  versión de CACHE** en cada fase que toque arte.
- `<script>` nuevos en `index.html` después de `nucleo/pantallas.js` y antes de
  `nucleo/arranque.js`.

---

## 3. Reglas de blackjack

**Núcleo (siempre activo):** pedir/plantarse, dealer roba hasta 17, as vale
1 u 11, pasarse de 21 pierde, blackjack natural (as + 10/figura con 2 cartas)
paga 3:2.

**Opcionales (toggles en `bj-reglas`):**

| Toggle | Por defecto | Nota |
|--------|-------------|------|
| Doblar | ON | La primera que se implementa (Fase 4). |
| Rendirse (surrender) | OFF | Recuperas media apuesta. Fase 4. |
| Seguro (insurance) | OFF | Solo con as visible del dealer. Fase 4. |
| Dividir (split) | OFF | La más compleja (dos manos activas): **fase propia** (Fase 5). Hasta entonces el toggle aparece deshabilitado con nota «próximamente». |

La combinación de toggles activos (+ nº de rondas en Arcade) forma el
**ruleset**, que se muestra en la mesa y se guarda junto a los récords.

---

## 4. Modo Clásico

Flujo según propuestas §4: mesa con banca arriba, apuesta con stepper,
«Repartir» → mano → resolución con animación de fichas → siguiente mano.
Banca a 0 → pantalla «banca rota» → reiniciar banca.

- Persistencia en `localStorage`: banca actual, récord de banca máxima,
  y estadísticas (manos jugadas, % victorias, mayor racha).
- Mazo de 52 con contador visible; al agotarse se rebaraja (animación breve
  de «rebarajando» para que el contador tenga sentido al contar cartas).
- Sin tarot.

---

## 5. Modo Arcade — «El Torneo»

- 1–5 jugadores hotseat. Todos empiezan con la misma pila (p. ej. 50 fichas,
  configurable).
- **Cada ronda**: el dealer muestra su carta visible → cada jugador, al recibir
  el móvil, **apuesta en secreto** y juega su mano viendo la carta del dealer →
  al final de la ronda el dealer revela y roba, se comparan todas las manos y
  **se revelan las apuestas** con la resolución.
- Pagos: ganas tu apuesta ×1 (×1,5 con blackjack natural); si pierdes, pierdes
  **solo** lo apostado; empate devuelve la apuesta.
- **Deuda (sin eliminación)**: la apuesta mínima es obligatoria aunque no tengas
  fichas, así que la pila puede quedar en negativo. Mientras estés en deuda:
  solo puedes apostar la mínima y no puedes doblar/dividir/rendirte. Sales de la
  deuda al volver a saldo positivo. Nadie queda fuera de la partida.
- **Mazo**: 2 jugadores o más → zapato de 2 mazos (104) con contador visible.
  Rondas configurables; si el zapato se agota, la partida termina ahí.
- **Fin**: ranking por pila final; gana la más grande.
- **Solitario**: con 1 jugador el Torneo se transforma: es como el Clásico
  (tú contra el dealer con tu pila) pero **sin estadísticas persistentes y con
  tarot activo**; 1 mazo de 52, **8 rondas o hasta agotar el mazo**. Al acabar
  se guarda/muestra el **récord de puntuación máxima** indicando **con qué
  ruleset** se consiguió.
- **Tarot** (§6) y **modo fiesta** (§7) activos en este modo.

---

## 6. El tarot: la tirada del destino

Al empezar una partida de Arcade se sacan **3 arcanos al azar** del pool de 22,
cada uno **normal o invertido (50 %)**, y se revelan con una animación de tirada
en la pantalla `bj-tarot`, colocados como **Pasado — Presente — Futuro** (por
ahora las posiciones son temáticas; el dato guarda un campo `posicion` por si
en el futuro condiciona el efecto). Quedan visibles como **reglas de mesa**
durante toda la partida (panel desplegable en la mesa, como los «Efectos
actuales» de Cartas de la Fortuna). **Todos los efectos son globales.**

### Pool de 22 arcanos (efectos placeholder — el usuario los redefinirá)

Cada efecto intenta reflejar el significado tradicional de la carta
(p. ej. la Rueda de la Fortuna hace la partida más aleatoria). `[F]` = admite
capa extra de modo fiesta en su campo `fiesta`.

| # | Arcano | Normal | Invertida |
|---|--------|--------|-----------|
| 0 | El Loco | Una vez por partida, cada jugador puede descartar su mano inicial y robar dos cartas nuevas. | La apuesta mínima se duplica toda la partida. `[F]` |
| I | El Mago | Una vez por partida, cada jugador puede descartar una carta de su mano y robar otra. | Una vez por partida, el dealer cambia su peor carta. |
| II | La Sacerdotisa | Una vez por ronda, puedes mirar la siguiente carta del mazo antes de decidir. | El contador de cartas restantes se oculta. |
| III | La Emperatriz | El blackjack natural paga ×2 en vez de ×1,5. | La apuesta máxima queda limitada a 10. |
| IV | El Emperador | El líder anuncia su jugada («pediré hasta 17») antes de jugar y debe cumplirla. | El último del ranking dobla lo que gane esta ronda. |
| V | El Hierofante | Reglas de casino puras: se desactivan las reglas opcionales del ruleset. | Todas las reglas opcionales quedan activadas. |
| VI | Los Enamorados | Al recibir tu mano puedes cambiar una de tus dos cartas iniciales por una nueva. | Cada decisión debe tomarse en 10 segundos. `[F]` |
| VII | El Carro | Ganar dos rondas seguidas da +5 fichas de bonus. | Tras ganar una ronda, tu siguiente apuesta debe ser al menos el doble de la mínima. |
| VIII | La Fuerza | Se puede doblar con cualquier número de cartas. | Solo se puede doblar con 9, 10 u 11. |
| IX | El Ermitaño | El jugador con menos fichas ve la carta oculta del dealer. | La carta visible del dealer no se muestra hasta que te plantas. |
| X | La Rueda de la Fortuna | Al empezar cada ronda, un multiplicador aleatorio ×1–×3 para las ganancias de esa ronda. | Cada ronda, un valor al azar (p. ej. «los 7») no vale nada (0). |
| XI | La Justicia | Los empates los gana el jugador. | Los empates los gana el dealer. `[F]` |
| XII | El Colgado | Puedes rendirte incluso después de haber pedido carta. | Rendirse está prohibido. |
| XIII | La Muerte | Pasarse con exactamente 22 no pierde: cuenta como 12 y sigues. | Si te pasas, tu siguiente apuesta es obligatoriamente la mínima. `[F]` |
| XIV | La Templanza | Plantarse con 5 cartas sin pasarse paga como blackjack. | Prohibido plantarse con menos de 14. `[F]` |
| XV | El Diablo | Tras plantarte puedes «tentar al diablo»: robas una carta más; si no te pasas, cobras ×2. | Quien gana la ronda le quita 3 fichas a cada perdedor. `[F]` |
| XVI | La Torre | El dealer se planta en 16 (más blando). | El dealer roba hasta 18 (más letal). |
| XVII | La Estrella | Los ases también pueden valer 12. | Los ases solo valen 1. |
| XVIII | La Luna | Tu 2.ª carta se juega boca abajo; si ganas la mano «a ciegas», cobras ×2. | La primera carta de cada mano no se ve hasta plantarse. |
| XIX | El Sol | La carta oculta del dealer se juega boca arriba. | El dealer gana los blackjacks empatados. `[F]` |
| XX | El Juicio | La última ronda vale doble. | En la última ronda todos deben apostar al menos la mitad de su pila. |
| XXI | El Mundo | El 21 exacto (sin ser natural) paga como blackjack. | El blackjack natural paga solo ×1. |

> Nota de implementación: los efectos requieren «hooks» distintos en el motor
> (pago, comportamiento del dealer, valor de cartas, restricciones de apuesta,
> visibilidad…). En la fase de tarot se implementan los hooks y todos los
> efectos que encajen en ellos; si alguno resulta desproporcionado se deja su
> texto como recordatorio visible y se marca `implementado: false` en el dato
> (nunca un TODO en código).

---

## 7. Modo fiesta 🍻

Interruptor en `bj-arcade-config`. No cambia ninguna regla: **añade
consecuencias** encima. Textos placeholder, campo `fiesta` en los datos:

- Pasarse (bust) → bebe 1 trago.
- Perder contra blackjack del dealer → beben todos los que perdieron la ronda.
- Blackjack natural → repartes 3 tragos.
- Último del ranking al final de cada ronda → bebe 1.
- Estar **en deuda** al final de una ronda → bebe 1.
- Los arcanos `[F]` añaden su línea extra solo con el modo activado.

---

## 8. Arte (Fase 1 obligatoria)

### Baraja francesa (52 + reverso)
- `img/21arc/generar_poker.py`, base 72×100 (mismo ratio que el resto), ×6.
- Frentes: ♠ ♥ ♦ ♣, A–K, pixel art. Reverso **propio de 21 Arcanos** para
  diferenciarse del azul de Cartas de la Fortuna: **negro con motivo dorado**
  (coherente con el tarot del juego).

### Tarot (22 arcanos + invertidas)
- `img/21arc/generar_tarot_bj.py`, **partiendo del diseño de
  `img/cartas/generar_tarot.py`**: se mantiene el marco triple, el medallón superior con
  el **numeral**, el panel interior con la escena, los ornamentos y el
  **nombre dentro de la carta, abajo**.
- **Cambio de paleta**: donde había azul oscuro (`AZUL`, `NOCHE`) → **negros**
  (p. ej. `(12, 10, 8)` / `(6, 5, 4)`), y donde había plata (`PLATA*`) →
  **dorados** (p. ej. base `(212, 175, 55)`, oscuro `(140, 110, 40)`, brillo
  `(250, 230, 160)`).
- 22 escenas nuevas (una por arcano); El Diablo y la Rueda **se rehacen** con
  la paleta negro/dorado (no se reutilizan los sprites azules, identidades
  visuales separadas).
- Invertidas por rotación 180° como hasta ahora. Hoja de contacto de revisión.
- Todo a `sw.js` + subir CACHE.

---

## 9. Desarrollo por fases

> El usuario decide cuándo se avanza de fase. Sin TODOs: cada fase se entrega
> completa y funcional.

### Fase 1 — Arte: todas las cartas ✏️ (obligatoria la primera)
- Script `generar_poker.py`: 52 frentes + reverso negro/dorado.
- Script `generar_tarot_bj.py`: 22 arcanos negro/dorado + invertidas + hoja de
  contacto, manteniendo el diseño (medallón, numeral, nombre abajo).
- Registrar imágenes en `sw.js` (subir CACHE).
- Criterio de salida: el usuario revisa las hojas de contacto y aprueba el arte.

### Fase 2 — Andamiaje y navegación
- Tarjeta «21 Arcanos» en el hub FIEsta.
- Pantallas vacías `bj-menu`, `bj-reglas`, `bj-clasico`, `bj-arcade-config`,
  `bj-arcade`, `bj-tarot`, `bj-fin` + navegación y botones «Atrás».
- `js/blackjack/main.js` con `bjEstado` y wiring propio.

### Fase 3 — Motor de blackjack (lógica pura, sin UI)
- `js/blackjack/motor.js`: construir mazo/zapato (1 o 2 barajas), robar,
  contador de restantes, valor de mano (as 1/11), detección de blackjack
  natural y bust, turno del dealer (roba hasta 17), resolución de mano.
- `data/blackjack/reglas.js`: definición de reglas opcionales y ruleset.
- El motor recibe el ruleset y los hooks de tarot como parámetros (aunque el
  tarot llegue en la Fase 7, el motor nace preparado).

### Fase 4 — Pantalla de reglas + Modo Clásico completo
- `bj-reglas`: toggles de doblar / rendirse / seguro (split visible pero
  deshabilitado, «próximamente»); resumen del ruleset activo.
- `bj-clasico`: mesa completa — banca, apuesta con stepper, repartir, pedir /
  plantarse / doblar / rendirse / seguro según ruleset, animación de fichas,
  rebarajado al agotar el mazo, pantalla de banca rota.
- Persistencia: banca + récord de banca máxima + estadísticas (manos jugadas,
  % victorias, mayor racha) en `localStorage`.

### Fase 5 — Split
- Dos manos activas en estado y UI (pestañas o manos apiladas), apuesta
  duplicada, resolución independiente de cada mano.
- Habilitar el toggle en `bj-reglas`. Disponible en Clásico y Arcade.

### Fase 6 — Modo Arcade «El Torneo»
- `bj-arcade-config`: nº de jugadores (1–5) + nombres, pila inicial, nº de
  rondas, interruptor de modo fiesta.
- Ronda completa: carta visible del dealer → por cada jugador: pantalla de
  apuesta **secreta** + su mano → resolución del dealer al final → revelado de
  apuestas y pagos → ranking actualizado.
- Sistema de **deuda**: pila en negativo, restricciones (solo apuesta mínima,
  sin doblar/dividir/rendirse), salida de la deuda.
- Zapato de 2 mazos con 2+ jugadores; fin por rondas o por agotarse las cartas.
- Solitario: 1 mazo, 8 rondas o fin de mazo, sin estadísticas, y al terminar
  guardar/mostrar **récord de puntuación máxima con su ruleset**.
- Pantalla `bj-fin` con ranking (o récord en solitario).

### Fase 7 — Tarot
- `data/blackjack/tarot.js`: 44 entradas (22 × normal/invertida) con numeral,
  nombre, texto, `posicion` (pasado/presente/futuro), campo `fiesta` opcional
  y clave de efecto.
- Pantalla `bj-tarot`: animación de tirada, revelado de las 3 cartas como
  Pasado — Presente — Futuro al empezar la partida de Arcade.
- Panel «Reglas de mesa» desplegable en la mesa del Arcade con los 3 arcanos.
- Hooks del motor + implementación de los efectos (los que no entren se marcan
  `implementado: false` en datos, sin TODOs en código).

### Fase 8 — Modo fiesta + pulido
- Capa de tragos (§7) leyendo los campos `fiesta` de datos y resultados.
- Pulido: animaciones de reparto/volteo, feedback de ganar/perder fichas,
  detalles visuales de la mesa, revisión de `sw.js`.
- Aquí se decide si split/seguro necesitan ajustes y se repasan los textos de
  los arcanos con el usuario.

### Fase 9 — Pulido de emoción, mesa compartida del Torneo y tarot 100 % en código
Motivación: al jugar de verdad, el Arcade se siente plano (sin revelado de
cartas) y la apuesta secreta uno-a-uno hace que el resto de la mesa esté
ciega la mayor parte de la ronda; además parte de los efectos del tarot
todavía se aplican «de palabra» (`implementado: false`), lo que rompe el
ritmo. Esta fase ataca las tres cosas.

**9.1 — Animaciones de revelado**
- Las cartas del dealer se reparten/revelan **una a una** (no todas de golpe):
  volteo con retardo escalonado, tanto al mostrar la carta visible como al
  destapar la oculta en la resolución de la ronda.
- Al **doblar**, la carta que se recibe se revela con la misma animación de
  volteo (hoy aparece sin transición). Aplica en Clásico y Arcade.
- Reutilizar/objetivo: una función común de volteo (p. ej. `bjAnimarVolteo`)
  en `motor.js` o un nuevo `js/blackjack/animaciones.js`, en vez de duplicar
  la animación en `clasico.js` y `arcade.js`.

**9.2 — El Torneo replanteado: mesa compartida en vez de turnos ciegos**
Cambio de fondo en cómo se juega una ronda del Arcade. Sustituye el modelo
"pasa el móvil → apuesta secreta → juegas viendo solo tu mano" por una
**mesa compartida**: todos los jugadores ven la carta del dealer a la vez y
también las manos de los demás (no solo la propia), con una barra superior
que identifica de quién es el turno activo en cada momento.
- Implica revisar si la apuesta sigue siendo secreta o pasa a ser abierta
  (la apuesta secreta encajaba con el modelo de turnos ciegos; con mesa
  compartida hay que decidir si tiene sentido mantenerla, o revelarla al
  apostar). **Pendiente de decidir con el usuario al empezar la fase.**
- La «pantalla de pasar el móvil» (`bj-arcade-pasar`) probablemente
  desaparece o cambia de función, ya que deja de haber nada que ocultar entre
  jugadores salvo (quizá) la apuesta.
- Nueva UI: barra/indicador superior de turno (foto de qué jugador actúa
  ahora) + zona de mesa con la mano de cada jugador visible simultáneamente
  (la propia resaltada como activa, las demás en modo lectura).
- Repensar en detalle antes de tocar código: qué pasa con la deuda, con los
  arcanos que dependen de "el jugador de turno" o de ocultar información
  (Ermitaño, Sacerdotisa invertida, Luna…), y con el ritmo de la ronda cuando
  todos ven todo.

**9.3 — Tarot 100 % aplicado por código (sin reglas manuales)**
- Todos los efectos del tarot deben **aplicarse en la partida**, no explicarse
  para que los jugadores los recuerden de palabra. Elimina el concepto
  `implementado: false` / «📜 Regla manual» de `data/blackjack/tarot.js`:
  cada uno de los 44 efectos (22 arcanos × normal/invertida) necesita su hook
  real en el motor o en `arcade.js`.
- Los efectos hoy marcados como manuales (Loco n, Mago n/i, Sacerdotisa n,
  Emperador n, Enamorados n/i, Rueda i, Muerte n, Diablo n, Estrella n/i,
  Luna n/i — ver §6 y el estado de la Fase 7) son los que hay que
  reimplementar en código en esta fase. Si alguno sigue siendo imposible de
  automatizar de forma razonable, se redefine su texto/efecto en vez de
  dejarlo manual (nunca queda un efecto "de palabra").

**9.4 — Pools de tarot por posición: Pasado / Presente / Futuro**
- Reorganizar el pool de 22 arcanos en **3 pools según la posición de la
  tirada**: Pasado, Presente y Futuro dejan de ser una etiqueta puramente
  temática (§6, campo `posicion` ya reservado) y pasan a **condicionar qué
  efectos puede tener cada carta**.
- Implica revisar `data/blackjack/tarot.js`: cada arcano/posición necesita un
  efecto coherente con su pool (p. ej. Pasado → afecta a lo ya ocurrido/rastro
  entre rondas; Presente → afecta a la ronda en curso; Futuro → afecta a
  rondas por venir o al final de la partida). **El reparto exacto de qué
  arcano-posición hace qué efecto se define con el usuario al empezar esta
  fase**; aquí solo queda fijado el criterio organizativo.
- La tirada (`bjTarotTirada`) sigue sacando 3 arcanos, pero ahora cada
  posición saca del pool que le corresponde en vez de barajar los 22 sin
  restricción de posición.

---

## 10. Estado actual

- ✅ **Fase 1 completada** (2026-07-11). Arte revisado e iterado con el
  usuario sobre las hojas de contacto `img/21arc/_contacto_poker.png` y
  `img/21arc/_contacto_tarot_bj.png`. Póker: pips sin contornos internos y
  figuras sin doble marco. Tarot: 16 escenas retocadas en revisión (mago con
  caldero, sacerdotisa con mitra, Strength es un puño rompiendo una cadena,
  etc.).
  - `img/21arc/generar_poker.py`: 52 frentes (`poker-<palo>-<valor>.png`,
    palos picas/corazones/diamantes/treboles, valores A,2–10,J,Q,K) + reverso
    negro/dorado (`poker-reverso.png`).
  - `img/21arc/generar_tarot_bj.py`: 22 arcanos negro/dorado
    (`tarot-bj-<slug>.png` + `-invertida`), mismo diseño que `generar_tarot.py`
    (marco triple, medallón con numeral —se ensancha para XVIII—, nombre abajo).
    Cada escena es una función registrada en la lista `CARTAS` del final.
  - `sw.js`: 97 imágenes nuevas registradas y CACHE subida a `fiesta-v4.2.0`.
- ✅ **Fase 2 completada** (2026-07-11). Andamiaje y navegación:
  - Tarjeta «21 Arcanos» en el hub (`btn-juego-blackjack`) + entrada en
    `INFO_JUEGOS` (`js/nucleo/arranque.js`).
  - Siete pantallas vacías en `index.html`: `bj-menu`, `bj-reglas`,
    `bj-clasico`, `bj-arcade-config`, `bj-tarot`, `bj-arcade`, `bj-fin`. Cada una
    con su nota de fase y botón «Atrás» (`data-volver`). El flujo del Torneo se
    encadena (config → tarot → mesa → fin) para poder recorrerlo ya.
  - `js/blackjack/main.js`: `bjEstado` (modo/ruleset/jugadores/tarot como huecos
    reservados) + wiring de navegación (`bjConectar`, `bjEntrarMenu`, menú y
    flujo Arcade). Registrado en `index.html` y en `sw.js`.
  - Versiones subidas: `APP_VERSION` → `4.2.0`, `CACHE` → `fiesta-v4.3.0`.
  - Hub compactado en CSS para que quepan 5 juegos en móvil (hero 104px, título
    2,3rem, tarjetas más bajas) + `overflow-y:auto` con `justify-content:safe
    center` en la pantalla `fiesta` como red de seguridad.
  - ⚠️ Decisión de UI del usuario: los botones del menú son **«Modo Clásico»** y
    **«Modo Arcade»** (nada de «El Torneo» en la interfaz). «El Torneo» queda solo
    como nombre interno/temático del modo Arcade en comentarios y en este plan.
- ✅ **Fase 3 completada** (2026-07-11). Motor de blackjack (lógica pura, sin UI):
  - `data/blackjack/reglas.js`: catálogo `BJ_REGLAS` (doblar ON; rendirse/seguro
    OFF; dividir deshabilitado, «Próximamente (Fase 5)»), constantes de rondas del
    Arcade y `bjRulesetPorDefecto()`.
  - `js/blackjack/motor.js`: `BJ_PALOS`/`BJ_VALORES`, `bjImagenCarta`,
    `bjConstruirMazo(numBarajas)` (52 ó 104, barajado), `bjRobar`,
    `bjCartasRestantes`, `bjRepartirInicial`, `bjValorMano` (as 1/11),
    `bjManoEsBlanda`, `bjEsBlackjackNatural`, `bjEsBust`, `bjJugarDealer` (roba
    hasta 17, opciones `limiteDealer`/`dealerRobaBlando17`) y `bjResolverMano`
    (opciones `pagoNatural`/`empate`). Todas reciben `opciones` para que el ruleset
    (Fase 4) y el tarot (Fase 7) inyecten sus hooks; sin `opciones` es casino puro.
  - Cargados en `index.html` (datos → motor → main) y en `sw.js`.
  - Versiones subidas: `APP_VERSION` → `4.3.0`, `CACHE` → `fiesta-v4.4.0`.
  - Verificación: sin runtime de JS local ni navegador (criterio del usuario), la
    lógica se revisó a mano; queda pendiente comprobarla al integrarla en la UI
    del Clásico (Fase 4).
- ✅ **Fase 4 completada** (2026-07-11). Pantalla de reglas + Modo Clásico completo:
  - **Ruleset** (compartido por ambos modos): en `js/blackjack/main.js`, pantalla
    `bj-reglas` con un toggle por regla de `BJ_REGLAS` (dividir deshabilitado con
    nota), resumen de reglas activas y persistencia en `localStorage`
    (`blackjack_ruleset`, clave `BJ_RULESET_CLAVE`). Los switches reutilizan la
    técnica de Zona Tensionada con clases propias `.bj-switch`.
  - **Modo Clásico** en `js/blackjack/clasico.js` (estado `bjClasico`):
    flujo completo apostar → repartir → (seguro) → pedir/plantarse/doblar/rendirse
    → resolver → siguiente. Apuesta con stepper (mín 5, paso 5, tope = banca);
    doblar y rendirse según ruleset y solo en la 1.ª decisión; seguro ofrecido con
    As visible del dealer y regla activa; **peek** del dealer que resuelve los
    naturales al instante. Pago natural 3:2, contabilidad `stake·(1+pago)` (probada
    a mano: gana/pierde/push/natural/doblar/seguro conservan fichas).
  - **Mazo** de 52 con contador visible; rebarajado con aviso «🔀 Rebarajando…»
    cuando quedan < 15 cartas (flag `repartiendo` evita repartir dos veces).
  - **Persistencia** (`blackjack_clasico`): banca, récord de banca máxima y stats
    (manos, % victorias, mejor racha). Overlay de estadísticas y overlay de **banca
    rota** (< apuesta mínima) con botón de reiniciar banca (conserva récord/stats).
  - Animaciones: entrada de cartas, banner de resultado y «+X / −X» de fichas
    (reutiliza el `pop` de La Ruleta). Overlays en `position:fixed` para cubrir la
    mesa aunque tenga scroll.
  - `index.html`: pantallas `bj-reglas` y `bj-clasico` completas; `clasico.js`
    cargado (datos → motor → clasico → main) y en `sw.js`.
  - Decisión de UI: el modo Arcade se llama **«Modo Arcade»** en los botones (no
    «El Torneo»).
  - Versiones subidas: `APP_VERSION` → `4.4.0`, `CACHE` → `fiesta-v4.5.0`.
- ✅ **Fase 5 completada** (2026-07-11). Split (dividir) en el Clásico:
  - `js/blackjack/clasico.js` refactorizado al modelo de **varias manos**:
    `bjClasico.manos` (array) + `bjClasico.manoActiva`. Sin dividir, `manos` tiene
    un elemento y todo funciona igual que en la Fase 4.
  - Dividir un par (mismo valor por `bjValorCarta`, así que 10/J/Q/K emparejan)
    en dos manos con su apuesta; se juegan en orden (activa resaltada). **Sin
    re-split** (máximo dos manos). **Doblar tras dividir** permitido; **rendirse
    no** tras dividir. **Ases divididos**: una carta cada uno y se plantan solos.
  - El motor gana el hook `opciones.jugadorPuedeNatural` (js/blackjack/motor.js):
    una mano dividida que suma 21 con 2 cartas **no es blackjack** (paga 1:1).
  - Toggle «Dividir» habilitado en `data/blackjack/reglas.js` (`disponible: true`,
    por defecto OFF). Botón «Dividir» añadido a la mesa; UI de dos manos con total,
    apuesta y resultado por mano (CSS `.bj-mano*`). Contabilidad de fichas revisada
    a mano (dividir, doblar tras dividir, ases): conserva fichas.
  - Nota: el split vive en el Clásico; el Arcade (Fase 6) reutilizará el mismo
    patrón de `manos` cuando se implemente su mesa.
  - Versiones subidas: `APP_VERSION` → `4.5.0`, `CACHE` → `fiesta-v4.6.0`.
- ✅ **Fase 6 completada** (2026-07-11). Modo Arcade «El Torneo» completo (sin
  tarot ni tragos, que son Fases 7–8):
  - `js/blackjack/arcade.js` (estado `bjArcade`): configuración (1–5 jugadores +
    nombres, pila inicial, nº de rondas —oculto en solitario—, interruptor de modo
    fiesta, que se guarda pero aún no reparte tragos).
  - Ronda: al empezar se reparten dealer + manos de salida de todos (zapato justo);
    cada jugador, por turnos, ve la pantalla de **pasar el móvil** → **apuesta
    secreta** → juega su mano (pedir/plantarse/doblar/dividir/rendirse) viendo la
    carta del dealer; al final el dealer revela y roba, y `bj-arcade-ronda` muestra
    manos, apuestas reveladas, variación de fichas y pila de cada uno.
  - **Deuda**: la apuesta mínima es obligatoria (la pila puede quedar negativa);
    en deuda queda bloqueada en la mínima y sin doblar/dividir/rendirse (se gatea
    por pila y fondos). Nadie es eliminado.
  - **Mazo**: zapato de 2 barajas con 2+ jugadores, 1 con solitario; contador
    visible; la partida acaba por nº de rondas o al agotarse el zapato (con guardas
    para no robar `undefined`).
  - **Solitario** (1 jugador): 8 rondas, 1 mazo, sin pasar el móvil ni stats; al
    acabar guarda/enseña el **récord** (`blackjack_arcade_record`) con el ruleset.
  - **Fin**: `bj-fin` con ranking por pila (medallas `.podio-*`) o puntuación +
    récord en solitario.
  - Nota: el seguro no se ofrece en el Arcade (es del Clásico); el ruleset se
    comparte y sus otras reglas (doblar/rendirse/dividir) sí aplican.
  - **Bugfix** (afectaba también al Clásico): un `display` de autor gana al
    `[hidden]` del navegador; añadidas reglas `.bj-controles[hidden]` y
    `.bj-config-fila[hidden] { display:none }` para que los bloques de fase se
    oculten de verdad.
  - `bj-tarot` sigue de placeholder (inalcanzable hasta la Fase 7). `main.js`
    limpiado del andamiaje del Arcade.
  - Versiones subidas: `APP_VERSION` → `4.6.0`, `CACHE` → `fiesta-v4.7.0`.
- ✅ **Fase 7 completada** (2026-07-12). Tarot:
  - `data/blackjack/tarot.js`: `BJ_TAROT`, 22 arcanos × (normal|invertida) con
    clave de efecto (`<slug>-n|-i`), texto, `implementado` y campo `fiesta`
    opcional. **`implementado: false` = regla manual**: la app la muestra con la
    etiqueta «📜 Regla manual» y los jugadores la aplican de palabra (Loco n,
    Mago n/i, Sacerdotisa n, Emperador n, Enamorados n/i, Rueda i, Muerte n,
    Diablo n, Estrella n/i, Luna n/i). El resto (30 efectos) los aplica el código.
  - `js/blackjack/tarot.js`: `bjTarotTirada()` (3 arcanos únicos, 50 % invertida,
    posiciones Pasado/Presente/Futuro en `bjEstado.tarot`), revelado escalonado en
    `bj-tarot` (CSS `.revelada`), `bjTarotTiene(clave)`, `bjTarotOpcionesMotor()`
    (Torre→limiteDealer, Emperatriz/Mundo→pagoNatural, Justicia→empate),
    `bjTarotRulesetEfectivo()` (Hierofante) y el panel «Reglas de mesa» (chip 🔮
    en la mesa, overlay que se cierra tocando).
  - `arcade.js` aplica los hooks: ruleset efectivo congelado en
    `bjArcade.ruleset`; límites de apuesta por arcanos
    (`bjArcadeLimitesApuesta`: Loco i ×2 mín, Emperatriz i máx 10, Muerte i
    mínima forzosa tras bust, Carro i ≥2×mín tras ganar, Juicio i ≥media pila en
    la última); acciones (Fuerza n/i sobre doblar, Colgado n/i sobre rendirse,
    Templanza i sobre plantarse <14); visibilidad (Sol n oculta boca arriba,
    Ermitaño n el más pobre ve la oculta, Ermitaño i tapa la visible,
    Sacerdotisa i oculta el contador); pagos por mano (`bjArcadeAjustarPago`:
    Templanza n y Mundo n pagan como blackjack, Sol i gana el dealer los BJ
    empatados); y ajustes de ronda (`bjArcadeAjustesDeRonda`: multiplicador
    Rueda n ×1–3 y Juicio n ×2 en la última —solo agranda ganancias—, Emperador i
    dobla ganancias del último, Carro n +5 por racha ≥2, Diablo i trasvase de 3
    fichas por ganador/perdedor, y rastro `bustPrevio`/`ganoPrevio`/`racha`).
  - El récord del solitario guarda ahora el **ruleset efectivo**.
  - El Clásico sigue sin tarot (no consulta ningún hook).
  - Versiones subidas: `APP_VERSION` → `4.7.0`, `CACHE` → `fiesta-v4.8.0`
    (+ 2 archivos JS nuevos en la caché).
- ✅ **Fase 8 en marcha** (2026-07-12). Modo fiesta 🍻 + versiones unificadas:
  - **Capa de tragos** (§7) en `js/blackjack/arcade.js`: `bjArcadeRenderFiesta`
    pinta bajo la resolución de ronda (`bj-arcade-ronda`, sección
    `#bj-ronda-fiesta`, oculta si el modo está apagado) las consecuencias de la
    ronda. `bjArcadeTragosDeRonda` calcula las reglas base leyendo los resultados
    (blackjack natural → reparte 3; pasarse → 1; perder ante blackjack del dealer
    → 1; último del ranking → 1 —solo multijugador y sin empate general—; en deuda
    → 1) y a continuación se listan los recordatorios de los arcanos con capa `[F]`
    activos (su línea `fiesta` viaja en `bjEstado.tarot`). Si no bebe nadie, una
    línea de relleno. CSS `.bj-fiesta*` (con animación de entrada).
  - Corrección previa de layout: la lista de nombres del Arcade
    (`#bj-arcade-nombres`) dejó de heredar el scroll con tope de `.lista-scroll`
    (quedaba estrujada entre los steppers); ahora crece con su contenido.
  - **Versiones unificadas** desde ahora: `APP_VERSION` y `CACHE` comparten número.
    Ambas a **4.9.0** (`fiesta-v4.9.0`).
  - Pendiente de la fase (colaborativo con el usuario): pulido de animaciones de
    reparto/volteo y feedback de fichas, y repaso de los textos placeholder de los
    arcanos.
- ✅ **Fase 9.1 completada** (2026-07-12). Animaciones de revelado:
  - Nuevo `js/blackjack/animaciones.js`: volteo de cartas compartido por Clásico y
    Arcade (antes habría que haberlo duplicado en cada mesa). Coreografía en dos
    tiempos por carta: **primero aparece el REVERSO** al lado de las demás (entrada
    suave) y, tras una pausa, se **voltea una sola vez** (gira de canto y el JS le
    cambia la imagen al frente en el punto de perfil). `bjCrearCartaVolteada` crea la
    carta con esa coreografía (con retardo opcional para repartir en cascada; si va
    boca abajo, solo aparece el reverso); `bjVoltearCartaEnSitio`/`bjProgramarVolteo`
    voltean una carta ya pintada boca abajo (revelar la oculta del dealer);
    `bjRenderDealerAnimado` pinta la mano del dealer comparando con el último
    repintado de esa mesa (rastro en `BJ_ESTADO_DEALER_ANIMADO`, por `clave`): si no
    cambió nada no toca el DOM, si se reveló la oculta y/o el dealer robó anima solo
    eso, y si el estado no encaja repinta todo con reparto escalonado.
  - **Iteración con el usuario**: la primera versión (un `scaleX 0→1` de entrada +
    otro giro al revelar) iba rápida y la oculta del dealer daba un «giro de más».
    Se rehízo al modelo reverso→pausa→un único volteo, más lento
    (`BJ_REVERSO_ENTRA_MS` 240 ms, `BJ_VOLTEO_MS` 520 ms, escalón 300 ms). Segunda
    ronda de ajustes: (a) la carta que **pide el jugador** también se revela con el
    volteo (antes solo el dealar), vía `bjPintarCartasMano`, que anima solo la carta
    nueva y repinta las ya vistas sin animación (`.bj-sin-entrada`) para que no
    salten al repintar la mano entera en cada acción; (b) el «saltito» tras el
    volteo del dealer era la carta recayendo en la entrada base `bj-carta-entra` al
    quitarle la clase de volteo — se deja la clase `bj-volteo-revela` fija (fill
    both), así no se reanima.
  - CSS nuevo en `css/estilos.css`: `.bj-reverso-entra` (el reverso aparece, sin
    girar) y `.bj-volteo-revela` (un solo giro `scaleX 1→0→1`, con el cambio de
    imagen a mitad hecho en JS), con mayor especificidad que `.bj-cartas img` para
    ganarle a la animación de entrada simple.
  - **Clásico** (`bjRenderDealer`): usa `bjRenderDealerAnimado` con la clave
    "clasico"; se olvida el rastro al entrar al modo (`bjOlvidarDealerAnimado`). La
    carta que se recibe al doblar (`bjRenderManosJugador`) se pinta con
    `bjCrearCartaVolteada`.
  - **Arcade**: la resolución de ronda (`bjArcadeRenderRonda`) revela la mano del
    dealer entera con la coreografía escalonada (repintado único por ronda). La mesa
    de turno (`bjArcadeRenderMesa`) mantiene entrada **simple** para el dealer: se
    repinta en cada acción del jugador, así que un volteo se repetiría en cada
    «pedir» (y esa vista la rehará la Fase 9.2). La carta de doblar en
    `bjArcadeRenderManos` usa el volteo (visible al doblar una mano dividida).
  - `index.html` y `sw.js`: `js/blackjack/animaciones.js` cargado entre `clasico.js`
    (del que depende `bjCrearCartaImg`) y `arcade.js` (que usa el volteo).
  - Versiones subidas: `APP_VERSION` y `CACHE` → **4.9.1** y, tras la 2.ª ronda de
    ajustes de animación, **4.9.2** (`fiesta-v4.9.2`).
  - Pendiente de 9.1: nada — sigue 9.2 (mesa compartida del Torneo) y 9.3 (tarot
    100 % en código).
- 🔧 **Fase 9.2 en marcha** (2026-07-12). Mesa compartida del Torneo:
  - **Barra de la mesa** en `bj-arcade` (`#bj-arcade-mesa-jugadores`): entre la
    cabecera (pila + cartas restantes) y las cartas del dealer, una barra
    scrolleable en horizontal con el RESTO de jugadores de la ronda (en solitario
    va oculta). La pinta `bjArcadeRenderMesaJugadores` (llamada desde
    `bjArcadeRenderMesa`): por jugador, una cabecera con su **nombre + el total de
    su mano** (como en «Tu mano» y el dealer) y su mano **apilada** (cada carta
    cubre el 70 % de la anterior, dejando ver ~30 % de su lateral izquierdo, CSS
    `.bj-mesa-jug*`). Quien **ya jugó** enseña sus cartas reales (3/4/5 si se plantó),
    su total y su **apuesta** debajo; quien aún no ha jugado, sus 2 iniciales boca
    abajo, sin total ni apuesta. «Ya jugó» = su posición en el orden es anterior a
    `turnoIndex`.
  - **Apuesta ya NO secreta**: con la mesa compartida se quitó todo el mensaje de
    secreto (`bj-arcade-pasar` «Nadie más debe ver tu apuesta» → «Es su turno de
    jugar»; `bj-arcade-apuesta` «Tu apuesta (en secreto)» → «Tu apuesta»; comentarios
    de `arcade.js`). Se mantiene el pasar-el-móvil como mero relevo de turno hotseat.
  - **Orden de juego aleatorio por ronda**: nuevo `bjArcade.orden` (barajado con
    `barajar()` en `bjArcadeIniciarRonda`); `turnoIndex` pasa a ser posición dentro
    de `orden`, y el jugador de turno se resuelve con `bjArcadeIndiceActual()`
    (`orden[turnoIndex]`). Accesores y usos directos de `turnoIndex` como índice de
    jugador migrados a los helpers. La resolución de ronda y el ranking siguen
    iterando por índice paralelo (no dependen del orden de juego).
  - **Botones de acción redondos** (Clásico y Arcade comparten `.bj-acciones`): de
    rejilla de 2 columnas con botones anchos y altos (3 filas) a **botones circulares
    de 44px de una letra/símbolo**, coloreados por acción (Pedir ✓ verde, Plantarse ✗
    rojo, Doblar D azul, Dividir S morado, Rendirse R negro), dispuestos en **dos
    filas escalonadas** (3 arriba, 2 abajo centradas) vía `flex-wrap` + `max-width:
    10rem` que fuerza 3 por fila. `title`/`aria-label` conservan el nombre. Ocupan
    mucho menos alto y ancho para que la mesa del Arcade quepa sin scroll vertical.
    (Un primer intento de solo achicarlos en la misma columna fue justo lo contrario
    de lo pedido; corregido a esta disposición a propuesta del usuario.)
  - Versiones subidas: `APP_VERSION` y `CACHE` → **4.9.5** (`fiesta-v4.9.5`).
  - Pendiente de 9.2 (según §9.2 del plan): resaltado del turno activo en la barra y
    repaso de los arcanos que dependen de ocultar información con la mesa a la vista.
- 🔧 **Fases 9.3 + 9.4 en marcha** (2026-07-12). Tarot por posición, 100 % en código.
  Reúne 9.3 (todos los efectos aplicados por código, sin reglas «de palabra») y 9.4
  (cada posición condiciona el efecto). La fuente de efectos es la tabla «PROPUESTA
  DE TAROT POR POSICIÓN» del final de este archivo. Se hace por pasos:
  - ✅ **Paso 1 — Datos** (`data/blackjack/tarot.js`): reescrito a la estructura
    `posiciones: { pasado, presente, futuro }`, cada una con `normal`/`invertida` y
    su `{ efecto, texto, fiesta? }`. Son **132 efectos** (22 arcanos × 3 posiciones ×
    2 orientaciones), con **wording unificado** (multiplicadores «×N,M», «+X fichas»,
    «apuesta mínima/máxima», sin aclaraciones entre paréntesis) y líneas `fiesta` de
    sabor en un subconjunto. Claves de efecto `<slug>-<pa|pr|fu>-<n|i>`. Eliminado el
    concepto `implementado`/«regla manual».
  - ✅ **Paso 2 — Tirada** (`js/blackjack/tarot.js`): `bjTarotTirada` coloca los 3
    arcanos en Pasado/Presente/Futuro y cada uno toma el efecto de SU posición;
    `bjTarotTiene` ya no exige `implementado`; el revelado y el panel muestran la
    posición y ya no pintan la etiqueta de regla manual.
  - ✅ **Paso 3 — Tragos del tarot en los datos**: los 132 efectos llevan ya su línea
    `fiesta` (que te toque un arcano casi siempre cuesta trago), aparte de los tragos
    base de §7 (deuda, perder, blackjack…).
  - ✅ **Paso 4 — Multiplicador por jugador + display**: `bjArcadeMultJugador(i)`
    concentra TODOS los arcanos que multiplican ganancias (Rueda, Juicio, Emperador,
    Carro, Luna, Fuerza, Diablo) y devuelve el ×N de cada jugador; la resolución solo
    multiplica lo que se GANA (nunca pérdidas ni empates). Es una función **pura** (el
    display la llama en cada repintado). Display: chip `✨ ×N` en la cabecera de
    `bj-arcade` (dentro de la fila que ya existía, **no crece en vertical**; se enciende
    en dorado si ≠ ×1), un `×N` pequeño por rival en la barra de la mesa compartida, y
    el ×N en la fila de cada jugador en la resolución de ronda. Por defecto, ×1.
  - ✅ **Paso 5 — Reglas de mesa y rastro** (`arcade.js` + `tarot.js`): helpers nuevos
    `bjTarotAplica` (los efectos de **Futuro** solo cuentan en la última ronda) y
    `bjTarotEsUltimaRonda`. Ya aplican por código: **Torre** (límite del dealer, las 3
    posiciones), **Emperatriz** (pago del natural, tope de apuesta, bonus/castigo de
    Pasado, mitad de pila en Futuro), **Mundo** (21 exacto, natural ×1, ±10 de Pasado),
    **Justicia** (empates), **Hierofante** (ruleset de Presente y +3 de Pasado),
    **Fuerza** (con cuántas cartas/qué totales se dobla, ×1,1 y −5), **Colgado**
    (rendirse tarde/prohibido, 10 % recuperado), **Templanza** (plantarse, pagos por
    4–5 cartas, recargo de mínima), **Muerte** (plantarse ≥17, mínimas forzadas, ×0,8),
    **Ermitaño** y **Luna invertida** y **Sol** (visibilidad de la mano del dealer),
    **Sacerdotisa** (contador oculto / cuenta de ases), **Emperador** (líder no se rinde,
    último dobla, ×2 y +2 por ronda en cabeza), **Carro** (racha, mínimas, ×2),
    **Diablo** (trasvases de fichas), **Loco invertido** y **Enamorados invertido**
    (Pasado: recargos y apuesta doble), **Mago invertido** (se acabó doblar).
    Rastro nuevo por jugador (`racha`, `victorias`, `bustPrevio`, `ganoPrevio`,
    `perdidasSeguidas`, `recargoMin`, `rondasLider`, `blackjacksPrevios`, `multRueda`,
    `multFijo`, `ganoACiegas`, `dobloYGano`) y banderas de mesa (`magoNoDoblar`,
    `dealerArraso`, `dealerRevelado`, `contadorOculto`, `dealerBlando`).
  - ⏳ **Pendiente (siguientes batches)**:
    1. **Valor de carta**: La Estrella (ases a 12 / 1 / 0, las 6 variantes) y La Rueda
       invertida (valores que cuentan 0). Necesitan un hook de valor en `motor.js`.
    2. **Interactivos** (piden UI en el turno): El Loco (descartar mano), Los Enamorados
       (descartar/cambiar carta), El Mago (cambiar carta; el dealer cambia la suya),
       La Sacerdotisa (espiar el mazo), El Juicio (2.ª oportunidad tras pasarse),
       El Diablo (tentar al diablo con 3 cartas), El Carro (apostar por el líder),
       La Muerte (22 → 12), El Mago Futuro (doblar obligatorio), El Hierofante Futuro
       (ruleset solo en la última ronda), La Justicia de Pasado (karma de empates).
    3. **Fin de partida**: El Mundo (Futuro), que suma/resta 15 por cada 21 o blackjack.
    4. **Saldo de tragos del tarot**: que la línea `fiesta` de cada arcano se sume al
       recuento del final de ronda solo cuando el efecto ha disparado de verdad.
  - ✅ **Paso 6 — Solitario: pool filtrado**. Los efectos que dependen del RANKING de
    jugadores no pueden disparar con un solo jugador (los helpers `bjArcadeEsLider` /
    `bjArcadeEsUltimo` / `bjArcadeLideraVictorias` / `bjArcadePuestoInicio` devuelven
    `false` con `jugadores.length <= 1`, y `bjArcadeTrasvasesDiablo` sale de vacío).
    Para no **malgastar una carta de la tirada** en un efecto inerte, esos efectos van
    marcados `soloMulti: true` en los datos y `bjTarotTirada` los excluye del pool en
    solitario (`bjTarotOrientacionesVivas`): por posición solo se considera un arcano
    si le queda alguna orientación viva, y la orientación se sortea entre las vivas.
    Son 12: **El Emperador** entero (las 6 → el arcano no sale nunca en solitario),
    **El Diablo** invertido (las 3, trasvases de fichas), **El Ermitaño** de Pasado
    (las 2, ir último/primero) y **El Carro** en `pr-n` (apostar por el líder) y `fu-i`
    (quien más victorias lleve). Ojo: **sí** siguen valiendo en solitario los que
    parecen de ranking pero miran al dealer (El Sol y La Torre de Pasado: «el dealer
    gana a todos» con un jugador es «el dealer te gana»).
  - Versiones subidas: `APP_VERSION` y `CACHE` → **4.9.10**.





# 21 ARCANOS — PROPUESTA DE TAROT POR POSICIÓN

## Filosofía

### PASADO
Representa consecuencias, secuelas, karma y memoria de rondas anteriores.

### PRESENTE
Representa las reglas activas de la ronda actual.

### FUTURO
Representa profecías, efectos para próximas rondas o para el final de la partida.

---

# 0 — EL LOCO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que alguien gana plantándose con su mano inicial, se le aplica un multiplicador extra de x1,1 que se va sumando en la partida (siguiente vez x1,2...). | Cada vez que alguien se pasa, su apuesta mínima sube dos fichas el resto de la partida. |
| Presente | Una vez por partida, cada jugador puede descartar su mano inicial y robar una nueva. | Una vez por partida, cada jugador puede descartar su mano inicial, pero el jugador está obligado a plantarse sin poder pedir ninguna carta. |
| Futuro | En la última ronda, todos pueden descartar su mano inicial y robar una nueva. | En la última ronda, todos deben descartar su mano inicial y robar una nueva a ciegas, plantándose sin poder pedir. |

---

# I — EL MAGO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si se obtiene un blackjack, el jugador puede intercambiar una carta de su mano por la primera del mazo en la siguiente ronda. | Si el dealer saca blackjack, los jugadores pierden el derecho a doblar el resto de la partida. |
| Presente | Una vez por partida se puede intercambiar una carta de tu mano por la siguiente del mazo. | Solo la primera vez en la partida, si su mano suma 17, el dealer sustituye su peor carta por otra del mazo. |
| Futuro | Todos los jugadores deben doblar en la última ronda a menos que obtengan blackjack | Nadie puede doblar en la última ronda. |

---

# II — LA SACERDOTISA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si se ganó la ronda anterior sin pedir ninguna carta extra, puede espiar la carta superior del mazo antes de pedir otra carta | Si alguien se ha pasado, el contador de cartas se oculta durante una ronda. |
| Presente | El contador de cartas restantes muestra también cuantos ases quedan durante toda la partida | El contador de cartas permanece oculto toda la partida. |
| Futuro | En la última ronda, todos ven la siguiente carta del mazo antes de decidir. | En la última ronda, el contador permanecerá oculto. |

---

# III — LA EMPERATRIZ

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada blackjack natural conseguido da un bonus acumulado: el próximo blackjack de ese jugador suma x1,0 (el siguiente blackjack multiplica x2,5...). | Tras obtener un bust, reduce el pago de un blackjack para ese jugador de x1,5 a x1,25  |
| Presente | El blackjack natural paga x2 toda la partida. | La apuesta máxima queda limitada. |
| Futuro | En la última ronda, el blackjack natural paga x3. | En la última ronda, un blackjack natural reduce las fichas del jugador un 25%. |

---

# IV — EL EMPERADOR

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | El líder de la partida obtiene +5 fichas adicionales multiplicadas por el número de rondas en cabeza. | El último de la partida obtiene un multiplicador x2 para la siguiente ronda en caso de victoria. |
| Presente | Quien vaya líder en cada momento no puede rendirse. | El último clasificado siempre puede doblar aunque no esté permitido. |
| Futuro | En la última ronda, si el líder gana, obtiene un multiplicador x2. | En la última ronda, si el último clasificado gana, obtiene un multiplicador x2 |

---

# V — EL HIEROFANTE

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que un jugador gana plantándose sin doblar o dividir, recibe +3 fichas. | Cada vez que un jugador gana tras usar doblar o dividir, recibe +3 fichas. |
| Presente | Se desactivan todas las reglas opcionales, solo se puede plantar y pedir. | Se activan todas las reglas opcionales independientemente de si están marcadas. |
| Futuro | En la última ronda se desactivan todas las reglas opcionales. | En la última ronda se activan todas las reglas opcionales. |

---

# VI — LOS ENAMORADOS

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si un jugador pierde dos rondas seguidas, puede descartar una carta inical de su próxima mano. | Si un jugador gana dos rondas seguidas, debe doblar su apuesta la próxima vez que juegue. |
| Presente | Una vez por partida, cada jugador puede descartar una de sus dos cartas iniciales. | Al recibir la mano, cada jugador debe cambiar a ciegas una de sus dos cartas iniciales por la carta superior del mazo. |
| Futuro | En la última ronda, todos pueden elegir entre dos manos iniciales distintas, dividir queda desactivado. | En la última ronda, cada jugador debe cambiar a ciegas una de sus dos cartas iniciales por la carta superior del mazo. |

---

# VII — EL CARRO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada racha de 2 victorias seguidas de un jugador le da +5 fichas de bonus. | Cada vez que alguien gana, su siguiente apuesta debe ser al menos el doble de la mínima |
| Presente | En cada ronda, cobras +3 fichas si el lider de la partida gana aunque tu propia mano pierda. | La apuesta mínima sube dos fichas cada vez que alguien encadena 2 victorias. |
| Futuro | Los jugadores que lleguen en racha de victorias a la última ronda obtienen un multiplicador x2. | En la última ronda, quien más victorias lleve debe apostar el doble de la apuesta máxima. |

---

# VIII — LA FUERZA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que un jugador dobla y gana, se le aplica un multiplicador de x1,1 (siguiente vez x1,2...). | Cada vez que un jugador dobla y pierde, pierde 5 fichas adicionales |
| Presente | Puede doblarse con cualquier número de cartas toda la partida. | Solo puede doblarse con 9, 10 u 11. |
| Futuro | Los jugadores que doblen en la última partida reciben un multiplicador a sus fichas totales de x1,1 en caso de victoria o de x0,9 en caso de perder. | En la última ronda, solo se puede doblar con 9, 10 u 11. |

---

# IX — EL ERMITAÑO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | En cada ronda, quien va último en la clasificación en ese momento ve la carta oculta del dealer | En cada ronda, quien va primero en ese momento no ve la carta visible del dealer hasta plantarse. |
| Presente | La carta oculta del dealer está siempre visible toda la partida. | La carta visible del dealer permanece oculta toda la partida. |
| Futuro | En la última ronda, todos ven la carta oculta del dealer. | En la última ronda, la carta visible del dealer permanece oculta hasta plantarse. |

---

# X — LA RUEDA DE LA FORTUNA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que alguien gana una mano, su próxima ganancia lleva multiplicador aleatorio ×1–×3. | Tras perder una ronda, el jugador verá como una de sus cartas inicales aleatoriamente vale 0. |
| Presente | Al empezar cada ronda se sortea un multiplicador ×0.5–×3 sobre las ganancias de esa ronda. | Al empezar cada ronda se sortea un valor de carta que cuenta como 0 esa ronda. |
| Futuro | En la última ronda, el multiplicador puede llegar hasta ×5. | En la última ronda, dos valores de carta al azar cuentan como 0. |

---

# XI — LA JUSTICIA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si la ronda anterior se saldo con empate, ese jugador obtiene un multiplicador de x1,1 en la siguiente ronda. | Si la ronda anterior se saldo con empate, ese jugador obtiene un multiplicador de x0,9 en la siguiente ronda. |
| Presente | Los jugadores ganan siempre los empates. | El dealer gana siempre los empates. |
| Futuro | Al final de la partida, el jugador con más empates obitene una bonificación de x1,2 a todas sus fichas (no aplica si nadie empata, en caso de empate a empates, ambos reciben el bonus) | Al final de la partida, el jugador con más empates reduce sus fichas en 15 unidades |

---

# XII — EL COLGADO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Se recupera un 10% de las fichas tras perder una apuesta | Cada mano ganada impide rendirse en la siguiente mano de ese jugador. |
| Presente | Está permitido rendirse después de pedir una carta. | Está prohibido rendirse aunque esté habilitado. |
| Futuro | Está permitido rendirse después de pedir una carta en la ronda final. | En la última ronda, rendirse está prohibido. |

---

# XIII — LA MUERTE

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada bust reduce a la mitad la apuesta mínima de ese jugador en su siguiente mano. |  Cada bust fija la siguiente apuesta de ese jugador obligatoriamente a la mínima. |
| Presente | Pasarse con 22 reduce tu puntuación a 12, permitiendo seguir jugando. | Nadie puede plantarse con menos de 17 durante toda la partida. |
| Futuro | En la última ronda, el primer bust de cada jugador se convierte en 12. | Hacer un bust en la última ronda aplica un multiplicador a las fichas totales de x0,8. |

---

# XIV — LA TEMPLANZA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que un jugador gana plantándose con 4 o más cartas, acumula un multiplicador de x1,1. | Cada vez que un jugador se planta con su mano inicial (2 cartas), su apuesta mínima sube un escalón (+5) el resto de la partida. |
| Presente | Plantarse con 5 o más cartas sin pasarse paga como un blackjack. | No puedes plantarte con la mano inicial, siempre se debe pedir. |
| Futuro | En la última ronda, plantarse con 4+ cartas sin pasarse paga como blackjack. | No puedes plantarte con la mano inicial ni con menos de 16 en la última ronda. |

---

# XV — EL DIABLO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Los jugadores que doblen y ganen, al doblar en su siguiente ronda, obtienen un multiplicador extra x2. | Cada mano perdida obliga a entregar 2 fichas extras por jugador ganador en la ronda (incluye el dealer) |
| Presente | Si cuentas con 3 cartas en la mano, al pedir otra y no pasarte, aplica un multiplicador x2 (Una vez por partida). | Los ganadores roban 3 fichas a cada perdedor por cada ronda. |
| Futuro | Los jugadores pueden doblar con un multiplicador x2 extra en la última ronda. | Los jugadores que ganen la última ronda roban 5 fichas a cada perdedor. |

---

# XVI — LA TORRE

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si el dealer gana a todos los jugadores, se planta en 16 la siguiente ronda. | Cuando un jugador obtiene 21, el dealer roba hasta llegar a 18. |
| Presente | El dealer se planta siempre en 16. | El dealer roba siempre hasta 18. |
| Futuro | En la última ronda, el dealer se planta en 16. | En la última ronda, el dealer roba hasta 18. |

---

# XVII — LA ESTRELLA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Tras perder una ronda, si se obtiene un as en la siguiente ronda, este vale siempre 11 | Tras ganar una ronda, si se obtiene un as en la siguiente ronda, este vale siempre 1. |
| Presente | Los ases pueden valer 1 o 12, no pueden valer 11. | Los ases solo valen 1 para toda la partida. |
| Futuro | Los ases también pueden valer 12 para la última ronda. | Los ases valen 0 en la última ronda. |

---

# XVIII — LA LUNA

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada vez que alguien gana sin ver la carta oculta del dealer, obtiene un multiplicador x1.15 para la siguiente ronda | Tras perder una ronda, la segunda carta de ese jugador se reparte boca abajo la ronda siguiente (juega a ciegas por miedo). |
| Presente | La segunda carta de cada jugador se reparte boca abajo. Ganar ofrece un multiplicador x2 adicional. | Ambas cartas del dealer están ocultas. |
| Futuro | La segunda carta de cada jugador se reparte boca abajo en la última ronda. Ganar ofrece un multiplicador x2.5 adicional. | Ambas cartas del dealer estarán ocultas en la última ronda |

---

# XIX — EL SOL

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Si todos los jugadores le ganan al dealer, este revela su carta oculta en la próxima ronda | Si gana el dealer a todos los jugadores, tendrá ambas cartas ocultas en la siguiente ronda|
| Presente | La carta oculta del dealer se reparte boca arriba durante toda la partida. | Cada blackjack del dealer quita 10 fichas a cada jugador.  |
| Futuro | En la última ronda, la carta oculta del dealer es visible desde el principio. | Si el dealer gana a todos los jugadores en la última ronda, se eliminan 15 fichas de cada jugador. |

---

# XX — EL JUICIO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Perder dos rondas seguidas ofrece una segunda oportunidad si el jugador se pasa en su siguiente mano. | Los multiplicadores activos en la ronda anterior se mantienen para la siguiente. |
| Presente | Si un jugador se pasa, obtiene una segunda oportunidad. (solo una vez) | Una vez se activa un multiplicador, permanece activo toda la partida. |
| Futuro | La última ronda añade un multiplicador adicional de x2. | En la última ronda, todos deben apostar al menos la mitad de su pila. |

---

# XXI — EL MUNDO

| Posición | Normal | Invertida |
|-----------|---------|---------|
| Pasado | Cada 21 exacto conseguido suma 10 fichas extras. | Cada blackjack natural reduce tu cuenta en 10 fichas. |
| Presente | El 21 exacto paga como blackjack. | El blackjack natural paga solo ×1. |
| Futuro | Al final de la partida, cada 21 exacto conseguido suma 15 puntos a las fichas totales | Los blackjacks naturales reducen las fihcas totales en 15 por cada uno. |
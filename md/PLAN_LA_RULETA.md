# Plan de desarrollo — FIEsta + «La Ruleta»

> Documento de planificación pensado para que **otro chat de Claude Code** pueda
> continuar el trabajo sin contexto previo. Contiene: objetivo, decisiones ya
> tomadas, arquitectura actual del repo, y el desarrollo dividido en **fases con
> TODOs de aprendizaje**.

---

## 1. Contexto del proyecto

Esta web es **FIEsta**, un hub de juegos de fiesta por turnos. Ya contiene dos
juegos completos: **DescriptIA** (describir y adivinar por equipos) y **Cartas
de la Fortuna** (mazo de cartas con efectos). «La Ruleta» será el **tercer juego**.

- **Sin framework, sin build step.** HTML + CSS + JavaScript vanilla.
- Los `.js` se cargan con `<script>` en orden desde `index.html` (el orden importa:
  las funciones/variables son globales).
- **PWA**: instalable (manifest + `sw.js` service worker), pensada para móvil,
  pantalla completa, respetando *safe areas* del notch. **Recuerda subir la
  versión de `CACHE` en `sw.js`** al añadir/cambiar archivos.
- **Idioma del código y comentarios: español.**
- Estética: tema oscuro azulado, tokens de color como variables CSS en
  `css/estilos.css` (`--color-acento`, `--color-superficie`, etc.).

### Nota importante para el asistente
El usuario **prueba los cambios de UI él mismo**. No abrir/ejecutar/servir la app
por él (ver memoria `feedback_no_probar_navegador`).

### Metodología de trabajo (lo que pide el usuario)
- Desarrollo **por fases**. El usuario indica cuándo se avanza de fase.
- **El usuario aprende implementando él.** En cada fase el asistente hace **el
  esqueleto/andamiaje** y **deja huecos con comentarios `// TODO`** para que el usuario
  los complete; cada `// TODO` va acompañado de **una explicación** de qué hay que hacer
  y por qué. No entregar la solución completa: dejar que el usuario escriba esa parte.
  (Ver memoria `dejar-todos-al-usuario`.)
- **Al empezar cada fase**, explicar primero los conceptos necesarios, de forma didáctica.
- Excepción puntual: tareas de reorganización/infraestructura las hace el asistente
  entero (sin TODOs) cuando el usuario lo pida.

---

## 2. Arquitectura actual (para reutilizar patrones)

### Estructura de ficheros (organizada por juego)
```
index.html            ← todas las pantallas (secciones .pantalla) + orden de <script>
site.webmanifest      ← nombre/iconos de la PWA (FIEsta)
sw.js                 ← service worker (offline); subir CACHE al cambiar archivos
css/estilos.css       ← estilos + tokens de color (compartido)
icons/                ← icono.svg (favicon), icon-180/192/512.png, generar_icono.py
img/
  cartas/             ← arte de Cartas de la Fortuna
js/
  nucleo/             ← COMÚN a todos los juegos
    pantallas.js      ← mostrarPantalla(nombre): patrón SPA
    util.js           ← utilidades compartidas (p. ej. barajar / Fisher–Yates)
    arranque.js       ← conectarNavegacionGenerica, arranque (muestra el hub), service worker
  descriptia/         ← juego DescriptIA (estado, datos, juego, main)
  cartas/             ← juego Cartas de la Fortuna (main)
  ruleta/             ← (se crea en la Fase 1) «La Ruleta»
data/
  descriptia/         ← tarjetas.js/.json + agregar_tarjeta.py
  cartas/             ← efectos.js
  ruleta/             ← (Fase 3) banco de temáticas de «La Ruleta»
```

**Orden de `<script>` en index.html:** `nucleo/pantallas.js` → (por cada juego: sus
datos y sus `js`) → `nucleo/arranque.js` **al final** (es quien muestra el hub).
Cada juego registra su propio wiring con su `document.addEventListener("DOMContentLoaded", …)`.

### Patrones reutilizables ya presentes
- **Patrón SPA**: `<section class="pantalla" data-pantalla="NOMBRE">`, solo la
  `.activa` es visible; `mostrarPantalla("NOMBRE")` y botones `data-volver`.
- **Hub FIEsta**: añadir una `.juego-card` en la pantalla `fiesta` + su pantalla +
  su wiring en el `main.js` del juego.
- **Stepper** (`− valor +`): markup `.stepper[data-stepper]` + `.stepper-btn[data-paso]`.
- **Lista de inputs de nombres**: patrón `sincronizarJugadores()` + `renderNombresJugadores()`
  de `js/descriptia/main.js`.
- **Barajar**: `barajar(array)` en `js/nucleo/util.js` (Fisher–Yates, devuelve copia).
- **Persistencia**: patrón `cfGuardar`/`cfCargar`/`cfHayPartidaGuardada`/`cfBorrar`
  de Cartas de la Fortuna (sobre `localStorage` con `JSON`).

---

## 3. Decisiones ya tomadas (no volver a preguntar)

| Tema | Decisión |
|------|----------|
| **Nombre del juego** | La Ruleta |
| **Prefijo/namespacing** | `rl` → estado `rlEstado`, funciones `rlXxx()`, pantallas `data-pantalla="rl-…"` |
| **Jugadores** | Sin equipos. Mínimo **2**, máximo **6**. Cada jugador puntúa individualmente. |
| **Partida** | **3 temáticas** por partida, elegidas al azar del banco. En cada temática, **todos los jugadores adivinan una vez** (rotando quién adivina). |
| **Posición del sector** | **Nueva posición aleatoria en cada turno** (aunque la temática sea la misma). Así el jugador que ya vio la revelación anterior no tiene ventaja. |
| **Puntuación** | Sector de puntuación **3-1-1**: sector central de **3 puntos** y uno de **1 punto** a cada lado. Fuera del sector: **0 puntos**. |
| **Control de la aguja** | **Arrastrar** directamente sobre el semicírculo (pointer events + trigonometría). |
| **La pista es verbal** | El grupo dice la pista en voz alta (p. ej. una comida). La app **no** registra la pista. |
| **Final** | Ranking individual por puntos, con medallas 🥇🥈🥉 como en DescriptIA. Empates: comparten puesto. |
| **Temáticas** | Banco de pares de palabras en `data/ruleta/tematicas.js`. Contenido inicial escrito a mano; script de Python tipo `agregar_tarjeta.py` = fase futura. |

### Contenido pendiente de definir (TBD por el usuario)
- El **banco de temáticas** definitivo (pares de conceptos opuestos). De momento,
  unos **15–20 pares placeholder** (p. ej. «Comida rica ↔ Comida mala»,
  «Frío ↔ Caliente», «Infravalorado ↔ Sobrevalorado»…).
- **Anchura de los sectores** de puntuación: se parte de **12° el central y 12°
  cada lateral** (36° de 180°, un 20 % del semicírculo). Son constantes con
  nombre para poder ajustarlas tras probar.

---

## 4. Especificación de «La Ruleta»

Versión con un solo móvil del juego *Wavelength*: un jugador adivina dónde cae
un concepto dentro de un espectro entre dos polos, guiándose por una pista que
le da el resto del grupo.

### Flujo de juego

1. **Configuración** (`rl-config`): stepper de nº de jugadores (2–6) + nombres.
   Sin equipos. Al empezar: se **baraja el orden** de jugadores y se **eligen 3
   temáticas al azar** del banco.

2. **Pantalla de cambio de jugador** (`rl-turno`): texto grande **«Turno de:
   NOMBRE»** + instrucción («NOMBRE, tápate los ojos o date la vuelta. El resto,
   pulsad cuando estéis listos»). Botón **«Ver ruleta»** → pasa a la fase de pista.

3. **Fase de pista** (en `rl-juego`, sub-estado `pista`): se muestra la **media
   ruleta destapada**:
   - Semicírculo con el **sector de puntuación** visible en una **posición
     aleatoria**: sector central (3 pts) flanqueado por dos laterales (1 pt).
   - A los lados del semicírculo, las **dos palabras de la temática**
     (p. ej. izquierda «Comida mala», derecha «Comida rica»).
   - El grupo (todos menos quien adivina) ve la posición y **piensa una pista**
     acorde: si el sector cayó en el medio, una comida «ni buena ni mala».
   - Botón **«Ocultar y pasar a NOMBRE»** → tapa el sector.

4. **Fase de adivinar** (sub-estado `adivinando`): la ruleta aparece **tapada**
   (solo semicírculo liso + las dos palabras). El grupo dice su pista en voz
   alta. El jugador **arrastra la aguja** por el semicírculo hasta donde crea
   que está el sector, y pulsa **«Confirmar»**.

5. **Revelación** (sub-estado `resultado`): se destapa el sector, la aguja queda
   fija donde apuntó, y se muestra **«+X puntos para NOMBRE»** (3, 1 o 0 según
   dónde cayó la aguja). Botón **«Siguiente»** → vuelve a `rl-turno` con el
   siguiente jugador (misma temática, **posición nueva**). Cuando todos han
   adivinado la temática, se pasa a la siguiente; tras la 3ª, a `rl-fin`.

6. **Final** (`rl-fin`): ranking de jugadores por puntos totales con medallas
   🥇🥈🥉 (empates comparten puesto) y botón para volver a FIEsta.

### Geometría de la ruleta (referencia para las fases 3–6)

- El semicírculo se modela con **ángulos de 0° a 180°** (0° = extremo izquierdo,
  180° = extremo derecho).
- El sector de puntuación se define por su **ángulo central** `centro`:
  - 3 puntos: `[centro − 6°, centro + 6°]`
  - 1 punto: `[centro − 18°, centro − 6°)` y `(centro + 6°, centro + 18°]`
- La posición aleatoria se genera de modo que **todo el sector quepa** dentro del
  semicírculo: `centro ∈ [18°, 162°]`.
- La aguja es un ángulo `aguja ∈ [0°, 180°]`. Puntos: 3 si está a ≤ 6° del
  centro, 1 si está a ≤ 18°, 0 en el resto.
- Conversión polar → cartesiano para dibujar en SVG:
  `x = cx − r·cos(θ)`, `y = cy − r·sin(θ)` (con θ en radianes y el semicírculo
  «boca arriba»; se fijará el convenio exacto al implementarlo).

### Modelo de datos propuesto

```js
// data/ruleta/tematicas.js
const RL_TEMATICAS = [
  { izquierda: "Comida mala", derecha: "Comida rica" },
  { izquierda: "Frío", derecha: "Caliente" },
  // ... 15–20 pares placeholder
];

// js/ruleta/ — estado del juego
const rlEstado = {
  jugadores: [],            // [{ nombre, puntos }] en orden barajado
  tematicas: [],            // las 3 elegidas para esta partida
  tematicaIndex: 0,         // 0..2
  turnoIndex: 0,            // quién adivina dentro de la temática
  centroSector: 90,         // ángulo central del sector (se regenera cada turno)
  anguloAguja: 90,          // posición actual de la aguja
  subEstado: "pista",       // "pista" | "adivinando" | "resultado"
};
```

---

## 5. Convenciones para no chocar con los otros juegos

Como todo es global (sin módulos), **evitar colisiones de nombres**:
- Carpeta **`js/ruleta/`** para la lógica (p. ej. `main.js`, y `juego.js` si crece).
- Carpeta de datos **`data/ruleta/`** (`tematicas.js`).
- **Prefijar** todo: `rlEstado`, `rlXxx()`, constantes `RL_XXX`.
- Pantallas: `data-pantalla="rl-config"`, `"rl-turno"`, `"rl-juego"`, `"rl-fin"`.
- `<script>` nuevos en `index.html` **después** de `js/nucleo/pantallas.js` y
  **antes** de `js/nucleo/arranque.js`. El juego registra su init en su propio
  `document.addEventListener("DOMContentLoaded", …)`.
- Al tapar el sector, **no** taparlo solo con CSS (opacidad/color): en el
  sub-estado `adivinando` el sector **no debe estar en el DOM** (o debe estar
  vacío), para que no se pueda intuir mirando la pantalla en ángulo.

---

## 6. Desarrollo por fases

> Recuerda: al iniciar cada fase, **explica primero los conceptos de sus TODOs**.
> El usuario dice cuándo se pasa a la siguiente fase.

### Fase 1 — Andamiaje del juego y navegación
Enganchar «La Ruleta» al hub y crear su esqueleto.
- Añadir su `.juego-card` en la pantalla `fiesta`.
- Crear las pantallas vacías `rl-config`, `rl-turno`, `rl-juego`, `rl-fin` en `index.html`.
- Crear `js/ruleta/main.js` con su init y el objeto `rlEstado`.
- Wiring: la tarjeta del hub lleva a `rl-config`; botones «Atrás»/volver a `fiesta`.
- Subir versión de `CACHE` en `sw.js` y añadir los archivos nuevos.
- **TODOs de aprendizaje:**
  - **TODO 1.1** — Repasar el flujo de **registro de un juego** en este repo:
    dónde va cada `<script>`, por qué el orden importa, y cómo el `main.js` del
    juego se engancha al hub sin tocar el núcleo.

### Fase 2 — Configuración de jugadores (2–6)
Pantalla `rl-config` reutilizando el patrón de DescriptIA/Cartas.
- Stepper de nº de jugadores (**min 2, max 6**) + lista de inputs de nombres.
- Validación: ningún nombre vacío.
- Botón «Empezar» → **barajar orden** de jugadores, **elegir 3 temáticas al azar**
  del banco (sin repetir), ir a `rl-turno`.
- **TODOs de aprendizaje:**
  - **TODO 2.1** — Reutilizar el patrón **stepper + lista de nombres** una vez más,
    esta vez escribiéndolo con menos andamiaje (ya se hizo en Cartas).
  - **TODO 2.2** — **Elegir N elementos al azar sin repetir**: barajar el banco
    con `barajar()` y quedarse con los 3 primeros (`slice`). Entender por qué esto
    garantiza no repetir, a diferencia de sortear 3 veces.

### Fase 3 — Banco de temáticas y modelo de ángulos
Datos y lógica base (sin dibujar nada todavía).
- `data/ruleta/tematicas.js` con `RL_TEMATICAS` (15–20 pares placeholder).
- Constantes de geometría: anchura del sector central (12°) y laterales (12°).
- `rlNuevaPosicion()`: genera un `centroSector` aleatorio en `[18°, 162°]`.
- `rlCalcularPuntos(aguja, centro)`: devuelve 3, 1 o 0 según la distancia angular.
- **TODOs de aprendizaje:**
  - **TODO 3.1** — **Trabajar con ángulos**: por qué modelamos la ruleta como un
    número (0–180) y no como coordenadas; generar un aleatorio en un rango
    (`Math.random()` escalado y desplazado).
  - **TODO 3.2** — Implementar `rlCalcularPuntos` con `Math.abs(aguja − centro)`
    y las dos fronteras (6° y 18°). Probarla desde la consola con casos límite
    (justo en la frontera).

### Fase 4 — Dibujo de la media ruleta (SVG)
La parte visual de `rl-juego`, aún sin interacción.
- Semicírculo base dibujado con **SVG inline** (reutilizar lo aprendido con el
  icono de FIEsta: `viewBox`, `<path>`).
- Los **3 sectores de puntuación** como `<path>` con **arcos** (comando `A`),
  en la posición que diga `rlEstado.centroSector`, con los números 3/1/1 visibles.
- Las **dos palabras** de la temática a izquierda y derecha del semicírculo.
- Los tres **sub-estados visuales**: `pista` (sector visible), `adivinando`
  (sector fuera del DOM, semicírculo liso), `resultado` (sector visible + aguja).
- **TODOs de aprendizaje:**
  - **TODO 4.1** — **Coordenadas polares → cartesianas**: escribir la función
    `rlPolarACartesiano(angulo, radio)` con `Math.cos`/`Math.sin` (y grados →
    radianes). Es la pieza que traduce «ángulo 137°» a un punto dibujable.
  - **TODO 4.2** — **Arcos en SVG**: entender el comando `A` de `<path>`
    (radio, large-arc-flag, sweep-flag) y construir el `d` de un sector circular
    (línea al borde + arco + línea de vuelta al centro).

### Fase 5 — La aguja arrastrable
Interacción principal del jugador que adivina.
- Dibujar la **aguja** (línea del centro al borde) en `anguloAguja`.
- **Arrastre**: `pointerdown`/`pointermove`/`pointerup` sobre el SVG; convertir
  la posición del dedo al ángulo respecto al centro del semicírculo; limitar
  el resultado a `[0°, 180°]`.
- Botón **«Confirmar»** (solo activo en sub-estado `adivinando`).
- **TODOs de aprendizaje:**
  - **TODO 5.1** — **Pointer events**: por qué usamos `pointer*` en vez de
    `mouse*`/`touch*` (unifican ratón y táctil), y `setPointerCapture` para que
    el arrastre no se corte al salirse del SVG.
  - **TODO 5.2** — **`Math.atan2(dy, dx)`**: obtener el ángulo del dedo respecto
    al centro y ajustarlo al convenio 0–180 del semicírculo (más el `clamp` a los
    extremos). Es la inversa del TODO 4.1.

### Fase 6 — Flujo completo de turnos y puntuación
Encadenar todo: temáticas × jugadores, con la pantalla de cambio de jugador.
- `rl-turno`: «Turno de: NOMBRE» + botón «Ver ruleta» → sub-estado `pista`.
- `pista` → botón «Ocultar y pasar a NOMBRE» → `adivinando` → «Confirmar» →
  `resultado` (sumar puntos con `rlCalcularPuntos`, mostrar «+X puntos»).
- «Siguiente» → siguiente jugador de la temática (con `rlNuevaPosicion()`);
  si ya adivinaron todos → siguiente temática; tras la 3ª → `rl-fin`.
- **TODOs de aprendizaje:**
  - **TODO 6.1** — **Máquina de estados con sub-estados**: una pantalla
    (`rl-juego`) con tres modos controlados por `rlEstado.subEstado`; renderizar
    según el estado en vez de mostrar/ocultar a mano en cada handler.
  - **TODO 6.2** — **Doble rotación** (temática × jugador): avanzar `turnoIndex`
    con módulo y detectar el «cero» para avanzar `tematicaIndex`; detectar el fin
    de la partida. Es la versión anidada de la rotación de turnos de Cartas.

### Fase 7 — Pantalla final con ranking
- `rl-fin`: ordenar jugadores por puntos (descendente) y pintar el ranking con
  🥇🥈🥉 y el resto sin medalla, cada uno con sus puntos.
- **Empates**: jugadores con los mismos puntos **comparten puesto** (dos 🥇 si
  empatan primeros, y el siguiente es 🥉… decidir si se salta el puesto o no).
- Botón «Volver a FIEsta» (y limpiar el estado de la partida).
- **TODOs de aprendizaje:**
  - **TODO 7.1** — **Ordenar con `sort` y comparadores** (`(a, b) => b.puntos − a.puntos`)
    y asignar puestos contemplando empates (comparar con el anterior de la lista).

### Fase 8 — Continuar partida (persistencia)
- **Guardar** `rlEstado` en `localStorage` al inicio de cada turno (en `rl-turno`,
  antes de revelar nada) y **borrarlo** al llegar a `rl-fin`.
- En `rl-config`, botón **«Continuar partida»** visible solo si hay guardada.
- Detalle: si se guardó a mitad de un turno, al reanudar se **reinicia ese turno**
  (nueva posición del sector) para evitar trampas.
- **TODOs de aprendizaje:**
  - **TODO 8.1** — Adaptar el patrón `cfGuardar`/`cfCargar`/`cfHayPartidaGuardada`
    de Cartas a este juego, entendiendo qué partes son genéricas (candidatas a
    moverse a `js/nucleo/` en el futuro) y cuáles son específicas.

### Fase 9 — Pulido
- Animación al **destapar** el sector en la revelación (transición de la tapa).
- Feedback visual de los puntos (color según 3/1/0, pequeña animación).
- Repasar tamaños táctiles: la aguja debe arrastrarse cómodamente con el pulgar.
- Ideas futuras: script Python para añadir temáticas, sonidos, ajustar anchuras
  de sectores desde una pantalla de opciones.

---

## 7. Casos borde a tener en cuenta

- **2 jugadores**: el «grupo» que da la pista es una sola persona. Válido.
- **Aguja justo en la frontera** entre sectores: definir si la frontera cuenta
  para el sector de más puntos (recomendado: sí, usar `<=`).
- **Sector pegado a un extremo**: `centro ∈ [18°, 162°]` ya lo evita, pero
  comprobar que a 18° el dibujo no se corta.
- **Banco con menos de 3 temáticas**: no debería pasar con el banco placeholder,
  pero `rlElegirTematicas` no debe romperse (jugar con las que haya).
- **Recarga a mitad de turno**: se reanuda al inicio del turno con posición nueva
  (ver Fase 8).
- **Pantallas estrechas**: las dos palabras de la temática pueden ser largas;
  decidir si van arriba/abajo del semicírculo en vez de a los lados si no caben.

---

## 8. Estado actual del repo (punto de partida)

- Hub FIEsta con DescriptIA y Cartas de la Fortuna completos y jugables.
- Núcleo común en `js/nucleo/` (`pantallas.js`, `util.js` con `barajar`, `arranque.js`).
- PWA funcionando (manifest, `sw.js`, iconos).
- «La Ruleta»: **sin empezar**. Este documento es su plan. Empezar por la Fase 1.

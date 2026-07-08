# Plan de desarrollo — FIEsta + «Zona Tensionada» 🏙️

> Documento de planificación pensado para que **otro chat de Claude Code** pueda
> continuar el trabajo sin contexto previo. Contiene: objetivo, decisiones ya
> tomadas, arquitectura actual del repo, y el desarrollo dividido en **fases con
> TODOs de aprendizaje**. Es el cuarto juego de FIEsta: una parodia de *El Pueblo
> Duerme* (los hombres lobo) con temática de crisis de la vivienda, basada en
> `PROPUESTAS_LA_CIUDAD_DUERME.md` (ya cerradas: este documento manda).

---

## 1. Contexto del proyecto

Esta web es **FIEsta**, un hub de juegos de fiesta por turnos. Ya contiene tres
juegos completos: **DescriptIA** (describir y adivinar por equipos), **Cartas de
la Fortuna** (mazo con efectos) y **La Ruleta** (Wavelength). «Zona Tensionada»
será el **cuarto juego**.

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
- Excepción puntual: tareas de reorganización/infraestructura **y el arte** las hace
  el asistente enteras (sin TODOs), como se hizo con las cartas pixel art de
  Cartas de la Fortuna.

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
  cartas/             ← arte de Cartas de la Fortuna (+ generar_cartas.py, referencia de estilo)
  zona/               ← (Fase 0) cartas pixel art de los roles de Zona Tensionada
js/
  nucleo/             ← COMÚN: pantallas.js (SPA), util.js (barajar), arranque.js
  descriptia/         ← DescriptIA
  cartas/             ← Cartas de la Fortuna
  ruleta/             ← La Ruleta
  zona/               ← (Fase 1) «Zona Tensionada»
data/
  descriptia/  cartas/  ruleta/
  zona/               ← (Fase 3) roles.js + textos.js
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
- **Handoff de móvil**: pantalla de cambio de jugador de La Ruleta (`rl-turno`) —
  mismo patrón para la revelación de roles.
- **Persistencia**: patrón `cfGuardar`/`cfCargar`/`cfHayPartidaGuardada`/`cfBorrar`
  de Cartas de la Fortuna (sobre `localStorage` con `JSON`).
- **Arte pixel art por script**: `img/cartas/generar_cartas.py` (Pillow) como
  referencia de cómo se generaron las cartas de Cartas de la Fortuna.

---

## 3. Decisiones ya tomadas (no volver a preguntar)

| Tema | Decisión |
|------|----------|
| **Nombre del juego** | **Zona Tensionada** |
| **Prefijo/namespacing** | `zt` → estado `ztEstado`, funciones `ztXxx()`, constantes `ZT_XXX`, pantallas `data-pantalla="zt-…"`, carpetas `js/zona/`, `data/zona/`, `img/zona/` |
| **Jugadores** | Mínimo **5**, máximo **14** (los que reciben carta). Además hay **una persona narradora** que no recibe carta y maneja el móvil durante la noche. |
| **Roles v1** | **Todos los del catálogo menos la Abuela** (fusionada con el Sindicato, ver §4). |
| **Sindicato de Vivienda** | Fusión Sindicato+Abuela: **NO protege cada noche**. Su único poder es **un solo uso** de «salvar al desahuciado de esta noche» (ve quién ha caído y decide si gastarlo). El botón se gasta y queda deshabilitado para siempre. |
| **Plataforma de Alquiler Vacacional** | **Opción A (Pisoturista)**: cada noche convierte la casa de un jugador en piso turístico → ese jugador **no vota** en la asamblea del día siguiente. Gana con los buitres. |
| **Concejal de Urbanismo** | **No es una carta**: se elige por **votación inicial a mano alzada**, con una pantalla en la app para registrar quién es. Voto doble + desempata. **Sin** poder de recalificar. Compatible con tener rol secreto. |
| **Influencer Inmobiliario** | Si la asamblea lo expulsa, **gana él y la partida continúa** (la app anuncia su victoria personal, queda eliminado y se sigue jugando hasta que gane un bando). Si lo desahucian de noche, no gana. |
| **Desahuciados** | **Eliminados clásicos**: dejan de jugar, la app ya no los ofrece como objetivo ni les da turno. (Nada de la variante «turistas».) |
| **Noche** | **El móvil se lo queda la persona narradora**: lee las pantallas en alto («Buitres, abrid los ojos…») y pulsa según los gestos silenciosos de cada rol. Los demás, ojos cerrados. |
| **Votación del día** | **A mano alzada**, sin app. Debate **libre, sin temporizador**. En la app solo se **registra el resultado**: el expulsado o «nadie». |
| **Configuración de partida** | Pantalla propia: stepper de **nº de buitres** + **un interruptor estilo iOS por cada carta especial**. Con **presets por nº de jugadores** (ver §5) que se pueden cambiar a mano. |
| **Revelación de roles** | El móvil pasa de mano en mano: pantalla con el **nombre** del jugador → botón «Ver mi carta» → **carta pixel art + texto del efecto** → botón «Ocultar y pasar» → siguiente nombre. |
| **Efecto visible** | El texto del efecto de cada carta aparece **tanto en la revelación como en su turno nocturno**. |
| **Turnos que desaparecen** | Cuando un rol es eliminado, su turno nocturno **desaparece de la secuencia**. Los botones de un solo uso ya gastados aparecen **deshabilitados** (no desaparece el turno, se ve el botón gastado). |
| **Arte** | Cartas **pixel art generadas por Claude en la primera fase** (script Python tipo `generar_cartas.py`): **fondo oscuro**, cargadas de **detalles y colores**. Una carta por rol + reverso. |

### Contenido pendiente de definir (TBD por el usuario)
- Los **textos paródicos definitivos** (amanecer, desahucio, salvación, inspección,
  expulsión…). Se parte de los ejemplos del §5 de las propuestas; se recomienda
  **2–3 variantes aleatorias por evento** (más gracia a la segunda partida).
- Las **identidades decorativas** de los vecinos rasos («la del 4º con el carrito…»).
- Ajustar los **presets** de la tabla del §5 después de probar partidas reales.
- Qué pasa si muere el Concejal: propuesta → la app ofrece **elegir sucesor** con
  la misma pantalla de votación inicial (o «nadie»). Confirmar al llegar a la Fase 6.

---

## 4. Especificación de «Zona Tensionada»

Parodia de *El Pueblo Duerme* con temática de vivienda. Vocabulario: el pueblo →
**el barrio**; los lobos → **fondos buitre**; morir → **ser desahuciado**; el
linchamiento → la **asamblea de vecinos** expulsa a un sospechoso de especular;
la noche → «**la ciudad duerme…**».

### 4.1 Bandos y condiciones de victoria
- 🏦 **Fondos Buitre** (+ Plataforma): ganan si los buitres **igualan o superan**
  en número al resto de jugadores vivos.
- 🏘️ **Vecinos**: ganan si expulsan/eliminan a **todos** los fondos buitre.
- 📱 **Influencer**: victoria personal si la asamblea lo expulsa (la partida sigue).
- 🤝 **Pareja mixta** (vecino + buitre emparejados por la Inmobiliaria): ganan
  **solo si quedan ellos dos** vivos.
- La victoria se comprueba **después de cada noche y después de cada votación**.

### 4.2 Catálogo de roles (v1, todos incluidos)

| Rol | Bando | Mecánica |
|---|---|---|
| 🏦 **Fondo Buitre** (nº configurable) | Buitres | Cada noche eligen juntos a un vecino al que **desahuciar**. Se reconocen la primera noche. |
| 🧾 **Hacienda** | Vecinos | Cada noche **inspecciona** a un jugador: la app dice si es fondo buitre o no. La **Plataforma sale «inocente»** (como el traidor clásico). |
| ✊ **Sindicato de Vivienda** | Vecinos | Cada noche despierta y **ve quién ha sido desahuciado**. Tiene **UN solo uso** en toda la partida: **salvarlo** (convoca una cacerolada). Botón que se gasta y queda deshabilitado. |
| 🧳 **Plataforma de Alquiler Vacacional** | Buitres (sin desahuciar) | Conoce a los buitres (abre los ojos con ellos la 1ª noche). Cada noche convierte la casa de alguien en **piso turístico**: ese jugador **no vota** al día siguiente. |
| 🛠️ **El Okupa** | Vecinos | La **primera** vez que los buitres lo desahucian, **no cae** («lo intentaron, pero sigue dentro»). La segunda, sí. |
| 🏗️ **El Tasador** | Vecinos | Si es eliminado (de noche o por la asamblea), **se lleva a alguien por delante**: aparece una pantalla para que elija. |
| 📱 **Influencer Inmobiliario** | Independiente | Gana si la asamblea lo expulsa. La partida continúa sin él. |
| 🤝 **Inmobiliaria «Buscamos Compañero de Piso»** | Vecinos | **Solo la primera noche** (acción de un solo uso): empareja a dos jugadores como **compañeros de piso**. Si cae uno, cae el otro. Pareja mixta → condición de victoria propia. |
| 🏘️ **Vecinos rasos** | Vecinos | Sin poderes. Reciben una **identidad decorativa** aleatoria (solo texto). |
| 🏛️ **Concejal de Urbanismo** | (no es carta) | Elegido por votación inicial a mano alzada; la app registra quién es. Su voto **vale doble y desempata** (lo aplican los humanos al contar manos; la app lo recuerda en la pantalla de votación). |

### 4.3 Flujo de partida

1. **`zt-jugadores`**: stepper de nº de jugadores (**5–14**) + inputs de nombres.
2. **`zt-config`** («Configuración de la partida»): stepper de **nº de buitres** +
   un **interruptor estilo iOS** por cada carta especial (Hacienda, Sindicato,
   Plataforma, Okupa, Tasador, Influencer, Inmobiliaria). Al entrar se cargan los
   valores del **preset** según el nº de jugadores; el usuario puede tocarlos.
   Validación al empezar (ver casos borde).
3. **Reparto** (`zt-reparto`): se baraja y asigna. El móvil circula:
   pantalla «**NOMBRE**, coge el móvil» → botón «Ver mi carta» → **carta pixel art
   del rol + texto de su efecto** (los vecinos rasos ven la carta de vecino + su
   identidad decorativa) → «Ocultar y pasar» → siguiente. Nadie más mira.
4. **`zt-concejal`**: «Votad a mano alzada quién es el Concejal de Urbanismo» →
   lista de nombres, se registra uno. (Pantalla reutilizada si hay que reelegir.)
5. **Noche** (`zt-noche`): «La ciudad duerme». El móvil lo coge **la persona
   narradora**, que lee y pulsa. Turnos en **orden fijo**, solo de roles **vivos**:
   1. *(solo noche 1)* 🤝 Inmobiliaria: elige a los dos compañeros de piso.
   2. 🏦 Buitres (+ 🧳 Plataforma abre los ojos con ellos la noche 1 para
      reconocerse): eligen víctima en una lista de vivos.
   3. 🧳 Plataforma: elige a quién deja **sin voto** mañana.
   4. 🧾 Hacienda: elige a quién inspeccionar → la app muestra el resultado.
   5. ✊ Sindicato: la app le enseña **quién ha caído esta noche** y ofrece dos
      botones: «Usar la cacerolada (salvarlo)» —de un solo uso, luego queda
      deshabilitado— o «No intervenir».
   Cada pantalla de turno muestra la **carta del rol + su efecto** arriba y la
   acción debajo.
6. **Amanecer** (`zt-dia`): la app **resuelve la noche** y lo anuncia con texto
   paródico: desahuciado (o «esta noche no ha caído nadie» si el Sindicato salvó
   o el Okupa resistió), quién se queda **sin voto** (pisoturista), y las
   **cascadas** (pareja de piso, venganza del Tasador con su pantalla de elección).
   Se comprueba la victoria.
7. **Debate libre** (sin app, sin temporizador) y **votación a mano alzada**.
   En la app: lista de vivos **con voto** + opción «Nadie» para registrar el
   expulsado. La pantalla recuerda: «El voto de NOMBRE (Concejal) vale doble y
   desempata». Al registrar: si era el Influencer → anuncio de su victoria
   personal (y sigue la partida); si era el Tasador → su venganza; cascada de
   pareja; se revela **solo si era buitre o no** (decidir: ¿se revela el rol
   exacto? propuesta: sí, como en el clásico). Se comprueba la victoria.
8. Vuelta al paso 5 (noche siguiente). Los turnos de roles eliminados **ya no
   aparecen**.
9. **Fin** (`zt-fin`): pantalla de victoria del bando ganador (+ menciones:
   Influencer, pareja) con la **lista completa de jugadores y sus roles
   revelados**, y botón para volver a FIEsta.

### 4.4 Modelo de datos propuesto

```js
// data/zona/roles.js — catálogo estático
const ZT_ROLES = {
  buitre:      { nombre: "Fondo Buitre", bando: "buitres", carta: "img/zona/buitre.png",
                 efecto: "Cada noche, los fondos buitre eligen un bloque que comprar…", ordenNoche: 2 },
  hacienda:    { nombre: "Hacienda", bando: "vecinos", carta: "…", efecto: "…", ordenNoche: 4 },
  sindicato:   { nombre: "Sindicato de Vivienda", bando: "vecinos", efecto: "…", ordenNoche: 5, usoUnico: true },
  plataforma:  { nombre: "Plataforma de Alquiler Vacacional", bando: "buitres", ordenNoche: 3 },
  inmobiliaria:{ nombre: "Inmobiliaria", bando: "vecinos", ordenNoche: 1, soloNoche1: true },
  okupa:       { …, pasivo: true },   // sin turno nocturno
  tasador:     { …, pasivo: true },
  influencer:  { …, pasivo: true, bando: "independiente" },
  vecino:      { …, pasivo: true },
};

// js/zona/ — estado de la partida
const ztEstado = {
  jugadores: [],        // [{ nombre, rol, vivo, identidad, sinVotoHoy, parejaCon }]
  config: { numJugadores: 8, numBuitres: 2,
            especiales: { hacienda: true, sindicato: true, plataforma: false, … } },
  concejalIndex: null,  // índice del Concejal (o null)
  noche: 0,             // nº de noche actual
  colaTurnos: [],       // turnos nocturnos pendientes esta noche
  victimaNoche: null,   // resultado provisional de la noche
  sindicatoDisponible: true,  // el uso único
  okupaResistio: false, // si ya gastó su vida extra
  fase: "config",       // para persistencia
};
```

### 4.5 Textos paródicos (`data/zona/textos.js`)
Diccionario por evento con **arrays de variantes** (se elige una al azar), estilo:
- Noche: «La ciudad duerme. Los fondos buitre revisan sus carteras…»
- Desahucio: «NOMBRE ha encontrado un burofax en su puerta. El piso ya está en
  una web con fotos de gran angular por 1.400 €/mes.»
- Salvación: «Esta noche había una cacerolada en el portal de NOMBRE. Los buitres
  no se han atrevido a entrar.»
- Inspección: «47 transferencias a una SICAV. Es un fondo buitre.» / «Todo en
  regla. Hasta guarda las facturas del butano.»
- Expulsión: «La asamblea ha decidido: NOMBRE, devuelve las llaves. Todas.»
- Okupa: «Lo intentaron, pero sigue dentro.»
Contenido inicial placeholder; los definitivos los escribe el usuario (TBD §3).

---

## 5. Presets por número de jugadores (editables en `zt-config`)

Propuesta inicial (constante `ZT_PRESETS`, ajustar tras probar):

| Jugadores | Buitres | Especiales activadas por defecto |
|---|---|---|
| 5–6 | 1 | Hacienda, Sindicato |
| 7–8 | 2 | + Plataforma, Okupa |
| 9–10 | 2 | + Tasador, Influencer |
| 11–12 | 3 | + Inmobiliaria (todas) |
| 13–14 | 4 | todas |

Al cambiar el nº de jugadores en `zt-jugadores`, la pantalla `zt-config` se
rellena con el preset del rango; cualquier interruptor/stepper que toque el
usuario **manda sobre el preset**.

---

## 6. Convenciones para no chocar con los otros juegos

Como todo es global (sin módulos), **evitar colisiones de nombres**:
- Carpeta **`js/zona/`** (p. ej. `main.js`, `noche.js`, `dia.js` si crece) y
  **`data/zona/`** (`roles.js`, `textos.js`). Arte en **`img/zona/`**.
- **Prefijar** todo: `ztEstado`, `ztXxx()`, constantes `ZT_XXX`.
- Pantallas: `data-pantalla="zt-jugadores"`, `"zt-config"`, `"zt-reparto"`,
  `"zt-concejal"`, `"zt-noche"`, `"zt-dia"`, `"zt-fin"`.
- `<script>` nuevos en `index.html` **después** de `js/nucleo/pantallas.js` y
  **antes** de `js/nucleo/arranque.js`. El juego registra su init en su propio
  `document.addEventListener("DOMContentLoaded", …)`.
- **Información secreta**: al ocultar una carta o pasar de turno nocturno, el
  contenido sensible **no debe quedar en el DOM** (mismo criterio que el sector
  tapado de La Ruleta): vaciar el nodo, no taparlo con CSS.

---

## 7. Desarrollo por fases

> Recuerda: al iniciar cada fase, **explica primero los conceptos de sus TODOs**.
> El usuario dice cuándo se pasa a la siguiente fase.

### Fase 0 — Arte: cartas pixel art de los roles (la hace el asistente entera)
- Crear `img/zona/generar_cartas.py` (Pillow, como `img/cartas/generar_cartas.py`)
  que genere **una carta por rol** + **reverso**: estilo **pixel art**, **fondo
  oscuro**, cargadas de **detalles y colores** (buitre con maletín, lupa de
  Hacienda sobre facturas, pancartas del Sindicato, llavero de la Plataforma,
  candado del Okupa, casco del Tasador, aro de luz del Influencer, corazón/llaves
  de la Inmobiliaria, bloque de pisos del vecino raso…).
- Formato coherente con las cartas existentes (misma proporción); guardar PNGs
  en `img/zona/` y añadirlos al `sw.js` (subir `CACHE`).
- Sin TODOs: es la excepción de arte/infraestructura.

### Fase 1 — Andamiaje del juego y navegación
- Añadir la `.juego-card` de Zona Tensionada en la pantalla `fiesta`.
- Crear las pantallas vacías `zt-jugadores`, `zt-config`, `zt-reparto`,
  `zt-concejal`, `zt-noche`, `zt-dia`, `zt-fin` en `index.html`.
- Crear `js/zona/main.js` con su init y el objeto `ztEstado`.
- Wiring: la tarjeta del hub lleva a `zt-jugadores`; botones «Atrás» con `data-volver`.
- Subir versión de `CACHE` en `sw.js` y añadir los archivos nuevos.
- **TODOs de aprendizaje:**
  - **TODO 1.1** — Repasar el flujo de **registro de un juego** (cuarta vez ya):
    hacerlo esta vez casi sin andamiaje, mirando cómo lo hace `js/ruleta/main.js`.

### Fase 2 — Configuración: jugadores y pantalla de partida
- `zt-jugadores`: stepper (**5–14**) + lista de inputs de nombres + validación
  (ningún nombre vacío ni repetido). Botón «Siguiente» → `zt-config`.
- `zt-config`: stepper de **nº de buitres** + **interruptores estilo iOS** (uno
  por carta especial). Al entrar, cargar el **preset** según nº de jugadores
  (tabla del §5). Botón «Repartir cartas» → validar y pasar a la Fase 3.
- **TODOs de aprendizaje:**
  - **TODO 2.1** — **El interruptor estilo iOS con CSS puro**: un
    `<input type="checkbox">` oculto + `<label>` como pista deslizante
    (`border-radius`, `::after` como bola, `transition` en `transform`, y el
    selector `:checked + …` para el estado encendido). Accesible con teclado.
  - **TODO 2.2** — **Presets por rango**: función `ztPresetPara(numJugadores)`
    que devuelve el preset de la tabla (buscar el rango al que pertenece un
    número) y volcarlo en los controles **sin pisar** lo que el usuario ya tocó.

### Fase 3 — Modelo de roles y reparto
Datos y lógica base (sin UI de revelación todavía).
- `data/zona/roles.js`: catálogo `ZT_ROLES` (§4.4) con nombre, bando, ruta de la
  carta, texto del efecto, `ordenNoche`, banderas (`usoUnico`, `soloNoche1`,
  `pasivo`). Y `data/zona/textos.js` con las variantes placeholder.
- `ztConstruirMazo(config)`: N buitres + una carta por especial activada + rellenar
  con vecinos rasos hasta el nº de jugadores. `barajar()` y asignar a los nombres.
- Identidades decorativas aleatorias (sin repetir) para los vecinos rasos.
- Validación de configuración (ver casos borde §8).
- **TODOs de aprendizaje:**
  - **TODO 3.1** — **Modelar los roles como datos**: por qué un catálogo declarativo
    (`ZT_ROLES` + banderas) evita un `if` por rol repartido por todo el código; la
    lógica genérica lee las banderas.
  - **TODO 3.2** — **Construir y validar el mazo**: componer el array de roles según
    la config, comprobar que cabe (buitres + especiales ≤ jugadores) y que los
    buitres no llegan a la mitad; barajar y asignar con `barajar()`.

### Fase 4 — Revelación de roles (handoff) + elección del Concejal
- `zt-reparto` con **dos sub-estados**: «NOMBRE, coge el móvil» (nombre en grande +
  botón «Ver mi carta») ↔ revelación (**imagen de la carta** + nombre del rol +
  **texto del efecto**; vecino raso: su identidad decorativa) + «Ocultar y pasar».
- Al ocultar, **vaciar del DOM** la información del rol (ver §6).
- Tras el último jugador → `zt-concejal`: lista de nombres para registrar al
  elegido a mano alzada → primera noche.
- **TODOs de aprendizaje:**
  - **TODO 4.1** — **Handoff con sub-estados**: recorrer la lista de jugadores con
    un índice y alternar dos vistas dentro de la misma pantalla (renderizar según
    estado, como `rl-juego`), limpiando el contenido sensible al ocultar.
  - **TODO 4.2** — **Render dinámico de la carta**: componer la vista desde
    `ZT_ROLES[jugador.rol]` (src de la imagen, nombre, efecto) en vez de tener un
    HTML por rol.

### Fase 5 — La noche
El corazón del juego: la secuencia de turnos nocturnos que maneja la persona narradora.
- `ztConstruirColaTurnos()`: al empezar cada noche, filtrar los roles **vivos** con
  turno nocturno, ordenar por `ordenNoche`, incluir la Inmobiliaria **solo la
  noche 1** y saltar los turnos de roles ya eliminados (así «desaparecen» solos).
- Pantalla de turno: **carta del rol + efecto** + instrucción para la narradora
  («Buitres, abrid los ojos…») + **lista de objetivos vivos** (botones con nombres).
- Acciones: víctima de los buitres; pisoturista de la Plataforma; inspección de
  Hacienda (mostrar resultado, Plataforma = inocente); Sindicato: ver víctima +
  botón de un solo uso «Cacerolada (salvar)» / «No intervenir» — una vez gastado,
  el botón sale **deshabilitado** con texto «(ya usada)»; Inmobiliaria noche 1:
  elegir **dos** nombres para la pareja.
- `ztResolverNoche()`: aplicar salvación, vida extra del Okupa, y dejar el
  resultado listo para el amanecer (aún sin matar en pantalla).
- **TODOs de aprendizaje:**
  - **TODO 5.1** — **Cola de turnos como máquina de estados**: construir la cola al
    empezar la noche, avanzar con un índice, y por qué se reconstruye cada noche
    (roles muertos, `soloNoche1`) en vez de esconder pantallas a mano.
  - **TODO 5.2** — **Resolver la noche en orden**: separar «recoger intenciones»
    (víctima, salvación, pisoturista) de «aplicar efectos» al amanecer; manejar el
    caso Okupa (no muere, marcar `okupaResistio`) y el caso salvado.
  - **TODO 5.3** — **Botón de un solo uso**: modelarlo como estado
    (`sindicatoDisponible`), no como propiedad del DOM: deshabilitar el `<button>`
    (`disabled`) a partir del estado para que sobreviva a re-renders y a la
    persistencia.

### Fase 6 — El día: amanecer, votación y victoria
- `zt-dia`, sub-estado **amanecer**: anuncio con textos paródicos del resultado
  (desahuciado / nadie / okupa resiste), quién está **sin voto** hoy, cascadas
  (pareja de piso; Tasador → pantalla para elegir a quién se lleva).
- Sub-estado **votación** (tras el debate libre, sin app): lista de vivos +
  «Nadie», recordatorio del voto doble del Concejal. Registrar expulsado:
  Influencer → anuncio de victoria personal (sigue la partida); Tasador →
  venganza; cascada de pareja; revelar si era buitre.
- `ztComprobarVictoria()` tras cada noche y cada votación (condiciones §4.1,
  incluida la pareja mixta). Si hay ganador → `zt-fin`; si no → noche siguiente.
- Si muere el Concejal: reutilizar `zt-concejal` para elegir sucesor (propuesta
  TBD §3, confirmar con el usuario al llegar aquí).
- **TODOs de aprendizaje:**
  - **TODO 6.1** — **Eliminaciones en cascada**: implementar `ztEliminar(jugador)`
    que procese las consecuencias encadenadas (pareja, Tasador) sin recursión
    infinita; por qué conviene una única función de eliminación para todo el juego.
  - **TODO 6.2** — **`ztComprobarVictoria()`**: contar vivos por bando con
    `filter`, el empate buitres = resto, la condición especial de la pareja mixta,
    y en qué momentos exactos hay que llamarla.

### Fase 7 — Fin de partida
- `zt-fin`: bando ganador con texto paródico + menciones (Influencer, pareja) +
  **lista completa de jugadores con su rol revelado** (mini-carta o nombre del
  rol) y botón «Volver a FIEsta» (limpiando el estado).
- **TODOs de aprendizaje:**
  - **TODO 7.1** — **Render de la lista final**: recorrer `ztEstado.jugadores` y
    pintar nombre + rol + vivo/desahuciado, reutilizando `ZT_ROLES` para no
    duplicar textos.

### Fase 8 — Persistencia y pulido
- **Continuar partida**: guardar `ztEstado` en `localStorage` al empezar cada
  noche y cada día; botón «Continuar» en `zt-jugadores` si hay partida guardada;
  borrar al terminar. (El uso único del Sindicato y la vida del Okupa deben
  sobrevivir a la recarga: ya viven en `ztEstado`.)
- Pulido: transiciones al revelar cartas, variantes de textos definitivas,
  repasar tamaños táctiles (14 nombres en pantalla), `sw.js` al día.
- **TODOs de aprendizaje:**
  - **TODO 8.1** — Adaptar el patrón `cfGuardar`/`cfCargar` una vez más; qué
    puntos de guardado son seguros en un juego con información secreta (guardar
    al inicio de noche/día, nunca a mitad de un turno nocturno).

---

## 8. Casos borde a tener en cuenta

- **Config inválida**: buitres ≥ mitad de jugadores (la partida nace decidida) o
  buitres + especiales > jugadores. Avisar y no dejar empezar.
- **5 jugadores con todo activado**: no caben todas las especiales → el preset
  las limita, pero el usuario puede intentarlo a mano: validar.
- **Sindicato ya gastado**: su turno sigue apareciendo con el botón deshabilitado
  (decisión §3), así la narración no delata nada.
- **La víctima es el Okupa Y el Sindicato salva**: la salvación se aplica primero
  y el Okupa **no** gasta su vida extra.
- **Cascadas encadenadas**: Tasador emparejado → cae su pareja → ¿y si la pareja
  era otro Tasador…? `ztEliminar` debe procesar una cola, no recursión ciega.
- **El Influencer desahuciado de noche**: no gana, eliminado normal.
- **La pareja mixta queda sola**: comprobar ANTES que la condición de buitres
  (2 vivos: 1 buitre + 1 vecino emparejados → ganan ellos, no los buitres).
- **Hacienda inspecciona a la Plataforma**: resultado «inocente».
- **Todos los roles nocturnos muertos salvo los buitres**: la noche queda solo
  con el turno de buitres; la cola debe funcionar con 1 turno.
- **El Concejal es expulsado/desahuciado**: pantalla de sucesor (TBD §3).
- **14 inputs de nombres / 14 botones de objetivo**: cuidar el scroll y los
  tamaños táctiles en pantallas pequeñas.
- **Recarga a mitad de noche**: se reanuda al **inicio de esa noche** (las
  intenciones a medias se descartan), para no corromper el estado.

---

## 9. Estado actual del repo (punto de partida)

- Hub FIEsta con DescriptIA, Cartas de la Fortuna y La Ruleta completos y jugables.
- Núcleo común en `js/nucleo/` (`pantallas.js`, `util.js` con `barajar`, `arranque.js`).
- PWA funcionando (manifest, `sw.js`, iconos).
- «Zona Tensionada»: **sin empezar**. Este documento es su plan. Empezar por la
  **Fase 0 (arte de las cartas)**.

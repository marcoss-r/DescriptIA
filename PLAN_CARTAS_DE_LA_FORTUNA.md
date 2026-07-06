# Plan de desarrollo — FIEsta + «Cartas de la Fortuna»

> Documento de planificación pensado para que **otro chat de Claude Code** pueda
> continuar el trabajo sin contexto previo. Contiene: objetivo, decisiones ya
> tomadas, arquitectura actual del repo, y el desarrollo dividido en **fases con
> TODOs de aprendizaje**.

---

## 1. Contexto del proyecto

Esta web es **FIEsta**, un hub de juegos de fiesta por turnos. Empezó siendo un
único juego (**DescriptIA**, describir y adivinar por equipos) y ahora es un menú
principal («FIEsta») desde el que se accede a varios juegos.

- **Sin framework, sin build step.** HTML + CSS + JavaScript vanilla.
- Los `.js` se cargan con `<script>` en orden desde `index.html` (el orden importa:
  las funciones/variables son globales).
- **PWA**: instalable (manifest + `sw.js` service worker), pensada para móvil,
  pantalla completa, respetando *safe areas* del notch.
- **Idioma del código y comentarios: español.**
- Estética: tema oscuro azulado, tokens de color como variables CSS en
  `css/estilos.css` (`--color-acento`, `--color-superficie`, etc.).

### Nota importante para el asistente
El usuario **prueba los cambios de UI él mismo**. No abrir/ejecutar/servir la app
por él (ver memoria `feedback_no_probar_navegador`).

### Metodología de trabajo (lo que pide el usuario)
- Desarrollo **por fases**. El usuario indica cuándo se avanza de fase.
- Cada fase tiene **un par de TODOs pensados para aprender**.
- **Al empezar cada fase**, el asistente debe **explicar los conceptos necesarios
  para cada TODO** antes/durante la implementación, de forma didáctica, y guiar al
  usuario. El objetivo es que el usuario aprenda, no solo que el código funcione.

---

## 2. Arquitectura actual (para reutilizar patrones)

### Estructura de ficheros
```
index.html            ← todas las pantallas (secciones .pantalla) + orden de <script>
site.webmanifest      ← nombre/iconos de la PWA
sw.js                 ← service worker (offline)
css/estilos.css       ← estilos + tokens de color
icons/                ← icon-180.png, icon-192.png, icon-512.png
js/
  pantallas.js        ← mostrarPantalla(nombre): patrón SPA (común a todos los juegos)
  estado.js           ← estado de DescriptIA + persistencia en localStorage
  datos.js            ← helpers del banco de tarjetas de DescriptIA
  juego.js            ← lógica de juego de DescriptIA
  main.js             ← arranque, wiring de botones, hub FIEsta, asistente de config
data/
  tarjetas.js/.json   ← contenido de DescriptIA
```

### Patrón SPA de pantallas (clave, se reutiliza)
- Cada pantalla es `<section class="pantalla" data-pantalla="NOMBRE">` dentro de `#app`.
- Solo la que tiene la clase `.activa` es visible. Se cambia con:
  ```js
  mostrarPantalla("NOMBRE"); // js/pantallas.js
  ```
- Botones «Atrás»: cualquier botón con `data-volver="NOMBRE"` navega solo
  (ver `conectarNavegacionGenerica()` en `main.js`).

### Hub FIEsta (ya existe)
- Pantalla `data-pantalla="fiesta"`: título + `.lista-juegos` con tarjetas-botón
  `.juego-card`. La de DescriptIA ya está y lleva a `data-pantalla="inicio"`.
- La app arranca en `mostrarPantalla("fiesta")` (en `main.js`, `DOMContentLoaded`).
- Para añadir un juego nuevo al hub: otra `.juego-card` + su pantalla + su wiring.

### Utilidades reutilizables ya presentes
- **Stepper** (`− valor +`): markup `.stepper[data-stepper]` + `.stepper-btn[data-paso]`.
  Ver pantalla de jugadores/equipos de DescriptIA en `index.html` + `main.js`.
- **Lista de inputs de nombres**: patrón `sincronizarJugadores()` + `renderNombresJugadores()`
  en `main.js` (mantiene un array sincronizado con el nº elegido, conservando lo escrito).
- **Barajar**: existe una función `barajar(array)` (usada en el reparto de equipos).
  Reutilizarla para orden de jugadores y para el mazo.
- **Persistencia**: `guardarEstado()/cargarEstado()/borrarEstado()/reiniciarEstado()`
  sobre `localStorage` (patrón a imitar si se quiere reanudar partida).

---

## 3. Decisiones ya tomadas (no volver a preguntar)

| Tema | Decisión |
|------|----------|
| **Nombre del nuevo juego** | Cartas de la Fortuna |
| **Jugadores** | Sin equipos. Mínimo 2, **máximo 10**. |
| **Baraja** | Española: **As–7 + 3 figuras** (Sota, Caballo, Rey) × 4 palos (oros, copas, espadas, bastos) = **40 cartas**. |
| **Efectos** | **Un efecto por valor (10 efectos distintos)**. El palo es solo estético; una carta hace lo mismo sin importar el palo. |
| **Cartas de tarot** | Por ahora **solo dejar el sistema preparado** para admitirlas (campo de tipo/origen en el modelo). Contenido y efectos del tarot = fase posterior. |
| **Puntuación** | **Sin puntuación** ni podio. El juego termina cuando se acaba el mazo → pantalla de fin sencilla. |
| **Arte de cartas e icono** | **Placeholders CSS/SVG ahora.** El reverso de carta se dibuja con CSS/SVG. Los frentes en pixel art (PNG) se integran en una fase posterior. El icono de la app también se diseña como SVG y se rasteriza. |

### Contenido pendiente de definir (TBD por el usuario)
- Los **10 textos de efectos** (uno por valor). De momento van **placeholders**.
- Diseño final de los **frentes pixel art** y de las **cartas de tarot**.

---

## 4. Especificación de «Cartas de la Fortuna»

### Flujo de juego
1. **Configuración**: pantalla similar a DescriptIA para elegir nº de jugadores
   (stepper, 2–10) y escribir sus nombres. Sin equipos, sin categorías.
2. Al empezar: se **baraja el orden de los jugadores** y se **baraja el mazo** (40 cartas).
3. **Pantalla de juego única** (¡sin pantalla intermedia de handoff como en DescriptIA!):
   - Arriba, cabecera con **«Le toca a: NOMBRE»** (el nombre del jugador actual).
   - En el centro, el **mazo visto desde arriba**: se ve solo la carta superior
     boca abajo (reverso), con sensación de varias cartas apiladas debajo.
   - El **reverso actúa como botón**. Al tocarlo → **transición/animación de volteo**
     → se revela una **carta aleatoria** del mazo (frente pixel art placeholder).
   - Debajo aparece el **texto del efecto** de esa carta (según su valor).
   - Botón **«Siguiente jugador»** → avanza el turno, actualiza el nombre de la
     cabecera y vuelve a mostrar el mazo boca abajo para el siguiente.
4. Las cartas **no se reponen**: cada turno consume una carta del mazo.
5. **Fin**: cuando el mazo se queda **sin cartas** → pantalla de fin sencilla
   («Se acabó el mazo 🎉») con botón para volver a FIEsta.

> Nota de reconciliación: el usuario mencionó primero un «empezar turno», pero
> luego aclaró que **no quiere una pantalla entre jugadores**. Interpretación
> adoptada: hay **una sola pantalla de juego**; el nombre del jugador actual sale
> en la cabecera y **tocar el mazo es la acción de revelar**. No hay pantalla de
> «pásale el móvil».

### Diseño del reverso de carta (CSS/SVG, hazlo tú)
- Bordes **blancos**.
- Interior **azul**.
- Motivo interior **blanco y sencillo**: **mini estrellas de 4 puntas**.
- Aspecto de **mazo apilado** (sombra/offset de varias capas detrás de la carta superior).

### Modelo de datos propuesto
```js
// Carta de la baraja española
{ origen: "espanola", palo: "oros", valor: 1 }   // valor 1..7, 10=Sota, 11=Caballo, 12=Rey (o el esquema que se prefiera)
// Carta de tarot (futuro)
{ origen: "tarot", nombre: "...", ... }

// Efectos: diccionario por VALOR (10 entradas), el palo no influye
const efectosPorValor = {
  1:  "«As»: <efecto placeholder>",
  2:  "...",
  // ... hasta las figuras
};
```

---

## 5. Convenciones para no chocar con DescriptIA

Como todo es global (sin módulos), **evitar colisiones de nombres**:
- Nuevo fichero **`js/cartas.js`** para toda la lógica del juego.
- Nuevo fichero de datos **`data/efectos-cartas.js`** (los 10 efectos + estructura de mazo).
- **Prefijar** estado y funciones, p. ej. objeto de estado `cfEstado` y funciones
  `conectarCartas…()`, `cfMostrar…()`. (cf = Cartas de la Fortuna).
- Nombres de pantallas prefijados: `data-pantalla="cf-config"`, `"cf-juego"`, `"cf-fin"`.
- Añadir los `<script>` nuevos en `index.html` **después** de `pantallas.js`
  (que es común) y su init en `DOMContentLoaded`.

---

## 6. Desarrollo por fases

> Recuerda: al iniciar cada fase, **explica primero los conceptos de sus TODOs**.
> El usuario dice cuándo se pasa a la siguiente fase.

### Fase 0 — Rebranding a «FIEsta» + icono
Convertir la identidad de la app de DescriptIA a FIEsta.
- Cambiar `<title>`, y en `site.webmanifest` los campos `name` / `short_name`, más
  `apple-mobile-web-app-title` en `index.html`, a **FIEsta**.
- Diseñar un **icono nuevo**: temática **fiesta + física + espacio** (ideas: planeta
  con gorro de fiesta / cometa con confeti / átomo con estrellas de 4 puntas).
  Hacerlo como **SVG** y rasterizar a `icon-192.png`, `icon-512.png`, `icon-180.png`.
- Mostrar **ese mismo motivo en la pantalla principal FIEsta** (hero SVG sobre el título).
- **TODOs de aprendizaje:**
  - **TODO 0.1** — Entender el **web app manifest**: qué hacen `name`, `short_name`,
    `icons`, `theme_color`, y cómo el navegador/OS los usa al instalar la PWA.
  - **TODO 0.2** — Dibujar un **SVG inline** sencillo (estrella de 4 puntas + planeta):
    entender `viewBox`, sistema de coordenadas, `<path>`/`<polygon>`, `fill`.

### Fase 1 — Andamiaje del juego y navegación
Enganchar «Cartas de la Fortuna» al hub y crear su esqueleto.
- Añadir su `.juego-card` en la pantalla `fiesta`.
- Crear las pantallas vacías `cf-config`, `cf-juego`, `cf-fin` en `index.html`.
- Crear `js/cartas.js` con su `init` y el objeto `cfEstado` (namespacing).
- Wiring: la tarjeta del hub lleva a `cf-config`; botones «Atrás»/volver a `fiesta`.
- **TODOs de aprendizaje:**
  - **TODO 1.1** — Entender el **patrón SPA** de este repo (`mostrarPantalla`,
    `.pantalla.activa`, `data-volver`) y añadir una pantalla nueva navegable.
  - **TODO 1.2** — Entender por qué con **variables globales** hace falta *namespacing*
    y crear un **objeto de estado propio** (`cfEstado`) en vez de variables sueltas.

### Fase 2 — Configuración de jugadores (2–10)
Pantalla `cf-config` parecida a la de jugadores de DescriptIA, pero sin equipos.
- Stepper de nº de jugadores (**min 2, max 10**) + lista de inputs de nombres.
- Validación: ningún nombre vacío.
- Botón «Empezar» → **barajar orden** de jugadores, **barajar mazo**, ir a `cf-juego`.
- **TODOs de aprendizaje:**
  - **TODO 2.1** — Reutilizar el patrón **stepper + lista de nombres**; entender
    cómo `sincronizarJugadores()` mantiene el array cuadrado con el nº elegido.
  - **TODO 2.2** — Implementar/entender el **barajado (Fisher–Yates)** con la función
    `barajar` existente, aplicado al orden de jugadores.

### Fase 3 — Modelo de baraja y estado del juego
Datos y lógica base (sin UI todavía).
- En `data/efectos-cartas.js`: definir palos, valores y `efectosPorValor` (10 textos
  placeholder). Estructura preparada para cartas de tarot (`origen`).
- Construir el **mazo de 40 cartas**, función para **barajar** y **robar** (sacar la
  superior). Estado: mazo restante, índice de turno, carta revelada actual.
- **TODOs de aprendizaje:**
  - **TODO 3.1** — **Modelar datos**: objetos `{origen, palo, valor}`, un diccionario
    de efectos por valor, y construir el mazo con bucles anidados (palos × valores).
  - **TODO 3.2** — **Robar una carta**: `pop()`/`shift()` sobre el array; diferencia
    entre **mutar** el array del mazo y **copiarlo**; cómo detectar mazo vacío.

### Fase 4 — Pantalla de juego: cabecera, reverso y revelado
La pantalla `cf-juego` completa.
- Cabecera **«Le toca a: NOMBRE»** que se actualiza cada turno.
- **Reverso de carta** dibujado con CSS/SVG (bordes blancos, interior azul, mini
  estrellas de 4 puntas, aspecto de mazo apilado).
- Reverso = botón → **animación de volteo** → frente (placeholder) + **texto del efecto**.
- Botón **«Siguiente jugador»** → siguiente turno, reset a reverso.
- **Fin de mazo** → pantalla `cf-fin` sencilla → volver a FIEsta.
- **TODOs de aprendizaje:**
  - **TODO 4.1** — **Animación de volteo** con CSS (`transform: rotateY`, `transition`,
    `backface-visibility`); manejar los dos estados visuales reverso ↔ frente.
  - **TODO 4.2** — **Lógica de turnos**: rotar por el orden de jugadores, consumir
    carta del mazo, y **detectar el fin** para saltar a la pantalla de fin.

### Fase 5 — (Posterior/opcional) Arte real y tarot
- Sustituir los **frentes placeholder por los PNG de pixel art** reales.
- Añadir las **cartas de tarot** al mazo con sus efectos (cuando estén definidos).
- (Opcional) **Reanudar partida** con `localStorage`, imitando el patrón de DescriptIA.

---

## 7. Estado actual del repo (punto de partida)
- Hub FIEsta ya implementado (pantalla `fiesta` + tarjeta de DescriptIA + arranque en `fiesta`).
- Botón «← FIEsta» en la pantalla de inicio de DescriptIA.
- **Rebranding (título/manifest/icono) todavía NO hecho** → es la Fase 0.
- «Cartas de la Fortuna» todavía **no existe** → Fases 1–4.

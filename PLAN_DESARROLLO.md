# 🎮 Plan de desarrollo — Juego de tarjetas por equipos (web)

> **Qué es esto:** un plan de desarrollo por fases, pensado para **dos usos a la vez**:
> 1. **Que aprendas desarrollo web** paso a paso (cada fase explica los conceptos nuevos).
> 2. **Que sirva de guion para Claude Code**: cada fase tiene un bloque "🛠️ A construir" que puedes copiar y pegar como instrucción.
>
> No hace falta que sepas nada de programación para empezar. Vamos de menos a más.

---

## 📑 Índice

- [Cómo usar este documento](#-cómo-usar-este-documento)
- [Visión general del juego](#-visión-general-del-juego)
- [Decisiones técnicas y supuestos](#-decisiones-técnicas-y-supuestos)
- [Stack: qué tecnologías y por qué](#-stack-qué-tecnologías-y-por-qué)
- [Estructura de carpetas](#-estructura-de-carpetas-del-proyecto)
- [Glosario rápido](#-glosario-rápido-guárdalo-a-mano)
- [Modelo de datos](#-modelo-de-datos-el-estado-del-juego)
- [Sistema de tarjetas y script de Python](#-sistema-de-tarjetas-y-script-de-python)
- [Las fases de desarrollo](#-las-fases-de-desarrollo)
- [Casos borde a tener en cuenta](#-casos-borde-a-tener-en-cuenta)
- [Checklist global](#-checklist-global)
- [Ideas para el futuro](#-ideas-para-el-futuro)

---

## 🧭 Cómo usar este documento

**Como guía de aprendizaje:** lee las fases en orden. Cada una tiene una sección "📚 Aprenderás" con los conceptos nuevos y una "🔍 Para probar" para que veas con tus propios ojos qué hace cada pieza.

**Como input para Claude Code:** trabaja **una fase cada vez**. Abre Claude Code en la carpeta del proyecto y dile algo como:

> "Estamos construyendo el proyecto descrito en `PLAN_DESARROLLO.md`. Ya hemos terminado hasta la Fase X. Ahora implementa la **Fase X+1** siguiendo su bloque *A construir* y sus *Criterios de aceptación*. Explícame los cambios que haces."

Trabajar por fases evita que se genere todo de golpe (difícil de entender y de depurar) y te deja aprender a tu ritmo.

> 💡 **Consejo:** marca las casillas `- [ ]` a medida que completes tareas. Este archivo es tu tablero de progreso.

---

## 🎯 Visión general del juego

Es un juego de fiesta por equipos, estilo *Time's Up! / Party & Co*. Se juega **pasándose un mismo dispositivo** (móvil en vertical).

**Preparación de una partida:**
1. Se define el número de jugadores y se les pone nombre.
2. Se define el número de equipos (2 a 4). Los jugadores se reparten **al azar** entre los equipos.
3. Se pone nombre a cada equipo.
4. Se eligen las categorías a jugar (Acciones, Películas, Refranes, Deportes, Libros, Animales, Lugares…).
5. El juego elige **40 tarjetas** para la partida, repartidas equitativamente entre las categorías elegidas (los sobrantes van a categorías al azar). La selección dentro de cada categoría es aleatoria.

**Las 3 rondas** (se juegan con **las mismas 40 tarjetas**, que se reponen al empezar cada ronda):
1. **Descripción ilimitada** — describes con las palabras que quieras.
2. **Descripción con una palabra** — solo puedes decir *una* palabra.
3. **Gestos** — mímica, sin hablar.

**Un turno (minironda):**
- El jugador de turno tiene **40 segundos**.
- Aparece una tarjeta al azar del *pool* (mazo de tarjetas disponibles).
- Si su equipo acierta → botón **verde (✓)** → suma y sale otra tarjeta.
- Si quieren pasar → botón **rojo (✗)** → sale otra tarjeta.
- No se repite a ese jugador una tarjeta que ya le haya salido **en esa misma minironda**.
- **Solo en la Ronda 1:** pasar **resta 5 segundos** al temporizador.
- Al agotarse el tiempo → **pantalla de resumen** (esta sí con scroll) donde puedes corregir aciertos/fallos. Las **acertadas salen del pool**; las **pasadas vuelven al pool**.

**Fin de ronda:** cuando el pool se queda vacío (todas acertadas). Entonces se reponen las 40 tarjetas y empieza la siguiente ronda.

**Particularidad importante (tiempo arrastrado):** la ronda **no** termina porque a un jugador se le acabe el tiempo, sino cuando **se vacía el pool**. Si el jugador que acierta la última tarjeta **aún tiene segundos**, empieza **él mismo** la siguiente ronda con **el tiempo que le quedaba**.

**Final de partida:** ranking de equipos por número total de aciertos → 🥇 dorado, 🥈 plateado, 🥉 bronce, y el resto sin color, con su número de aciertos al lado.

---

## ⚙️ Decisiones técnicas y supuestos

Estas son las reglas que doy por asumidas. **Si alguna no te cuadra, cámbiala aquí antes de empezar** (es tu documento de referencia):

- **Orientación:** móvil en vertical. La app **no** hace scroll, salvo las pantallas de resumen.
- **Estética:** tonos oscuros y azulados, bordes redondeados, transiciones entre pantallas.
- **Sin dependencias externas:** nada de librerías descargadas ni CDNs. Todo el código vive en el repositorio.
- **Equipos:** de **2 a 4**.
- **Jugadores por equipo:** hasta **4**. *(Recomendado mínimo 2 por equipo: alguien tiene que adivinar. Decide si permites equipos de 1.)*
- **Puntuación:** cada equipo acumula el total de tarjetas acertadas en las **3 rondas**. El ranking final ordena por ese total.
- **Empates:** posibles; en ese caso comparten posición/medalla. *(Decide si quieres desempate.)*
- **Categorías:** por ahora **no** se editan desde la app. Se gestionan con el script de Python.
- **Guardado:** la partida se **guarda automáticamente** para poder retomarla si cierras o recargas (usaremos `localStorage`).
- **Al pasar en Ronda 1**, si quedan menos de 5 segundos, el tiempo baja a 0 y termina el turno.

> ⚠️ **Confírmame mentalmente** que la mecánica del "tiempo arrastrado" entre rondas es la que quieres, porque condiciona bastante el motor del juego.

---

## 🧱 Stack: qué tecnologías y por qué

Vamos a usar **"vanilla"** (tecnologías puras del navegador, sin frameworks):

| Tecnología | Rol | Analogía |
|---|---|---|
| **HTML** | La **estructura**: qué elementos hay (botones, textos, tarjetas). | El esqueleto y los músculos. |
| **CSS** | El **estilo**: colores, formas, transiciones. | La ropa y la piel. |
| **JavaScript** | La **lógica**: qué pasa al pulsar un botón, el temporizador, las reglas. | El cerebro. |

**¿Por qué vanilla y sin librerías?**
- Cumple tu requisito de **no descargar nada** (más control, menos superficie de problemas de seguridad).
- Funciona en **GitHub Pages** con solo subir los archivos: no hay "compilación".
- Es la mejor forma de **aprender de verdad** cómo funciona la web por dentro.

**GitHub Pages** es un servicio gratuito de GitHub que publica los archivos de un repositorio como una web accesible por URL. Perfecto para este proyecto porque es 100% estático (solo HTML/CSS/JS, sin servidor propio).

---

## 📁 Estructura de carpetas del proyecto

```
mi-juego/
├── index.html          ← única página; contiene todas las "pantallas"
├── css/
│   └── estilos.css     ← todo el diseño (tema oscuro, tarjetas, transiciones)
├── js/
│   ├── estado.js       ← el "estado" del juego + guardado/carga (localStorage)
│   ├── datos.js        ← utilidades sobre las tarjetas (barajar, repartir 40…)
│   ├── pantallas.js    ← mostrar/ocultar pantallas y transiciones
│   ├── juego.js        ← el motor: turnos, timer, rondas, puntuación
│   └── main.js         ← arranque: conecta todo cuando carga la página
├── data/
│   ├── tarjetas.json   ← FUENTE de datos (la edita el script de Python)
│   ├── tarjetas.js     ← copia generada que carga la web (no editar a mano)
│   └── agregar_tarjeta.py  ← script para añadir tarjetas por consola
└── README.md           ← cómo ejecutar y desplegar
```

> 📚 **Por qué separar en varios archivos JS:** para que cada archivo tenga *una responsabilidad*. Es más fácil de entender, encontrar errores y pedirle cambios concretos a Claude Code. Se llama **separación de responsabilidades**.

---

## 📖 Glosario rápido (guárdalo a mano)

- **DOM:** la representación en memoria de tu HTML que JavaScript puede leer y modificar. Cambiar el DOM = cambiar lo que se ve.
- **Estado (state):** un objeto de JavaScript que guarda *toda* la situación del juego (jugadores, equipos, pool, ronda, tiempo…). La pantalla siempre es un reflejo del estado.
- **Renderizar:** dibujar la pantalla a partir del estado.
- **Event listener:** "código que espera un suceso" (p. ej. un clic) y reacciona.
- **`localStorage`:** un almacén de texto que persiste en el navegador aunque cierres la pestaña. Ahí guardaremos la partida.
- **Pool / mazo:** el conjunto de tarjetas todavía disponibles en la ronda actual.
- **SPA (Single Page Application):** una sola página HTML que simula varias "pantallas" mostrando/ocultando trozos, sin recargar.
- **Barajar (shuffle):** desordenar aleatoriamente una lista. Usaremos el algoritmo *Fisher–Yates*.

---

## 🗂️ Modelo de datos (el "estado" del juego)

Antes de programar nada de pantallas, conviene tener claro **qué información guardamos**. Todo el juego girará en torno a un único objeto `estado`. Una forma aproximada (Claude Code la refinará):

```js
const estado = {
  fase: "config-jugadores",     // en qué pantalla estamos
  jugadores: [                   // lista de jugadores
    { id: 1, nombre: "Ana", equipoId: 2 },
    { id: 2, nombre: "Luis", equipoId: 1 },
  ],
  equipos: [
    { id: 1, nombre: "Los Tigres", aciertos: 0 },
    { id: 2, nombre: "Las Águilas", aciertos: 0 },
  ],
  categoriasElegidas: ["Animales", "Películas", "Refranes"],
  tarjetasPartida: [             // las 40 elegidas para toda la partida
    { id: "a1", texto: "Cóndor", categoria: "Animales" },
    // ...
  ],
  rondaActual: 0,                // 0=ilimitada, 1=una palabra, 2=gestos
  ordenTurnos: [ /* ids de jugadores intercalando equipos */ ],
  turnoIndex: 0,                 // a quién le toca dentro de ordenTurnos
  pool: [ /* ids de tarjetas disponibles esta ronda */ ],
  tiempoRestante: 40,            // segundos (se arrastra entre rondas)
  minironda: {                   // datos del turno en curso
    vistasEnEsteTurno: [],       // para no repetir tarjeta al mismo jugador
    resultados: [],              // { tarjetaId, resultado: "acierto" | "pasada" }
  },
};
```

> 📚 **Idea clave:** *el estado manda*. Nunca guardaremos información "solo en la pantalla". Cambiamos el estado → volvemos a renderizar. Así, guardar la partida es tan simple como guardar este objeto.

---

## 🃏 Sistema de tarjetas y script de Python

**Objetivo:** poder añadir tarjetas sin tocar la interfaz de la app, desde la consola, con Python.

**Cómo funciona el flujo de datos:**

```
   agregar_tarjeta.py
          │  (te pregunta categoría + tarjeta por consola)
          ▼
   data/tarjetas.json   ← fuente de la verdad (JSON, fácil para Python)
          │  (el script regenera este otro:)
          ▼
   data/tarjetas.js     ← const TARJETAS = { ... };  (lo carga index.html)
```

**¿Por qué dos archivos?** El navegador, cuando abres un archivo directamente (sin servidor), **no** puede leer un `.json` con normalidad por razones de seguridad. En cambio, un `.js` que declara una variable global (`const TARJETAS = {...}`) **sí** se carga sin problemas, tanto en local como en GitHub Pages. Así que:
- **JSON** = cómodo para el script de Python (y para ti, para leerlo).
- **JS generado** = lo que consume la web.

> 📚 **Bonus de aprendizaje:** esto es una versión sencilla y manual de un "paso de compilación" (*build step*): transformar unos datos fuente en el formato que consume la aplicación.

**Boceto del script** (Claude Code lo completará con validaciones):

```python
import json
from pathlib import Path

BASE = Path(__file__).parent
JSON_PATH = BASE / "tarjetas.json"
JS_PATH = BASE / "tarjetas.js"

def cargar():
    if JSON_PATH.exists():
        return json.loads(JSON_PATH.read_text(encoding="utf-8"))
    return {}

def guardar(datos):
    JSON_PATH.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    js = "const TARJETAS = " + json.dumps(datos, ensure_ascii=False, indent=2) + ";"
    JS_PATH.write_text(js, encoding="utf-8")

def main():
    datos = cargar()
    print("Categorías actuales:", ", ".join(datos.keys()) or "(ninguna)")
    while True:
        cat = input("Categoría (Enter para salir): ").strip()
        if not cat:
            break
        tarjeta = input(f"Tarjeta para '{cat}': ").strip()
        if not tarjeta:
            continue
        datos.setdefault(cat, [])
        if tarjeta in datos[cat]:
            print("  ⚠️ Ya existe, no se añade.")
        else:
            datos[cat].append(tarjeta)
            print(f"  ✅ Añadida a {cat}.")
    guardar(datos)
    print("Guardado. ¡Listo!")

if __name__ == "__main__":
    main()
```

> ✅ Este script **es la única excepción a "todo en el navegador"**: se ejecuta en tu ordenador solo cuando *tú* quieras añadir tarjetas. No forma parte de la web publicada, así que no afecta a GitHub Pages ni a la seguridad de la app.

**Datos de arranque:** para que el juego sea jugable desde el minuto uno, la Fase 2 incluirá un banco de ejemplo (unas 15–20 tarjetas por categoría). Luego tú lo amplías con el script.

---

## 🚧 Las fases de desarrollo

> Cada fase es autónoma y deja la app en un estado que **puedes probar**. No pases a la siguiente hasta que la actual funcione.

---

### Fase 0 — Preparación del proyecto

**🎯 Objetivo:** tener el esqueleto de carpetas y una página que abra en el navegador y muestre "Hola".

**📚 Aprenderás:** qué es un repositorio, la estructura HTML mínima, cómo abrir un archivo en el navegador.

**🛠️ A construir:**
- [ ] Crear la estructura de carpetas de arriba (archivos vacíos por ahora).
- [ ] Un `index.html` mínimo que enlace `css/estilos.css` y los archivos `js/` (en orden), y muestre un texto de prueba.
- [ ] Un `README.md` con: cómo abrir el proyecto y (más adelante) cómo desplegarlo.

**✅ Criterios de aceptación:** al abrir `index.html` en el navegador se ve el texto de prueba y no hay errores en la consola (F12).

**🔍 Para probar:** abre `index.html` y pulsa F12 → pestaña *Console*. Debe estar limpia.

---

### Fase 1 — Sistema de pantallas (SPA sin scroll) + tema base

**🎯 Objetivo:** varias "pantallas" en un solo HTML, de las que solo una es visible, con transición al cambiar. Fijar el tema visual oscuro azulado.

**📚 Aprenderás:** el patrón SPA, mostrar/ocultar con clases CSS, **variables CSS** (tokens de color), transiciones, y diseño en vertical que ocupa la pantalla sin scroll.

**🛠️ A construir:**
- [ ] En `index.html`, definir cada pantalla como un contenedor (p. ej. `<section class="pantalla" data-pantalla="inicio">`). Empieza con 2–3 de prueba.
- [ ] En `css/estilos.css`, definir **variables de tema** (fondo oscuro azulado, color de acento, verde de acierto, rojo de fallo, radios de borde grandes) y usarlas en todo el diseño.
- [ ] Layout que **llene el alto del móvil** y no genere scroll (salvo donde se permita más adelante).
- [ ] En `js/pantallas.js`, una función `mostrarPantalla(nombre)` que oculta todas y muestra la pedida, con una transición (deslizar/desvanecer).

**✅ Criterios de aceptación:** botones de prueba cambian de pantalla con animación; en vertical no aparece barra de scroll.

**🔍 Para probar:** navega entre pantallas de prueba y comprueba que la transición se ve fluida.

---

### Fase 2 — Datos de tarjetas y utilidades

**🎯 Objetivo:** tener el banco de tarjetas cargado y las funciones para barajar y repartir.

**📚 Aprenderás:** objetos y arrays en JS, **funciones puras**, el algoritmo de barajado *Fisher–Yates*, división entera y resto (para repartir 40).

**🛠️ A construir:**
- [ ] `data/tarjetas.json` + `data/tarjetas.js` con un **banco de ejemplo** (categorías: Acciones, Películas, Refranes, Deportes, Libros, Animales, Lugares; ~15–20 tarjetas cada una).
- [ ] `data/agregar_tarjeta.py` funcionando (ver sección de tarjetas).
- [ ] En `js/datos.js`: `barajar(lista)`, y `elegir40(categoriasElegidas)` que:
  - reparte 40 equitativamente entre las categorías elegidas,
  - si no es divisible, reparte los **sobrantes a categorías al azar** (una tarjeta extra por categoría escogida al azar),
  - elige aleatoriamente **dentro** de cada categoría,
  - controla el caso de que una categoría tenga menos tarjetas de las pedidas (rellena desde otras).

**✅ Criterios de aceptación:** llamar a `elegir40(...)` devuelve siempre 40 tarjetas (o el máximo posible si no hay suficientes en total), sin repetidas, bien repartidas.

**🔍 Para probar:** desde la consola del navegador, prueba `elegir40(["Animales","Películas"])` y cuenta que salen 40 y variadas.

---

### Fase 3 — Configuración de la partida

**🎯 Objetivo:** las pantallas para montar la partida.

**📚 Aprenderás:** capturar lo que escribe el usuario, **validaciones**, y volver a dibujar listas cuando cambian los datos.

**🛠️ A construir (pantallas en orden):**
- [ ] **Jugadores:** elegir cuántos y escribir su nombre (validar que no estén vacíos).
- [ ] **Equipos:** elegir número (2–4); **repartir jugadores al azar** entre los equipos (usa `barajar`); mostrar el reparto.
- [ ] **Nombrar equipos:** un campo por equipo.
- [ ] **Categorías:** elegir cuáles jugar (mínimo 1). Al confirmar, llamar a `elegir40` y guardar `tarjetasPartida` en el estado.
- [ ] Aplicar límites: **2–4 equipos**, hasta **4 jugadores por equipo**.

**✅ Criterios de aceptación:** no se puede avanzar con datos inválidos; al terminar, el estado tiene jugadores, equipos con nombre, categorías y 40 tarjetas.

**🔍 Para probar:** monta una partida y revisa el `estado` en consola (`console.log(estado)`).

---

### Fase 4 — Orden de turnos con alternancia de equipos

**🎯 Objetivo:** calcular el orden de juego intercalando equipos.

**📚 Aprenderás:** ordenar/intercalar listas (*round-robin*).

**🛠️ A construir:**
- [ ] En `js/juego.js`, `calcularOrdenTurnos()` que produzca: J1 de E1, J1 de E2, J1 de E3…, luego J2 de E1, J2 de E2… (con orden aleatorio dentro de lo razonable, pero **alternando equipos**). Guardar en `estado.ordenTurnos`.
- [ ] Gestionar equipos de distinto tamaño (si un equipo se queda sin jugadores en esa vuelta, se salta).

**✅ Criterios de aceptación:** el orden nunca pone dos turnos seguidos del mismo equipo mientras haya alternativas.

**🔍 Para probar:** imprime `ordenTurnos` y comprueba la alternancia con distintos tamaños de equipo.

---

### Fase 5 — Motor de la minironda (pantalla de juego)

**🎯 Objetivo:** el corazón del juego: un turno de 40 s con tarjetas.

**📚 Aprenderás:** el **temporizador** (`setInterval`), event listeners de botones, y mantener el estado de un turno.

**🛠️ A construir (pantalla de juego):**
- [ ] Título según la ronda ("Descripción ilimitada" / "Una palabra" / "Gestos").
- [ ] **Temporizador de 40 s** visible, que cuenta hacia atrás.
- [ ] La **tarjeta** actual (texto grande, p. ej. "Cóndor").
- [ ] Botón **verde (✓)** y botón **rojo (✗)** (siempre presentes, iguales en todas las rondas).
- [ ] Al pulsar ✓: registrar **acierto**, sacar otra tarjeta del pool **que no haya salido a este jugador en este turno**.
- [ ] Al pulsar ✗: registrar **pasada**, sacar otra tarjeta con la misma regla de no-repetición.
- [ ] **Solo Ronda 1:** al pasar, **restar 5 s** al temporizador (si quedan <5, poner 0 y terminar turno).
- [ ] Si se acaban las tarjetas *no vistas este turno* antes que el tiempo, gestionarlo con elegancia (ver Casos borde).
- [ ] Al llegar a 0 → ir a la pantalla de resumen de minironda (Fase 6).

**✅ Criterios de aceptación:** el timer corre, los botones responden, nunca se repite tarjeta al mismo jugador dentro del turno, y en Ronda 1 pasar quita 5 s.

**🔍 Para probar:** juega un turno completo y verifica el descuento de 5 s solo en Ronda 1.

---

### Fase 6 — Resumen de minironda (scrolleable + corrección)

**🎯 Objetivo:** revisar y corregir lo del turno, y actualizar el pool.

**📚 Aprenderás:** renderizar listas dinámicas, permitir scroll **solo aquí**, y editar el estado desde la interfaz.

**🛠️ A construir:**
- [ ] Lista **scrolleable** con todas las tarjetas del turno (acertadas y pasadas), en formato **pequeño**.
- [ ] Cada tarjeta tiene en sus esquinas un mini-botón **verde** y uno **rojo**. Aparece **resaltado** el resultado que marcaste durante el turno y **atenuado (gris)** el otro.
- [ ] Al pulsar el atenuado, ese pasa a ser el seleccionado y el anterior se atenúa (corrige errores).
- [ ] Al confirmar: las **acertadas salen del pool**; las **pasadas vuelven al pool**.
- [ ] Actualizar los **aciertos del equipo** del jugador según el resultado final corregido.
- [ ] Pasar el turno al siguiente jugador (o cambiar de ronda si el pool quedó vacío → Fase 7).

**✅ Criterios de aceptación:** la corrección funciona en ambos sentidos; el pool y los aciertos quedan coherentes tras confirmar.

**🔍 Para probar:** marca a propósito mal una tarjeta durante el turno y corrígela aquí; comprueba que el marcador se ajusta.

---

### Fase 7 — Flujo completo de las 3 rondas

**🎯 Objetivo:** encadenar minirondas y rondas con todas las reglas, incluida la del **tiempo arrastrado**.

**📚 Aprenderás:** modelar el juego como una **máquina de estados** (config → juego → resumen turno → … → fin).

**🛠️ A construir:**
- [ ] Repetir minirondas rotando por `ordenTurnos` hasta que **el pool quede vacío**.
- [ ] Al vaciarse el pool → **fin de ronda**; avanzar a la siguiente ronda y **reponer las mismas 40 tarjetas** al pool.
- [ ] **Tiempo arrastrado:** si el pool se vacía a mitad del turno de un jugador y **le queda tiempo**, la nueva ronda empieza **con ese mismo jugador** y **ese tiempo restante** (no 40 s). Si no queda tiempo, empieza el siguiente jugador con 40 s.
- [ ] Tras la Ronda 3 (Gestos), ir a la pantalla final (Fase 8).

**✅ Criterios de aceptación:** las rondas avanzan solo al vaciarse el pool; el arrastre de tiempo y de jugador funciona; las tarjetas se reponen entre rondas.

**🔍 Para probar:** fuerza (con un banco pequeño) que un jugador vacíe el pool con tiempo de sobra y verifica que sigue él en la siguiente ronda con ese tiempo.

---

### Fase 8 — Puntuación y pantalla final

**🎯 Objetivo:** mostrar el ranking final.

**📚 Aprenderás:** agregar datos y ordenar una lista.

**🛠️ A construir:**
- [ ] Calcular aciertos totales por equipo (ya acumulados en el estado).
- [ ] Ordenar de más a menos y mostrar: 🥇 **dorado**, 🥈 **plateado**, 🥉 **bronce**, resto **sin color**, con el número de aciertos al lado.
- [ ] Botón para **empezar otra partida** (limpia el estado guardado).
- [ ] Definir qué hacer con **empates** (comparten medalla, según tu decisión de la sección de supuestos).

**✅ Criterios de aceptación:** el orden y los colores del podio son correctos según los aciertos.

**🔍 Para probar:** juega una partida corta y comprueba el podio.

---

### Fase 9 — Guardar y retomar la partida

**🎯 Objetivo:** que cerrar o recargar no pierda la partida.

**📚 Aprenderás:** serializar a JSON, `localStorage`, y cargar el estado al arrancar.

**🛠️ A construir:**
- [ ] En `js/estado.js`: `guardarEstado()` (guarda el objeto `estado` en `localStorage`) y `cargarEstado()` (lo recupera).
- [ ] Llamar a `guardarEstado()` tras cada cambio importante (fin de turno, cambio de ronda, corrección…).
- [ ] Al abrir la app, si hay partida guardada, ofrecer **"Continuar partida"** o **"Nueva partida"**.
- [ ] Cuidado con el **temporizador**: al recargar en mitad de un turno, decide si se reanuda con el tiempo que había o si se reinicia ese turno (recomendado: reiniciar solo el turno en curso para evitar trampas; documéntalo aquí).

**✅ Criterios de aceptación:** recargar la página en mitad de una partida permite continuar sin perder equipos, aciertos ni progreso de rondas.

**🔍 Para probar:** a mitad de partida, recarga (F5) y pulsa "Continuar".

---

### Fase 10 — Pulido visual y transiciones

**🎯 Objetivo:** que se vea bonito y coherente.

**📚 Aprenderás:** afinar variables CSS, animaciones y accesibilidad básica.

**🛠️ A construir:**
- [ ] Repasar el tema oscuro azulado, contrastes legibles, bordes redondeados coherentes.
- [ ] Transiciones suaves entre pantallas y al aparecer una nueva tarjeta.
- [ ] Estados visuales claros de los botones (pulsado, deshabilitado).
- [ ] Que la tarjeta y el timer sean bien visibles en pantallas de móvil pequeñas.
- [ ] Detalles de accesibilidad: tamaño de toque cómodo, texto legible.

**✅ Criterios de aceptación:** la app se ve pulida y se usa cómodamente con el pulgar en vertical.

**🔍 Para probar:** ábrela en el móvil (o en el modo responsive del navegador, F12 → icono de móvil).

---

### Fase 11 — Despliegue en GitHub Pages

**🎯 Objetivo:** publicar el juego con una URL pública.

**📚 Aprenderás:** lo básico de Git y GitHub, y cómo activar Pages.

**🛠️ A construir:**
- [ ] Crear un repositorio en GitHub y **subir** el proyecto.
- [ ] Activar **GitHub Pages** en *Settings → Pages* (rama principal, carpeta raíz).
- [ ] Probar la URL pública en el móvil.
- [ ] Completar el `README.md` con instrucciones de uso y del script de tarjetas.

**✅ Criterios de aceptación:** el juego funciona igual desde la URL de GitHub Pages que en local.

**🔍 Para probar:** abre la URL pública en tu móvil y juega una partida entera.

---

## 🧩 Casos borde a tener en cuenta

Anótalos aquí para que ni tú ni Claude Code los olvidéis:

- **Pasar en Ronda 1 con <5 s:** el tiempo va a 0 y termina el turno.
- **Se acaban las tarjetas "no vistas este turno" antes que el tiempo:** decide qué mostrar (p. ej. permitir repetir las ya pasadas de este turno, o esperar a que baje el timer). Recomendado: si el pool aún tiene tarjetas pero ya salieron todas a este jugador, permitir que reaparezcan las pasadas.
- **El pool se vacía justo al agotarse el tiempo:** ¿cuenta como fin de ronda con tiempo 0? → empieza el siguiente jugador con 40 s.
- **Categoría con menos tarjetas de las necesarias:** `elegir40` debe completar desde otras categorías.
- **Menos de 40 tarjetas en total en las categorías elegidas:** avisar o jugar con las que haya (decídelo).
- **Equipos de 1 jugador:** ¿quién adivina? Decide si lo permites.
- **Recarga en mitad de un turno:** cómo se comporta el temporizador (ver Fase 9).
- **Empates en el podio:** cómo se muestran.

---

## ✅ Checklist global

- [ ] Fase 0 — Preparación del proyecto
- [ ] Fase 1 — Sistema de pantallas + tema
- [ ] Fase 2 — Datos de tarjetas y utilidades
- [ ] Fase 3 — Configuración de la partida
- [ ] Fase 4 — Orden de turnos
- [ ] Fase 5 — Motor de la minironda
- [ ] Fase 6 — Resumen de minironda + corrección
- [ ] Fase 7 — Flujo completo de rondas (incl. tiempo arrastrado)
- [ ] Fase 8 — Puntuación y pantalla final
- [ ] Fase 9 — Guardar y retomar
- [ ] Fase 10 — Pulido visual
- [ ] Fase 11 — Despliegue en GitHub Pages

---

## 🚀 Ideas para el futuro

Para cuando domines lo básico:

- Pantalla para **gestionar categorías/tarjetas desde la app** (con protección para no romperlas).
- **Sonidos** al acertar, pasar o acabarse el tiempo.
- **Configurar** la duración del turno o el número de tarjetas por partida.
- **Efectos** visuales al cambiar de ronda.
- **Modo oscuro/claro** alternable.
- Historial de partidas jugadas.

---

*Documento vivo: edítalo según decidas cosas. Es tu mapa del proyecto.* 🗺️

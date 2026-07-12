# Propuestas — Blackjack para FIEsta

> Documento de **ideas y decisiones de diseño** para un nuevo juego del hub FIEsta
> basado en el blackjack. Todavía NO es un plan de desarrollo por fases: primero
> hay que elegir entre las opciones marcadas como **Decisión**. Cuando estén
> decididas, se convertirá en un plan tipo `PLAN_CARTAS_DE_LA_FORTUNA.md`.

---

## 1. Decisiones ya tomadas (conversación 2026-07-11)

| Tema | Decisión |
|------|----------|
| **Modos** | Dos: **Clásico** (1 jugador vs dealer) y **Arcade** (1–N jugadores). |
| **Fichas en Clásico** | **Banca persistente**: empiezas con X fichas, se guarda en `localStorage` entre sesiones; si te arruinas, reinicias. |
| **Tarot en Arcade** | **Pool nuevo y amplio** (10+ arcanos con efectos pensados para blackjack). Por **partida** (no por mano) entran **3 cartas de tarot aleatorias**. |
| **Tono** | **Mixto/configurable**: los efectos base son de mecánica y puntos (jugable en solitario y en cualquier contexto); un interruptor **«modo fiesta»** añade una capa de tragos encima. |
| **Dispositivo** | **Hotseat**: un solo móvil que se pasa por turnos, como el resto de FIEsta. |
| **Arte** | Cartas en **pixel art**, baraja **francesa de 52** (la de blackjack: ♠ ♥ ♦ ♣, A–K). Generadas por script Python como `img/cartas/generar_cartas.py`. |

---

## 2. Nombre del juego (Decisión)

- **Opción A — «21 Arcanos»**: junta el 21 del blackjack con el tarot. Mi favorita:
  describe los dos modos y suena a nombre propio.
- **Opción B — «La Banca»**: corto, sabor casino, pero no menciona el tarot.
- **Opción C — «Blackjack Arcano»**: el más descriptivo, el más largo.

Convenciones derivadas (sea cual sea el nombre): carpeta `js/blackjack/`,
datos en `data/blackjack/`, prefijo `bj` (`bjEstado`, `bjConstruirMazo()`),
pantallas `data-pantalla="bj-…"`.

---

## 3. Base común a ambos modos

### 3.1 Reglas de blackjack (Decisión: qué subconjunto)

Reglas núcleo (siempre): pedir/plantarse, dealer roba hasta 17, as vale 1 u 11,
pasarse de 21 pierde, blackjack natural (as + figura/10 con 2 cartas).

Reglas opcionales, de más a menos recomendable:

| Regla | Qué aporta | Coste de implementación |
|-------|------------|--------------------------|
| **Doblar** | La decisión más divertida con apuestas; casi obligatoria en Clásico. | Bajo |
| **Dividir (split)** | Mucho sabor casino, pero duplica la complejidad del estado (dos manos activas, UI de dos manos). | Alto |
| **Rendirse (surrender)** | Recuperas media apuesta; interesante pero prescindible. | Bajo |
| **Seguro (insurance)** | En la práctica confunde a jugadores casuales. | Medio |

- **Opción A (recomendada)**: núcleo + **doblar** en la v1. Split/surrender como
  «Fase de pulido» futura.
- **Opción B**: todo desde el principio (retrasa mucho la primera versión jugable).

### 3.2 El mazo (Decisión)

- **Opción A — 1 mazo de 52, se rebaraja al agotarse**: simple y suficiente.
- **Opción B — zapato de 2 mazos**: solo tiene sentido si te importa que «contar
  cartas» sea viable/inviable; para un juego de fiesta no aporta.

### 3.3 Arte

- 52 frentes + reverso propio (distinto al azul de Cartas de la Fortuna, para que
  cada juego tenga identidad; p. ej. **rojo/burdeos con motivo de picas**).
- Los arcanos del tarot nuevos también en pixel art, con **marco distinto**
  (p. ej. dorado) para que se distingan de un vistazo.
- Recordatorio técnico: añadir las imágenes a `sw.js` y subir la versión de CACHE.

---

## 4. Modo Clásico (1 jugador vs dealer)

Tú contra la banca, con tu **banca de fichas persistente**.

### Flujo
1. Pantalla de mesa: banca actual arriba, apuesta con stepper (o fichas tocables), «Repartir».
2. Mano normal de blackjack: tus cartas boca arriba, dealer con una oculta.
3. Resolución → animación de ganar/perder fichas → siguiente mano.
4. Si llegas a 0 fichas: pantalla de «banca rota» → botón de reiniciar banca.

### Decisiones de diseño

1. **Banca inicial y apuestas** —
   **Opción A (recomendada)**: 100 fichas, apuesta mínima 5, sin máximo.
   **Opción B**: 20 fichas y apuestas 1–5 (partidas más tensas, te arruinas antes).
2. **Pago del blackjack natural** —
   **Opción A (recomendada)**: 3:2 como en el casino (apuestas 10, ganas 15).
   **Opción B**: 2:1 redondo (más fácil de calcular de cabeza y de programar).
3. **Qué se persiste** —
   **Opción A (recomendada)**: banca + **récord de banca máxima alcanzada** (da
   un objetivo a largo plazo).
   **Opción B**: además, estadísticas (manos jugadas, % victorias, mayor racha).
   Bonito pero es trabajo de UI extra; puede ser fase posterior.
4. **¿Tarot en Clásico?** —
   **Opción A (recomendada)**: **no**, el Clásico es blackjack puro; el tarot es
   la seña de identidad del Arcade.
   **Opción B**: un arcano diario («la carta del día») que modifica la mesa; idea
   simpática para retención, pero mejor como extra futuro.

---

## 5. Modo Arcade — tres ideas de estructura

Las tres comparten: **hotseat**, **puntos por mano**, **3 arcanos por partida**
(sección 6) y **modo fiesta opcional** (sección 8). Se puede implementar solo
una, o una v1 con la Idea A y ampliar después.

---

### Idea A — «Asalto a la Banca» (todos contra el dealer) ⭐ recomendada

Todos los jugadores juegan **contra el mismo dealer**, pero compiten entre sí
**por puntos**. En cada ronda, el móvil pasa de jugador en jugador: cada uno
juega su mano contra la mano del dealer de esa ronda (la mano del dealer se
resuelve **una vez por ronda**, al final, y se compara contra todos).

- **Por qué funciona en solitario**: con 1 jugador es «tú contra la banca a
  puntos»: mismas reglas, y tu objetivo es batir tu récord de puntos por partida.
- **Por qué funciona en grupo**: aunque todos van contra el dealer, la gracia es
  el ranking; el tarot mete caos compartido («esta partida los empates los gana
  el dealer») y puñales entre jugadores (arcanos de sabotaje).

**Decisiones de diseño:**

1. **Duración de la partida** —
   **Opción A (recomendada)**: nº fijo de **rondas** (p. ej. 8; configurable 5–15).
   Predecible, ideal para fiesta, y en solitario define el récord «puntos en 8 rondas».
   **Opción B**: carrera hasta X puntos (el que llega, gana). Menos justa en
   hotseat: el orden de turno importa.
2. **Cuándo se resuelve el dealer** —
   **Opción A (recomendada)**: el dealer reparte su carta visible al inicio de la
   ronda, cada jugador juega su mano viéndola, y **al final de la ronda** el dealer
   revela y roba. Todos comparados contra la misma mano del dealer → muy justo y
   genera drama colectivo («como saque figura nos mata a todos»).
   **Opción B**: cada jugador juega una mano completa e independiente contra un
   dealer nuevo. Más sencillo de programar (es el Clásico en bucle) pero menos
   sensación de mesa compartida.
3. **¿Mazo compartido o infinito?** —
   **Opción A (recomendada)**: mazo compartido de 52 visible («quedan 12 cartas»):
   los últimos de la ronda pueden intuir qué queda — pequeña capa de habilidad.
   **Opción B**: cada mano roba de un mazo «infinito» (rebarajado virtual). Más
   simple, cero memoria entre manos.

---

### Idea B — «El Torneo» (competitivo con apuestas cruzadas)

Cada jugador tiene una **pila de puntos-ficha** (todos empiezan igual, p. ej. 50).
Antes de cada ronda cada jugador **apuesta** parte de su pila; luego se juega la
ronda contra el dealer como en la Idea A. Ganas tu apuesta ×1 (×1,5 con
blackjack), la pierdes si pierdes. Al acabar las rondas, gana la pila más grande.

Aporta sobre la Idea A: **gestión de riesgo** («voy último, me lo juego todo a la
última ronda»). En solitario degenera en el modo Clásico, así que:

**Decisiones de diseño:**

1. **¿Eliminación?** —
   **Opción A (recomendada)**: no puedes quedar a 0 — siempre conservas una
   apuesta mínima (nadie se queda mirando en una fiesta).
   **Opción B**: a 0 estás eliminado, pero pasas a «poseer» al dealer: tú pulsas
   sus botones y celebras sus victorias. Cero jugadores aburridos y da rol al eliminado.
2. **Apuestas ocultas o públicas** —
   **Opción A**: públicas y en orden (los últimos reaccionan a los primeros).
   **Opción B (recomendada)**: cada uno apuesta en secreto en su turno al recibir
   el móvil (el hotseat lo hace natural) → se revela todo al final de la ronda.
3. **Solitario** —
   **Opción A (recomendada)**: si hay 1 jugador, este modo directamente no se
   ofrece (el selector de modo lo indica).
   **Opción B**: contra 2 «bots» con estrategia fija de apuesta. Divertido pero
   es bastante trabajo de IA/UI para un modo secundario.

---

### Idea C — «Parejas Cómplices» (variante por equipos, capa sobre A o B)

No es un modo aparte sino un **interruptor «por equipos»** en la configuración
del Arcade (con 4+ jugadores y número par): equipos de 2, los puntos de la
pareja se **suman**, y el ranking final es de equipos.

Lo interesante es darle a la pareja una **mecánica propia**, no solo sumar:

**Decisiones de diseño:**

1. **Mecánica de pareja** —
   **Opción A (recomendada) — «El Consejo»**: cuando te toca, tu pareja puede
   decir en voz alta UNA palabra («pide», «plántate», «dobla») una vez por ronda.
   Cero código extra (es una regla social, se explica en pantalla) y mucha risa.
   **Opción B — «Mano compartida»**: los dos miembros alternan decisiones sobre
   la misma mano (uno decide la 3.ª carta, el otro la 4.ª…). Más código y más
   pases de móvil, pero muy cómplice.
   **Opción C — «Banquillo»**: cada ronda juega solo un miembro y la pareja elige
   quién (relevante si el tarot ha maldecido/bendecido a alguien en concreto).
2. **Los arcanos con objetivo** («elige a un jugador») —
   **Opción A (recomendada)**: no pueden elegir a tu propio compañero → fuerzan
   guerra entre equipos.
   **Opción B**: sin restricción (a veces conviene sacrificar al compañero…).

---

## 6. El sistema de tarot del Arcade (común a las ideas A/B/C)

Al empezar la **partida** se sacan **3 arcanos al azar** del pool. Cada uno sale
en orientación **normal o invertida** (50 %), como en Cartas de la Fortuna.

### Decisión 1 — Cuándo y cómo entran en juego

- **Opción A — «Las tres del destino» (recomendada)**: los 3 se revelan **al
  inicio de la partida** con una animación de tirada de tarot, y quedan visibles
  como **reglas de mesa** activas toda la partida. Simple de programar (son
  modificadores globales), fácil de recordar, y cada partida se siente distinta
  desde la primera mano.
- **Opción B — «Revelación por actos»**: se revela 1 al inicio, otro al terminar
  ⅓ de la partida y el último a ⅔. La partida va mutando; algo más de estado.
- **Opción C — «Barajadas en el mazo»**: los 3 arcanos se mezclan **dentro del
  mazo de 52**; cuando alguien roba uno en plena mano, el efecto se dispara al
  momento (y roba otra carta para su mano). Máximo caos y sorpresa, pero hay que
  resolver qué pasa con efectos globales a mitad de una mano — la más difícil de
  equilibrar.

> Se pueden combinar: pool de arcanos etiquetados como «regla de mesa» (van
> revelados, Opción A) o «instantáneo» (van barajados, Opción C). Para la v1
> recomiendo solo Opción A y abrir la puerta a lo demás con el campo `tipo`.

### Decisión 2 — A quién afectan

- **Opción A (recomendada)**: mezcla en el pool — la mayoría son **reglas de mesa**
  (afectan a todos por igual, funcionan en solitario) y unos pocos son **dirigidos**
  (un jugador elige a otro; solo entran en el sorteo si hay 2+ jugadores).
- **Opción B**: todos globales (más simple, funciona igual a cualquier nº de
  jugadores, pero pierdes los puñales entre amigos).

### Pool de arcanos propuesto (12, cada uno con normal/invertida)

Los textos son **propuestas/placeholder**, como los efectos de Cartas de la
Fortuna al principio. `[F]` = tiene además capa de modo fiesta (sección 8).
Los marcados 👥 son «dirigidos» (requieren 2+ jugadores).

| Arcano | Normal | Invertida |
|--------|--------|-----------|
| **La Torre** | El dealer se planta en 16 (más blando). | El dealer roba hasta 18 (más letal). |
| **El Sol** | La carta oculta del dealer se juega boca arriba. | El dealer gana los empates. `[F]` |
| **La Luna** | Tu 2.ª carta se juega boca abajo (no la ves); si ganas la mano «a ciegas», puntos ×2. | La primera carta de cada mano no se ve hasta plantarse. |
| **La Estrella** | Los ases también pueden valer 12. | Los ases solo valen 1. |
| **La Templanza** | Plantarse con 5 cartas sin pasarse puntúa como blackjack. | Prohibido plantarse con menos de 14. `[F]` |
| **La Rueda** | Al empezar cada ronda, un multiplicador aleatorio ×1–×3 para los puntos de esa ronda. | Cada ronda, una carta al azar (p. ej. «los 7») no vale nada (0). |
| **El Mago** | Una vez por partida, cada jugador puede descartar una carta de su mano y robar otra. | Una vez por partida, el dealer cambia su peor carta. |
| **La Muerte** | Pasarse de 21 con exactamente 22 no pierde: cuenta como 12 y sigues. | Pasarse resta puntos además de perder la mano. `[F]` |
| **El Juicio** | La última ronda vale doble. | La ronda con menos puntos de cada jugador se borra al final. |
| **El Diablo** 👥 | Quien gana la ronda roba 5 puntos a quien elija. `[F]` | Quien pierde la ronda regala 5 puntos a quien elija. |
| **El Emperador** 👥 | El líder del ranking anuncia su jugada («pediré hasta 17») antes de jugar y debe cumplirla. | El último del ranking dobla puntos esta ronda. |
| **El Colgado** 👥 | Una vez por partida, puedes «colgar» tu mano y pasársela a otro jugador (se la queda). | Una vez por partida, puedes robar la mano ya plantada de otro. |

### Decisión 3 — Arte del tarot

- **Opción A (recomendada)**: los 12 nuevos en pixel art con marco dorado
  (script Python, como el resto). Diablo y Rueda existen en Cartas de la Fortuna
  pero con otro marco: **rehacerlos** con el marco del blackjack para no mezclar
  identidades visuales.
- **Opción B**: reutilizar tal cual los sprites de Diablo/Loco/Rueda y solo crear
  los nuevos (más rápido, menos coherente).

---

## 7. Puntuación por mano (Arcade)

Propuesta base (fácil de sumar de cabeza, premia el riesgo):

| Resultado de la mano | Puntos |
|----------------------|--------|
| Ganar al dealer | **10** |
| Ganar con 21 exacto (sin ser natural) | **15** |
| **Blackjack natural** | **25** |
| Empate (push) | **5** |
| Perder | **0** |
| Pasarse (bust) | **0** (o −5, ver Decisión 2) |

**Decisiones de diseño:**

1. **Bonus de racha** —
   **Opción A (recomendada)**: +5 por cada victoria consecutiva a partir de la 2.ª
   (racha de 3 = 10 + 5 + 5). Premia la regularidad y da narrativa («¡va on fire!»).
   **Opción B**: sin rachas, tabla plana. Más simple y más legible.
2. **¿Puntos negativos?** —
   **Opción A (recomendada)**: no, el suelo es 0 (perder ya duele; los negativos
   frustran a quien va último).
   **Opción B**: pasarse = −5 (castiga la avaricia; combina con La Muerte invertida).
3. **Récords en solitario** —
   Guardar en `localStorage` el **récord de puntos por nº de rondas** (p. ej.
   «mejor partida a 8 rondas: 95 pts»), y mostrarlo en la pantalla de fin. Es lo
   que hace que el Arcade en solitario tenga objetivo. (Aquí no veo opciones: es
   barato y necesario para el requisito de «que tenga sentido jugarlo tú solo».)

---

## 8. Modo fiesta (capa opcional de tragos)

Interruptor en la configuración del Arcade: **«Modo fiesta 🍻»**. No cambia
ninguna regla de blackjack ni de puntos: **añade consecuencias** encima, para
que el juego siga funcionando idéntico en solitario o sin alcohol.

Propuesta de capa (todo placeholder, al estilo Cartas de la Fortuna):

- **Pasarse (bust)** → bebe 1 trago.
- **Perder contra blackjack del dealer** → beben todos los que perdieron esa ronda.
- **Blackjack natural** → repartes 3 tragos.
- **Último del ranking al final de cada ronda** → bebe 1.
- Los arcanos `[F]` añaden su línea extra de tragos solo con el modo activado
  (p. ej. El Diablo normal: «…y además le reparte 2 tragos»).

**Decisión**: ¿la capa de tragos se define **dentro de cada efecto** (campo
`fiesta` en el dato del arcano/resultado) o como **tabla aparte**? Recomiendo
**campo `fiesta` opcional en los propios datos** (`data/blackjack/…`): así el
código solo mira «¿modo fiesta y el dato tiene texto fiesta? → muéstralo», sin
lógica repartida.

---

## 9. Resumen de mis recomendaciones (si tuviera que decidir yo)

1. Nombre: **21 Arcanos**.
2. Reglas: núcleo + doblar; 1 mazo con rebarajado.
3. Clásico: banca persistente de 100, pago 3:2, récord de banca máxima, sin tarot.
4. Arcade v1: **Idea A (Asalto a la Banca)** con rondas fijas configurables,
   dealer compartido por ronda y mazo visible; Ideas B y C como ampliaciones.
5. Tarot: 3 arcanos revelados al inicio como reglas de mesa (Opción A), pool de
   12 con normal/invertida, dirigidos solo con 2+ jugadores.
6. Puntos: tabla base + rachas, sin negativos, récord solo en `localStorage`.
7. Modo fiesta como interruptor, textos de tragos dentro de los datos.

---

## 10. Preguntas abiertas (para decidir antes del plan por fases)

1. ¿Nombre del juego? (sección 2)
2. ¿Qué idea(s) del Arcade entran en la v1? ¿Solo la A, o A + interruptor de
   equipos (C) desde el principio?
3. ¿Nº máximo de jugadores en Arcade? (el resto de FIEsta usa 10; con manos de
   blackjack por cabeza, 6–8 puede ser mejor ritmo por ronda).
4. ¿Cuántas rondas por defecto y qué rango configurable? (propuesta: 8, rango 5–15).
5. De la tabla de arcanos: ¿cuáles te gustan, cuáles fuera, cuáles se te ocurren?
   (los textos finales los escribes tú, como los efectos de Cartas de la Fortuna).
6. ¿Split/surrender/seguro quedan descartados para siempre o «fase de pulido»?

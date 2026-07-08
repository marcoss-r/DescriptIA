# Propuestas — «La Ciudad Duerme» 🏙️

> **Qué es este documento:** una batería de **propuestas** para el cuarto juego de
> FIEsta, una parodia de *El Pueblo Duerme* (los hombres lobo) con **temática de
> vivienda**. Aquí no hay nada decidido salvo el concepto base: léelo, marca lo
> que te guste, tacha lo que no, y con tus decisiones se escribirá el
> `PLAN_LA_CIUDAD_DUERME.md` de desarrollo por fases.

---

## 1. Concepto base (lo que ya has decidido)

- Parodia de *El Pueblo Duerme* → **«La Ciudad Duerme»**.
- Los lobos son **Fondos Buitre**.
- Temática de crisis de la vivienda: plataformas de alquiler vacacional,
  Hacienda, especulación…
- La app hace de **narrador** (un solo móvil, como el resto de juegos de FIEsta).

**Reskin del vocabulario clásico:**

| Clásico | Parodia propuesta |
|---|---|
| El pueblo | El barrio / la ciudad |
| Los lobos matan a un aldeano | Los fondos buitre **desahucian** a un vecino |
| Morir | Ser **desahuciado** (te vas del barrio, dejas de jugar) |
| El linchamiento del día | La **asamblea de vecinos** vota **expulsar del barrio** a un sospechoso de especular |
| La noche | «La ciudad duerme…» |

---

## 2. Bandos y condiciones de victoria

**Propuesta base (calcada del original, funciona seguro):**
- 🏦 **Fondos Buitre**: ganan si igualan o superan en número a los vecinos.
- 🏘️ **Vecinos**: ganan si expulsan a todos los fondos buitre.
- (Opcional) Roles independientes con su propia condición (ver Influencer, §3.8).

**Variante temática (más arriesgada, decide si te apetece):**
- En vez de «morir», los desahuciados pasan a ser **turistas**: siguen sentados
  pero solo pueden hacer ruido, no votar. El barrio pierde si hay más turistas
  que vecinos («el barrio se ha gentrificado»). Mismo cálculo, mejor sabor.

---

## 3. Catálogo de roles propuestos

> Marca los que quieras para la v1. Recomendación: para empezar, **4–5 roles**
> (buitres + 2–3 especiales) y el resto vecinos rasos. Cuantos más roles, más
> pantallas nocturnas hay que programar.

### 3.1 🏦 Fondo Buitre (el lobo) — imprescindible
Cada noche los buitres despiertan, se reconocen entre ellos y eligen a un vecino
al que **desahuciar** («hemos comprado tu bloque»).

### 3.2 🧾 Hacienda (la vidente) — muy recomendado
Cada noche **inspecciona** a un jugador y la app le revela si es fondo buitre o
no («sus cuentas están en Luxemburgo» / «declara hasta el trastero»).

### 3.3 ✊ El Sindicato de Vivienda (el protector/guarda) — muy recomendado
Cada noche elige a un vecino y **para su desahucio** esa noche (convoca una
concentración en el portal). Decidir: ¿puede protegerse a sí mismo? ¿puede
repetir objetivo dos noches seguidas? (clásico: no repetir).

### 3.4 🧳 La Plataforma de Alquiler Vacacional (rol nuevo, el más paródico)
Juega **con los buitres** (gana con ellos) pero con poder propio. Opciones de
mecánica — elige una:
- **(a) Pisoturista:** cada noche convierte la casa de un jugador en piso
  turístico: ese jugador **no vota** en la asamblea del día siguiente (está
  buscando dónde dormir). Molesto pero no letal.
- **(b) Blanqueo:** una vez por partida hace que un buitre dé resultado
  «inocente» si Hacienda lo inspecciona esa noche.
- **(c) Comisión:** no despierta con los buitres ni los conoce, pero gana si
  ganan ellos (como el «traidor» clásico). El más fácil de programar.

### 3.5 👵 La Abuela de Renta Antigua (la bruja)
Tiene **dos cartas de un solo uso** en toda la partida:
- **Contrato indefinido de renta antigua**: salva al desahuciado de esa noche.
- **Subida del alquiler del 300 %**: desahucia ella a quien quiera.
La app le enseña por la noche quién ha sido desahuciado y le ofrece usar (o no)
cada carta.

### 3.6 🛠️ El Okupa (variante del «duro de matar»)
La **primera vez** que los buitres lo desahucian, **no cae**: okupa el bloque y
sigue jugando (se anuncia por la mañana: «lo intentaron, pero sigue dentro»).
La segunda vez ya no hay milagro.

### 3.7 🏗️ El Tasador (el cazador)
Si es desahuciado (de noche o por la asamblea), **se lleva a alguien por
delante**: declara ruina el edificio de otro jugador y cae con él.

### 3.8 📱 El Influencer Inmobiliario (el bufón) — rol independiente
Va por libre: **gana la partida si consigue que la asamblea lo expulse** (quiere
el drama para su canal: «ME ECHAN DE MI BARRIO *(not clickbait)*»). Si lo
desahucian los buitres de noche, no gana. Barato de programar y muy divertido.

### 3.9 🏛️ El Concejal de Urbanismo (el alcalde)
Se elige por votación al principio (o al azar). Su voto en la asamblea **vale
doble** y desempata. Versión paródica: puede una vez por partida **recalificar**
(anular la expulsión del día). Ojo: mucho poder, quizá para una v2.

### 3.10 🤝 La Inmobiliaria «Buscamos Compañero de Piso» (el cupido)
La primera noche empareja a dos jugadores como **compañeros de piso**: si
desahucian a uno, el otro se va con él (no puede pagar el alquiler solo). Si
empareja a un vecino con un buitre, ese dúo gana solo si quedan ellos dos.
Bonito, pero añade bastante lógica; candidato a v2.

### 3.11 🏘️ Vecinos rasos (los aldeanos)
Sin poderes. Para darles sabor, cada uno recibe una **identidad decorativa**
aleatoria: «la del 4º con el carrito de la compra», «el del bajo que arregla
bicis», «la estudiante con tres compañeros de piso», «el jubilado del ático»…
Solo texto, cero lógica extra.

---

## 4. Mecánica de la app (un solo móvil)

El reto: en el original hay un narrador humano; aquí **la app narra**, y la
información secreta se gestiona **pasando el móvil**.

**Fase 0 — Reparto de roles:** el móvil va pasando de mano en mano; cada jugador
pulsa «Ver mi rol», lo lee en privado (pantalla tipo «toca y mantén para
revelar»), pulsa «Ocultar» y lo pasa. Patrón parecido al handoff de La Ruleta.

**Fase de noche («La ciudad duerme»):** todos cierran los ojos. La app va
mostrando pantallas por rol, en orden fijo (p. ej. Buitres → Hacienda →
Sindicato → Abuela). Dos opciones de manejo — decide:
- **(a) El móvil en el centro:** la app muestra «Buitres, abrid los ojos» en
  grande; los buitres abren los ojos, tocan en silencio a su víctima en una
  lista de nombres, y la app pasa al siguiente rol. Los demás, ojos cerrados.
  *Riesgo:* se oye dónde tocas; se mitiga barajando la posición de los nombres.
- **(b) El móvil circula a ciegas:** el móvil pasa por TODOS los jugadores en
  cada fase nocturna; quien no es el rol activo ve una pantalla de espera y
  pulsa «Pasar» (así nadie sabe quién actuó). Más seguro, mucho más lento.
  
  Recomendación: **(a)** con nombres en posición aleatoria.

**Fase de día:** la app anuncia el resultado de la noche con texto paródico
(«El barrio amanece con un local convertido en *brunch artesanal*: NOMBRE ha
sido desahuciado»). Debate libre **sin la app** (o con temporizador opcional),
y luego votación de la asamblea en el móvil: se puede votar a mano alzada y que
alguien meta el resultado, o votar por turnos en el móvil. Recomendación v1:
**a mano alzada**, y en la app solo se selecciona al expulsado (o «nadie»).

**Muertos/desahuciados:** la app mantiene la lista y ya no los ofrece como
objetivo ni les da turno.

---

## 5. Textos y tono (el 50 % de la gracia)

Toda la narración de la app en clave de sátira. Ejemplos de línea editorial:

- Noche: «La ciudad duerme. Los fondos buitre revisan sus carteras…»
- Desahucio: «NOMBRE ha encontrado un burofax en su puerta. El piso ya está en
  una web con fotos de gran angular por 1.400 €/mes.»
- Salvación del Sindicato: «Esta noche había una cacerolada en el portal de
  NOMBRE. Los buitres no se han atrevido a entrar.»
- Inspección de Hacienda: «Hemos revisado sus movimientos: 47 transferencias a
  una SICAV. Es un fondo buitre.» / «Todo en regla. Hasta guarda las facturas
  del butano.»
- Expulsión de la asamblea: «La asamblea ha decidido: NOMBRE, devuelve las
  llaves. Todas.»

Decidir: ¿textos fijos o varias variantes aleatorias por evento? (variantes =
más gracia a la segunda partida, solo cuesta escribirlas).

---

## 6. Preguntas para cerrar antes del plan de desarrollo

1. **Nº de jugadores:** propuesta 5–12 (con menos de 5, el social deduction no
   funciona). ¿Rango final?
2. **Roles de la v1:** propuesta mínima → Buitres (1–3 según nº de jugadores) +
   Hacienda + Sindicato + vecinos rasos. ¿Añadimos ya Plataforma Vacacional,
   Abuela, Okupa o Influencer?
3. **Plataforma Vacacional:** ¿mecánica (a), (b) o (c) del §3.4?
4. **Desahuciados:** ¿eliminados clásicos o «turistas» que siguen en la mesa (§2)?
5. **Noche:** ¿móvil en el centro (a) o circulando (b) (§4)?
6. **Votación del día:** ¿a mano alzada + registrar resultado, o voto por turnos
   en el móvil?
7. **Temporizador de debate:** ¿sí (2–3 min configurables) o debate libre?
8. **Nombre final:** «La Ciudad Duerme» ¿te vale, o buscamos algo más paródico?
   (ideas: «El Barrio Duerme», «Se Vende», «Zona Tensionada»).
9. **Arte:** ¿mini-sprites pixel art por rol como en Cartas de la Fortuna
   (script Python que los genera), o iconos SVG simples?

---

*Cuando decidas, con este documento se redacta el plan por fases
(`PLAN_LA_CIUDAD_DUERME.md`) siguiendo la metodología habitual: esqueleto +
TODOs de aprendizaje.* 🗺️

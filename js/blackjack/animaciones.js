// 21 Arcanos — Fase 9.1: volteo de cartas, compartido por clasico.js y arcade.js.
//
// Antes cada mesa hacía aparecer sus cartas con la misma animación de "entrada"
// (fundido + traslación) tanto para repartir como para revelar, repintando la mano
// entera de golpe en cada acción. Aquí vive una única coreografía de reparto:
//
//   1. la carta aparece primero como REVERSO, al lado de las demás (entrada suave);
//   2. tras una pausa, se VOLTEA en el sitio: gira de canto y, en el punto en que
//      queda de perfil (ancho 0), se le cambia la imagen al frente y termina de
//      abrirse mostrando ya su cara.
//
// Un solo giro por carta (sin "medio giro" de entrada + giro de revelado, que era
// lo que hacía que la oculta del dealer pareciese girar de más). Casos:
//   - repartir varias cartas: cada una con un retardo escalonado (cascada);
//   - carta que queda boca abajo (oculta del dealer): solo aparece el reverso, sin
//     voltearse todavía;
//   - revelar una carta ya pintada boca abajo (la oculta al resolver): se voltea en
//     el sitio, sin volver a "entrar".
// Para el dealer del Clásico se anima además SOLO lo que cambió desde el último
// repintado (no la mano entera en cada acción del jugador).
//
// Usa bjCrearCartaImg/bjImagenCarta (clasico.js/motor.js), ya cargados antes.

const BJ_REVERSO_ENTRA_MS = 240;  // el reverso aparece antes de empezar a voltearse
const BJ_VOLTEO_MS = 520;         // duración del volteo (reverso → canto → frente)
const BJ_VOLTEO_ESCALON_MS = 300; // retardo entre cartas repartidas/reveladas en cascada

// Crea el <img> de una carta que ENTRA mostrando primero el REVERSO (aparece junto a
// las demás) y, tras la pausa de entrada, se voltea para enseñar su frente. Si la
// carta debe quedarse boca abajo (`oculta`), solo aparece el reverso: no se voltea.
// `retardoMs` decala su aparición para repartir varias en cascada.
function bjCrearCartaVolteada(carta, oculta, retardoMs = 0) {
  const img = bjCrearCartaImg(carta, true); // SIEMPRE empieza mostrando el reverso
  img.classList.add("bj-reverso-entra");
  img.style.animationDelay = retardoMs + "ms";
  if (!oculta) {
    // Cuando el reverso ya ha aparecido, voltearla para revelar su frente.
    bjProgramarVolteo(img, carta, retardoMs + BJ_REVERSO_ENTRA_MS);
  }
  return img;
}

// Voltea EN EL SITIO una carta que ahora mismo muestra el reverso (p. ej. la oculta
// del dealer, ya pintada): tras `retardoMs`, gira de canto, cambia la imagen al
// frente en el punto de perfil y termina de abrirse mostrando ya la cara nueva.
function bjVoltearCartaEnSitio(img, carta, retardoMs = 0) {
  bjProgramarVolteo(img, carta, retardoMs);
}

// Núcleo del volteo: programa el giro de una carta que muestra el reverso. Cambia la
// imagen a mitad del giro (cuando la carta está de canto y no se ve) para que el
// cambio pase desapercibido. La clase `bj-volteo-revela` NO se quita al terminar: se
// deja fija (con fill both retiene el estado final = sin transformar). Quitarla haría
// que la carta recayese en la regla base `.bj-cartas img { animation: bj-carta-entra }`
// y el navegador reprodujese esa entrada otra vez (el "saltito" tras el volteo).
function bjProgramarVolteo(img, carta, retardoMs) {
  setTimeout(() => {
    img.style.animationDelay = "0ms";
    img.classList.remove("bj-reverso-entra");
    void img.offsetWidth; // fuerza un reflow para reiniciar la animación con fiabilidad
    img.classList.add("bj-volteo-revela");
    setTimeout(() => {
      img.src = bjImagenCarta(carta);
      img.alt = `${carta.valor} de ${carta.palo}`;
    }, BJ_VOLTEO_MS / 2);
  }, retardoMs);
}

// Pinta las cartas de `mano` dentro de `contenedor`, animando SOLO las que aún no se
// habían mostrado (`mano.mostradas`): la primera vez que se ve la mano, sus cartas
// entran con la animación simple (reparto inicial); cualquier carta añadida DESPUÉS
// (pedir, doblar, la 2.ª de una mano dividida) se revela con el volteo reverso→frente.
// Las cartas ya vistas se repintan SIN animación, para que no "salten" cada vez que se
// repinta la mano entera (que es lo que hacen las mesas en cada acción del jugador).
function bjPintarCartasMano(contenedor, mano) {
  const yaMostradas = mano.mostradas || 0;
  const esPrimeraVez = yaMostradas === 0;
  mano.cartas.forEach((carta, idx) => {
    if (idx < yaMostradas) {
      const img = bjCrearCartaImg(carta, false);
      img.classList.add("bj-sin-entrada"); // carta ya vista: no reanimar al repintar
      contenedor.appendChild(img);
    } else if (esPrimeraVez) {
      contenedor.appendChild(bjCrearCartaImg(carta, false)); // reparto inicial: entrada simple
    } else {
      contenedor.appendChild(
        bjCrearCartaVolteada(carta, false, (idx - yaMostradas) * BJ_VOLTEO_ESCALON_MS)
      );
    }
  });
  mano.mostradas = mano.cartas.length;
}

// Pinta la mano del dealer en `contenedorId`, animando SOLO lo que cambió desde el
// último repintado de esa mesa (identificada por `clave`, una por mesa que la use):
// si no ha cambiado nada, no toca el DOM; si se ha revelado la oculta y/o el dealer
// ha robado, anima justo eso. Si el estado no encaja con ningún caso conocido (p.
// ej. empieza una mano nueva más corta que la anterior), repinta todo desde cero
// con reparto escalonado.
const BJ_ESTADO_DEALER_ANIMADO = {};

function bjRenderDealerAnimado(contenedorId, mano, oculta, clave) {
  const cont = document.getElementById(contenedorId);
  const previo = BJ_ESTADO_DEALER_ANIMADO[clave];

  const repintarTodo = () => {
    cont.innerHTML = "";
    mano.forEach((carta, indice) => {
      const tapada = oculta && indice === mano.length - 1;
      cont.appendChild(bjCrearCartaVolteada(carta, tapada, indice * BJ_VOLTEO_ESCALON_MS));
    });
  };

  if (!previo || mano.length < previo.len || cont.children.length !== previo.len) {
    repintarTodo();
  } else if (mano.length === previo.len && oculta === previo.oculta) {
    // Nada ha cambiado: no se repinta (evita repetir el volteo en cada acción del
    // jugador que no afecta al dealer, p. ej. pedir carta con la propia mano).
  } else if (previo.oculta && !oculta) {
    // La oculta se acaba de revelar. Si además el dealer ha robado (mismo golpe:
    // revela y juega su turno), esas cartas nuevas se reparten cuando acabe el giro.
    const imgOculta = cont.children[previo.len - 1];
    const cartaOculta = mano[previo.len - 1];
    let retardo = 0;
    if (imgOculta) {
      bjVoltearCartaEnSitio(imgOculta, cartaOculta, 0);
      retardo = BJ_VOLTEO_MS; // esperar a que termine el volteo antes de repartir más
    }
    for (let i = previo.len; i < mano.length; i++) {
      cont.appendChild(bjCrearCartaVolteada(mano[i], false, retardo));
      retardo += BJ_VOLTEO_ESCALON_MS;
    }
  } else if (mano.length > previo.len) {
    // El dealer ha robado sin cambiar la ocultación: reparte solo las cartas nuevas.
    let retardo = 0;
    for (let i = previo.len; i < mano.length; i++) {
      const tapada = oculta && i === mano.length - 1;
      cont.appendChild(bjCrearCartaVolteada(mano[i], tapada, retardo));
      retardo += BJ_VOLTEO_ESCALON_MS;
    }
  } else {
    // Cualquier otro caso no contemplado (p. ej. la ocultación cambia al revés):
    // repinta todo para no dejar la mesa en un estado a medias.
    repintarTodo();
  }

  BJ_ESTADO_DEALER_ANIMADO[clave] = { len: mano.length, oculta };
}

// Olvida el rastro de una mesa (al entrar de nuevo en el modo): así la próxima mano
// se reparte desde cero en vez de compararse con la sesión anterior.
function bjOlvidarDealerAnimado(clave) {
  delete BJ_ESTADO_DEALER_ANIMADO[clave];
}

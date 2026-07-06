// Núcleo: utilidades compartidas por todos los juegos.

// Fisher–Yates: devuelve una COPIA de la lista en orden aleatorio (no muta el original).
function barajar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

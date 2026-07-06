// Gestión de pantallas: mostrar/ocultar secciones con la clase "activa".

function mostrarPantalla(nombre) {
  const pantallas = document.querySelectorAll(".pantalla");
  pantallas.forEach((pantalla) => {
    pantalla.classList.toggle("activa", pantalla.dataset.pantalla === nombre);
  });
}

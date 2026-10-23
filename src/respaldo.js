// Respaldo local del editor (por navegador): si se cierra la pestaña sin guardar, se ofrece recuperarlo.
// Es una red de seguridad; la fuente de verdad son los .md en disco.
const clave = (id) => `stacknotes.respaldo.${id}`;

export function leerRespaldo(id) {
  try {
    return JSON.parse(localStorage.getItem(clave(id)));
  } catch {
    return null;
  }
}

export function guardarRespaldo(id, form) {
  try {
    localStorage.setItem(clave(id), JSON.stringify({ form, guardadoEn: new Date().toISOString() }));
  } catch {
    // sin storage (modo privado / cuota): no hay respaldo, el editor sigue funcionando
  }
}

export function borrarRespaldo(id) {
  try {
    localStorage.removeItem(clave(id));
  } catch {
    // idem
  }
}

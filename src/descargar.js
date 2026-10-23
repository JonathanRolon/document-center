import { serializar } from '../lib/front-matter.js';

// Descarga un texto como archivo en el navegador
export function descargarArchivo(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}

// La nota tal como está en notas/<slug>.md (front matter + cuerpo)
export function descargarMarkdown(nota) {
  descargarArchivo(`${nota.slug}.md`, serializar(nota), 'text/markdown;charset=utf-8');
}

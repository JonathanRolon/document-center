// Chequeos antes de subir el build a gh-pages (el repo y el sitio son públicos).
// Puro: recibe la lista de archivos ya leída y devuelve los problemas encontrados.

// Archivos que nunca se publican, por nombre o carpeta
const RUTAS_PROHIBIDAS = [
  { re: /(^|\/)borradores(\/|$)/i, motivo: 'borrador' },
  { re: /(^|\/)\.env(\.|$)/i, motivo: 'archivo .env' },
  { re: /(^|\/)default-env[^/]*$/i, motivo: 'default-env (credenciales de servicios)' },
  { re: /\.(pem|key|p12|pfx|jks|keystore)$/i, motivo: 'clave o certificado' },
  { re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i, motivo: 'clave SSH' },
  { re: /(^|\/)\.git(\/|$)/, motivo: 'carpeta .git' }
];

// Valores de ejemplo que no cuentan como credencial: <tu-secreto>, xxxx, ****, ${VAR}
const ES_EJEMPLO = /^(<.*>|\$\{.*\}|[x*.]+|\.\.\.|tu[-_].*|your[-_].*|changeme|example)$/i;

// Patrones de credenciales en el contenido. `valor` (opcional) = grupo a comparar con ES_EJEMPLO.
const PATRONES = [
  { nombre: 'clave privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nombre: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { nombre: 'token de GitHub', re: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/ },
  { nombre: 'token de Slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { nombre: 'clave de Google API', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { nombre: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  {
    // clientsecret de XSUAA / service keys de BTP, password/secret/apikey asignados en JSON o config.
    // \\? : dentro de los JSON del build las comillas del cuerpo de la nota quedan escapadas (\")
    nombre: 'secreto asignado',
    re: /\b(client_?secret|password|passwd|secret|api_?key|access_?token)\b(?:\\?["'])?\s*[:=]\s*\\?["']([^"'\s\\]{8,})\\?["']/i,
    valor: 2
  }
];

// "x\ny\nz", índice → número de línea (1-based)
const lineaDe = (texto, indice) => texto.slice(0, indice).split('\n').length;

// archivos: [{ ruta, contenido? }]  (ruta relativa con "/"; contenido solo para archivos de texto)
// → [{ ruta, linea?, motivo }]
export function revisarArchivos(archivos) {
  const problemas = [];
  for (const { ruta, contenido } of archivos) {
    for (const { re, motivo } of RUTAS_PROHIBIDAS) {
      if (re.test(ruta)) problemas.push({ ruta, motivo });
    }
    if (typeof contenido !== 'string') continue;
    for (const { nombre, re, valor } of PATRONES) {
      const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      for (const m of contenido.matchAll(global)) {
        if (valor && ES_EJEMPLO.test(m[valor])) continue;
        problemas.push({ ruta, linea: lineaDe(contenido, m.index), motivo: `posible ${nombre}` });
        break; // uno por patrón y archivo alcanza para frenar
      }
    }
  }
  return problemas;
}

// Notas que se van a publicar vs. borradores locales.
// publicadas: [{ slug, publicado }], slugsBorradores: Set → problemas
export function revisarNotas(publicadas, slugsBorradores) {
  const problemas = [];
  for (const n of publicadas) {
    if (!n.publicado) problemas.push({ ruta: `notas/${n.slug}.md`, motivo: 'nota sin fecha "publicado"' });
    if (slugsBorradores.has(n.slug)) {
      problemas.push({ ruta: `notas/${n.slug}.md`, motivo: 'existe también en borradores/ (¿se publicó un borrador a medias?)' });
    }
  }
  return problemas;
}

export const formatearProblema = ({ ruta, linea, motivo }) => `  ✗ ${ruta}${linea ? `:${linea}` : ''}: ${motivo}`;

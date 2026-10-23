// Detecta links de YouTube para embeberlos. Solo se aceptan estos hosts (no se embebe cualquier sitio).
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']);
const ID_VALIDO = /^[A-Za-z0-9_-]{11}$/;

// "90", "90s", "1m30s", "1h2m3s" → segundos
function segundos(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

// → { id, inicio } o null si no es un video de YouTube válido
export function extraerYoutube(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return null;

  let id = null;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (url.pathname === '/watch') id = url.searchParams.get('v');
  else id = /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null;

  if (!id || !ID_VALIDO.test(id)) return null;
  return { id, inicio: segundos(url.searchParams.get('t') ?? url.searchParams.get('start')) };
}

export const urlEmbed = ({ id, inicio }) =>
  `https://www.youtube-nocookie.com/embed/${id}${inicio ? `?start=${inicio}` : ''}`;

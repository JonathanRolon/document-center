import { Children, isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import CodeBlock from './CodeBlock.jsx';
import VideoYoutube from './VideoYoutube.jsx';
import { extraerYoutube } from '../youtube.js';

// remark-gfm: tablas, tachado, listas de tareas y autolinks (GitHub Flavored Markdown)
// rehype-slug: ids en los títulos, para el índice de la nota
// react-markdown no renderiza HTML embebido por defecto: seguro para contenido de usuarios
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSlug];

// Párrafo que es solo un link de YouTube → { video, href }; si no, null
function linkYoutubeSolo(node) {
  const hijos = node?.children?.filter((h) => !(h.type === 'text' && !h.value.trim())) ?? [];
  const href = hijos.length === 1 && hijos[0].tagName === 'a' ? hijos[0].properties?.href : null;
  const video = href ? extraerYoutube(href) : null;
  return video ? { video, href } : null;
}

// Texto plano de unos hijos de React (también dentro de `code`, énfasis, etc.)
function textoDe(nodos) {
  return Children.toArray(nodos)
    .map((n) => (isValidElement(n) ? textoDe(n.props.children) : String(n)))
    .join('');
}

// Cita que empieza con "💡 **Título.** texto" → aclaración plegable (<details>), cerrada por defecto.
// Si la cita no tiene ese formato, queda como cita normal.
function Aclaracion({ children }) {
  const hijos = Children.toArray(children);
  const i = hijos.findIndex((h) => isValidElement(h));
  const parrafo = hijos[i];
  const partes = parrafo ? Children.toArray(parrafo.props.children) : [];
  const [marca, titulo] = partes;
  const esAclaracion =
    typeof marca === 'string' && marca.trim() === '💡' && isValidElement(titulo) && titulo.type === 'strong';
  if (!esAclaracion) return <blockquote>{children}</blockquote>;

  const texto = textoDe(titulo.props.children).replace(/\.\s*$/, '');
  const resto = partes.slice(2);
  if (typeof resto[0] === 'string') resto[0] = resto[0].replace(/^\s+/, '');
  return (
    <details className="aclaracion">
      <summary>
        <span aria-hidden="true">💡</span> {texto}
      </summary>
      <div className="aclaracion-cuerpo">
        {resto.length > 0 && <p>{resto}</p>}
        {hijos.slice(i + 1)}
      </div>
    </details>
  );
}

const components = {
  blockquote: Aclaracion,

  // un link de YouTube solo en su línea se embebe; un link dentro de un texto queda como link
  p({ node, children }) {
    const yt = linkYoutubeSolo(node);
    return yt ? <VideoYoutube video={yt.video} href={yt.href} /> : <p>{children}</p>;
  },

  // bloques ``` → CodeBlock; el `code` inline queda como está
  pre({ children }) {
    const { className = '', children: texto = '' } = children?.props ?? {};
    const lenguaje = /language-([\w-]+)/.exec(className)?.[1];
    return <CodeBlock lenguaje={lenguaje} codigo={String(texto).replace(/\n$/, '')} />;
  }
};

export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {children ?? ''}
      </ReactMarkdown>
    </div>
  );
}

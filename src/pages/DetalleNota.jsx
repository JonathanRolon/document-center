import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EDITOR, NoEncontrada, obtenerNota, pedir } from '../fuente.js';
import { useNotas } from '../notas.js';
import EstadoBadge from '../components/EstadoBadge.jsx';
import Markdown from '../components/Markdown.jsx';
import Indice from '../components/Indice.jsx';
import Tags from '../components/Tags.jsx';
import { formatearFecha } from '../fechas.js';
import { descargarMarkdown } from '../descargar.js';

// El historial de cada nota es el de git
const historialEnGithub = (slug) => `https://github.com/JonathanRolon/document-center/commits/main/notas/${slug}.md`;

export default function DetalleNota() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const notas = useNotas();
  const [estado, setEstado] = useState({ nota: null, error: null });
  const [errorAccion, setErrorAccion] = useState(null);
  const cuerpoRef = useRef(null);
  const n = estado.nota;

  useEffect(() => {
    let cancelado = false;
    setEstado({ nota: null, error: null });
    obtenerNota(slug)
      .then((nota) => !cancelado && setEstado({ nota, error: null }))
      .catch((e) => !cancelado && setEstado({ nota: null, error: e }));
    return () => { cancelado = true; };
  }, [slug]);

  async function accion(fn) {
    setErrorAccion(null);
    try {
      await fn();
    } catch (e) {
      setErrorAccion(e.message);
    }
  }

  const cambiarEstado = (paso) => accion(async () => {
    setEstado({ nota: await pedir(`api/notas/${slug}/${paso}`, { method: 'POST' }), error: null });
    notas.recargar();
  });

  const eliminar = () => accion(async () => {
    if (!window.confirm(`¿Eliminar "${n.titulo}"? Si estaba publicada, queda en el historial de git.`)) return;
    await pedir(`api/notas/${slug}`, { method: 'DELETE' });
    notas.recargar();
    navigate('/');
  });

  if (estado.error) {
    return (
      <p className="pagina error">
        {estado.error instanceof NoEncontrada ? 'Nota no encontrada.' : `Error: ${estado.error.message}`} <Link to="/">Volver</Link>
      </p>
    );
  }
  if (!n) return <p className="pagina">Cargando…</p>;

  return (
    <div className="nota-layout">
      <article className="nota">
        <div className="titulo-pagina">
          <h1>{n.titulo}</h1>
          {EDITOR && <EstadoBadge borrador={n.borrador} />}
        </div>
        {n.resumen && <p className="resumen">{n.resumen}</p>}
        <Tags tags={n.tags} />

        <div className="acciones">
          {EDITOR && (
            <>
              <Link className="boton" to={`/notas/${slug}/editar`}>Editar</Link>
              {n.borrador
                ? <button className="boton primario" onClick={() => cambiarEstado('publicar')}>Publicar</button>
                : <button className="boton" onClick={() => cambiarEstado('despublicar')}>Despublicar</button>}
              <button className="boton peligro" onClick={eliminar}>Eliminar</button>
              <span className="separador" />
            </>
          )}
          <button className="boton" onClick={() => window.print()} title="Elegí 'Guardar como PDF' en el diálogo">Exportar PDF</button>
          <button className="boton" onClick={() => descargarMarkdown(n)}>Descargar .md</button>
        </div>
        {errorAccion && <p className="error">Error: {errorAccion}</p>}

        <div ref={cuerpoRef}>
          <Markdown>{n.cuerpo}</Markdown>
        </div>

        <footer className="meta pie-nota">
          {n.publicado ? `Publicado el ${formatearFecha(n.publicado)}` : 'Borrador'}
          {n.creado && <> · Creado el {formatearFecha(n.creado)}</>}
          {!n.borrador && <> · <a href={historialEnGithub(slug)} target="_blank" rel="noreferrer">Historial</a></>}
        </footer>
      </article>
      <Indice contenedor={cuerpoRef} version={n.cuerpo} />
    </div>
  );
}

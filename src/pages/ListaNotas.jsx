import { Link } from 'react-router';
import { EDITOR } from '../fuente.js';
import { useNotas } from '../notas.js';
import EstadoBadge from '../components/EstadoBadge.jsx';
import Tags from '../components/Tags.jsx';
import { formatearFecha } from '../fechas.js';

function DescripcionFiltros({ filtros, setFiltros, cantidad }) {
  const partes = [];
  if (filtros.q.trim()) partes.push(`"${filtros.q.trim()}"`);
  if (filtros.tag) partes.push(`#${filtros.tag}`);
  return (
    <p className="filtros-activos">
      {cantidad ?? '…'} {cantidad === 1 ? 'resultado' : 'resultados'} para {partes.join(' en ')}
      <button type="button" className="boton" onClick={() => setFiltros({ q: '', tag: '' })}>Limpiar filtros</button>
    </p>
  );
}

export default function ListaNotas() {
  const { data, error, cargando, filtros, setFiltros, hayFiltros } = useNotas();

  return (
    <div className="pagina">
      <div className="titulo-pagina">
        <h1>Notas</h1>
        {EDITOR && <Link className="boton primario" to="/nueva">Nueva nota</Link>}
      </div>

      {hayFiltros && <DescripcionFiltros filtros={filtros} setFiltros={setFiltros} cantidad={data?.length} />}
      {cargando && !data && <p>Cargando…</p>}
      {error && <p className="error">Error: {error}</p>}
      {data?.length === 0 && !hayFiltros && (
        <p>Todavía no hay notas{EDITOR ? '. Creá la primera.' : ' publicadas.'}</p>
      )}

      <ul className="grilla">
        {data?.map((n) => (
          <li key={n.slug}>
            <Link to={`/notas/${n.slug}`} className="tarjeta">
              <span className="tarjeta-titulo">{n.titulo}</span>
              {n.resumen && <p>{n.resumen}</p>}
              <Tags tags={n.tags} estaticos />
              <span className="tarjeta-pie">
                <small>{formatearFecha(n.publicado ?? n.creado)}</small>
                {EDITOR && <EstadoBadge borrador={n.borrador} />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link, NavLink, useNavigate } from 'react-router';
import { EDITOR } from '../fuente.js';
import { useNotas } from '../notas.js';
import MenuAjustes from './MenuAjustes.jsx';

export default function Sidebar() {
  const { data: notas, error, tags, filtros, setFiltros } = useNotas();
  const navigate = useNavigate();

  const elegirTag = (tag) => {
    setFiltros({ ...filtros, tag: filtros.tag === tag ? '' : tag });
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <Link to="/" className="marca">Stack Notes</Link>

      <input
        className="buscador"
        type="search"
        placeholder="Buscar en todo…"
        value={filtros.q}
        onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
      />
      {EDITOR && <Link className="boton primario ancho" to="/nueva">+ Nueva nota</Link>}

      {tags.length > 0 && (
        <section>
          <span className="etiqueta">Tags</span>
          <div className="nube-tags">
            {tags.map(({ tag, cantidad }) => (
              <button
                key={tag}
                type="button"
                className={`tag${filtros.tag === tag ? ' activo' : ''}`}
                onClick={() => elegirTag(tag)}
              >
                #{tag} <span className="cantidad">{cantidad}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="arbol">
        <span className="etiqueta">Notas</span>
        {error && <p className="error">{error}</p>}
        {notas?.map((n) => (
          <NavLink key={n.slug} to={`/notas/${n.slug}`} className="item-nota">
            <span className="item-titulo">{n.titulo}</span>
            {n.borrador && <span className="punto-borrador" title="Borrador" />}
          </NavLink>
        ))}
        {notas?.length === 0 && <p className="meta">{filtros.q || filtros.tag ? 'Sin resultados' : 'Sin notas'}</p>}
      </nav>

      <footer className="sidebar-pie">
        <div className="cuenta">
          <div className="cuenta-datos meta">{EDITOR ? 'Editor local' : 'Notas técnicas'}</div>
          <MenuAjustes />
        </div>
      </footer>
    </aside>
  );
}

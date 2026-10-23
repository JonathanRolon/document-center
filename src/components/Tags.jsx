import { useNavigate } from 'react-router';
import { useNotas } from '../notas.js';

// Tags clickeables: filtran la lista de notas y llevan al inicio.
// `estaticos` para usarlos dentro de un link (no se anidan elementos interactivos).
export default function Tags({ tags, estaticos = false }) {
  const { setFiltros } = useNotas();
  const navigate = useNavigate();
  if (!tags?.length) return null;

  const filtrar = (tag) => {
    setFiltros({ q: '', tag });
    navigate('/');
  };

  return (
    <span className="tags">
      {tags.map((t) => (estaticos
        ? <span key={t} className="tag">#{t}</span>
        : <button key={t} type="button" className="tag" onClick={() => filtrar(t)}>#{t}</button>))}
    </span>
  );
}

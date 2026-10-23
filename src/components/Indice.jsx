import { useEffect, useState } from 'react';

// Índice de la nota armado desde los h2/h3 ya renderizados (ids de rehype-slug).
// Usa scrollIntoView en lugar de href="#id" porque el HashRouter usa el hash para las rutas.
export default function Indice({ contenedor, version }) {
  const [titulos, setTitulos] = useState([]);
  const [activo, setActivo] = useState(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return undefined;
    const hs = [...el.querySelectorAll('h2[id], h3[id]')];
    setTitulos(hs.map((h) => ({ id: h.id, texto: h.textContent, nivel: h.tagName === 'H3' ? 3 : 2 })));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActivo(visible.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' }
    );
    hs.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [contenedor, version]);

  if (titulos.length < 2) return null;

  return (
    <nav className="indice" aria-label="Índice de la nota">
      <span className="etiqueta">En esta nota</span>
      {titulos.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`indice-item nivel-${t.nivel}${activo === t.id ? ' activo' : ''}`}
          onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' })}
        >
          {t.texto}
        </button>
      ))}
    </nav>
  );
}

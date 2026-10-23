import { FORMATOS } from '../markdown-formato.js';

export default function BarraMarkdown({ onAplicar }) {
  return (
    <div className="barra-markdown" role="toolbar" aria-label="Formato Markdown">
      {Object.entries(FORMATOS).map(([tipo, { etiqueta, ayuda }]) => (
        <button
          key={tipo}
          type="button"
          title={ayuda}
          aria-label={ayuda}
          // mousedown: evita que el textarea pierda la selección antes del click
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onAplicar(tipo)}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

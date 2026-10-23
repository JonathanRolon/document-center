import { useEffect, useRef, useState } from 'react';
import { TEMAS, useTema } from '../tema.js';

// Botón ⚙ con menú de temas. Se cierra con Escape o clic afuera.
export default function MenuAjustes() {
  const { tema, setTema } = useTema();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClic = (e) => !contenedor.current?.contains(e.target) && setAbierto(false);
    const alTeclear = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={contenedor}>
      <button
        type="button"
        className="boton-ajustes"
        aria-label="Ajustes"
        aria-haspopup="menu"
        aria-expanded={abierto}
        title="Ajustes"
        onClick={() => setAbierto(!abierto)}
      >
        ⚙
      </button>

      {abierto && (
        <div className="menu-ajustes" role="menu">
          <span className="etiqueta">Tema</span>
          {Object.entries(TEMAS).map(([clave, { nombre, muestra }]) => (
            <button
              key={clave}
              type="button"
              role="menuitemradio"
              aria-checked={tema === clave}
              className="menu-item"
              onClick={() => setTema(clave)}
            >
              <span className="muestra-tema" style={{ background: muestra }} />
              {nombre}
              {tema === clave && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

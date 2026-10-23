import { createContext, useContext, useEffect, useState } from 'react';

// Temas disponibles. `atributo` va en <html data-theme> (styles.css define cada paleta);
// `oscuro` decide el estilo del resaltado de código; `muestra` es el color del selector.
// Se recuerda por navegador (preferencia personal).
export const TEMAS = {
  sistema: { nombre: 'Sistema', atributo: null, muestra: 'linear-gradient(135deg, #ffffff 50%, #191919 50%)' },
  claro: { nombre: 'Claro', atributo: 'light', oscuro: false, muestra: '#ffffff' },
  oscuro: { nombre: 'Oscuro', atributo: 'dark', oscuro: true, muestra: '#191919' },
  sepia: { nombre: 'Sepia', atributo: 'sepia', oscuro: false, muestra: '#f4ecd8' },
  sap: { nombre: 'Estilo SAP Help', atributo: 'sap', oscuro: false, muestra: 'linear-gradient(135deg, #1d2d3e 50%, #0064d9 50%)' }
};

const CLAVE = 'stacknotes.tema';
// tema de quien entra por primera vez (o sin storage)
const POR_DEFECTO = 'sap';
const consulta = () => window.matchMedia('(prefers-color-scheme: dark)');

function leerGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado in TEMAS ? guardado : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
}

export function useTemaEstado() {
  const [tema, setTema] = useState(leerGuardado);
  const [sistemaOscuro, setSistemaOscuro] = useState(() => consulta().matches);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    const mq = consulta();
    const alCambiar = (e) => setSistemaOscuro(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  // al imprimir/exportar PDF todo va en claro (el resaltado de código usa estilos inline)
  useEffect(() => {
    const antes = () => setImprimiendo(true);
    const despues = () => setImprimiendo(false);
    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', despues);
    return () => {
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', despues);
    };
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    const { atributo } = TEMAS[tema];
    if (atributo) raiz.setAttribute('data-theme', atributo);
    else raiz.removeAttribute('data-theme');
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // sin storage (modo privado): el tema dura lo que la pestaña
    }
  }, [tema]);

  const oscuro = !imprimiendo && (tema === 'sistema' ? sistemaOscuro : TEMAS[tema].oscuro);
  return { tema, setTema, oscuro };
}

export const TemaContext = createContext({ tema: 'sistema', setTema: () => {}, oscuro: false });
export const useTema = () => useContext(TemaContext);

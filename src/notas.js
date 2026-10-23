import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { obtenerIndice } from './fuente.js';
import { filtrarNotas, contarTags, ordenarNotas } from '../lib/busqueda.js';

function useDemorado(valor, ms) {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return demorado;
}

// Índice de notas (se baja una vez) + filtros; la búsqueda corre en el navegador.
// Compartido por sidebar e inicio.
export function useNotasEstado() {
  const [indice, setIndice] = useState({ notas: null, error: null, cargando: true });
  const [filtros, setFiltros] = useState({ q: '', tag: '' });
  const q = useDemorado(filtros.q.trim(), 150);

  const recargar = useCallback(() => {
    setIndice((s) => ({ ...s, cargando: true }));
    obtenerIndice()
      .then((notas) => setIndice({ notas: ordenarNotas(notas), error: null, cargando: false }))
      .catch((e) => setIndice({ notas: null, error: e.message, cargando: false }));
  }, []);

  useEffect(recargar, [recargar]);

  const data = useMemo(
    () => indice.notas && filtrarNotas(indice.notas, { q, tag: filtros.tag }),
    [indice.notas, q, filtros.tag]
  );
  const tags = useMemo(() => contarTags(indice.notas ?? []), [indice.notas]);

  return {
    data,
    error: indice.error,
    cargando: indice.cargando,
    tags,
    filtros,
    setFiltros,
    hayFiltros: Boolean(q || filtros.tag),
    // después de crear/editar/borrar en el editor
    recargar
  };
}

export const NotasContext = createContext(null);
export const useNotas = () => useContext(NotasContext);

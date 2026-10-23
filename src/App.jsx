import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router';
import { EDITOR } from './fuente.js';
import { NotasContext, useNotasEstado } from './notas.js';
import { TemaContext, useTemaEstado } from './tema.js';
import Sidebar from './components/Sidebar.jsx';
import ListaNotas from './pages/ListaNotas.jsx';

// Markdown + resaltado de código pesan: se cargan recién al abrir una nota
const DetalleNota = lazy(() => import('./pages/DetalleNota.jsx'));
// solo existe en el editor local. La comparación va inline (no EDITOR) para que el build
// público la resuelva a false y descarte el import.
const EditarNota = import.meta.env.MODE === 'editor' ? lazy(() => import('./pages/EditarNota.jsx')) : null;

function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  // en mobile el sidebar es un panel: se cierra al navegar
  useEffect(() => setMenuAbierto(false), [location]);

  return (
    <div className={`app${menuAbierto ? ' menu-abierto' : ''}`}>
      <Sidebar />
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}
      <div className="principal">
        <button className="boton-menu" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">☰</button>
        <Suspense fallback={<p className="pagina">Cargando…</p>}>
          <Routes>
            <Route path="/" element={<ListaNotas />} />
            <Route path="/notas/:slug" element={<DetalleNota />} />
            {EditarNota && <Route path="/nueva" element={<EditarNota />} />}
            {EditarNota && <Route path="/notas/:slug/editar" element={<EditarNota />} />}
            <Route path="*" element={<p className="pagina">Página no encontrada. <Link to="/">Volver</Link></p>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

// HashRouter: GitHub Pages sirve estáticos, así los links profundos no dan 404
export default function App() {
  const tema = useTemaEstado();
  const notas = useNotasEstado();

  return (
    <TemaContext.Provider value={tema}>
      <NotasContext.Provider value={notas}>
        <HashRouter>
          <Layout />
        </HashRouter>
      </NotasContext.Provider>
    </TemaContext.Provider>
  );
}

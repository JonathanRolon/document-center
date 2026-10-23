import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { obtenerNota, pedir } from '../fuente.js';
import { useNotas } from '../notas.js';
import { FORMATOS, reemplazarEnTextarea } from '../markdown-formato.js';
import { leerRespaldo, guardarRespaldo, borrarRespaldo } from '../respaldo.js';
import { formatearFechaHora } from '../fechas.js';
import Markdown from '../components/Markdown.jsx';
import TagsInput from '../components/TagsInput.jsx';
import BarraMarkdown from '../components/BarraMarkdown.jsx';

const VACIO = { titulo: '', resumen: '', cuerpo: '', tags: [] };
const aForm = (c) => ({ titulo: c.titulo, resumen: c.resumen ?? '', cuerpo: c.cuerpo ?? '', tags: c.tags });
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Sirve para crear (/nueva) y editar (/notas/:slug/editar). Solo existe en el editor local.
export default function EditarNota() {
  const { slug: id } = useParams();
  const navigate = useNavigate();
  const notas = useNotas();
  const claveRespaldo = id ?? 'nueva';

  const [base, setBase] = useState(VACIO); // último estado guardado en disco
  const [form, setForm] = useState(VACIO);
  const [respaldo, setRespaldo] = useState(null); // respaldo local pendiente de recuperar/descartar
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [error, setError] = useState(null);
  const cuerpoRef = useRef(null);

  const sucio = !iguales(form, base);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    const inicial = id ? obtenerNota(id).then(aForm) : Promise.resolve(VACIO);
    inicial
      .then((datos) => {
        if (cancelado) return;
        setBase(datos);
        setForm(datos);
        const r = leerRespaldo(claveRespaldo);
        setRespaldo(r && !iguales(r.form, datos) ? r : null);
      })
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => { cancelado = true; };
  }, [id, claveRespaldo]);

  // Respaldo local mientras haya cambios sin guardar (no pisa uno pendiente de decidir)
  useEffect(() => {
    if (cargando || respaldo) return undefined;
    const t = setTimeout(() => (sucio ? guardarRespaldo(claveRespaldo, form) : borrarRespaldo(claveRespaldo)), 800);
    return () => clearTimeout(t);
  }, [form, sucio, claveRespaldo, cargando, respaldo]);

  // Aviso del navegador al cerrar o recargar con cambios sin guardar
  useEffect(() => {
    if (!sucio) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sucio]);

  async function guardar() {
    if (guardando) return;
    if (!form.titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }
    const enviado = form;
    setGuardando(true);
    setError(null);
    try {
      const c = id
        ? await pedir(`api/notas/${id}`, { method: 'PUT', body: enviado })
        : await pedir('api/notas', { method: 'POST', body: enviado });
      const datos = aForm(c);
      setBase(datos);
      // si se siguió escribiendo durante el guardado, no se pisa lo nuevo
      setForm((actual) => (iguales(actual, enviado) ? datos : actual));
      borrarRespaldo(claveRespaldo);
      setGuardadoEn(new Date().toISOString());
      notas.recargar();
      // nueva nota o borrador renombrado (el slug sigue al título): la URL cambia
      if (c.slug !== id) navigate(`/notas/${c.slug}/editar`, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  // Ctrl/Cmd+S guarda sin salir del editor
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  useEffect(() => {
    const alTeclear = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        guardarRef.current();
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  function aplicarFormato(tipo) {
    const ta = cuerpoRef.current;
    const resultado = FORMATOS[tipo].aplicar(form.cuerpo, ta.selectionStart, ta.selectionEnd);
    if (!reemplazarEnTextarea(ta, form.cuerpo, resultado)) {
      setForm((f) => ({ ...f, cuerpo: resultado.texto }));
      requestAnimationFrame(() => ta.setSelectionRange(resultado.inicio, resultado.fin));
    }
  }

  function atajosCuerpo(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const tipo = { b: 'negrita', i: 'cursiva' }[e.key.toLowerCase()];
    if (tipo) {
      e.preventDefault();
      aplicarFormato(tipo);
    }
  }

  if (cargando) return <p className="pagina">Cargando…</p>;

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  let estado = 'Sin cambios';
  if (guardando) estado = 'Guardando…';
  else if (sucio) estado = 'Cambios sin guardar';
  else if (guardadoEn) estado = `Guardado ${formatearFechaHora(guardadoEn)}`;

  return (
    <form className="formulario pagina ancha" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <div className="barra-editor">
        <Link to={id ? `/notas/${id}` : '/'}>← {id ? 'Ver nota' : 'Volver'}</Link>
        <span className={`estado-guardado${sucio ? ' sucio' : ''}`}>{estado}</span>
        <span className="barra-editor-acciones">
          <button className="boton primario" disabled={guardando} title="Ctrl+S">
            {id ? 'Guardar' : 'Guardar borrador'}
          </button>
        </span>
      </div>

      {respaldo && (
        <div className="aviso">
          Hay cambios sin guardar de este editor del {formatearFechaHora(respaldo.guardadoEn)}.
          <button type="button" className="boton" onClick={() => { setForm(respaldo.form); setRespaldo(null); }}>Recuperar</button>
          <button type="button" className="boton" onClick={() => { borrarRespaldo(claveRespaldo); setRespaldo(null); }}>Descartar</button>
        </div>
      )}
      {error && <p className="error">Error: {error}</p>}

      <input
        className="input-titulo"
        value={form.titulo}
        onChange={cambiar('titulo')}
        maxLength={200}
        placeholder="Título"
        aria-label="Título"
        required
      />
      <textarea
        className="input-resumen"
        value={form.resumen}
        onChange={cambiar('resumen')}
        maxLength={1000}
        rows={2}
        placeholder="Resumen (opcional)"
        aria-label="Resumen"
      />
      <div className="campo">
        <TagsInput
          value={form.tags}
          onChange={(tags) => setForm({ ...form, tags })}
          sugerencias={notas.tags.map((t) => t.tag)}
        />
      </div>

      <div className="editor">
        <div className="editor-columna">
          <BarraMarkdown onAplicar={aplicarFormato} />
          <textarea
            ref={cuerpoRef}
            value={form.cuerpo}
            onChange={cambiar('cuerpo')}
            onKeyDown={atajosCuerpo}
            rows={24}
            className="mono"
            aria-label="Cuerpo (Markdown)"
            placeholder="Escribí en Markdown…"
          />
        </div>
        <div className="editor-columna">
          <span className="etiqueta">Vista previa</span>
          <div className="preview"><Markdown>{form.cuerpo}</Markdown></div>
        </div>
      </div>
      {!id && <p className="meta">Se guarda como borrador en borradores/; publicalo desde la nota.</p>}
    </form>
  );
}

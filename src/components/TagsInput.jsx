import { useId, useState } from 'react';
import { MAX_TAGS, normalizarTag } from '../../lib/tags.js';

// Chips + input: Enter o coma agrega, Backspace con el input vacío quita el último.
// Sugiere los tags existentes (datalist).
export default function TagsInput({ value, onChange, sugerencias }) {
  const [texto, setTexto] = useState('');
  const listaId = useId();

  function agregar(crudo) {
    const tag = normalizarTag(crudo);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setTexto('');
  }

  function alTeclear(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      agregar(texto);
    } else if (e.key === 'Backspace' && !texto && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tags-input">
      {value.map((t) => (
        <span key={t} className="tag">
          #{t}
          <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
        </span>
      ))}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={alTeclear}
        onBlur={() => texto && agregar(texto)}
        list={listaId}
        placeholder={value.length >= MAX_TAGS ? `Máximo ${MAX_TAGS} tags` : 'Agregar tag…'}
        disabled={value.length >= MAX_TAGS}
      />
      <datalist id={listaId}>
        {sugerencias.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

import { useState } from 'react';
// import directo: el índice del paquete arrastra todos los lenguajes de Prism y highlight.js
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import abap from 'react-syntax-highlighter/dist/esm/languages/prism/abap';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import { useTema } from '../tema.js';

// Solo se registran estos lenguajes (PrismLight) para no inflar el bundle
const LENGUAJES = { abap, bash, css, java, javascript, json, jsx, markup, python, sql, typescript, yaml };
for (const [nombre, def] of Object.entries(LENGUAJES)) SyntaxHighlighter.registerLanguage(nombre, def);

const ALIAS = { js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', yml: 'yaml', html: 'markup', xml: 'markup', py: 'python' };

export default function CodeBlock({ lenguaje, codigo }) {
  const { oscuro } = useTema();
  const [copiado, setCopiado] = useState(false);
  const lang = ALIAS[lenguaje] ?? lenguaje;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // portapapeles no disponible (permisos / http): no hacemos nada
    }
  }

  return (
    <div className="bloque-codigo">
      <div className="bloque-codigo-barra">
        <span>{lenguaje ?? 'texto'}</span>
        <button type="button" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
      </div>
      {LENGUAJES[lang] ? (
        <SyntaxHighlighter
          language={lang}
          style={oscuro ? oneDark : oneLight}
          customStyle={{ margin: 0, padding: '0.9rem 1rem', background: 'transparent', fontSize: '0.875rem' }}
          codeTagProps={{ style: { background: 'none', fontFamily: 'var(--fuente-mono)' } }}
        >
          {codigo}
        </SyntaxHighlighter>
      ) : (
        <pre className="codigo-plano"><code>{codigo}</code></pre>
      )}
    </div>
  );
}

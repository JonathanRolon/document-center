# Stack Notes

Sitio técnico personal (ABAP, SAP BTP, tutoriales) estilo blog/Notion, público en GitHub Pages:
https://jonathanrolon.github.io/document-center/ — repo `JonathanRolon/document-center`.
Deadline: fin de diciembre 2026. Nada interno de empresa: el repo es **público**.

Reusa front y diseño de `../Portal Tecnico` (versión anterior en SAP BTP), pero este proyecto
**no usa nada de SAP BTP** (sin XSUAA, approuter, HANA, MTA, `@sap/*` de runtime).

## Stack

- Node 22, npm. JavaScript ESM, sin TypeScript.
- **Front**: React + Vite + `react-router` (`HashRouter`), `react-markdown` + `remark-gfm` + `rehype-slug`,
  resaltado Prism (incluye ABAP) con `react-syntax-highlighter`.
- **Editor local**: servidor Node/Express mínimo que lee/escribe los `.md`. Sin login, sin base de datos,
  escucha **solo en `127.0.0.1`**. Nunca se publica.
- **Sitio público**: el mismo front en modo solo lectura, build estático generado desde `notas/`
  (índice + una nota por JSON). Búsqueda y filtro por tags en el navegador.
- **Historial**: git. No hay tabla de versiones.
- **Deploy**: sin GitHub Actions. `npm run publicar` hace el build local y lo sube a la rama `gh-pages`
  (Pages en modo "Deploy from a branch"). Incluye `.nojekyll`. Rutas relativas (`base: './'`) + `HashRouter`.

## Contenido

- `notas/<slug>.md`: notas (el slug sale del título). `borradores/<slug>.md`: borradores, **ignorados por git**.
- Front matter:

  ```yaml
  ---
  titulo: "..."
  resumen: "..."
  tags: ["abap", "sap-btp"]
  creado: 2026-10-21T21:00:00.000Z
  publicado: 2026-10-22T10:00:00.000Z   # si existe, la nota es pública
  ---
  ```

- Publicar desde el editor = mover de `borradores/` a `notas/` y setear `publicado`. Despublicar = al revés.
- Un borrador renombra su archivo si cambia el título; una nota publicada **conserva el slug** (no romper links).
- Tags: minúsculas, espacios → `-`, máx. 10.
- Imágenes: `![alt](imagenes/<carpeta>/<archivo>.png)`, con el archivo en `borradores/imagenes/<carpeta>/`
  (git-ignorada). Publicar mueve las que usa la nota a `notas/imagenes/`; el build copia solo las de notas
  publicadas y falla si falta alguna. **Nunca en `public/`** (se publica todo). Revisar que las capturas
  no muestren clientes, hosts, usuarios ni datos internos.

## Estructura

```
document-center/
├─ notas/               # .md públicos (versionados)
├─ borradores/          # .md privados (git-ignorados)
├─ lib/                 # lógica sin React, compartida por front, server y scripts
│  ├─ front-matter.js   # parsear/serializar el subconjunto fijo de YAML
│  ├─ slug.js, tags.js, busqueda.js, checks-publicar.js, migrar.js
│  └─ archivos.js       # repositorio sobre notas/ y borradores/ (usa fs: no entra al front)
├─ src/                 # front React
│  ├─ fuente.js         # EDITOR → api/*; público → datos/*.json
│  ├─ notas.js          # índice + filtros (búsqueda en el navegador)
│  ├─ components/, pages/ (EditarNota solo en el editor)
│  └─ fonts/72/         # woff2 (los importa styles.css)
├─ public/              # .nojekyll + fonts/72/LICENSE.txt y README.txt (Apache-2.0)
├─ server/editor.js     # Express (API) + Vite en modo middleware, 127.0.0.1:4004
├─ scripts/
│  ├─ generar-datos.js  # notas/ publicadas → dist/datos/indice.json + datos/notas/<slug>.json
│  ├─ publicar.js       # checks → build → git worktree .publicar/ en gh-pages → push
│  └─ migrar-respaldo.js
└─ test/                # node --test
```

- Modo editor = `vite --mode editor`. Para que el build público descarte código del editor, la condición
  tiene que ser `import.meta.env.MODE === 'editor'` **inline** (Rolldown no propaga la constante
  `EDITOR` importada de otro módulo).
- `react-router` fijado en v7 (igual que el proyecto anterior); la v8 es un cambio mayor.

## Comandos

```sh
npm install
npm run editar                   # editor local en http://127.0.0.1:4004/
npm run previsualizar            # build del sitio público + vite preview
npm run publicar -- --prueba     # build + checks, sin tocar git
npm run publicar                 # checks + build + commit en gh-pages + push a origin
npm run migrar -- respaldo.json  # respaldo del proyecto anterior → notas/ y borradores/
npm test                         # node --test
```

`publicar` exige que `notas/` esté commiteado (el historial del sitio es el de git). Primera vez en GitHub:
Settings → Pages → Source "Deploy from a branch" → `gh-pages` / `(root)`.

## Seguridad (repo público)

- `npm run publicar` **falla** si lo que va a publicar contiene borradores, `.env*`, `default-env*`,
  claves (`*.pem`, `*.key`, etc.) o patrones de credenciales.
- Nunca commitear `borradores/`, `.env*`, claves ni service keys.
- Fuentes 72 (`@sap-theming/theming-base-content`, Apache-2.0): incluir su LICENSE junto a las fuentes.
  Sin logos ni marcas de SAP.
- YouTube solo vía `youtube-nocookie.com`, en `iframe` con `sandbox`.

## Convenciones

- Archivos en kebab-case, componentes React en PascalCase.
- Lógica pura (front matter, slugs, YouTube, búsqueda, checks de publicar) en módulos sin React,
  testeada con `node --test`.
- Commits chicos, uno por paso lógico, en español e imperativo (ej. "Agrega script de publicación").
- No inventar comandos ni versiones: verificar con la CLI (`npm view`, `git --help`) o la doc.
- Respuestas cortas y directas, en español.

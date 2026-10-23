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

- Publicar desde el editor = mover de `borradores/` a `notas/` y setear `publicado`.
- Tags: minúsculas, espacios → `-`.

## Estructura

Se detalla en el plan del Paso 2. A grandes rasgos:

```
document-center/
├─ notas/          # .md públicos (versionados)
├─ borradores/     # .md privados (git-ignorados)
├─ src/            # front React (modo editor y modo lectura)
├─ server/         # Express del editor local
├─ scripts/        # build de contenido, publicar, migrar respaldo
├─ public/fonts/72 # fuentes 72/72Mono + LICENSE (Apache-2.0)
└─ test/           # node --test
```

## Comandos

```sh
npm install
npm run editar          # editor local: Express en 127.0.0.1 + Vite dev
npm run previsualizar   # build del sitio público y preview local
npm run publicar        # checks de seguridad + build + push a gh-pages
npm test                # node --test
```

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

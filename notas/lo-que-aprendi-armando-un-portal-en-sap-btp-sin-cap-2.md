---
titulo: "Lo que aprendí armando un portal en SAP BTP sin CAP"
resumen: "XSUAA, approuter, HDI y MTA en una cuenta trial: la arquitectura de la primera versión de Stack Notes, las trampas que encontré y por qué desacoplar la base me permitió sacarla de BTP sin reescribirla."
tags: ["sap-btp", "xsuaa", "hana-cloud", "cloud-foundry", "mta"]
creado: 2026-10-23T04:22:04.479Z
publicado: 2026-10-23T04:22:09.707Z
---

## Contexto

La primera versión de este sitio fue una app en **SAP BTP** (Cloud Foundry, cuenta trial): un portal tipo Notion con login, roles de lector/editor, notas en Markdown, tags, búsqueda, historial de versiones y respaldo.

Elegí **no usar CAP** a propósito: quería ver las piezas de BTP una por una (XSUAA, approuter, HDI, MTA) sin que un framework las esconda.

## Arquitectura

```
Navegador ──▶ approuter (login XSUAA, CSRF, sirve el front)
                 │  /api/*  + JWT (forwardAuthToken)
                 ▼
              backend Express ──▶ repositorios ──▶ HANA Cloud (contenedor HDI)
```

| Módulo MTA | Tipo | Memoria | Qué hace |
|---|---|---|---|
| approuter | `approuter.nodejs` | 256M | Login, CSRF, sirve el build de React desde `resources/` |
| backend | `nodejs` | 128M | API bajo `/api`, valida el JWT y los scopes |
| db | `hdb` | 256M | Corre `@sap/hdi-deploy` **una vez** y se detiene |
| xsuaa | managed service | – | Scopes, role templates, role collections |
| hdi | `hdi-shared` | – | Contenedor HDI sobre la instancia de HANA Cloud |

Servir el front **desde el approuter** (en lugar del HTML5 Application Repository) ahorra un módulo y memoria, algo que en trial importa.

## Seguridad: XSUAA y approuter

### Validar el JWT sin passport

Con `@sap/xssec` v4 no hace falta `passport`: alcanza un middleware propio con `createSecurityContext`.

```js
const { createSecurityContext, SECURITY_CONTEXT, errors: { ValidationError } } = require('@sap/xssec');

function createAuthMiddleware(authService) {
  return async (req, res, next) => {
    try {
      req[SECURITY_CONTEXT] = await createSecurityContext(authService, { req });
      next();
    } catch (e) {
      res.sendStatus(e instanceof ValidationError ? 401 : 500);
    }
  };
}

const requireScope = (scope) => (req, res, next) =>
  req[SECURITY_CONTEXT].checkLocalScope(scope) ? next() : res.sendStatus(403);
```

### Roles

En `xs-security.json`: scopes con prefijo `$XSAPPNAME.` (`Read`, `Write`, `Admin`), un role template por perfil (Viewer, Editor, Admin) y role collections listas para asignar.

- Después del **primer deploy** hay que asignarse la role collection en el cockpit (*Security → Users*). Sin eso, el login funciona pero la API responde 403.
- Las reglas de visibilidad (un lector solo ve lo publicado) van **en el backend**. El front solo oculta botones.

### CSRF del approuter

El approuter exige un token CSRF en POST/PUT/DELETE. Se pide con un GET y el header `x-csrf-token: fetch`, y se reintenta una vez si responde 403 con `x-csrf-token: required` (por ejemplo, después de una sesión nueva).

### La trampa de la caché

Síntoma: después de cerrar sesión, el front cargaba igual y la API "devolvía cualquier cosa".

Causa: el navegador servía `index.html` **desde caché**, sin pasar por el login. Las llamadas a `/api` recibían la **página de login (HTML)** en lugar de JSON.

Arreglo en dos partes:

```json
{
  "source": "^/(.*)$",
  "target": "$1",
  "localDir": "resources",
  "authenticationType": "xsuaa",
  "cacheControl": "no-cache, no-store, must-revalidate"
}
```

y en el front, si la respuesta no es JSON, mostrar "Sesión vencida: recargá la página" en lugar de un error de parseo.

## Persistencia: HANA Cloud con HDI, desacoplada

### HDI

- Tablas como `.hdbtable` y datos semilla con `.hdbtabledata` + CSV en el módulo `db/`.
- El recurso `hdi-shared` **necesita la instancia de HANA corriendo al momento del deploy**. En trial se apaga todas las noches: arrancala antes de `cf deploy` (ver la nota sobre Automation Pilot).
- `npm audit` marca vulnerabilidades en dependencias de `@sap/hdi-deploy`. Es un proceso que corre una vez durante el deploy y no queda expuesto.

### Repositorios y tests de contrato

El backend nunca escribe SQL en las rutas: todo pasa por **repositorios** que devuelven objetos planos en camelCase. El adaptador se elige con una variable (`DB_KIND=hana` en CF, `memory` en local).

- Un **mismo test de contrato** corre contra el adaptador en memoria y contra HANA real.
- Lo específico de HANA queda en `db/` y en `data/hana/`. Cambiar de base = un adaptador nuevo.

### Detalles de HANA que costaron

**Búsqueda literal con LIKE:** el texto del usuario puede traer `%` o `_`. Hay que escaparlos y declarar el `ESCAPE`, también sobre el `NCLOB` del cuerpo:

```js
// el texto buscado es literal: se escapan los comodines de LIKE
const patronLike = (texto) => `%${texto.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
```

```sql
LOWER("TITULO") LIKE ? ESCAPE '\' OR LOWER("CUERPO") LIKE ? ESCAPE '\'
```

**LOBs:** el driver `hdb` devuelve los `NCLOB` como `Buffer`; hay que convertirlos con `toString('utf8')`.

**Transacciones:** guardar una nota toca varias tablas (nota, tags, versiones). Con `hdb`, la transacción va en una **conexión dedicada** con `setAutoCommit(false)`, y commit o rollback al final:

```js
async function transaction(fn) {
  const c = await abrirCliente();
  c.setAutoCommit(false);
  try {
    const resultado = await fn({ query: (sql, params) => ejecutar(c, sql, params) });
    await promisify(c.commit.bind(c))();
    return resultado;
  } catch (e) {
    await promisify(c.rollback.bind(c))().catch(() => {});
    throw e;
  } finally {
    c.end();
  }
}
```

## Desarrollo local

- Se generan `default-env.json` (approuter y backend) a partir de **service keys** de XSUAA y del contenedor HDI. Nunca se versionan.
- Se entra **siempre por el approuter** (`localhost:5000`), que hace el login y reenvía el token al backend local.
- `http://localhost:5000/**` tiene que estar en los `redirect-uris` de `xs-security.json`, o el login falla al volver.

## Herramientas en Windows

- `mbt build` **necesita GNU make**: `winget install ezwinports.make`.
- Después de instalar `cf`, `mbt` o `make`, las terminales de VS Code **no ven el PATH nuevo** aunque abras otra pestaña. Hay que cerrar **todas** las ventanas de VS Code y volver a abrirlo.
- `cf login --sso` pide un passcode generado contra el UAA del landscape correcto: tomá el API endpoint del cockpit (*Subaccount → Overview*), no lo adivines.

## Restricciones de la trial

- **CF frena las apps todas las noches** y **HANA se apaga**: cualquier cosa "programada" dentro de CF no corre.
- La cuenta trial **vence** (unos 90 días).
- Memoria justa: por eso 128M para el backend y el front servido desde el approuter.

## La lección más útil: desacoplar

Como la base estaba detrás de repositorios y el respaldo se generaba **a través del repositorio** (no con SQL), exportar todo a un JSON fue trivial. Eso me permitió llevar el contenido a archivos Markdown y publicar este sitio como estático en GitHub Pages, **sin depender de BTP** y reusando todo el front de React.

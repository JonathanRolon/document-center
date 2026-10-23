---
titulo: "CAP: \"Acquiring client from pool timed out\" con un solo usuario"
resumen: "Un servicio CAP Node.js sobre HANA Cloud empezó a responder 503 aunque casi no tenía tráfico. No era concurrencia: era una fuga de conexiones por un cds.tx() que nunca se cerraba."
tags: ["sap-cap", "hana-cloud", "nodejs", "sap-btp", "troubleshooting"]
creado: 2026-10-23T12:00:00.000Z
---

## El síntoma

Un servicio **CAP Node.js** con **HANA Cloud**, en Cloud Foundry, empezó a fallar en producción. En los logs (`cf logs <app> --recent`):

```
[cds] - TimeoutError: Acquiring client from pool timed out. Please review your system setup,
transaction handling, and pool configuration. Pool State: borrowed: 100, pending: 0, size: 100,
available: 0, max: 100
    at ResourceRequest._fireTimeout (.../generic-pool/lib/ResourceRequest.js:62:17)
```

con `statusCode: 503` hacia el front (Fiori, vía `$batch`). Un rato después, además:

```
[hana] - Error: Client error: Connection closed by server
code: 'EHDBCLOSE'
```

Lo raro: **había un solo request a la vez**. Ningún pico de usuarios.

## Lo que dice la documentación

La [guía de troubleshooting de CAP](https://cap.cloud.sap/docs/get-started/get-help) lista dos causas:

1. Se llegó al **máximo de conexiones** del pool y los requests esperan demasiado por una libre.
2. **Crear una conexión nueva** tarda demasiado.

Y propone ajustar `max` o `acquireTimeoutMillis` del pool (`cds.requires.db.pool`, ver [Databases](https://cap.cloud.sap/docs/node.js/databases)):

```json
{
  "cds": {
    "requires": {
      "db": {
        "kind": "hana",
        "pool": { "acquireTimeoutMillis": 5000, "min": 0, "max": 100 }
      }
    }
  }
}
```

Pero leyendo el estado del pool, **subir `max` no iba a arreglar nada**:

| Dato del error | Lectura |
|---|---|
| `borrowed: 100` | Las 100 conexiones están **prestadas**… |
| `available: 0` | …ninguna volvió al pool… |
| `pending: 0` | …y no hay una cola de requests esperando. |

Con un usuario solo, 100 conexiones tomadas no son carga: son **conexiones que nunca se devolvieron**. Una fuga. Con `max: 200` solo habría tardado el doble en volver a romperse.

## La causa: `cds.tx()` sin cerrar

En CAP, cada handler ya corre **dentro de una transacción** ligada al request: la abre el framework y hace commit (o rollback si hay error) al terminar. Esa transacción usa **una** conexión y la devuelve al pool al final.

El problema estaba en un helper que se llamaba desde varios handlers, así:

```js
// ❌ dentro de un handler
this.on('READ', Algo, async (req) => {
  const datos = await this._leerDatos(cds.tx(), req.data.id);   // tx nueva, nadie la cierra
  // ...
});

async _leerDatos(tx, id) {
  return tx.run(SELECT.one.from(Tabla).where({ id }));          // toma una conexión del pool
}
```

`cds.tx()` crea una transacción **aparte**, que no es la del request. La primera query la hace tomar una conexión física, y la doc de CAP es clara sobre quién la cierra:

> *The caller of `srv.tx()` is responsible to `commit` or `rollback` the transaction.* ([Transaction Management](https://cap.cloud.sap/docs/node.js/cds-tx))

Nadie hacía commit ni rollback. Cada llamada dejaba **una conexión tomada para siempre**. Tras unas 100 lecturas, el pool quedaba vacío y la app respondía 503 a todo, hasta reiniciarla.

## El arreglo

Usar la transacción **del request**, que el framework cierra solo:

```js
// ✅ misma transacción (y conexión) que el request
this.on('READ', Algo, async (req) => {
  const tx = cds.tx(req);
  const datos = await this._leerDatos(tx, req.data.id);
  // ...
});
```

Si de verdad necesitás una transacción **independiente** (por ejemplo, un log que tiene que quedar aunque el request falle, o un job en background), usá la forma con función, que hace commit o rollback sola:

```js
await cds.tx(async (tx) => {
  await tx.run(INSERT.into(Log).entries(entrada));
});   // commit si termina bien, rollback si lanza error
```

o cerrala vos con `try`/`catch`:

```js
const tx = cds.tx();
try {
  await tx.run(/* ... */);
  await tx.commit();
} catch (e) {
  await tx.rollback();
  throw e;
}
```

## Otro antipatrón que estaba cerca: `forEach(async …)`

En el mismo servicio había código así para recorrer una jerarquía:

```js
// ❌
function procesar(items) {
  return new Promise(async (resolve, reject) => {
    const promesas = [];
    items.forEach(async (item) => {
      promesas.push(leer(item));
    });
    Promise.all(promesas).then(() => resolve(resultado));   // sin catch → si falla, nunca resuelve
  });
}
```

Problemas:

- `forEach` **no espera** funciones `async`: dispara todo y sigue.
- `new Promise(async …)` + `throw` adentro: el error **no rechaza** la promesa. Queda colgada o termina como *unhandled rejection*.
- `Promise.all(...).then(...)` sin `catch`: si una lectura falla, la promesa externa **nunca se resuelve**, y el request queda esperando con lo que tenga tomado.

Versión equivalente y segura:

```js
// ✅
async function procesar(items) {
  const resultados = await Promise.all(items.map((item) => leer(item)));
  return resultados.flat();
}
```

Si `items` puede ser grande y cada `leer` pega a la base o a un servicio externo, conviene **limitar la concurrencia** (lotes de N, o `for…of` con `await`) en lugar de disparar cientos de llamadas a la vez.

## Checklist para este error

1. **Leé el estado del pool** en el mensaje: `borrowed` alto con `pending: 0` y poco tráfico ⇒ **fuga**, no carga.
2. Buscá en el código `cds.tx()` / `srv.tx()` **sin argumentos** dentro de handlers, y transacciones manuales sin `commit`/`rollback`.
3. Pasá `cds.tx(req)` (o directamente usá `SELECT`/`INSERT` en el handler, que ya corre en la transacción del request).
4. Recién si el problema es **carga real** (`pending` alto, muchos usuarios), ajustá `max` / `acquireTimeoutMillis`. Si usás `@sap/hana-client`, revisá también `HDB_NODEJS_THREADPOOL_SIZE`, como sugiere la misma guía de troubleshooting.
5. Reiniciar la app "lo arregla" por un rato: es otra pista de fuga.

---
titulo: "Federar Entra ID con SAP IAS paso a paso"
resumen: "PoC en cuentas trial: Microsoft Entra ID como IdP corporativo de SAP Cloud Identity Services (SAML y OIDC), usuarios sombra en BTP, propagación de grupos hasta las Role Collections y troubleshooting."
tags: ["sap-btp", "sap-ias", "entra-id", "saml", "oidc", "seguridad"]
creado: 2026-04-17T12:00:00.000Z
publicado: 2026-10-24T00:57:38.625Z
---

> Prueba de concepto armada sobre cuentas **trial** (Azure gratuita + BTP trial). Los IDs que aparecen son de esos tenants de prueba.

## 1. Qué vamos a armar

Los usuarios entran a una app de BTP (por ejemplo, Work Zone) con su cuenta de **Microsoft Entra ID**. BTP confía en **SAP Cloud Identity Services (IAS)**, e IAS delega la autenticación en Entra como **IdP corporativo**:

```
Usuario ──▶ App en BTP / Work Zone (SP) ──▶ SAP IAS (proxy) ──▶ Microsoft Entra ID (IdP corporativo)
```

El trust entre IAS y Entra se puede armar de dos formas; la guía cubre las dos:

| | Opción A: SAML 2.0 | Opción B: OIDC |
|---|---|---|
| Del lado de Entra | Aplicación empresarial de la galería (*SAP Cloud Identity Services*) | Registro de aplicación con client secret |
| Del lado de IAS | Corporate IdP tipo *Microsoft ADFS / Entra ID (SAML 2.0)* + metadata XML | Corporate IdP tipo *OpenID Connect Compliant* + Discovery URL |
| A mantener | Re-subir el XML cuando rota el certificado | Renovar el secret antes de que expire |

Las secciones 2, 5, 6 y 8 son comunes; la 3 es solo SAML y la 4 solo OIDC. La propagación de grupos (sección 7) está armada sobre SAML.

> **¿Qué es un claim?**
>
> Un claim es simplemente un dato que el IdP (Entra) incluye dentro del token SAML cuando autentica a un usuario. Es como un "sobre" que viaja junto con la identidad del usuario.
>
> Cuando Entra autentica a tu usuario, arma un SAML Assertion que contiene, por ejemplo:
>
> ```xml
> <Attribute Name="emailaddress">
>   <AttributeValue>juan@sapdevlabs.onmicrosoft.com</AttributeValue>
> </Attribute>
> <Attribute Name="givenname">
>   <AttributeValue>Juan</AttributeValue>
> </Attribute>
> <Attribute Name="Groups">
>   <AttributeValue>a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx</AttributeValue>
> </Attribute>
> ```
>
> Ese último es el **Group Claim**: Entra informa en qué grupos está el usuario, usando el Object ID (GUID) del grupo. IAS lo recibe, lo pasa hacia BTP, y BTP lo usa para asignar Role Collections.

> **¿Qué es un SP (Service Provider)?**
>
> En SAML hay dos actores principales:
>
> | Actor | Rol | Ej. |
> |---|---|---|
> | IdP (Identity Provider) | Autentica al usuario, emite el token | Entra ID (y también IAS como proxy) |
> | SP (Service Provider) | La app que quiere saber quién es el usuario | BTP / Work Zone |

## 2. Preparación: registración y habilitación del tenant de Azure

- Entrar en [https://azure.microsoft.com/free/](https://azure.microsoft.com/free/) y generar una cuenta Azure gratuita. Al registrarse pide aprobar el MFA.
- Desde el portal de Azure tendremos acceso a crear recursos, importar código, crear agentes IA, etc.
- Ingresamos a Entra ([Centro de administración Microsoft Entra](https://entra.microsoft.com/#home)):

![Acceso a Entra desde el portal de Azure](imagenes/entra-id-ias/azure-entra.png)

Nos guardamos los valores **Id del tenant** y **Dominio principal** (desde *Información general*):

- Tenant ID: `0342a3ba-96e8-4838-9cd1-71c4945c2547`
- Dominio principal: `<tu-dominio>.onmicrosoft.com`

- Accediendo a `https://login.microsoftonline.com/<tenantId>/v2.0/.well-known/openid-configuration`, reemplazando `<tenantId>` por el id correspondiente, nos devuelve un JSON válido. Esto sirve como comprobación de que el tenant es funcional:

![openid-configuration del tenant](imagenes/entra-id-ias/openid-configuration.png)

## 3. Opción A: trust SAML entre Entra ID y SAP IAS

### Registrar la aplicación empresarial

- Registrar una nueva app (*Aplicaciones empresariales → Nueva aplicación*):

![Aplicaciones empresariales](imagenes/entra-id-ias/aplicaciones-empresariales.png)

Elegimos SAP:

![Galería de Entra: SAP](imagenes/entra-id-ias/galeria-sap.png)

![SAP Cloud Identity Services en la galería](imagenes/entra-id-ias/galeria-cloud-identity-services.png)

![Aplicación SAP Cloud Identity Services creada](imagenes/entra-id-ias/app-ias-informacion-general.png)

Me guardo id de objeto y aplicación:

- Id de app: `56235024-49e1-4e18-ab0f-42d8ecd7cece`
- Id de objeto: `a5a8b34c-58b0-4795-acf3-4d7b5aad0d20`

### Configurar el trust

- Ir a *Tenant Settings* del IAS:

![Tenant Settings en IAS](imagenes/entra-id-ias/ias-tenant-settings.png)

Descargar la metadata desde *SAML 2.0 Configuration*:

![Descargar metadata SAML del IAS](imagenes/entra-id-ias/ias-saml-metadata.png)

- Volver a [https://entra.microsoft.com](https://entra.microsoft.com), sobre la app generada (*Inicio de sesión único → SAML*):

![Elegir SAML como método de SSO](imagenes/entra-id-ias/entra-sso-saml.png)

![Cargar el archivo de metadatos](imagenes/entra-id-ias/entra-cargar-metadatos.png)

Los campos se completan automáticamente:

![Configuración básica de SAML completada](imagenes/entra-id-ias/entra-configuracion-basica-saml.png)

![Probar el SSO](imagenes/entra-id-ias/entra-test-sso.png)

![Probar inicio de sesión](imagenes/entra-id-ias/entra-probar-inicio-sesion.png)

Es correcto que falle, dado que aún no configuramos la parte del IAS:

![Error esperado del IAS](imagenes/entra-id-ias/ias-error-sin-configurar.png)

- Cambiar el siguiente valor:
  **Unique User Identifier (Name ID)**: `user.userprincipalname`
  a
  **Unique User Identifier (Name ID)**: `user.mail`, con formato *Dirección de correo electrónico*.

![Identificador de usuario único por defecto](imagenes/entra-id-ias/entra-identificador-usuario-unico.png)

![NameID = user.mail con formato email](imagenes/entra-id-ias/entra-nameid-mail.png)

La guía oficial Microsoft-SAP lo advierte explícitamente: *"watch out for the NameID setting, because UPNs aren't necessarily email addresses"* ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/sap/workloads/scenario-azure-first-sap-identity-integration)). Además, cada usuario debería tener el atributo *correo electrónico / mail* poblado en Entra.

- Descargar, en la misma pantalla del SSO, el **XML de metadatos de federación**. Contiene el Entity ID de Entra (`https://sts.windows.net/<tenantId>/`), los endpoints SSO y SLO (`https://login.microsoftonline.com/<tenantId>/saml2`) y el certificado de firma (válido 3 años por defecto):

![XML de metadatos de federación](imagenes/entra-id-ias/entra-xml-metadatos.png)

> IAS no refresca solo la metadata SAML del IdP corporativo (a diferencia de la configuración OIDC, que tiene *Metadata Refresh Interval*), así que vas a necesitar re-subir el XML cuando rote el certificado ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/sap/workloads/scenario-azure-first-sap-identity-integration)). Configurá la notificación de expiración en la app de Entra.

- En IAS, *Identity Providers → Corporate Identity Providers → +Create*:

![Menú Corporate Identity Providers](imagenes/entra-id-ias/ias-menu-corporate-idp.png)

![Crear un Corporate IdP](imagenes/entra-id-ias/ias-crear-corporate-idp.png)

Tres campos importan:

- **Display Name** (descriptivo, p. ej. *Microsoft Entra ID*),
- **Name** (técnico, URL-safe),
- y especialmente el **Identity Provider Type**. Debés elegir **"Microsoft ADFS / Microsoft Entra ID (SAML 2.0)"**, no el SAML 2.0 genérico. Si elegís el genérico, IAS incluye la propiedad `Scoping/ProxyCount` en la AuthnRequest y Entra la rechaza con el error *"The SAML authentication request property 'Scoping/ProxyCount' is not supported"*. Este es el gotcha #1 de toda la integración (SAP KBA 3337506).

![Tipo Microsoft ADFS / Entra ID (SAML 2.0)](imagenes/entra-id-ias/ias-tipo-idp.png)

- Una vez creado el Corporate IdP, abrir *Trust → SAML 2.0 Configuration → Browse* y subir el Federation Metadata XML de Entra:

![SAML 2.0 Configuration del Corporate IdP](imagenes/entra-id-ias/ias-entra-trust.png)

![Browse del metadata XML](imagenes/entra-id-ias/ias-saml-browse.png)

![Metadata cargada](imagenes/entra-id-ias/ias-saml-metadata-cargada.png)

IAS rellena automáticamente SSO Endpoint, Single Logout Endpoint, Signing Certificate e Issuer. Forzar **Signing Algorithm = SHA-256** (SHA-1 no está soportado):

![Signing Algorithm SHA-256](imagenes/entra-id-ias/ias-sha256.png)

- Dentro de **Name ID Policy**, cambiar de *Default*:

![Name ID Policy en Default](imagenes/entra-id-ias/ias-nameid-default.png)

a **Email**, y *Save*:

![Name ID Policy en Email](imagenes/entra-id-ias/ias-nameid-email.png)

En *Single Sign-On → Identity Federation* mantener **OFF** el parámetro *Use Identity Authentication user store*:

![User Store en OFF](imagenes/entra-id-ias/ias-user-store-off.png)

Razón: así IAS funciona como **proxy puro**: reenvía el Subject y los atributos del assertion de Entra intactos al Service Provider, y los claims `Groups` llegan hasta XSUAA sin perderse. Si lo activás, IAS sobreescribe los atributos con los del user store local ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/saas-apps/sap-hana-cloud-platform-identity-authentication-tutorial)) y vas a tener que re-emitirlos manualmente en *Default Attributes* de cada Application.

Con esto, seguí en la sección 5.

## 4. Opción B: federación contra Azure AD vía OIDC

- Del lado de Azure, se debe registrar una aplicación nueva (desde *Registros de aplicaciones*, no se da de alta desde *Aplicaciones empresariales*):

![Registros de aplicaciones](imagenes/entra-id-ias/oidc-registros-aplicaciones.png)

- Registrar la URL de callback del tenant del IAS:

![Registrar una aplicación](imagenes/entra-id-ias/oidc-registrar-aplicacion.png)

`https://<tu-tenant-ias>.accounts.ondemand.com/oauth2/callback`

En este caso: `https://aqnll4mlh.trial-accounts.ondemand.com/oauth2/callback`

Copiar el Id de cliente (1), el id de tenant de Entra (2) y generar el secret (copiarse el valor, porque después no se vuelve a mostrar):

![Ids de la app registrada](imagenes/entra-id-ias/oidc-app-ids.png)

![Secreto de cliente](imagenes/entra-id-ias/oidc-secreto.png)

Desde el IAS, generar un nuevo proveedor de identidades corporativo:

![Corporate IdP OIDC en IAS](imagenes/entra-id-ias/ias-oidc-idp.png)

El tipo debe ser **OpenID Connect Compliant**:

![Tipo OpenID Connect](imagenes/entra-id-ias/ias-tipo-oidc.png)

Luego, generar la configuración. En **Discovery URL** ingresar:

`https://login.microsoftonline.com/<id de tenant Entra>/v2.0/.well-known/openid-configuration`

En este caso: `https://login.microsoftonline.com/0342a3ba-96e8-4838-9cd1-71c4945c2547/v2.0/.well-known/openid-configuration`

Luego, en **Client ID** queda el valor del id de aplicación, en este caso `341b5a9b-0631-4807-aaab-5aa40c233cee`, y finalmente el **secret** generado:

![OpenID Connect Configuration](imagenes/entra-id-ias/ias-oidc-configuracion.png)

Luego darle *Save* y *Validate*: nos va a pedir autenticarnos con la cuenta corporativa de Azure, configurar el MFA si fuera necesario, y finalmente debería salir todo en verde (el warning *"Refresh Token missing from Response"* es normal: Azure no siempre lo envía en el flujo de validación):

![Validación OIDC exitosa](imagenes/entra-id-ias/ias-oidc-validar.png)

## 5. Conectar las aplicaciones al IdP corporativo (común)

Sobre la app SP, cambiar el método de autenticación condicional al corporativo (*Conditional Authentication → Default Identity Provider*):

![Conditional Authentication: Default IdP = Microsoft Entra ID](imagenes/entra-id-ias/ias-conditional-authentication.png)

![Elegir Microsoft Entra ID](imagenes/entra-id-ias/ias-default-idp.png)

Es importante confiar en los IdPs corporativos, si no devolverá un 401, así que marcamos el flag (*Trust Corporate Identity Providers*):

![Trust Corporate Identity Providers](imagenes/entra-id-ias/ias-trust-corporate-idps.png)

Es como una puerta giratoria con dos llaves:

- **Llave 1 (Conditional Auth):** abre la puerta de salida hacia Entra.
- **Llave 2 (Trust Corporate IdP):** abre la puerta de entrada de vuelta.

Opcionalmente, añadir reglas por **Email Domain**, **User Type**, **User Group** o **IP Range**; por ejemplo, emails `@contoso.com` → Entra, `@gmail.com` → user store local para externos. Para usar reglas, el *Default Identity Provider* tiene que quedar en *Identity Authentication*:

![Authentication Rules](imagenes/entra-id-ias/ias-reglas.png)

![Nueva regla de autenticación condicional](imagenes/entra-id-ias/ias-nueva-regla.png)

> **NOTA:** *Crear usuarios sombra en el inicio de sesión* (Create Shadow Users During Logon) = ON en BTP permite que los usuarios de IAS se creen automáticamente en BTP cuando inician sesión, sin crearlos manualmente. Esto porque el usuario del IAS no es el mismo que el de BTP (este último es una copia).

![Usuarios sombra activado en la relación de confianza de BTP](imagenes/entra-id-ias/btp-shadow-users.png)

### Mapeo de atributos Entra → IAS → App

Entra envía por defecto al menos `emailaddress`, `givenname`, `surname`, `name` y `objectidentifier`. En IAS, si operás en modo proxy puro (user store local en OFF), los atributos pasan por referencia usando la sintaxis `${corporateIdP.<nombre>}` en *Trust → Default Attributes* o *Trust → Assertion Attributes* de cada Application. Ejemplos típicos hacia XSUAA:

| Name | Value | Source |
|---|---|---|
| `Groups` | `${corporateIdP.Groups}` | Corporate Identity Provider |
| `first_name` | `${corporateIdP.givenName}` | Corporate Identity Provider |
| `last_name` | `${corporateIdP.surname}` | Corporate Identity Provider |
| `mail` | `${corporateIdP.mail}` | Corporate Identity Provider |

Como el user store de IAS está OFF, los atributos de Entra se envían directamente: **no hace falta tocarlos a nivel application**, dejar como está (el propio IAS avisa que esos atributos se ignoran en este modo):

![Atributos de la application](imagenes/entra-id-ias/ias-atributos-app.png)

## 6. Usuario de prueba y login (común)

### Alta del usuario

![Usuarios de Entra: Nuevo usuario](imagenes/entra-id-ias/entra-usuarios.png)

![Crear un usuario nuevo: datos básicos](imagenes/entra-id-ias/entra-nuevo-usuario.png)

- El nombre de usuario principal (UPN), formado así: `<alias>@<dominio_verificado>`
- El nombre para mostrar
- La contraseña inicial, que será cambiada al iniciar sesión

**OJO:** antes de crear, se debe completar el campo *Correo electrónico* en la pestaña *Propiedades*, dado que es el campo definido como NameID (`user.mail`) en la sección 3 (SAML).

![Propiedades: nombre y apellido](imagenes/entra-id-ias/entra-nuevo-usuario-propiedades.png)

![Propiedades: correo electrónico](imagenes/entra-id-ias/entra-nuevo-usuario-correo.png)

![Revisar y crear](imagenes/entra-id-ias/entra-nuevo-usuario-revisar.png)

![Usuario creado](imagenes/entra-id-ias/entra-usuarios-creados.png)

![Detalle del usuario de prueba](imagenes/entra-id-ias/entra-usuario-detalle.png)

### Asignación a la Enterprise Application de IAS

El plan gratuito no permite agregar grupos a la aplicación, de manera que agrego directamente el usuario (*Enterprise applications → SAP Cloud Identity Services → Users and groups → +Add user/group*, seleccionar el usuario y aplicarle el rol *User*):

![Seleccionar el usuario](imagenes/entra-id-ias/entra-asignar-usuario.png)

Asignar:

![Agregar asignación](imagenes/entra-id-ias/entra-agregar-asignacion.png)

![Usuario asignado a la app](imagenes/entra-id-ias/entra-usuarios-y-grupos.png)

Respecto a **¿Asignación requerida?**:

![Asignación requerida](imagenes/entra-id-ias/entra-asignacion-requerida.png)

Viene en **Sí** por defecto, lo que obliga a asignación explícita. La recomendación oficial Microsoft-SAP es ponerlo en **No** cuando IAS/BTP decide la autorización, para evitar duplicar autorización en dos capas; pero en un tenant trial cerrado tiene sentido dejarlo en Sí para evitar ruido. Lo importante es mantener coherencia: si lo dejás en Sí, debés asignar explícitamente a cada usuario (o a un grupo directo, no anidado) o recibirás `AADSTS50105` al intentar el login.

Controla si Entra deja pasar o no la autenticación antes de que el token llegue a IAS:

```
Usuario intenta login
        ↓
ENTRA verifica: ¿está asignado a la app?
   NO → error AADSTS50105 (nunca llega a IAS)
   SÍ → Entra emite el token SAML → viaja a IAS
```

### Probar y diagnosticar el flujo

Iniciar sesión con el usuario corporativo creado en la app de Azure:

![Login de Microsoft](imagenes/entra-id-ias/login-entra.png)

Actualizar contraseña:

![Actualizar contraseña en el primer login](imagenes/entra-id-ias/login-actualizar-contrasena.png)

![Usuario logueado en Work Zone](imagenes/entra-id-ias/work-zone-usuario.png)

*undefined undefined* es por los atributos que completamos en el formulario de la app de Entra al generar el usuario: si falta alguno, no se mapea.

Adicionalmente, como *Crear usuarios sombra en el inicio de sesión* = ON, se genera el usuario sombra (copia) en el cockpit de BTP: en *Seguridad → Usuarios* aparece el usuario con el proveedor de identidades `<tenant-ias>.trial-accounts.ondemand.com (business users)`.

## 7. Propagar grupos de Entra hasta BTP Role Collections

> Esta sección está armada sobre la **opción A (SAML)**: el group claim se configura en *Attributes & Claims* de la aplicación empresarial.

### Configurar el group claim en Entra — Object ID vs Display Name

En *Single sign-on → Attributes & Claims → +Add a group claim* aparecen cuatro opciones para *"Which groups…"*. La respuesta correcta para IAS+BTP es **"Groups assigned to the application"**: solo emite grupos directamente asignados a la Enterprise App, lo que limita el tamaño del token y respeta el límite de **150 grupos por assertion SAML** ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)). Las opciones *All groups* o *Security groups* funcionan en Entra ID Free, pero emiten todos los grupos del usuario y corren el riesgo de superar 150, tras lo cual Entra devuelve un `groups.link` hacia Graph API ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)) que IAS no resuelve. Resultado: el usuario autentica, pero las role collections no se aplican (SAP KBA 3671189).

La decisión sobre **Source attribute** es igualmente crítica: usá **Group ID (Object ID)**, no Display Name ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/sap/workloads/scenario-azure-first-sap-identity-integration)). Razón técnica: el Object ID es un GUID inmutable y globalmente único, nunca reutilizable; el Display Name se puede renombrar, y abre un vector de escalada de privilegios por homonimia (un usuario crea un grupo con el mismo nombre y hereda permisos). La contra es que en el cockpit de BTP los GUIDs son poco legibles: mitigalo documentando el mapping fuera del sistema.

En *Advanced options*, marcá **Customize the name of the group claim** y poné `Name = Groups` (con G mayúscula), sin namespace. El motivo: el mapping de Role Collections en BTP busca por defecto un atributo llamado exactamente `Groups`, y en IAS podrás referenciarlo como `${corporateIdP.Groups}`. Si no lo renombrás, el claim llegará como el URI largo `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` y tendrás que re-mapearlo en *Enriched Assertion Attributes* de IAS.

`sAMAccountName`, SID y NetBIOS solo están disponibles para grupos sincronizados desde AD on-prem vía Entra Connect ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)). Para grupos cloud-only (el caso habitual en trial), solo funcionan *Group ID* o *Cloud-only group display names*, y este último solo con la opción *Groups assigned to the application*.

### Mapeo end-to-end Entra → IAS → BTP

El flujo completo requiere coordinar tres capas:

1. **En Entra:** crear un security group `SAP_BTP_Developer`, anotar su Object ID (GUID), asignar el usuario de prueba al grupo y asignar el grupo a la Enterprise App (paso que requiere P1; con Free se asignan usuarios uno a uno). Configurar el claim `Groups` como se describió arriba.
2. **En IAS:** mantener *Use Identity Authentication user store* = OFF en el Corporate IdP para preservar el claim. Si por alguna razón lo activás, añadí manualmente en *Default Attributes* de la Application: `Groups = ${corporateIdP.Groups}`.
3. **En el BTP Cockpit:** ir a *Security → Role Collections → <nombre> → Edit → User Groups → +Add*, seleccionar el Identity Provider = el tenant IAS, y poner como *Name* el **Object ID (GUID)** del grupo de Entra, no el display name.

Tras el primer login federado, BTP crea el shadow user automáticamente (si *Create Shadow Users During Logon* = ON) y evalúa el claim `Groups` contra el mapping. El resultado es visible en *Security → Users → <usuario> → Role Collections*.

Diagrama simplificado del flujo del atributo:

```
Entra ID                        SAP IAS                           BTP XSUAA
[Group claim "Groups"]  ──SAML──▶  [${corporateIdP.Groups}]  ──SAML──▶  [Role Collection mapping
 Source = Group ID                  (pass-through, OFF user                Name = <GUID Entra>
 Value = <GUID>                      store)]                                → Role Collection asignada]
```

Las consideraciones finales sobre grupos son dos: los grupos anidados se resuelven con *Security groups* pero no con *Groups assigned to the application* (se requiere miembro directo), y el formato SAML es multi-valued (un `<Attribute Name="Groups">` con múltiples `<AttributeValue>`), que IAS y XSUAA procesan correctamente como array.

### El flujo de grupos

> Sin P1 no se pueden asignar grupos a la Enterprise App, así que la opción *Groups assigned to the application* no emite nada: en ese caso se usa *Security groups* (vigilando el límite de 150).

```
1. ENTRA: Crear Security Group
   → Grupos → Nuevo grupo → Seguridad
   → Anotar el Object ID (GUID)

2. ENTRA: Configurar Group Claim en la Enterprise App
   → SAP Cloud Identity Services → Single sign-on
   → Attributes & Claims → Add a group claim
   → "Security groups" (sin P1) o "Groups assigned to the application" (con P1)
   → Source = Group ID
   → Rename a "Groups"

3. ENTRA: Asignar usuario al grupo
   → El grupo → Miembros → +Agregar
   → (con P1: asignar el grupo a la Enterprise App)
   → (sin P1: el usuario asignado a la app directamente ya es suficiente)

4. BTP: Mapear el Object ID a una Role Collection
   → Security → Role Collections → Launchpad_Admin
   → User Groups → +Add
   → Name = <GUID del grupo de Entra>
   → Identity Provider = <tenant-ias>.trial-accounts.ondemand.com
   → Save
```

## 8. Troubleshooting

Las filas marcadas con **SAML** aplican solo a la opción A; el resto, a las dos.

| # | Aplica a | Error | Causa raíz | Solución de una línea |
|---|---|---|---|---|
| 1 | Ambas | `AADSTS50105` – user not assigned to a role | Usuario no asignado a la Enterprise App | Asignar user/grupo directo (no anidado) o poner *Asignación requerida* = No |
| 2 | SAML | `AADSTS700016` / `70001` – app not found | Entity ID distinto entre IAS y Entra | Corregir *Identifier (Entity ID)* en la configuración básica de SAML = Entity ID del tenant IAS |
| 3 | SAML | `InvalidNameIDPolicy` | El formato de NameID pedido por IAS no coincide con el que emite Entra | Alinear las dos puntas: *Name ID Policy* en IAS (Email) y NameID = `user.mail` con formato email en Entra |
| 4 | SAML | Signature verification failed | Certificado expirado/rotado sin actualizar | Re-subir el Federation Metadata en IAS; forzar SHA-256 |
| 5 | SAML | `NotBefore` / `NotOnOrAfter` not valid | Desfase de reloj (relevante si hay S/4HANA on-prem) | Sincronizar NTP; `login/saml2_allowed_clock_skew` en ABAP |
| 6 | SAML | Audience / `InResponseTo` mismatch | Reply URL o Entity ID incorrectos, cookies viejas | Corregir la ACS, probar en incógnito |
| 7 | Ambas | User not found in Identity Authentication | User store de IAS en ON y el usuario no existe en IAS | Volver a OFF el user store, o crear los usuarios en IAS |
| 8 | SAML | Shadow user con UPN `@tenant.onmicrosoft.com` | NameID por defecto = UPN | Cambiar NameID a `user.mail` en Entra |
| 9 | Ambas | Claim `Groups` vacío en XSUAA | Claim no configurado, más de 150 grupos, o user store ON en IAS | Configurar *Groups assigned to the application*; mantener user store OFF |
| 10 | Ambas | Redirect loop al entrar a la consola de IAS | Default IdP mal configurado en la app *Administration Console* de IAS | URL de rescate `https://<tenant>.trial-accounts.ondemand.com/admin/?authType=ias` (KBA 3253488) |

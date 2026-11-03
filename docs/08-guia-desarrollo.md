# 08 — Guía técnica

Cómo está construido el servidor, qué reglas aplica, cómo se instala y cómo se prueba. El contrato de la API, `docs/api` (versión **2.12.0**), es la fuente de verdad: el código responde exactamente lo que el contrato define.

---

## 1. Dónde está cada cosa

| Tema | Dónde |
|---|---|
| Qué recibe y devuelve cada endpoint, y sus errores | `docs/api/*.yaml` (un archivo por módulo) y `docs/api/openapi.yaml` (unificado, generado). |
| De dónde salen los datos de cada endpoint | §8 y los comentarios de `database/scripts/views/*.sql`. |
| Reglas de negocio del servidor | §7. |
| Reglas que garantiza la base de datos | §6 y `docs/04`. |
| Generación del PDF y variables automáticas | `docs/06` y `server/utils/sistemaVariables.js`. |

El servidor repite cada validación que hace el cliente: no depende de que el frontend haya validado.

---

## 2. Estructura de un módulo

Cada módulo tiene tres archivos en `server/modules/<nombre>/`:

| Archivo | Responsabilidad |
|---|---|
| `*.routes.js` | Rutas y middlewares (autenticación, rol requerido). Sin lógica. |
| `*.controller.js` | Lee `req`, valida campos y tipos, y traduce los errores del servicio a respuestas HTTP. |
| `*.service.js` | Reglas de negocio y acceso a datos con Prisma. No conoce `req` ni `res`. |

Los módulos (`auth`, `catalogs`, `flows`, `templates`, `requests`, `approvals` y `documents`) se registran en `server/app.js`.

---

## 3. Formato de errores

Todo error responde `{ "error": { "codigo", "mensaje", "detalles": [{ "campo", "mensaje" }] } }`:

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDACION_FALLIDA` | 400 | Campos faltantes o inválidos (un elemento de `detalles` por falla). |
| `PASSWORD_ACTUAL_INCORRECTA` | 400 | Solo en `POST /api/auth/password`. |
| `APROBADOR_INVALIDO` | 400 al crear o editar un flujo; **409** al publicar y al decidir | El titular de un paso no puede aprobar. |
| `CREDENCIALES_INVALIDAS` | 401 | Login rechazado. |
| `NO_AUTENTICADO` | 401 | Token ausente, inválido, vencido o revocado, o cuenta inactiva. |
| `SIN_PERMISO` | 403 | El rol no permite la acción, o `codUnidad` ajeno. |
| `CAMBIO_PASSWORD_REQUERIDO` | 403 | Cuenta con contraseña inicial. |
| `NO_ENCONTRADO` | 404 | No existe **o el usuario no tiene acceso**; a propósito no se distingue. |
| `CONFLICTO_ESTADO` | 409 | La operación no vale para el estado actual. |
| `DEMASIADOS_INTENTOS` / `DEMASIADAS_SOLICITUDES` | 429 | Límite del login o de la API superado (§9.3). |
| `ERROR_INTERNO` | 500 | Error no controlado, sin detalle técnico. |
| `SERVICIO_NO_DISPONIBLE` | 503 | Base saturada o sin respuesta; se puede reintentar. |

Los cuerpos se arman con `server/utils/errorResponse.js`.

---

## 4. Autenticación y roles

- **Autenticación:** `middleware/auth.js` verifica el token, que no esté revocado, que la cuenta siga activa y que no tenga pendiente el cambio de la contraseña inicial (`403 CAMBIO_PASSWORD_REQUERIDO`). Con la contraseña inicial solo se permiten `me`, `password` y `logout`.
- **Roles:** `requireRole('ADMINISTRADOR')` (o una lista) responde `403 SIN_PERMISO`. Cada operación del contrato declara sus roles en `x-roles`. `SOLICITANTE` lo tiene toda cuenta activa; `APROBADOR` y `ADMINISTRADOR` se asignan.
- **Contexto del usuario:** el token trae `roles`, `estamentos` y `codUnidad`, y los servicios lo reciben desde el controlador. El perfil completo (unas 12 relaciones) solo se carga cuando hace falta, por ejemplo para congelar los datos automáticos al radicar.
- **Caché del estado de la cuenta:** el middleware guarda unos segundos el estado de cada cuenta (`ACCOUNT_CACHE_SECONDS`, 10 por defecto) para no consultarlo en cada petición. Cambiar la contraseña o cerrar la sesión invalida la entrada al momento. Cambiar los roles de una cuenta revoca sus sesiones (trigger en `usuarios_roles`); el middleware lo nota en hasta `ACCOUNT_CACHE_SECONDS`.

---

## 5. Acceso a datos y rendimiento

Prisma 7 se conecta con el adaptador de `pg` (`config/prisma.js`). El esquema está en `server/prisma/schema/`, dividido por área (`auth`, `organizacion`, `templates`, `requests`), y `server/prisma.config.js` indica su ubicación. Las vistas de `database/scripts/views/` documentan qué datos junta cada endpoint y sirven de especificación para las consultas.

- **Una consulta por lectura:** con `relationJoins` activado, las relaciones anidadas se traen con un solo `JOIN` en lugar de una consulta por relación (el perfil del usuario pasó de unas 12 consultas a 1).
- **Solo los campos necesarios:** las listas usan `select` y no cargan los JSON del formulario ni del documento.
- **Lecturas en paralelo:** las consultas independientes van con `Promise.all` o `Promise.allSettled`, este último cuando importa el orden en que se informan los errores.
- **Inserciones en lote:** los pasos de un flujo se insertan con `createMany`.
- **bcrypt fuera del hilo principal:** las comparaciones y los hash de contraseña corren en hilos de trabajo (`utils/hashWorker.js`), así 50 inicios de sesión simultáneos no bloquean el servidor.
- **Pool de conexiones y precalentamiento:** el pool de `pg` tiene un tamaño fijo (`DB_POOL_SIZE`, 8 por defecto), dentro del límite del pooler de Supabase, y espera hasta 10 s por una conexión libre. Al arrancar se abren las primeras conexiones para que la primera petición no espere.
- **Saturación de la base:** se responde `503` reintentable en lugar de `500`.

---

## 6. Reglas que garantiza la base de datos

Los triggers e índices de `database/scripts/` sostienen las reglas aunque el código falle. El servidor valida antes para dar un mensaje claro y traduce los errores de la base a `400` o `409`. El detalle de cada trigger está en `docs/04`.

| Qué | Cómo |
|---|---|
| **Código del documento** | Al insertar una solicitud se genera `UP{unidad, 2 dígitos}-{año de Panamá}-{número de 4 dígitos}`, que reinicia cada año por unidad. |
| **Flujo de la solicitud** | `solicitudes.id_flujo` se toma de la versión y solo cambia mientras la solicitud está `PENDIENTE`. |
| **Fechas** | `fecha_resolucion` y `fecha_accion` se llenan al decidir; `ultimo_acceso`, al iniciar sesión. |
| **Historial inmutable** | Al decidir se copian el cargo, el área, el nombre y la cédula del aprobador. Una aprobación decidida no se modifica ni se borra. |
| **Paso de flujo válido** | Un paso solo acepta un titular con cuenta activa y rol `APROBADOR`. |
| **Flujo activo congelado** | En un flujo activo no se agregan, borran ni renumeran pasos; solo se cambia la persona de un paso por otra del mismo puesto. |
| **Una versión activa y una en borrador por plantilla** | Índices únicos parciales. Al publicar, la versión anterior pasa a `INACTIVO` antes de activar la nueva, en la misma transacción. |
| **Una firma activa por persona** | Índice único parcial. Una firma nueva desactiva la anterior; no la borra. |

---

## 7. Reglas de negocio del servidor

### 7.1 Alcance y acceso

- **Administrador:** solo su unidad. Un `codUnidad` ajeno en la petición responde `403`; un recurso de otra unidad, `404`.
- **Solicitante:** ve y solicita las plantillas `ACTIVO` de su unidad cuya `audiencia` incluye alguno de sus estamentos. Si la plantilla no le corresponde, `404`; si la versión dejó de estar activa, `409` al radicar.
- **Aprobador:** ve y decide solo sus propias aprobaciones.
- La cuenta, la persona y la asignación activas deciden quién ingresa, quién aparece en los catálogos y quién aprueba.

### 7.2 Flujos

- Pasos con secuencias consecutivas desde 1 y asignaciones vigentes de la unidad.
- **Solo aprobadores:** cada titular debe tener cuenta activa y rol `APROBADOR`; si no, `400 APROBADOR_INVALIDO`, con el campo del paso en `detalles`.
- **Personas distintas:** no se repite la asignación ni el titular, aunque sean cargos distintos de la misma persona (`400 VALIDACION_FALLIDA`).
- El `codigo` es único (`409 CONFLICTO_ESTADO`).
- Solo se editan flujos en borrador, y la edición reemplaza todos los pasos; un flujo activo responde `409`.
- Un flujo en borrador pertenece a la primera versión que lo usa; otra versión que lo use responde `409`.
- `GET /api/flows` devuelve solo los flujos activos.

### 7.3 Plantillas

- Al guardar y al publicar se valida el documento (`shared/documento/validar.js`): variables definidas y usadas, ids únicos, `select` con opciones, a lo sumo un bloque de firmas y exactamente uno si algún paso firma. El `patron` de un campo `text` solo puede ser uno de los tres formatos predefinidos, para que ninguna expresión regular trabe el servidor.
- **Publicar** ocurre en una sola transacción:
  1. Exige un flujo con al menos un paso.
  2. Vuelve a comprobar aprobadores y personas distintas con los titulares actuales (`409`).
  3. Pasa la versión activa anterior a `INACTIVO`.
  4. Activa la versión nueva y registra `fecha_public`.
  5. Activa el flujo.
- Las solicitudes en proceso conservan la versión y el flujo con los que se radicaron, aunque se publique otra versión o se desactive la plantilla.
- **Desactivar** pasa la versión activa a `INACTIVO` sin tocar las solicitudes en proceso.
- **Nueva versión** clona la versión activa o, si no hay, la de mayor número. Solo puede haber un borrador.
- **Plantilla nunca publicada** (su única versión es la 1 en borrador): admite cambiar la `audiencia` y eliminarla junto con su versión y su flujo en borrador. Una plantilla que ya se publicó responde `409`.
- Una versión activa es inmutable.
- Para el solicitante, `GET /api/templates/{id}` incluye `variablesSistema`, la vista previa de sus datos automáticos.

### 7.4 Solicitudes

- Cada respuesta de `datosJson` se valida contra su variable (`server/utils/validarRespuestas.js`). Las claves que no son variables de la versión se descartan.
- Al radicar se congelan las variables automáticas (`server/utils/sistemaVariables.js`).
- Si el titular del primer paso ya no puede aprobar, responde `409 APROBADOR_INVALIDO` y no se crea la solicitud.
- Se crea solo la primera aprobación; la siguiente se crea cuando la anterior se aprueba.
- En el detalle, los pasos decididos muestran los datos copiados al decidir, no los actuales.

### 7.5 Aprobaciones

- Solo decide el usuario asignado; para cualquier otro, o si no existe, `404`.
- Un paso ya decidido o una solicitud que ya no está `PENDIENTE` responde `409`.
- Rechazar exige `comentario` y cierra la solicitud como `RECHAZADO`. El comentario admite hasta 1000 caracteres.
- Aprobar un paso que firma vincula la firma activa del aprobador. Si no tiene, el paso se aprueba igual como visto bueno, sin imagen.
- Antes de crear el paso siguiente se comprueba que su titular puede aprobar; si no, `409 APROBADOR_INVALIDO` y la decisión no se registra.
- Aprobar el último paso cierra la solicitud como `APROBADO`.

### 7.6 Documento PDF

- Solo lo descarga el solicitante dueño, y solo con la solicitud `APROBADO` (`400` si está en otro estado; `404` para cualquier otra persona).
- Los aprobadores y administradores ven el documento en la vista previa, pero no lo descargan.
- Las firmas se entregan como URL firmadas temporales de Supabase Storage (bucket privado); no se guardan.

---

## 8. Módulos, endpoints y vistas

| Módulo | Endpoints | Vistas de referencia |
|---|---|---|
| `auth` | `POST /auth/login`, `GET /auth/me`, `POST /auth/password`, `POST /auth/logout` | — |
| `catalogs` / `flows` | `GET /catalogs/cargos`, `GET /flows`, `GET /flows/{id}`, `POST /flows`, `PUT /flows/{id}` | `v_cargos_autoridades`, `v_flujos_resumen`, `v_flujo_pasos` |
| `templates` | `GET /templates`, `GET /templates/summary`, `GET /templates/catalog`, `GET /templates/{id}`, `POST /templates`, `PUT /templates/{id}`, `DELETE /templates/{id}`, `POST …/versions`, `POST …/publish`, `POST …/deactivate` | `v_plantillas_inventario`, `v_plantillas_catalogo`, `v_plantillas_detalle`, `v_flujo_pasos` |
| `requests` | `POST /requests`, `GET /requests/me`, `GET /requests/{id}` | `v_mis_solicitudes`, `v_solicitudes_detalle`, `v_linea_tiempo_solicitudes`, `v_pasos_documento` |
| `approvals` | `GET /approvals/pending`, `GET /approvals/history`, `POST /approvals/{id}/decision` | `v_bandeja_aprobaciones`, `v_historial_aprobaciones` |
| `documents` | `GET /documents/{requestId}/pdf` | `v_pasos_documento` y el motor `shared/documento` |

---

## 9. Instalación y configuración

### 9.1 Base de datos

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta los scripts de `database/scripts/` en su editor SQL, en este orden:
   1. `siadu_schema.sql`: las tablas.
   2. `trigger/`: usuarios, solicitudes, flujos, aprobaciones y plantillas.
   3. `catalogos/01_roles.sql`: los roles `Administrador` y `Aprobador`.
   4. `siadu_views.sql`: las 13 vistas en una transacción.
   5. `userd_db.sql`: copia de `userd_db.example.sql` con la contraseña del usuario `siadu_app` (ignorado por git).
2. En *Storage*, crea un bucket **privado** llamado `firmas`.
3. Comprueba la instalación con estas consultas de solo lectura:

```sql
-- 13 vistas
SELECT count(*) FROM information_schema.views WHERE table_schema = 'public';

-- 13 triggers
SELECT count(*) FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public';

-- 3 índices únicos parciales
SELECT indexname FROM pg_indexes
WHERE indexname IN ('uk_versiones_activa', 'uk_versiones_borrador', 'uk_firmas_activa');
```

El repositorio no trae personas ni estructura institucional. Para entrar hacen falta al menos una unidad, una persona (`personal` o `estudiantes`), su cuenta en `usuarios` (contraseña con hash bcrypt) y, si administra o aprueba, su rol en `usuarios_roles`. Para aprobar, además, cargos, asignaciones y una firma activa.

El servidor se conecta con `siadu_app`, que tiene permisos mínimos: lectura general, inserción y actualización en las tablas operativas, y `DELETE` solo en las tablas de flujos y plantillas, donde los triggers impiden borrar lo publicado.

Las vistas se mantienen en `views/`; `siadu_views.sql` se regenera desde la raíz del repositorio:

```
node -e "const fs=require('fs'),p='database/scripts/';const v=fs.readdirSync(p+'views').filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync(p+'views/'+f,'utf8').trimEnd()).join('\n\n');fs.writeFileSync(p+'siadu_views.sql','-- Las 13 vistas de views/ en una transacción\n\nBEGIN;\n\n'+v+'\n\nCOMMIT;\n')"
```

### 9.2 Servidor

Las variables van en `ecosystem.config.js`, copia local de `ecosystem.config.example.js` ignorada por git. PM2 las inyecta; el proyecto no usa `dotenv`.

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Supabase (puerto 5432) con el usuario `siadu_app`. Los símbolos de la contraseña van codificados (`$` como `%24`). La conexión va cifrada, salvo con una base local o `sslmode=disable`. |
| `JWT_SECRET` | Secreto de los tokens: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. |
| `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` | URL del proyecto y clave secreta, para leer las firmas del bucket privado. |
| `PUPPETEER_EXECUTABLE_PATH` | Ruta de Chrome o Edge para generar el PDF fuera de Docker. |
| `EXPIRESIN` | Duración del token (por ejemplo `2h`); mínimo 2 horas y, sin valor, 8. |

`npm run dev` arranca el servidor en `http://localhost:7001`. El resto de la configuración (pool de conexiones, caché, proxy) tiene valores por defecto en el código.

### 9.3 Seguridad

- **Cabeceras y política de contenido:** `middleware/seguridad.js` aplica `helmet` con una CSP estricta. El servidor pone un nonce en `index.html` y el script de paginación de la vista previa lo lleva en su etiqueta; cualquier otro script en línea se bloquea.
- **Límite de intentos del login:** 8 fallidos por cuenta e IP, o 100 por IP, cada 15 minutos; después responde `429` con `Retry-After`. Detrás de un balanceador, `TRUST_PROXY` indica los saltos de proxy para tomar la IP real del cliente.
- **Límites de peticiones:** 300 por minuto por usuario (o por IP sin sesión) en toda la API, y 30 PDF cada 10 minutos por usuario.
- **Sesiones revocables:** el token lleva la `version_sesion` del usuario. Cerrar sesión o cambiar la contraseña la incrementa y los tokens anteriores dejan de valer; el cambio de contraseña entrega un token nuevo para la sesión actual.
- **Registro de seguridad:** `logger.evento` escribe líneas JSON (`LOGIN_OK`, `LOGIN_FALLIDO`, `LOGIN_BLOQUEADO`, `LOGOUT`, `PASSWORD_CAMBIADA`, `DECISION_REGISTRADA`, `API_LIMITADA`, `PDF_LIMITADO`) con la IP y el identificador enmascarado, nunca contraseñas ni tokens.
- **PDF sin red:** Chromium bloquea toda petición que no sea `data:`; los logos y las firmas se incrustan antes de imprimir.

### 9.4 Cliente sin servidor (mocks)

`npm run dev:mocks` (dentro de `client/`) levanta la interfaz con la API simulada del contrato (`client/mock-server/`) y datos ficticios. Las cuentas de prueba están en `client/mock-server/roles.mock.js`; por ejemplo, la cédula `9-000-0001` con la contraseña `admin` entra con los tres roles.

Con `npm run dev`, el cliente envía `/api` al servidor en `http://localhost:7001` (proxy de `client/vite.config.js`); si no hay servidor, la interfaz lo avisa.

---

## 10. Pruebas

| Qué | Cómo |
|---|---|
| **Todo de una vez** | `npm test` en la raíz corre las pruebas del servidor y las del motor; `npm run lint` revisa server, shared y client con ESLint. |
| **Pruebas unitarias del servidor** | `cd server && npm test`: reglas de cada módulo, seguridad y sesiones, con la base simulada. |
| **Pruebas del motor del documento** | `cd shared && npm test` (pruebas en `shared/tests/`). |
| **Pruebas de integración** | `cd server && npm run test:integration` con `DATABASE_URL_TEST` apuntando a una base PostgreSQL cuyo nombre termine en `_test` (su esquema se borra). Crean la base con los scripts del repositorio, cargan datos ficticios y recorren el ciclo con el usuario `siadu_app`: publicar, solicitar, aprobar, rechazar, permisos, PDF y revocación de sesión (al cerrarla y al quitar un rol). Sin la variable se omiten; el PDF necesita Chromium. |
| **Contrato** | `docs/api/openapi.yaml` se puede abrir en [Swagger Editor](https://editor.swagger.io); `npm run mock` dentro de `docs/api` levanta un servidor simulado con Prism en el puerto 4010. |

---

## 11. Límites conocidos

- **Relevo de titular** (por ejemplo, un nuevo decano): las asignaciones administrativas se cargan fuera del sistema. El servidor vuelve a comprobar los aprobadores al publicar y al avanzar cada paso.
- **Delegación de aprobaciones y gestión de usuarios:** fuera del alcance.
- **Un aprobador puede solicitar** un trámite en cuyo flujo participa.
- **Flujos en borrador sin plantilla** quedan guardados; no hay una operación para eliminarlos.
- **Unidades:** todas las unidades actuales son facultades.

# Contratos de API — SIADU

> Especificación OpenAPI 3.0 de la API, por módulo. Es la fuente de verdad entre el frontend y el backend.

---

## Formato

Cada módulo tiene su propio archivo YAML. Los esquemas, enums y errores comunes viven en `common.yaml` y se referencian con `$ref`.

```
docs/api/
├── common.yaml        ← Componentes compartidos (errores, enums, VariableFormulario, PasoFlujo, CargoResumen)
├── auth.yaml          ← Autenticación, cambio de contraseña y perfil
├── catalogs.yaml      ← Catálogo de cargos y flujos de aprobación
├── templates.yaml     ← Plantillas, versiones y publicación
├── requests.yaml      ← Solicitudes del solicitante
├── approvals.yaml     ← Bandeja y decisiones del aprobador
├── documents.yaml     ← PDF oficial de solicitudes aprobadas
├── openapi.root.yaml  ← Raíz que enlaza los módulos
├── openapi.yaml       ← Generado con `npm run bundle`; no se edita a mano
├── package.json       ← Scripts del contrato: bundle, lint y mock
└── redocly.yaml       ← Reglas de validación
```

Para referenciar un componente compartido:

```yaml
responses:
  "401":
    $ref: "./common.yaml#/components/responses/NoAutenticado"
```

---

## Convenciones

| Tema | Regla |
| :--- | :--- |
| **Rutas** | En inglés: `/api/templates`, `/api/requests/:id`, `/api/catalogs/cargos` |
| **Campos JSON** | Español en `camelCase`: `idUsuario`, `codUnidad`, `variableFormJson`, `datosJson` |
| **Enums** | En mayúsculas, con los valores de los `CHECK` de la base: `ACTIVO`, `BORRADOR`, `PENDIENTE` |
| **IDs** | `integer` (los `BIGINT` de PostgreSQL se serializan como `Number`) |
| **Fechas** | ISO-8601 en UTC |
| **Listas** | Inventarios e historiales (`/api/templates`, `/api/approvals/history`): paginados `{ total, pagina, limite, totalPaginas, datos }`. Listas personales (`/api/requests/me`, `/api/approvals/pending`) y catálogos: arreglo |
| **Objeto** | Recurso directo en JSON |
| **Error** | `{ "error": { "codigo", "mensaje", "detalles": [{ "campo", "mensaje" }] } }` |
| **Códigos HTTP** | 400 validación · 401 sin sesión · 403 sin permiso · 404 no existe · 409 conflicto · 429 demasiadas peticiones · 500 error · 503 servicio saturado |
| **Seguridad** | `bearerAuth` global; los endpoints públicos declaran `security: []` |

---

## Decisiones de diseño

| # | Tema | Decisión |
| :-- | :--- | :--- |
| 1 | Estados de solicitud | `PENDIENTE`, `APROBADO` y `RECHAZADO`. |
| 2 | Delegación | Fuera de alcance: el aprobador solo aprueba o rechaza. |
| 3 | Flujo de aprobación | Entidad reutilizable por unidad (`flujos` y `flujo_pasos`), vinculada a la plantilla mediante `idFlujo`. |
| 4 | Aprobador de cada paso | Lo determina el cargo asignado en la unidad. La bandeja muestra las aprobaciones `PENDIENTE` del usuario. |
| 5 | Nombres de campos | `camelCase` en peticiones y respuestas. |
| 6 | Documento final | Se genera en el backend con Chromium, con marca de agua institucional y estampas de estado. |
| 7 | Roles y estamentos | `roles` (`ADMINISTRADOR`, `APROBADOR`, `SOLICITANTE`) para permisos y navegación; `estamentos` (`ESTUDIANTE`, `PROFESOR`, `ADMINISTRATIVO`) para filtrar el catálogo y precargar datos. |
| 8 | Login | `identificador` = correo institucional o cédula. JWT HS256 con duración configurable (mínimo 2 horas; 8 por defecto). Sin renovación de token. |
| 9 | Solicitud y plantilla | `POST /api/requests` recibe solo `idVersion`, que identifica plantilla, formulario, diseño y flujo. Una versión que ya no está `ACTIVO` responde `409`. |
| 10 | Cierre de sesión | `POST /api/auth/logout` revoca todas las sesiones del usuario: el token lleva la versión de sesión y el servidor la compara en cada petición. |
| 11 | Rol `SOLICITANTE` | Implícito para todo usuario activo; se suma a `APROBADOR` o `ADMINISTRADOR`. |
| 12 | Código de documento | `UP{código de la unidad, 2 dígitos}-{año}-{número de 4 dígitos}`; el número reinicia cada año por unidad. |
| 13 | Fuera de alcance | Hash del documento, motivo breve en la bandeja y departamentos del profesor. |
| 14 | Cédula | Obligatoria en la respuesta del login y de `/auth/me`. |
| 15 | Flujos: borrador y activo | `BORRADOR` es editable y pertenece a una versión; `ACTIVO` es reutilizable y no cambia de estructura. Pasa a `ACTIVO` al publicar la plantilla que lo usa. |
| 16 | Solo aprobadores en un flujo | Un paso solo admite un titular con cuenta activa y rol `APROBADOR`. Se valida al crear, editar y publicar (`APROBADOR_INVALIDO`). |
| 17 | Historial inmutable | Al decidir se guardan cargo, área, nombre y cédula del aprobador; una aprobación decidida no se modifica. |
| 18 | Documentos en proceso | Las solicitudes conservan la versión y el flujo con que se radicaron; publicar o desactivar una versión no las cambia. |
| 19 | PDF | Solo lo descarga el solicitante dueño. Aprobadores y administradores ven la vista previa. |
| 20 | Relevo de titular | Las asignaciones administrativas se cargan fuera del sistema. La base protege el historial y limita los cambios de un flujo activo a personas del mismo puesto. |
| 21 | Firmas | Imágenes en un almacenamiento privado. La base guarda la ruta del objeto y la API entrega `firmaUrl` firmada y temporal. Una firma activa por persona. |
| 22 | Unidad de la solicitud | `solicitudes.cod_unidad` es la unidad de la plantilla. |
| 23 | Alcance por unidad | El administrador trabaja solo con su unidad (otra unidad: `403`). El solicitante solo ve y solicita plantillas de su unidad. |
| 24 | Audiencia | El solicitante solo ve plantillas cuya `audiencia` incluye alguno de sus estamentos. |
| 25 | Perfil activo | El acceso, el catálogo y `esAprobador` exigen cuenta, persona y asignación activas. |
| 26 | Desactivar una versión | `POST /api/templates/{id}/deactivate` retira el trámite del catálogo; las solicitudes en proceso continúan. |
| 27 | Límites conocidos | No se impide que un aprobador solicite un trámite en cuyo flujo participa. Un cambio de titular que deje a una persona en dos pasos es responsabilidad de quien carga las asignaciones. |
| 28 | Visto bueno sin firma | Un paso con `reqFirma: false` solo revisa. Si el paso exige firma y el aprobador no tiene una activa, la aprobación se registra sin firma. |
| 29 | Aprobación ajena | Decidir una aprobación de otro usuario, o inexistente, responde `404`. |
| 30 | Flujo en borrador | Pertenece a la versión que lo construye; otra versión que lo use recibe `409`. |
| 31 | Resumen de plantillas | `GET /api/templates/summary` entrega en una llamada los totales por estado de la versión vigente. |
| 32 | Estado de la cuenta en caché | El servidor guarda unos segundos el estado de cada cuenta; una cuenta desactivada deja de funcionar al vencer esa caché. |
| 33 | Servidor saturado | Sin conexión a la base disponible a tiempo, responde `503 SERVICIO_NO_DISPONIBLE` con `Retry-After`. |
| 34 | Plantilla nunca publicada | Con su única versión en `BORRADOR` se puede cambiar la `audiencia` y eliminar la plantilla. Una vez publicada, la audiencia queda fija y solo se desactiva. |
| 35 | Límites de peticiones | `429` con `Retry-After`: intentos fallidos de login (`DEMASIADOS_INTENTOS`), peticiones por minuto y descargas de PDF (`DEMASIADAS_SOLICITUDES`). |

---

## Reglas

1. **El contrato es la fuente de verdad:** el servidor y los mocks responden lo que define.
2. **Un archivo por módulo;** lo compartido va en `common.yaml`.
3. **Cada operación declara** sus respuestas exitosas y sus errores esperados.
4. **`openapi.yaml` se genera** desde los módulos con `npm run bundle` y se valida con `npm run lint`.
5. **Todos los archivos comparten `info.version`**, incluido `openapi.root.yaml`.

---

## Herramientas

Dentro de `docs/api`:

| Comando | Uso |
|---------|-----|
| `npm run lint` | Valida los módulos y el contrato unificado con [Redocly CLI](https://redocly.com/docs/cli/) |
| `npm run bundle` | Genera `openapi.yaml` |
| `npm run mock` | Servidor simulado del contrato con [Prism](https://stoplight.io/open-source/prism), en `http://localhost:4010` |

El contrato también se puede abrir en [Swagger Editor](https://editor.swagger.io) o importar en Postman.

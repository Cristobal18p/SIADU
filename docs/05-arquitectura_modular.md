# Arquitectura Modular — SIADU

> Estructura de carpetas, capas y módulos del backend y del frontend.

---

## Estructura de carpetas

```
SIADU/
├── server/
│   ├── app.js                        ← Seguridad, límites y registro central de módulos
│   ├── bin/www                       ← Punto de entrada (arranque y apagado ordenado)
│   ├── config/
│   │   ├── prisma.js                 ← Prisma Client con el adaptador de pg (compartido por todos los módulos)
│   │   ├── pool.js                   ← Pool de pg: tamaño, espera y SSL
│   │   ├── precalentar.js            ← Conexiones abiertas al arrancar
│   │   └── token.js                  ← Secreto y duración del JWT
│   ├── middleware/
│   │   ├── auth.js                   ← Verifica el JWT y la sesión → adjunta req.user
│   │   ├── roles.js                  ← requireRole('ADMINISTRADOR', …)
│   │   ├── seguridad.js              ← Cabeceras, política de contenido y límites de peticiones
│   │   └── errores.js                ← Cuerpo de la petición y errores no controlados
│   ├── prisma/schema/                ← Esquema de Prisma por área
│   ├── utils/                        ← Respuestas de error, caché de cuenta, hash, Storage, validaciones…
│   └── modules/
│       ├── auth/                     ← Login, perfil, cambio de contraseña y cierre de sesión
│       ├── catalogs/                 ← Cargos y autoridades
│       ├── flows/                    ← Flujos de aprobación
│       ├── templates/                ← Plantillas y sus versiones
│       ├── requests/                 ← Solicitudes
│       ├── approvals/                ← Bandeja, historial y decisiones
│       └── documents/                ← PDF oficial
│       (cada uno: <módulo>.routes.js, <módulo>.controller.js y <módulo>.service.js)
│   └── tests/                        ← unit/ (base simulada) e integration/ (PostgreSQL)
│
├── client/
│   ├── mock-server/                  ← API simulada del contrato, con datos ficticios
│   └── src/
│       ├── api/
│       │   ├── http.js               ← Cliente axios base (inyecta el JWT y unifica los errores)
│       │   ├── auth.api.js
│       │   ├── catalogs.api.js
│       │   ├── templates.api.js
│       │   ├── requests.api.js
│       │   ├── approvals.api.js
│       │   ├── documents.api.js
│       │   └── tipos.js              ← Tipos JSDoc del contrato
│       ├── components/
│       │   ├── ui/                   ← Botones, campos, tablas, modales, estados vacíos…
│       │   ├── editor/               ← Editor TipTap, sus extensiones y barra de herramientas
│       │   ├── documento/            ← Vista previa y miniatura del documento
│       │   └── layout/               ← Estructura de la aplicación y mesa de trabajo
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── CambioPassword.jsx
│       │   ├── inicio/               ← Panel de inicio por rol
│       │   ├── admin/                ← Inventario de plantillas y constructor
│       │   ├── solicitudes/          ← Nueva solicitud (formulario dinámico) y mis solicitudes
│       │   ├── aprobador/            ← Bandeja, revisión e historial
│       │   └── documentos/           ← Documentos aprobados
│       ├── hooks/
│       └── utils/                    ← Validaciones, formato y variables del formulario
│
├── shared/
│   ├── documento/                    ← Motor único del documento: lo usan el editor, la vista previa y el PDF
│   └── tests/                        ← Pruebas del motor
│
└── docs/
    └── 05-arquitectura_modular.md    ← Este documento
```

---

## Responsabilidad de cada capa

| Archivo | Responsabilidad | Fuera de su responsabilidad |
|---------|----------------|----------------------|
| `.routes.js` | Definir endpoints y aplicar middlewares | Lógica de negocio |
| `.controller.js` | Recibir `req`, llamar al service, responder | Queries a BD |
| `.service.js` | Lógica de negocio y acceso a BD via Prisma | Tocar `req`/`res` |
| `middleware/auth.js` | Verificar JWT y adjuntar `req.user` | Lógica de módulo |
| `middleware/roles.js` | Autorizar por rol | Autenticación |
| `config/prisma.js` | Exportar el cliente de Prisma (singleton) | Cualquier otra cosa |

---

## Módulos del backend y sus endpoints

Todos los payloads usan `camelCase`. Las 26 operaciones, con sus datos y errores, están en el contrato [`docs/api`](api); la relación entre cada módulo, sus endpoints y las vistas de la base está en [`08-guia-desarrollo.md`](08-guia-desarrollo.md) §8.

| Módulo | Ruta base | Para qué |
|---|---|---|
| `auth` | `/api/auth` | Login, perfil, cambio de contraseña y cierre de sesión |
| `catalogs` | `/api/catalogs` | Cargos de autoridad de la unidad |
| `flows` | `/api/flows` | Flujos de aprobación |
| `templates` | `/api/templates` | Inventario, catálogo, constructor, versiones y publicación |
| `requests` | `/api/requests` | Radicar solicitudes y consultar su detalle |
| `approvals` | `/api/approvals` | Bandeja, historial y decisiones |
| `documents` | `/api/documents` | PDF oficial de las solicitudes aprobadas |

La vista previa no tiene endpoint propio: el cliente la arma con `GET /api/requests/:id` y el motor `shared/documento`.

---

## Formulario dinámico

El sistema genera el formulario web a partir de las variables de cada plantilla (`variableFormJson.variables`).
Es **100 % frontend**: no hay endpoints propios, y el servidor repite cada validación al radicar.

### Flujo completo

```
[El administrador diseña la plantilla en el editor TipTap]
        │  guarda variableFormJson: { variables: [{ id, etiqueta, tipo, … }] }
        ▼
[El solicitante abre NuevaSolicitudPage]
        │  GET /api/templates/:id
        ▼
[FormularioDinamico.jsx recibe las variables]
        │  un campo por variable según su tipo; DatosAutomaticos muestra los datos de la sesión
        ▼
[El solicitante completa y envía]
        │  POST /api/requests { idVersion, datosJson: { … } }
        ▼
[La vista previa y el PDF inyectan datosJson en disenoFormJson (shared/documento)]
```

### Tipos de campo (`variableFormJson.variables[]`)

`FormularioDinamico.jsx` dibuja cada tipo con los componentes de `components/ui` (`Field` y `Checkbox`):

| Tipo (`tipo`) | Se muestra como | Ejemplo de campo |
|---|---|---|
| `text` | Campo de texto | Código de asignatura, nombre |
| `textarea` | Área de texto | Justificación, carta de motivos |
| `number` | Campo numérico (con `min`, `max` y decimales) | Calificación reclamada, créditos |
| `date` | Selector de fecha (fechas pasadas o futuras) | Fecha de inasistencia, cita |
| `select` | Lista o grupo de opciones, con «Otro» opcional | Motivo de retiro, sede |
| `checkbox` | Casilla | Declaración jurada de veracidad |

> **Formato:** cada variable es un objeto dentro de `variableFormJson`:
> `{ id, etiqueta, tipo, requerido, placeholder, validaciones, opciones }`.

---

## Reglas de aislamiento entre módulos

1. **Los módulos se comunican solo por sus servicios.**
   `requests` y `templates` usan `auth.service` para el perfil del usuario, y `documents` usa `requests.service` para leer la solicitud. Ningún módulo usa las rutas ni los controladores de otro.

2. **Lo compartido vive en `/middleware/` o `/utils/`, nunca dentro de un módulo.**
   El JWT se verifica en `middleware/auth.js` y se reutiliza en todos los módulos.

3. **Un error en un módulo no afecta al resto.**
   Cada controlador traduce los errores de su servicio a la respuesta del contrato con `utils/errorResponse.js`;
   lo no controlado responde `500` (o `503` si la base está saturada) sin exponer el detalle.

4. **Cada módulo es una carpeta registrada con una línea en `app.js`.**

---

## Flujo institucional del documento (Cadena Secuencial de Aprobación)

```
Solicitante       Paso 1 (ej. Secretaria)    Paso 2 (ej. Director)       Cierre
     │                       │                          │                   │
     │─ POST /requests ─────►│                          │                   │
     │  (estado: PENDIENTE)  │─ POST /decision ────────►│                   │
     │                       │  (APROBADO: avanza paso) │─ POST /decision ─►│
     │                       │                          │  (APROBADO final) │
     │◄──────────────────────┴──────────────────────────┴───────────────────┤
     │  GET /documents/:requestId/pdf (Solo si estado === APROBADO)         │
```

# 01 — Arquitectura

SIADU combina un backend Node.js con Express y un frontend React de una sola página (SPA). El frontend se compila a archivos estáticos y Express los sirve junto con la API.

- **Producción:** imagen de Docker con Node y Chromium (`docs/09-despliegue.md`).
- **Desarrollo local:** PM2 gestiona el proceso (`npm run dev`, `npm run logs`).

---

## 1. Tecnologías

| Capa | Tecnología |
| :--- | :--- |
| Backend | Node.js 24 + Express |
| ORM | Prisma 7 con el adaptador de `pg` |
| Frontend | React, React Router 7, Vite y Tailwind CSS |
| Editor del documento | TipTap 3 |
| Base de datos | PostgreSQL en Supabase |
| Almacenamiento | Supabase Storage (firmas, bucket privado) |
| PDF | `puppeteer-core` con Chromium |
| Seguridad | `helmet`, `express-rate-limit`, JWT y bcrypt |
| Pruebas | `node:test` |

---

## 2. Estructura de carpetas

```
SIADU/
├── package.json                     ← Scripts del proyecto (instalar, compilar, arrancar)
├── ecosystem.config.example.js      ← Plantilla de PM2 y variables de entorno
├── Dockerfile                       ← Imagen con Node y Chromium para el PDF
│
├── server/                          ← Backend (API REST con Express)
│   ├── app.js                       ← Seguridad, límites, archivos estáticos y registro de módulos
│   ├── bin/www                      ← Arranque y apagado ordenado
│   ├── config/                      ← Prisma, pool de conexiones, precalentamiento y token
│   ├── middleware/                  ← Autenticación, roles, seguridad y errores
│   ├── modules/                     ← auth, catalogs, flows, templates, requests, approvals, documents
│   ├── prisma/schema/               ← Esquema de Prisma por área
│   ├── utils/                       ← Errores, caché de cuenta, bcrypt en hilos, Storage, validaciones
│   └── tests/
│       ├── unit/                    ← Pruebas con la base simulada
│       └── integration/             ← Ciclo completo contra PostgreSQL
│
├── client/                          ← Frontend (React con Vite)
│   ├── index.html
│   ├── vite.config.js
│   ├── mock-server/                 ← API simulada con datos ficticios (npm run dev:mocks)
│   ├── public/                      ← Favicon y logos institucionales (logos/)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                  ← Sesión, rutas por rol y navegación
│       ├── index.css                ← Tailwind y estilos base
│       ├── api/                     ← Cliente HTTP (axios) por módulo y tipos del contrato
│       ├── pages/                   ← Pantallas: inicio, solicitudes, documentos, aprobador, admin
│       ├── components/              ← ui, editor, documento y layout
│       ├── hooks/                   ← Hooks reutilizables
│       ├── utils/                   ← Validaciones, formato, variables y logos
│       └── assets/images/           ← Imágenes de fondo
│
├── shared/                          ← Código común al cliente y al servidor
│   ├── documento/                   ← Motor del documento (editor, vista previa y PDF)
│   └── tests/                       ← Pruebas del motor
│
├── database/scripts/                ← PostgreSQL
│   ├── siadu_schema.sql             ← Tablas
│   ├── trigger/                     ← Triggers por tabla
│   ├── views/                       ← Vistas, una por archivo
│   ├── siadu_views.sql              ← Las vistas en una transacción
│   ├── catalogos/01_roles.sql       ← Roles Administrador y Aprobador
│   └── userd_db.example.sql         ← Usuario de la aplicación con permisos mínimos
│
├── docs/                            ← Documentación técnica
│   └── api/                         ← Contrato OpenAPI
│
└── logs/                            ← Registros de PM2 (ignorados por git)
```

---

## 3. Flujo de conexión

```
[Navegador]
     │ HTTPS
     ▼
[Servidor Express]
     │
     ├── GET /*        → Aplicación React (archivos estáticos)
     └── GET/POST /api → API REST
              │
              ▼
     [Supabase — PostgreSQL + Storage]
```

- Express sirve la aplicación compilada; `index.html` lleva el nonce de la política de contenido de cada respuesta.
- Todas las peticiones de datos van a `/api/*`: el frontend nunca accede a la base.
- El servidor se conecta a PostgreSQL con Prisma, usando un usuario con permisos mínimos (`siadu_app`).
- Supabase Storage guarda solo las firmas; los logos son archivos estáticos y los PDF no se guardan.
- La autenticación es propia (JWT firmado por el servidor); no se usa Supabase Auth.

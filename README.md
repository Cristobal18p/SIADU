<div align="center">

# SIADU

**Sistema Integral de Automatización de Documentos Universitarios**


[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TipTap](https://img.shields.io/badge/TipTap-0D0D0D?style=for-the-badge&logo=tiptap&logoColor=white)](https://tiptap.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)

</div>

---

## Descripción

**SIADU** es la plataforma diseñada para centralizar la gestión de trámites y documentos oficiales de la **Facultad de Informática, Electrónica y Comunicación (FIEC)** de la **Universidad de Panamá**.

El núcleo del sistema es un **constructor visual de documentos controlado**: las autoridades y administradores diseñan cualquier plantilla institucional con la certeza de que el formato, la tipografía y los membretes serán exactamente los mismos al emitirse.

## ¿Cómo funciona?

1. **Diseño de plantillas.** El administrador redacta la plantilla e inserta campos variables: datos del estudiante, fechas, motivos y sellos de firma.
2. **Formularios autogenerados.** El sistema lee las variables de la plantilla y genera el formulario web del solicitante, sin programar pantallas distintas para cada trámite.
3. **Flujo de aprobación.** La solicitud pasa en orden por los cargos que corresponden (director, decano, secretaría), y cada aprobador la valida con su firma autorizada.
4. **Documento oficial.** Al completarse el flujo, el solicitante descarga el oficio en **PDF**, generado en el momento con los datos de la solicitud y las firmas. Los PDF no se guardan: solo se conservan los datos de la solicitud.

## Quiénes lo usan

| Rol | Qué hace |
|:----|:---------|
| **Solicitante** | Estudiantes y personal que piden un trámite desde el celular o el computador y descargan su documento aprobado. |
| **Aprobador** | Autoridades que revisan y firman las solicitudes de su escuela o departamento. |
| **Administrador** | Diseña las plantillas, define los flujos de aprobación y gestiona los catálogos. |

## Probarlo en un minuto (sin base de datos)

El cliente trae una API simulada del contrato con datos ficticios. Con Node.js 24:

```bash
cd client
npm install
npm run dev:mocks
```

Abre `http://localhost:5173` y entra con la cédula `9-000-0001` y la contraseña `admin` (estamento *Estudiante*): esa cuenta tiene los tres roles. Las demás cuentas de prueba están en `client/mock-server/roles.mock.js`.

## Ejecutarlo completo

1. **Base de datos:** crea un proyecto en Supabase y ejecuta los scripts de `database/scripts/` en el orden de [`docs/08-guia-desarrollo.md`](docs/08-guia-desarrollo.md) §9. El repositorio trae la estructura (tablas, triggers, vistas y roles); los datos los carga quien instala.
2. **Configuración:** copia `ecosystem.config.example.js` a `ecosystem.config.js` y completa las variables.
3. **Instalar y compilar:** `npm run install:all` y luego `npm run build:client`.
4. **Arrancar:** `npm run dev` (con PM2, en `http://localhost:7001`) o `npm start`.

En producción se despliega con Docker: la imagen incluye Chromium para generar el PDF ([`docs/09-despliegue.md`](docs/09-despliegue.md)).

## Documentación

| Documento | Contenido |
|:----------|:----------|
| [`01-arquitectura`](docs/01-arquitectura.md) | Stack, estructura de carpetas y flujo de conexión. |
| [`02-requerimientos`](docs/02-requerimientos.md) | Objetivo, roles y requerimientos. |
| [`03-constructor-documentos`](docs/03-constructor-documentos.md) | El editor de plantillas y los datos automáticos. |
| [`04-listas-triggers`](docs/04-listas-triggers.md) | Las reglas que aplica la propia base de datos. |
| [`05-arquitectura_modular`](docs/05-arquitectura_modular.md) | Módulos del backend y del frontend. |
| [`06-motor-documentos-oficiales`](docs/06-motor-documentos-oficiales.md) | Cómo se arma el documento y el PDF. |
| [`07-pantallas`](docs/07-pantallas.md) | Ciclo del trámite, reglas del flujo y pantallas. |
| [`08-guia-desarrollo`](docs/08-guia-desarrollo.md) | Reglas de negocio, seguridad, instalación y pruebas. |
| [`09-despliegue`](docs/09-despliegue.md) | Imagen de Docker, variables, publicación y problemas frecuentes. |
| [`api/`](docs/api) | Contrato OpenAPI, fuente de verdad entre frontend y backend. |

## Equipo de desarrollo

Desarrollado por **Cristobal Prados** ([@cristobal18p](https://github.com/cristobal18p)), con la colaboración de Carlos González ([@code-carlos12](https://github.com/code-carlos12)).

## Licencia

El código se distribuye bajo la licencia [MIT](LICENSE). Los logos de la Universidad de Panamá y de la FIEC pertenecen a la Universidad de Panamá y no están incluidos en esa licencia.


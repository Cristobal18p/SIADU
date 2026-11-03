# 07 — Ciclo del trámite y pantallas

## 1. Ciclo de un trámite

```
[1. Administrador]               [2. Solicitante]              [3. Aprobadores]              [4. Cierre]
Crea y publica la plantilla ──>  Llena el formulario     ──>   Revisan el documento    ──>   El solicitante descarga
con sus variables y su           y envía la solicitud          en orden y deciden            el PDF oficial
flujo de cargos                                                (aprobar o rechazar)
```

---

## 2. Reglas del flujo

- **Cadena secuencial:** el flujo es una lista ordenada de cargos (por ejemplo, `1. Secretaría` → `2. Director` → `3. Decano`). Solo el titular del paso actual ve la solicitud en su bandeja; al aprobar, pasa al siguiente.
- **Pasos por escuela:** un paso puede resolverse con el titular del cargo en la escuela del solicitante (por ejemplo, el director de su escuela).
- **Rechazo:** si cualquier paso rechaza, con un motivo obligatorio, la solicitud termina como `RECHAZADO` y no avanza más.
- **Tres estados:** `PENDIENTE`, `APROBADO` y `RECHAZADO`. Una solicitud no se devuelve para corregirla.
- **Sin delegación:** decide solo el titular asignado al paso.
- **Catálogo por estamento:** el solicitante ve las plantillas publicadas de su unidad cuya audiencia incluye su estamento (`ESTUDIANTE`, `PROFESOR` o `ADMINISTRATIVO`).

---

## 3. Pantallas

Todas las pantallas autenticadas comparten `components/layout/AppLayout.jsx`: barra lateral con las opciones del rol (desplegable en el móvil), cabecera con la ruta de navegación y el usuario, e indicador de pendientes en la bandeja. El solicitante y el aprobador usan la aplicación desde el móvil; las pantallas del administrador requieren un ancho de escritorio (1024 px o más).

| Rol | Ruta | Archivo en `client/src/pages/` | Qué muestra |
| :--- | :--- | :--- | :--- |
| Todos | `/login` | `Login.jsx` | Acceso con cédula o correo y elección del estamento. |
| Todos | (primer acceso) | `CambioPassword.jsx` | Cambio obligatorio de la contraseña inicial. |
| Todos | `/inicio` | `inicio/InicioPage.jsx` | Panel según el rol; con varios roles, pestañas para alternar. |
| Solicitante | `/solicitante/nueva-solicitud` | `solicitudes/NuevaSolicitudPage.jsx` | Catálogo de trámites y formulario generado de la versión activa. |
| Solicitante | `/solicitante/mis-solicitudes` | `solicitudes/MisSolicitudesPage.jsx` | Solicitudes con su estado y paso actual. |
| Solicitante | `/solicitante/mis-solicitudes/{id}` | `solicitudes/SolicitudDetallePage.jsx` | Estado, ruta de aprobación, motivo de rechazo y vista previa del documento. |
| Solicitante | `/solicitante/documentos` | `documentos/DocumentosPage.jsx` | Documentos aprobados con miniatura, filtros y descarga del PDF. |
| Aprobador | `/aprobador/bandeja` | `aprobador/BandejaPage.jsx` | Solicitudes pendientes de su cargo. |
| Aprobador | `/aprobador/bandeja/{id}` | `aprobador/RevisionPage.jsx` | Datos del solicitante, ruta de aprobación, documento y decisión. |
| Aprobador | `/aprobador/historial` | `aprobador/HistorialPage.jsx` | Decisiones tomadas, con filtros por decisión y fechas. |
| Administrador | `/admin/plantillas` | `admin/PlantillasPage.jsx` | Inventario de la unidad por estado, con búsqueda y acciones de versión. |
| Administrador | `/admin/editor` y `/admin/editor/{id}` | `admin/constructor/ConstructorPage.jsx` | Asistente de tres pasos: datos básicos, documento con su flujo y resumen. |

---

## 4. Revisión del aprobador

- **Panel de decisión:** ficha del solicitante, ruta de aprobación (pasos firmados, paso actual y pasos siguientes) y los botones **Aprobar** y **Rechazar**. Rechazar exige un motivo.
- **Documento:** la hoja Carta con el membrete y las variables reemplazadas por las respuestas, tal como quedará en el PDF.

## 5. Formulario del solicitante

- Sale de `variableFormJson.variables` de la versión activa: texto, texto largo, número, fecha, selección y casilla, con sus validaciones (`requerido`, `min`, `max`, patrones).
- Las variables automáticas (nombre, cédula, correo, carrera, escuela, unidad, cargo, fecha de emisión y código del documento) no se preguntan: el servidor las toma del perfil y las congela al radicar.

## 6. Vista previa y descarga

- **Administrador:** vista previa de la plantilla con datos de ejemplo, a partir del JSON del borrador.
- **Solicitante y aprobador:** vista previa de la solicitud con los datos de `GET /api/requests/{id}`: las respuestas, las variables congeladas y la firma de cada paso aprobado. Muestra la marca de agua de su estado (`docs/06` §3).
- **PDF:** solo el solicitante dueño y solo con la solicitud `APROBADO` (`GET /api/documents/{requestId}/pdf`). Se genera en el servidor en cada descarga y no se guarda.
- **Almacenamiento:** Supabase Storage guarda solo las imágenes de las firmas, en un bucket privado. Los logos son archivos estáticos del cliente.

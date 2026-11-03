# 04 — Triggers de la base de datos

> Los 13 triggers de la base, verificados contra una base cargada con los scripts de `database/scripts/`. La sección 3 lista la lógica que resuelve el servidor y no la base.
> **Scripts:** `database/scripts/trigger/`. Se ejecutan después de `siadu_schema.sql`.

---

## 1. Los 13 triggers que existen

| # | Tabla | Trigger | Momento | Qué hace |
|---|---|---|---|---|
| 1 | `usuarios` | `trg_usuarios_actualizar_ultimo_acceso` | BEFORE UPDATE OF `ultimo_acceso` | Si se intenta dejar `ultimo_acceso` en nulo o sin cambio, lo fija a la hora actual. |
| 2 | `solicitudes` | `trg_solicitudes_codigo` | BEFORE INSERT (si no trae código) | Genera `UP{código de unidad, 2 dígitos}-{año de Panamá}-{número de 4 dígitos}`, con numeración propia por unidad y año. Rechaza unidades fuera de 0–99 y más de 9999 documentos al año. |
| 3 | `solicitudes` | `trg_solicitudes_flujo` | BEFORE INSERT OR UPDATE OF `id_flujo` | Si no llega `id_flujo`, toma el flujo de la versión. Una vez resuelta la solicitud (`APROBADO` o `RECHAZADO`), su flujo no se puede cambiar. |
| 4 | `solicitudes` | `trg_solicitudes_fecha_resolucion` | BEFORE UPDATE OF `estado` | Al pasar a `APROBADO` o `RECHAZADO`, llena `fecha_resolucion` si está vacía. |
| 5 | `aprobaciones` | `trg_aprobaciones_fecha_accion` | BEFORE UPDATE OF `estado` | Al decidir, llena `fecha_accion` si está vacía. |
| 6 | `aprobaciones` | `trg_aprobaciones_congelar` | BEFORE UPDATE OR DELETE | Al decidir, copia (de la asignación resuelta en `solicitud_pasos` si el paso es por escuela) `cargo_nombre`, `area_nombre`, `aprobador_nombre` y `aprobador_cedula`. Una aprobación ya decidida no se puede modificar ni borrar. |
| 7 | `flujo_pasos` | `trg_flujo_pasos_aprobador` | BEFORE INSERT OR UPDATE OF `id_asignacion` | En un paso fijo, el titular de la asignación debe tener cuenta activa y el rol `APROBADOR`; los pasos por escuela se validan al radicar. |
| 8 | `flujo_pasos` | `trg_flujo_pasos_estructura` | BEFORE INSERT OR UPDATE OR DELETE | En un flujo `A` (activo) no se agregan, borran ni renumeran pasos ni cambian `req_firma`, `alcance` ni `id_cargo`; solo se puede cambiar la persona de un paso por otra del mismo puesto. En un flujo `B` (borrador) no hay restricciones. |
| 9 | `flujos` | `trg_flujos_estado` | BEFORE UPDATE OF `estado` | Un flujo `A` no vuelve a `B`. Para pasar de `B` a `A` debe tener al menos un paso, y al activarse se vacía `id_version_borrador`. |
| 10 | `flujos` | `trg_flujos_borrar` | BEFORE DELETE | Solo se borra un flujo `B` (el de una plantilla nunca publicada que se elimina); un flujo `A` no. |
| 11 | `versiones` | `trg_versiones_borrar` | BEFORE DELETE | Solo se borra la versión 1 en `BORRADOR` (plantilla nunca publicada). |
| 12 | `plantillas` | `trg_plantillas_borrar` | BEFORE DELETE | No se borra una plantilla que tuvo alguna versión publicada o posterior a la 1: solo se desactiva. |
| 13 | `usuarios_roles` | `trg_usuarios_roles_revocar_sesion` | AFTER INSERT OR UPDATE OR DELETE | Incrementa `version_sesion` de la cuenta: los tokens emitidos con los roles anteriores dejan de valer. |

Nota: `trg_solicitudes_fecha_resolucion`, `trg_aprobaciones_fecha_accion` y `trg_usuarios_roles_revocar_sesion` están definidos en `siadu_triggers_usuarios.sql`, no en los archivos de sus tablas. Se ejecutan los **cinco** archivos de `trigger/` (los borrados de los triggers 11 y 12 están en `siadu_triggers_plantillas.sql`). Los triggers 10 a 12 son los que permiten dar a `siadu_app` el permiso `DELETE` sobre `flujos`, `versiones` y `plantillas` (`DELETE /api/templates/{id}`) sin que pueda borrar historial.

Además de los triggers, la base impone reglas con índices únicos parciales:

| Índice | Garantiza |
|---|---|
| `uk_versiones_activa` | Una sola versión `ACTIVO` por plantilla. |
| `uk_versiones_borrador` | Una sola versión `BORRADOR` por plantilla. |
| `uk_firmas_activa` | Una sola firma activa por persona. |

---

## 2. Cómo se comprueban

En el editor SQL de Supabase (solo lectura):

```sql
SELECT n.nspname, c.relname AS tabla, t.tgname AS trigger
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY 2, 3;
```

Devuelve los 13 de la tabla anterior. El filtro por esquema es necesario: Supabase tiene triggers propios en otros esquemas.

---

## 3. Lo que resuelve el servidor

Estas reglas viven en los servicios del backend, no en la base (detalle en `docs/08-guia-desarrollo.md` §7):

| Función | Dónde se hace |
|---|---|
| Crear la primera aprobación al radicar una solicitud, y la siguiente cuando una aprobación se aprueba. | Servicio de `requests` y de `approvals`, en transacción. |
| Cerrar la solicitud (`APROBADO` al aprobar el último paso, `RECHAZADO` al rechazar). | Servicio de `approvals`. |
| Pasar la versión anterior a `INACTIVO` al publicar, exigir flujo con pasos y activar el flujo. | Servicio de `templates`, en una sola transacción. La versión anterior se desactiva **antes** de activar la nueva por el índice `uk_versiones_activa`. |
| Numerar las versiones de una plantilla. | Servicio de `templates`. |
| Exigir la firma para aprobar. | **No se exige.** Sin firma activa, el paso se aprueba como visto bueno, sin firma (`id_firma` nulo). |
| Validar la transición de estados de la solicitud. | Servicio. Los estados son solo `PENDIENTE`, `APROBADO` y `RECHAZADO`. |
| Pre-llenar `datos_json` con las variables de la plantilla. | No se hace: el cliente envía las respuestas y el servidor las valida. |
| Cédula única por persona y coincidencia entre usuario, personal y estudiante. | Carga externa de datos; el backend no la gestiona. |
| Historial de cambios de estado, hash de firma y protección de catálogos en uso. | Fuera del alcance. |

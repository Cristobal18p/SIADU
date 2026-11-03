# 09 — Despliegue con Docker

SIADU se despliega como una sola imagen de Docker que contiene el servidor, la aplicación React compilada y Chromium para generar el PDF. Funciona en cualquier servicio que ejecute contenedores Linux.

---

## 1. Qué contiene la imagen

El `Dockerfile` tiene dos etapas:

| Etapa | Qué hace |
|---|---|
| **build** | Instala las dependencias del servidor (genera el cliente de Prisma) y las del cliente, y compila React en `client/dist`. |
| **final** | Parte de `node:24-bookworm-slim`, instala Chromium y las fuentes Liberation (mismas métricas que Arial y Times New Roman), y copia solo el servidor, `shared/` y el cliente compilado. Corre con el usuario `node`, sin privilegios. |

La imagen ya define `NODE_ENV=production`, `PORT=7001` y `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`. `.dockerignore` deja fuera `node_modules`, las pruebas del servidor, la documentación, los scripts SQL y cualquier archivo de variables.

---

## 2. Antes de desplegar

- **Base de datos:** el proyecto de Supabase con los scripts de `database/scripts/` ejecutados y el usuario `siadu_app` creado (`docs/08` §9.1).
- **Data API desactivada:** en *Project Settings → Data API*, sin exponer el esquema `public`. Las tablas no tienen RLS y el único acceso a la base es `siadu_app` desde el backend; con la Data API activa quedarían legibles con la clave anon.
- **Storage:** el bucket privado `firmas`. No depende de la Data API: el backend lo lee con `SUPABASE_SERVICE_KEY`.
- **Cambios de esquema:** si la versión nueva trae cambios en la base, los scripts se ejecutan antes de publicar la imagen.

---

## 3. Variables de entorno

| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de Supabase (puerto 5432) con el usuario `siadu_app`. |
| `JWT_SECRET` | Sí | Secreto de los tokens; uno distinto por entorno. |
| `SUPABASE_URL` | Sí | URL del proyecto de Supabase. |
| `SUPABASE_SERVICE_KEY` | Sí | Clave secreta, para leer las firmas del bucket privado. |
| `TRUST_PROXY` | Detrás de un proxy | Saltos de proxy hasta el contenedor, normalmente `1`. Sin ella, el límite de intentos del login trata a todos los usuarios como una sola IP. |
| `EXPIRESIN` | No | Duración del token (por ejemplo `8h`). |

Las variables se configuran en el servicio de contenedores, nunca dentro de la imagen.

---

## 4. Construir y probar en local

Desde la raíz del repositorio:

```bash
docker build -t siadu:1.0.0 .
```

Las variables van en un archivo fuera del repositorio, una por línea y sin comillas:

```
DATABASE_URL=postgresql://siadu_app:...@...:5432/postgres
JWT_SECRET=...
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_KEY=...
```

```bash
docker run --rm -p 7001:7001 --env-file ../siadu.env siadu:1.0.0
```

Para comprobarlo:

1. Abre `http://localhost:7001` e inicia sesión.
2. Descarga el PDF de una solicitud aprobada: confirma que Chromium y las fuentes funcionan dentro del contenedor.
3. Revisa la salida con `docker logs`: los avisos llevan prefijo (`[precalentar]` si la base no respondió al arrancar, `[documents.service]` si el PDF bloqueó un recurso) y los eventos de seguridad salen como líneas JSON.

---

## 5. Publicar la imagen

La imagen se sube a un registro de contenedores (Docker Hub, GitHub Container Registry, Azure Container Registry u otro), con una etiqueta por versión:

```bash
docker tag siadu:1.0.0 <registro>/siadu:1.0.0
docker push <registro>/siadu:1.0.0
```

Una etiqueta por versión permite volver a la anterior cambiando solo la etiqueta en el servicio.

---

## 6. Ejecutar en un servicio de contenedores

- **Imagen:** `<registro>/siadu:<versión>`, con las credenciales del registro si es privado.
- **Puerto:** el contenedor escucha en `7001`; el servicio debe dirigir el tráfico a ese puerto.
- **HTTPS:** lo termina el servicio o su balanceador; por eso hace falta `TRUST_PROXY`.
- **Memoria:** Chromium necesita espacio; 1 GB o más para el contenedor.
- **Instancias:** una. Los límites de peticiones y la caché de cuentas viven en la memoria del proceso, así que con varias instancias cada una cuenta por separado.
- **Apagado:** el servidor atiende `SIGTERM`: deja de aceptar peticiones, termina las que están en curso y cierra las conexiones.

---

## 7. Actualizar

1. Ejecutar en la base los scripts de cambios, si los hay.
2. Construir y subir la imagen con una etiqueta nueva.
3. Cambiar la etiqueta en el servicio y reiniciarlo.

Para volver atrás, se configura la etiqueta anterior.

---

## 8. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El servicio no puede descargar la imagen (`unauthorized`) | Faltan las credenciales del registro en el servicio, o aún no se han aplicado. |
| El contenedor arranca, pero el sitio no responde | El servicio no dirige el tráfico al puerto `7001`. |
| El login responde `429` a usuarios distintos | Falta `TRUST_PROXY` y todos llegan con la IP del proxy. |
| El PDF sale sin firmas | Faltan `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`. |
| La primera descarga de PDF tarda más | Chromium se inicia con la primera descarga; las siguientes reutilizan el mismo proceso. |
| Error de conexión a la base al arrancar | `DATABASE_URL` incorrecta, o símbolos de la contraseña sin codificar (`$` como `%24`). |

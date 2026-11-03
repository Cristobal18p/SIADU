# 06 — Motor de documentos oficiales

Cómo se arma el documento oficial: el mismo HTML para el editor, la vista previa y el PDF, la paginación en hojas Carta, las marcas de agua y el bloque de firmas.

---

## 1. Dónde se procesa

- **Vista previa:** en el cliente. La página muestra el documento en un `<iframe srcDoc>` con los datos de `GET /api/requests/{id}` (o con datos de ejemplo en el constructor). No pasa por el servidor.
- **PDF:** en el servidor, con Chromium sin interfaz (`puppeteer-core`), en `GET /api/documents/{requestId}/pdf`:
  1. Comprueba que quien lo pide es el dueño de la solicitud (si no, `404`) y que está `APROBADO` (si no, `400`).
  2. Arma el HTML con los datos del formulario, las variables automáticas congeladas y los pasos con sus firmas.
  3. Incrusta los logos y las firmas como data URI; Chromium no hace ninguna petición de red.
  4. Espera a que el documento se pagine y genera el PDF vectorial.
  5. Lo entrega como adjunto (`Content-Disposition: attachment`) sin guardarlo.

El PDF no se genera en el navegador porque una captura de pantalla (`html2canvas`) o la impresión del navegador dan texto rasterizado y cortes de página distintos según el equipo.

### Motor único (`shared/documento`)

La vista previa y el PDF usan el mismo módulo para convertir el JSON en HTML:

| Pieza | Contenido |
| :--- | :--- |
| `render.js` | `documentoHtml()`: recorre `cuerpoDocumento`, aplica las reglas del contrato y arma membrete, pie, firmas y marcas de agua. Escapa todo el texto. |
| `estilos.js` | Hoja Carta, márgenes, tipografía, firmas y marcas. Los comparten el editor, la vista previa y el PDF. |
| `paginacion.js` | Reparte el cuerpo en hojas y numera los pies. |
| `formato.js` | Fechas formales y hora de Panamá (UTC−5), sin depender de la zona horaria del equipo. |
| `validar.js` | Reglas para guardar y publicar una plantilla; las usan el servidor y los mocks. |

- **Cliente:** `import { documentoHtml } from '@siadu/documento'` (alias de Vite).
- **Servidor:** importa el mismo módulo ESM desde CommonJS (Node 24) y lo pasa a `page.setContent()`.
- **Fuentes:** la imagen de Docker instala Liberation Sans y Serif, con las mismas métricas que Arial y Times New Roman, para que los cortes de línea coincidan con la vista previa.
- **Pruebas:** `cd shared && npm test` (pruebas en `shared/tests/`).

---

## 2. Hoja y paginación

- **Hoja:** Carta vertical (215.9 × 279.4 mm), márgenes de 25 mm arriba y 20 mm en los demás lados. `@page` no agrega márgenes: cada hoja (`.doc-pagina`) es una página del PDF.
- **Tipografía:** la define la plantilla en `disenoFormJson.formato` (Arial o Times New Roman, tamaño e interlineado); por defecto, Arial 11 pt con interlineado 1.15. El texto va justificado.
- **Membrete:** solo en la primera hoja.
- **Pie:** al fondo de cada hoja, con el texto de la plantilla y, si está activado, «Página X de Y».
- **Cortes:** entre bloques de primer nivel (párrafo, título, lista, tabla, bloque de firmas). Un bloque que no cabe pasa entero a la hoja siguiente, y un salto de página fuerza una hoja nueva.
- **Editor y vista previa:** el editor muestra las variables como cápsulas (`[Etiqueta]`) y la vista previa con su valor, así que los cortes pueden moverse entre ambos. La vista previa y el PDF siempre coinciden.

La paginación la hace el propio documento con un script, no Chromium. Al terminar marca `.doc-paginas[data-paginado="listo"]`, y el servidor espera ese atributo antes de imprimir.

---

## 3. Marcas de agua

| Capa | Cuándo | Aspecto |
| :--- | :--- | :--- |
| **Escudo de la Universidad** | Siempre, en todas las hojas | Centrado, al 7 % de opacidad. |
| **Documento en trámite — Sin validez oficial** | Solicitud `PENDIENTE` | Texto diagonal gris al 15 %. |
| **Solicitud rechazada** | Solicitud `RECHAZADO` | Texto diagonal rojo con borde punteado. |
| Sin marca diagonal | Solicitud `APROBADO` | Documento oficial con sus firmas. |

Las marcas de estado solo se ven en la vista previa: el PDF existe únicamente para solicitudes aprobadas. En una solicitud rechazada, el motivo de la autoridad se muestra en la pantalla de la solicitud.

---

## 4. Bloque de firmas

Una casilla por cada paso del flujo con `reqFirma`, en orden de `secuencia`, en filas de dos. Si la última fila queda con una sola casilla, va centrada. La paginación corta entre filas, nunca dentro de una casilla.

- **Paso aprobado:** imagen de la firma del titular (Supabase Storage), línea, nombre, cargo y área. Si el titular no tiene firma activa, el paso se aprueba igual y la casilla queda sin imagen.
- **Paso pendiente:** recuadro punteado con la leyenda «[Pendiente de Aprobación y Firma]», el titular y el cargo esperados.

El área de la firma mide lo mismo firmada o pendiente (14 mm), así el documento no se desplaza al aprobarse. Las medidas están en `shared/documento/estilos.js`.

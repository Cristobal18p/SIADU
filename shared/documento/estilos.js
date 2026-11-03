/**
 * Estilos y medidas de la hoja, comunes al editor, la vista previa y el PDF. Todo en mm y pt.
 * Los bloques del cuerpo solo llevan margen inferior: así sus altos se suman sin colapso y todos cortan igual.
 */

/** Hoja Carta y márgenes institucionales (superior, derecho, inferior, izquierdo). */
export const HOJA = {
  ancho: '215.9mm',
  alto: '279.4mm',
  margenes: { superior: '25mm', derecho: '20mm', inferior: '20mm', izquierdo: '20mm' },
};

/** Tipografías permitidas con alternativas de iguales medidas para servidores Linux (Liberation). */
export const FUENTES = {
  Arial: "Arial, 'Liberation Sans', Helvetica, sans-serif",
  'Times New Roman': "'Times New Roman', 'Liberation Serif', Times, serif",
};

/** Formato base cuando la plantilla no define `disenoFormJson.formato`. */
export const FORMATO_POR_DEFECTO = { fuente: 'Arial', tamano: '11pt', interlineado: '1.15' };

/** Sangría por nivel (`indent`): media pulgada, como un tabulador de procesador de texto. */
export const SANGRIA_POR_NIVEL = '12.7mm';

const { margenes } = HOJA;
const MARGEN_HOJA = `${margenes.superior} ${margenes.derecho} ${margenes.inferior} ${margenes.izquierdo}`;

export const ESTILOS_DOCUMENTO = `
/* La hoja pone sus propios márgenes: la página impresa no agrega otros */
@page { size: letter portrait; margin: 0; }

/* Hojas */
.doc-paginas { color: #111111; }

.doc-pagina, .doc-hoja {
  position: relative;
  box-sizing: border-box;
  width: ${HOJA.ancho};
  padding: ${MARGEN_HOJA};
  background: #ffffff;
  color: #111111;
  text-align: justify;
  overflow-wrap: break-word;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Hoja Carta de alto fijo: membrete (solo la primera), cuerpo y pie al fondo */
.doc-pagina {
  height: ${HOJA.alto};
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.doc-pagina:last-child { break-after: auto; page-break-after: auto; }
.doc-pagina-contenido { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
.doc-pagina-cuerpo { flex: 1 1 auto; min-height: 0; }

@media screen {
  .doc-pagina { margin: 0 auto 8mm; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(15, 23, 42, 0.08); }
  .doc-pagina:last-child { margin-bottom: 0; }
}
@media print {
  html, body { margin: 0; padding: 0; background: #ffffff; }
}

.doc-pagina *, .doc-pagina *::before, .doc-pagina *::after,
.doc-hoja *, .doc-hoja *::before, .doc-hoja *::after { box-sizing: border-box; }

/* Encabezado institucional (solo primera hoja) */
.doc-encabezado {
  display: flex;
  align-items: center;
  gap: 4mm;
  margin: 0 0 6mm;
  padding-bottom: 3mm;
  border-bottom: 0.5pt solid #9ca3af;
  text-align: center;
}
.doc-encabezado-logo { width: 22mm; height: 22mm; flex: 0 0 22mm; display: flex; align-items: center; justify-content: center; }
.doc-encabezado-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.doc-encabezado-lineas { flex: 1; min-width: 0; font-family: ${FUENTES.Arial}; line-height: 1.3; }
.doc-encabezado-linea1 { font-size: 12pt; font-weight: 700; letter-spacing: 0.3pt; }
.doc-encabezado-linea2 { font-size: 10pt; font-weight: 700; }
.doc-encabezado-linea3, .doc-encabezado-linea4 { font-size: 9pt; font-weight: 600; }

/* Cuerpo */
.doc-cuerpo > * { margin-top: 0; }
.doc-cuerpo p, .doc-cuerpo h1, .doc-cuerpo h2 { margin: 0 0 10px; }
.doc-cuerpo h1 { font-size: 16pt; font-weight: 700; line-height: 1.2; }
.doc-cuerpo h2 { font-size: 14pt; font-weight: 700; line-height: 1.2; }
.doc-cuerpo ul, .doc-cuerpo ol { margin: 0 0 10px; padding-left: 8mm; }
.doc-cuerpo ul { list-style: disc; }
.doc-cuerpo ol { list-style: decimal; }
.doc-cuerpo li > p { margin-bottom: 2px; }
.doc-cuerpo strong { font-weight: 700; }
.doc-cuerpo table { width: 100%; border-collapse: collapse; margin: 0 0 10px; table-layout: fixed; }
.doc-cuerpo th, .doc-cuerpo td { border: 0.75pt solid #111111; padding: 4px 6px; vertical-align: top; text-align: left; }
.doc-cuerpo th { font-weight: 700; background: #f3f4f6; }
.doc-cuerpo th > p, .doc-cuerpo td > p { margin: 0; }
.doc-variable { white-space: pre-wrap; }
.doc-variable-ejemplo { background: #eef2ff; border-radius: 2px; }
.doc-salto-pagina { height: 0; margin: 0; }

/* Bloque de firmas: filas de 2, la última centrada si queda sola. Se corta entre filas, nunca dentro de una
   casilla, y el área de la firma mide lo mismo firmada o pendiente. */
.doc-firmas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0 0 10px;
  padding-top: 12mm;
  break-inside: avoid;
  page-break-inside: avoid;
  text-align: center;
}
.doc-firmas-continua { padding-top: 6mm; }
.doc-firmas-sigue { margin-bottom: 0; }
.doc-firma { flex: 0 0 50%; padding: 0 5mm; font-family: ${FUENTES.Arial}; }
.doc-firma-imagen { height: 14mm; display: flex; align-items: flex-end; justify-content: center; }
.doc-firma-imagen img { max-height: 14mm; max-width: 55mm; object-fit: contain; }
.doc-firma-pendiente {
  height: 14mm;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #a0aec0;
  color: #718096;
  font-style: italic;
  font-size: 8pt;
}
.doc-firma-linea { border-top: 0.75pt solid #111111; margin: 1.5mm 6mm 1.5mm; }
.doc-firma-nombre { font-size: 10pt; font-weight: 700; }
.doc-firma-cargo { font-size: 9pt; }
.doc-firma-area { font-size: 8pt; color: #4b5563; }
.doc-firma-fecha { font-size: 7.5pt; color: #4b5563; margin-top: 1mm; }
.doc-firmas-vacio { flex: 0 0 100%; border: 1px dashed #a0aec0; color: #718096; font-style: italic; font-size: 9pt; padding: 6mm; }

/* Pie de página (al fondo de cada hoja) */
.doc-pie {
  flex: 0 0 auto;
  margin: 6mm 0 0;
  padding-top: 2mm;
  border-top: 0.5pt solid #9ca3af;
  font-family: ${FUENTES.Arial};
  font-size: 8pt;
  line-height: 1.35;
  color: #374151;
  text-align: center;
}
.doc-pie-contenido p { margin: 0; text-align: center; }
.doc-pie-paginacion { text-align: right; color: #4b5563; }

/* Marcas de agua (docs/06 §3), en cada hoja */
.doc-marca-escudo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130mm;
  height: 130mm;
  transform: translate(-50%, -50%);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.07;
  pointer-events: none;
  z-index: 0;
}
.doc-marca-estado {
  position: absolute;
  top: 45%;
  left: 10%;
  width: 80%;
  text-align: center;
  font-family: 'Arial Black', Impact, ${FUENTES.Arial};
  font-size: 38pt;
  font-weight: 900;
  letter-spacing: 4px;
  text-transform: uppercase;
  transform: rotate(-35deg);
  pointer-events: none;
  z-index: 2;
}
.doc-marca-estado.pendiente { color: rgba(113, 128, 150, 0.15); }
.doc-marca-estado.rechazado { color: rgba(197, 48, 48, 0.18); border: 4px dashed rgba(197, 48, 48, 0.25); padding: 15px; }
`;

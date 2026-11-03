import { useState } from 'react';
import { Eye, FileText, Maximize2, Minus, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import useMediaQuery from '../../hooks/useMediaQuery';
import VistaPreviaDocumento from './VistaPreviaDocumento';

/** Niveles de zoom; `null` ajusta la hoja al ancho. */
const ZOOMS = [null, 0.6, 0.8, 1, 1.25, 1.5];

/** Documento a pantalla completa, con zoom. */
function VisorDocumento({ previa, titulo, nota, onClose }) {
  const [nivel, setNivel] = useState(0);
  const zoom = ZOOMS[nivel];

  return (
    <Modal
      pantallaCompleta
      size="5xl"
      onClose={onClose}
      title="Documento"
      subtitle={nota}
      icon={FileText}
      tone="brand"
      footer={
        <div className="flex items-center justify-center gap-2 sm:mx-auto">
          <Button
            variant="outline"
            size="sm"
            icon={Minus}
            aria-label="Alejar"
            disabled={nivel === 0}
            onClick={() => setNivel((n) => n - 1)}
          />
          <span aria-live="polite" className="min-w-24 text-center text-sm font-medium text-slate-700">
            {zoom ? `${Math.round(zoom * 100)} %` : 'Ajustado'}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            aria-label="Acercar"
            disabled={nivel === ZOOMS.length - 1}
            onClick={() => setNivel((n) => n + 1)}
          />
        </div>
      }
    >
      <VistaPreviaDocumento {...previa} titulo={titulo} escala={zoom ?? undefined} alto="100%" />
    </Modal>
  );
}

/**
 * Panel del documento oficial para la mesa de trabajo, con pantalla completa y zoom.
 * En el teléfono se ofrece «Ver documento» en lugar de la hoja.
 *
 * @param {Object} props
 * @param {Object} props.previa - Props de VistaPreviaDocumento
 * @param {string} props.titulo - Nombre accesible del documento
 * @param {string} props.nota - Estado de validez del documento
 * @param {string} [props.etiqueta='Documento'] - Título del panel
 */
export default function PanelDocumento({ previa, titulo, nota, etiqueta = 'Documento' }) {
  const [paginas, setPaginas] = useState(null);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const enLinea = useMediaQuery('(min-width: 768px)');
  const llenar = useMediaQuery('(min-width: 1024px)');

  const visor = visorAbierto && (
    <VisorDocumento previa={previa} titulo={titulo} nota={nota} onClose={() => setVisorAbierto(false)} />
  );

  if (!enLinea) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">{etiqueta}</h2>
        </div>
        <div className="p-4 space-y-3">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            {nota}
          </p>
          <Button variant="outline" icon={Eye} className="w-full" onClick={() => setVisorAbierto(true)}>
            Ver documento
          </Button>
        </div>
        {visor}
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col lg:h-full">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{etiqueta}</h2>
          <p className="text-xs text-slate-500 truncate">
            {nota}
            {paginas ? ` · ${paginas} ${paginas === 1 ? 'hoja' : 'hojas'}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" icon={Maximize2} onClick={() => setVisorAbierto(true)} className="shrink-0">
          Pantalla completa
        </Button>
      </div>
      <div className="p-3 lg:flex-1 lg:min-h-0">
        <VistaPreviaDocumento
          {...previa}
          titulo={titulo}
          onPaginado={setPaginas}
          alto={llenar ? '100%' : 'min(60vh, 34rem)'}
        />
      </div>
      {visor}
    </section>
  );
}

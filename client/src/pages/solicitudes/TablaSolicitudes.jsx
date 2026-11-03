import { useState } from 'react';
import { Download } from 'lucide-react';
import documentsApi from '../../api/documents.api';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CodeChip from '../../components/ui/CodeChip';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/formatters';

/**
 * Tabla de solicitudes del usuario, compartida por Inicio y Mis solicitudes.
 *
 * @param {Object} props
 * @param {Array} props.rows
 * @param {string} [props.caption]
 * @param {(path: string) => void} props.onNavigate
 */
export default function TablaSolicitudes({ rows, caption = 'Mis solicitudes', onNavigate }) {
  const [descargandoId, setDescargandoId] = useState(null);
  const { notify } = useToast();

  const verDetalle = (item) => onNavigate(`/solicitante/mis-solicitudes/${item.idSolicitud}`);

  const descargar = async (item) => {
    try {
      setDescargandoId(item.idSolicitud);
      await documentsApi.downloadPdf(item.idSolicitud, item.codigoDocumento);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      notify(err?.message || 'No se pudo descargar el documento. Inténtalo de nuevo en unos momentos.');
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <DataTable
      caption={caption}
      rows={rows}
      rowKey={(item) => item.idSolicitud}
      columns={[
        { header: 'Nº Solicitud', cell: (item) => <CodeChip>{item.codigoDocumento}</CodeChip> },
        {
          header: 'Documento',
          wrap: true,
          cell: (item) => <span className="font-medium text-slate-900">{item.nombrePlantilla}</span>,
        },
        { header: 'Estado', cell: (item) => <Badge variant={item.estado} /> },
        {
          header: 'Enviada',
          cell: (item) => <span className="text-slate-500">{formatDate(item.fechaCreacion)}</span>,
        },
        {
          header: 'Resolución',
          cell: (item) =>
            item.resolucion?.fecha ? (
              <span className="text-slate-500">{formatDate(item.resolucion.fecha)}</span>
            ) : (
              <span className="text-xs text-slate-400 italic">Aún sin resolver</span>
            ),
        },
        {
          header: 'Acciones',
          align: 'right',
          cell: (item) => (
            <div className="inline-flex items-center gap-2">
              <Button
                variant="link"
                size="sm"
                aria-label={`Ver detalle de ${item.codigoDocumento}`}
                onClick={() => verDetalle(item)}
              >
                Ver detalle
              </Button>
              {item.estado === 'APROBADO' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={descargandoId === item.idSolicitud}
                  aria-label={`Descargar PDF de ${item.codigoDocumento}`}
                  onClick={() => descargar(item)}
                />
              )}
            </div>
          ),
        },
      ]}
      renderMobile={(item) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <CodeChip>{item.codigoDocumento}</CodeChip>
            <Badge variant={item.estado} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.nombrePlantilla}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enviada: {formatDate(item.fechaCreacion)} ·{' '}
              {item.resolucion?.fecha ? `Resuelta: ${formatDate(item.resolucion.fecha)}` : 'Aún sin resolver'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => verDetalle(item)}>
              Ver detalle
            </Button>
            {item.estado === 'APROBADO' && (
              <Button
                size="sm"
                icon={Download}
                className="w-full"
                loading={descargandoId === item.idSolicitud}
                onClick={() => descargar(item)}
              >
                Descargar PDF
              </Button>
            )}
          </div>
        </>
      )}
    />
  );
}

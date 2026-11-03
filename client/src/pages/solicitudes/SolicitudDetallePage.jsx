import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import requestsApi from '../../api/requests.api';
import documentsApi from '../../api/documents.api';
import Button from '../../components/ui/Button';
import MesaTrabajo from '../../components/layout/MesaTrabajo';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AlertaRechazo, CabeceraSolicitud, DocumentoSolicitud, RutaAprobacion } from './ResumenSolicitud';

/** Detalle de una solicitud propia: estado, ruta de aprobación y documento. */
export default function SolicitudDetallePage({ idSolicitud, onNavigate }) {
  const { notify } = useToast();
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDetalle(await requestsApi.getRequestById(idSolicitud));
    } catch (err) {
      console.error('Error al cargar el detalle de la solicitud:', err);
      setError(err);
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }, [idSolicitud]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const descargar = async () => {
    setDescargando(true);
    try {
      await documentsApi.downloadPdf(detalle.idSolicitud, detalle.codigoDocumento);
    } catch (err) {
      notify(err.message || 'No se pudo descargar el documento. Inténtalo de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  const volver = (
    <Button variant="link" size="sm" icon={ArrowLeft} onClick={() => onNavigate('/solicitante/mis-solicitudes')}>
      Volver a mis solicitudes
    </Button>
  );

  if (cargando) {
    return (
      <div className="space-y-6">
        <div>{volver}</div>
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <LoadingState label="Cargando la solicitud..." rows={5} />
        </section>
      </div>
    );
  }

  if (error || !detalle) {
    const noExiste = error?.status === 404;
    return (
      <div className="space-y-6">
        <div>{volver}</div>
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <ErrorState
            title={noExiste ? 'La solicitud no existe' : 'No pudimos cargar la solicitud'}
            description={
              noExiste
                ? 'Puede que el enlace sea incorrecto o que la solicitud no te pertenezca.'
                : undefined
            }
            onRetry={noExiste ? undefined : cargar}
          />
        </section>
      </div>
    );
  }

  // Estado y ruta a la izquierda; documento a la derecha
  return (
    <MesaTrabajo
      panel={
        <>
          <div>{volver}</div>
          <CabeceraSolicitud
            detalle={detalle}
            accion={
              detalle.estado === 'APROBADO' && (
                <Button icon={Download} loading={descargando} onClick={descargar} className="w-full md:w-auto lg:w-full">
                  Descargar PDF
                </Button>
              )
            }
          />
          <AlertaRechazo detalle={detalle} />
          <RutaAprobacion detalle={detalle} />
        </>
      }
      documento={<DocumentoSolicitud detalle={detalle} />}
    />
  );
}

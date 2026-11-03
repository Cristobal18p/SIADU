import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react';
import requestsApi from '../../api/requests.api';
import approvalsApi from '../../api/approvals.api';
import Button from '../../components/ui/Button';
import MesaTrabajo from '../../components/layout/MesaTrabajo';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import {
  AlertaRechazo,
  CabeceraSolicitud,
  DocumentoSolicitud,
  RutaAprobacion,
} from '../solicitudes/ResumenSolicitud';

// Tope del contrato para el comentario de la decisión
const LARGO_MAX_COMENTARIO = 1000;

/**
 * Revisión de una solicitud por el aprobador: datos del solicitante, flujo y documento.
 * Solo permite decidir si el paso activo es del usuario (`idAprobacionPendiente`); si no, es de solo lectura.
 */
export default function RevisionPage({ idSolicitud, origen = 'bandeja', onNavigate }) {
  const { notify } = useToast();
  const rutaVolver = origen === 'historial' ? '/aprobador/historial' : '/aprobador/bandeja';
  const etiquetaVolver = origen === 'historial' ? 'Volver al historial' : 'Volver a la bandeja';

  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null); // 'APROBADO' | 'RECHAZADO' | null
  const [comentario, setComentario] = useState('');
  const [errorComentario, setErrorComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDetalle(await requestsApi.getRequestById(idSolicitud));
    } catch (err) {
      console.error('Error al cargar el expediente:', err);
      setError(err);
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }, [idSolicitud]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirModal = (decision) => {
    setComentario('');
    setErrorComentario('');
    setModal(decision);
  };

  const cerrarModal = () => {
    if (!enviando) setModal(null);
  };

  const confirmar = async () => {
    const texto = comentario.trim();
    if (modal === 'RECHAZADO' && !texto) {
      setErrorComentario('Indica el motivo del rechazo.');
      return;
    }

    setEnviando(true);
    try {
      await approvalsApi.submitDecision(detalle.idAprobacionPendiente, {
        decision: modal,
        ...(texto ? { comentario: texto } : {}),
      });
      notify(modal === 'APROBADO' ? 'Documento aprobado.' : 'Solicitud rechazada.', 'success');
      onNavigate('/aprobador/bandeja');
    } catch (err) {
      if (err.status === 400 && Array.isArray(err.detalles) && err.detalles.length > 0) {
        setErrorComentario(err.detalles[0].mensaje);
      } else if (err.status === 404 || err.status === 409) {
        // El paso ya no está pendiente: se recarga
        setModal(null);
        notify(err.message || 'Este expediente ya fue resuelto.');
        cargar();
      } else {
        setModal(null);
        notify(err.message || 'No se pudo registrar la decisión. Inténtalo de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const volver = (
    <Button variant="link" size="sm" icon={ArrowLeft} onClick={() => onNavigate(rutaVolver)}>
      {etiquetaVolver}
    </Button>
  );

  if (cargando) {
    return (
      <div className="space-y-6">
        <div>{volver}</div>
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <LoadingState label="Cargando el expediente..." rows={5} />
        </section>
      </div>
    );
  }

  if (error || !detalle) {
    const noExiste = error?.status === 404 || error?.status === 403;
    return (
      <div className="space-y-6">
        <div>{volver}</div>
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <ErrorState
            title={noExiste ? 'No se encontró el expediente' : 'No pudimos cargar el expediente'}
            description={noExiste ? 'Puede que el enlace sea incorrecto o que no tengas acceso a él.' : undefined}
            onRetry={noExiste ? undefined : cargar}
          />
        </section>
      </div>
    );
  }

  const puedeDecidir = detalle.idAprobacionPendiente != null;
  const { solicitante } = detalle;

  return (
    <>
    <MesaTrabajo
      panel={
        <>
          <div>{volver}</div>
          <CabeceraSolicitud detalle={detalle} />
          <AlertaRechazo detalle={detalle} />
          {/* Datos del solicitante */}
          <section aria-labelledby="solicitante-titulo" className="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3">
            <h2 id="solicitante-titulo" className="text-xs font-medium text-slate-500">
              Solicitante
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-900">{solicitante.nombreCompleto}</p>
            <p className="text-xs text-slate-600">
              <span className="font-mono">{solicitante.cedula}</span>
              {solicitante.carrera && ` · ${solicitante.carrera}`}
            </p>
          </section>
          <RutaAprobacion detalle={detalle} />
        </>
      }
      pie={
        puedeDecidir ? (
          // Acciones fijas al pie en móvil y al final del panel en escritorio
          <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex flex-col gap-2 sm:static sm:z-auto sm:m-0 sm:p-4 sm:bg-white sm:backdrop-blur-none sm:rounded-xl sm:border sm:shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:flex-col lg:items-stretch lg:p-3">
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              Este expediente espera tu resolución.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" icon={ThumbsDown} className="flex-1 sm:flex-none lg:flex-1" onClick={() => abrirModal('RECHAZADO')}>
                Rechazar
              </Button>
              <Button icon={ThumbsUp} className="flex-1 sm:flex-none lg:flex-1" onClick={() => abrirModal('APROBADO')}>
                Aprobar
              </Button>
            </div>
          </div>
        ) : (
          detalle.estado === 'PENDIENTE' && (
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              Este expediente está en revisión por otro cargo. Solo puedes consultarlo.
            </p>
          )
        )
      }
      documento={<DocumentoSolicitud detalle={detalle} />}
    />

      {modal === 'APROBADO' && (
        <Modal
          onClose={cerrarModal}
          title="Aprobar documento"
          subtitle={detalle.codigoDocumento}
          icon={CheckCircle2}
          tone="success"
          footer={
            <>
              <Button variant="outline" size="sm" disabled={enviando} onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button size="sm" icon={ThumbsUp} loading={enviando} onClick={confirmar}>
                Confirmar aprobación
              </Button>
            </>
          }
        >
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Vas a aprobar <strong className="text-slate-800">{detalle.nombrePlantilla}</strong> de{' '}
              <strong className="text-slate-800">{solicitante.nombreCompleto}</strong>. Se registrará tu firma y la
              acción no se puede deshacer.
            </p>
            <Field
              id="comentario-aprobacion"
              maxLength={LARGO_MAX_COMENTARIO}
              as="textarea"
              rows={3}
              label="Comentario (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Observaciones para el expediente…"
              disabled={enviando}
            />
          </div>
        </Modal>
      )}

      {modal === 'RECHAZADO' && (
        <Modal
          onClose={cerrarModal}
          title="Rechazar solicitud"
          subtitle={detalle.codigoDocumento}
          icon={ShieldAlert}
          tone="danger"
          footer={
            <>
              <Button variant="outline" size="sm" disabled={enviando} onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" icon={ThumbsDown} loading={enviando} onClick={confirmar}>
                Confirmar rechazo
              </Button>
            </>
          }
        >
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
              <strong>Atención:</strong> el trámite se cierra de inmediato. Si el solicitante lo necesita, tendrá que
              iniciar una nueva solicitud.
            </div>
            <Field
              id="comentario-rechazo"
              maxLength={LARGO_MAX_COMENTARIO}
              as="textarea"
              rows={4}
              label="Motivo del rechazo"
              required
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                if (errorComentario) setErrorComentario('');
              }}
              error={errorComentario}
              hint="Quedará registrado en el historial y el solicitante podrá verlo."
              placeholder="Explica la razón del rechazo…"
              disabled={enviando}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

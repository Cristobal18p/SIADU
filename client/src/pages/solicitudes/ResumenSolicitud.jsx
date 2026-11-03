import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import SectionCard from '../../components/ui/SectionCard';
import Badge from '../../components/ui/Badge';
import CodeChip from '../../components/ui/CodeChip';
import { formatDate } from '../../utils/formatters';
import PanelDocumento from '../../components/documento/PanelDocumento';

const ICONO_PASO = {
  APROBADO: { icon: CheckCircle2, clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECHAZADO: { icon: XCircle, clase: 'bg-rose-50 text-rose-700 border-rose-200' },
  PENDIENTE: { icon: Clock, clase: 'bg-slate-50 text-slate-500 border-slate-200' },
};

/** Bloques de lectura de una solicitud, compartidos por el detalle y la revisión. */

/**
 * Cabecera de la solicitud: código, estado, trámite y fechas.
 *
 * @param {Object} props
 * @param {Object} props.detalle - Respuesta de GET /requests/{id}
 * @param {React.ReactNode} [props.accion] - Botón bajo las fechas
 */
export function CabeceraSolicitud({ detalle, accion }) {
  return (
    <header className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 relative overflow-hidden md:bg-transparent md:border-0 md:shadow-none md:rounded-none md:p-0 md:overflow-visible">
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand md:hidden" />
      <div className="flex flex-wrap items-center gap-2 mb-1.5 pt-0.5 md:pt-0">
        <CodeChip>{detalle.codigoDocumento}</CodeChip>
        <Badge variant={detalle.estado} />
      </div>
      <h1 className="text-xl sm:text-2xl md:text-xl lg:text-lg font-semibold text-slate-900 tracking-tight text-balance leading-snug">
        {detalle.nombrePlantilla}
      </h1>
      <p className="text-sm lg:text-xs text-slate-600 mt-1">
        Enviada el {formatDate(detalle.fechaCreacion)}
        {detalle.fechaResolucion && ` · Resuelta el ${formatDate(detalle.fechaResolucion)}`}
      </p>
      {accion && <div className="mt-3">{accion}</div>}
    </header>
  );
}

/** Aviso del rechazo, con el cargo y el comentario. */
export function AlertaRechazo({ detalle }) {
  const pasoRechazo = detalle.lineaTiempo?.find((p) => p.estado === 'RECHAZADO');
  if (!pasoRechazo) return null;

  return (
    <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
      <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-rose-900">Rechazada por {pasoRechazo.nombreCargo}</p>
        <p className="text-sm text-rose-900 mt-1 whitespace-pre-line">
          {pasoRechazo.comentario || 'La autoridad no registró una observación.'}
        </p>
      </div>
    </div>
  );
}

/** Ruta de aprobación a partir de `pasosDocumento`; `estado: null` indica un paso no alcanzado. */
export function RutaAprobacion({ detalle }) {
  const pasos = detalle.pasosDocumento ?? detalle.lineaTiempo ?? [];
  const hayRechazo = pasos.some((p) => p.estado === 'RECHAZADO');
  // Paso en curso: el primero sin resolver, si la solicitud sigue abierta
  const secuenciaActual =
    detalle.estado === 'PENDIENTE' ? pasos.find((p) => p.estado === 'PENDIENTE')?.secuencia : undefined;
  // Tras un rechazo, los pasos sin resolver no se alcanzaron
  const noAlcanzado = (paso) => hayRechazo && paso.estado !== 'APROBADO' && paso.estado !== 'RECHAZADO';
  const enEspera = (paso) => !hayRechazo && paso.estado === null;

  return (
    <SectionCard title="Ruta de aprobación">
      {pasos.length ? (
        <ol className="p-4">
          {pasos.map((paso, i) => {
            const esActual = paso.secuencia === secuenciaActual;
            const omitido = noAlcanzado(paso);
            const { icon: Icon, clase } = esActual
              ? { icon: Clock, clase: 'bg-blue-50 text-brand border-blue-300' }
              : ICONO_PASO[paso.estado] || ICONO_PASO.PENDIENTE;
            const ultimo = i === pasos.length - 1;
            return (
              <li key={paso.secuencia} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${clase}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  {!ultimo && <span className="w-px flex-1 bg-slate-200 my-1" aria-hidden="true" />}
                </div>
                <div className={`min-w-0 flex-1 ${ultimo ? '' : 'pb-5'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${omitido ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                    >
                      {paso.secuencia}. {paso.nombreCargo}
                    </span>
                    {omitido ? (
                      <span className="text-xs font-medium text-slate-500">No alcanzado</span>
                    ) : esActual ? (
                      <span className="text-xs font-medium text-brand">Paso actual</span>
                    ) : enEspera(paso) ? (
                      <span className="text-xs font-medium text-slate-500">En espera</span>
                    ) : (
                      <Badge variant={paso.estado}>{paso.estado === 'PENDIENTE' ? 'Pendiente' : undefined}</Badge>
                    )}
                  </div>
                  {paso.titular && <p className="text-xs text-slate-600 mt-0.5">{paso.titular}</p>}
                  {paso.fechaAccion && <p className="text-xs text-slate-500 mt-0.5">{formatDate(paso.fechaAccion)}</p>}
                  {paso.comentario && paso.estado !== 'RECHAZADO' && (
                    <p className="text-xs text-slate-700 mt-1 italic">"{paso.comentario}"</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="p-4 text-sm text-slate-600">Esta solicitud no tiene pasos de aprobación registrados.</p>
      )}
    </SectionCard>
  );
}

/**
 * Documento de la solicitud con sus datos, firmas y marca de agua según el estado.
 *
 * @param {Object} props
 * @param {Object} props.detalle - Respuesta de GET /requests/{id}
 */
export function DocumentoSolicitud({ detalle }) {
  const nota =
    detalle.estado === 'APROBADO'
      ? 'Documento aprobado'
      : detalle.estado === 'RECHAZADO'
        ? 'Solicitud rechazada: el documento no tiene validez'
        : 'En trámite: sin validez oficial hasta su aprobación';

  return (
    <PanelDocumento
      titulo={`${detalle.nombrePlantilla} · ${detalle.codigoDocumento}`}
      nota={nota}
      previa={{
        diseno: detalle.disenoFormJson,
        variables: detalle.variableFormJson?.variables,
        datos: detalle.datosJson,
        sistema: detalle.variablesSistema,
        pasos: detalle.pasosDocumento,
        estado: detalle.estado,
      }}
    />
  );
}

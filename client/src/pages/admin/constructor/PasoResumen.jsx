import { AlertTriangle, Maximize2 } from 'lucide-react';
import SectionCard from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { nombreCompletoUnidad } from '../../../utils/formatters';
import { AUDIENCIAS, esPasoEscuela } from '../../../utils/plantillas';
import { nombreTipo, variablesDelFormulario } from '../../../utils/variables';
import VistaPreviaPlantilla from '../../../components/documento/VistaPreviaPlantilla';

/** Fila de «etiqueta: valor» del resumen. */
function Dato({ etiqueta, children }) {
  return (
    <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-0.5">
      <dt className="text-xs font-semibold text-slate-500">{etiqueta}</dt>
      <dd className="sm:col-span-2 text-sm text-slate-900 break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

/**
 * Paso 3 del constructor: resumen, vista previa del documento y lo que falta para publicar.
 *
 * @param {Object} props
 * @param {Object} props.borrador
 * @param {Object} props.usuario
 * @param {Array<{ mensaje: string, paso: number }>} props.pendientes
 * @param {(indice: number) => void} props.onIrAPaso
 * @param {boolean} props.soloLectura
 * @param {Array} props.cargos - CargoResumen[]
 * @param {() => void} props.onVerDocumento
 */
export default function PasoResumen({ borrador, usuario, pendientes, onIrAPaso, soloLectura, cargos = [], onVerDocumento }) {

  const cargoDe = (idAsignacion) => cargos.find((c) => c.idAsignacion === idAsignacion);
  const grupos = AUDIENCIAS.filter((a) => borrador.audiencia.includes(a.valor));
  const campos = variablesDelFormulario(borrador.variables, borrador.cuerpoDocumento);
  const listo = pendientes.length === 0;

  // En pantallas anchas, resumen a la izquierda y documento fijo a la derecha
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 items-start">
      <div className="min-w-0 space-y-4">
        {/* Pendientes para publicar */}
        {!soloLectura && !listo && (
          <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-900">Falta completar para poder publicar</p>
              <ul className="mt-1 space-y-0.5">
                {pendientes.map((p) => (
                  <li key={p.mensaje} className="flex flex-wrap items-center gap-x-2 text-xs text-amber-900">
                    <span>{p.mensaje}</span>
                    <Button variant="link" size="sm" onClick={() => onIrAPaso(p.paso)}>
                      Completar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <SectionCard
          title="Datos de la plantilla"
          action={
            !soloLectura && (
              <Button variant="link" size="sm" onClick={() => onIrAPaso(0)}>
                Editar
              </Button>
            )
          }
        >
          <dl className="divide-y divide-slate-100">
            <Dato etiqueta="Nombre">{borrador.nombre.trim() || <span className="text-slate-400">Sin nombre</span>}</Dato>
            <Dato etiqueta="Descripción">
              {borrador.descripcion.trim() || <span className="text-slate-400">Sin descripción</span>}
            </Dato>
            <Dato etiqueta="Dirigida a">
              {grupos.length === 0 ? (
                <span className="text-slate-400">Sin definir</span>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {grupos.map((g) => (
                    <li key={g.valor} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      {g.etiqueta}
                    </li>
                  ))}
                </ul>
              )}
            </Dato>
            <Dato etiqueta="Unidad">{nombreCompletoUnidad(usuario?.unidad) || '—'}</Dato>
          </dl>
        </SectionCard>

        <SectionCard
          title="Formulario del solicitante"
          action={
            !soloLectura && (
              <Button variant="link" size="sm" onClick={() => onIrAPaso(1)}>
                Editar
              </Button>
            )
          }
        >
          {campos.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              Sin campos: el documento no usa variables que deba completar el solicitante.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {campos.map((v) => (
                <li key={v.id} className="px-4 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-medium text-slate-900">{v.etiqueta || v.id}</span>
                    <span className="text-xs text-slate-500">
                      {nombreTipo(v.tipo)} · {v.requerido ? 'Obligatorio' : 'Opcional'}
                    </span>
                  </div>
                  {v.pregunta && <p className="mt-0.5 text-xs text-slate-600">{v.pregunta}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Ruta de aprobación"
          action={
            !soloLectura && (
              <Button variant="link" size="sm" onClick={() => onIrAPaso(1)}>
                Editar
              </Button>
            )
          }
        >
          {borrador.pasosFlujo.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Aún no hay pasos de aprobación.</p>
          ) : (
            <ol className="px-4 py-3 space-y-2">
              {borrador.pasosFlujo.map((paso, i) => {
                const porEscuela = esPasoEscuela(paso);
                const cargo = porEscuela ? cargos.find((c) => c.idCargo === paso.idCargo) : cargoDe(paso.idAsignacion);
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{cargo?.nombreCargo ?? 'Autoridad por definir'}</p>
                      <p className="text-xs text-slate-500">
                        {porEscuela
                          ? 'Según la escuela del solicitante'
                          : cargo?.titularActual
                            ? cargo.titularActual
                            : 'Sin titular asignado'}{' '}
                        ·{' '}
                        {paso.reqFirma ? 'Firma en el documento' : 'Solo visto bueno'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      </div>

      <div className="min-w-0 lg:sticky lg:top-6">
        <SectionCard
          title="Documento final"
          action={
            <Button variant="link" size="sm" icon={Maximize2} onClick={onVerDocumento}>
              Ver en grande
            </Button>
          }
        >
          <div className="p-3">
            {/* Alto fijo; el documento se desplaza dentro */}
            <VistaPreviaPlantilla
              borrador={borrador}
              cargos={cargos}
              altoVisor="min(70vh, calc(100dvh - 14rem))"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

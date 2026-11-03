import { Briefcase, GraduationCap, Presentation } from 'lucide-react';
import SectionCard from '../../../components/ui/SectionCard';
import Field from '../../../components/ui/Field';
import Checkbox from '../../../components/ui/Checkbox';
import { AUDIENCIAS, audienciaEditable } from '../../../utils/plantillas';

const ICONOS_AUDIENCIA = {
  ESTUDIANTE: GraduationCap,
  PROFESOR: Presentation,
  ADMINISTRATIVO: Briefcase,
};

/**
 * Paso 1 del constructor: nombre, descripción y audiencia; la audiencia queda fija tras publicar.
 *
 * @param {Object} props
 * @param {Object} props.borrador
 * @param {(cambios: Object) => void} props.onCambio
 * @param {{ nombre?: string, audiencia?: string }} props.errores
 * @param {boolean} props.soloLectura
 */
export default function PasoDatosBasicos({ borrador, onCambio, errores, soloLectura }) {
  const audienciaFija = soloLectura || !audienciaEditable(borrador);

  const alternar = (valor, marcado) => {
    const siguiente = marcado
      ? [...borrador.audiencia, valor]
      : borrador.audiencia.filter((a) => a !== valor);
    // Se mantiene siempre el orden de la lista de grupos
    onCambio({ audiencia: AUDIENCIAS.map((a) => a.valor).filter((v) => siguiente.includes(v)) });
  };

  return (
    <>
      <SectionCard title="Información general">
        <div className="p-4 sm:p-6 space-y-6">
          <Field
            id="plantilla-nombre"
            label="Nombre de la plantilla"
            required
            value={borrador.nombre}
            onChange={(e) => onCambio({ nombre: e.target.value })}
            error={errores.nombre}
            placeholder="Ej: Certificación de Notas"
            disabled={soloLectura}
            maxLength={200}
            autoComplete="off"
          />

          <Field
            id="plantilla-descripcion"
            as="textarea"
            rows={4}
            label="Descripción del trámite"
            hint="Es lo que verá el solicitante en el catálogo: para qué sirve y qué necesita."
            value={borrador.descripcion}
            onChange={(e) => onCambio({ descripcion: e.target.value })}
            placeholder="Describe brevemente para qué sirve este trámite…"
            disabled={soloLectura}
          />
        </div>
      </SectionCard>

      <SectionCard title="¿Quién puede solicitarla?">
        <fieldset
          className="p-4 sm:p-6 space-y-4"
          aria-describedby={errores.audiencia ? 'plantilla-audiencia-error' : undefined}
        >
          <legend className="sr-only">Grupos que pueden solicitar este documento</legend>
          <p className="text-xs text-slate-500">
            {audienciaFija && !soloLectura
              ? 'La plantilla ya se publicó, así que la audiencia queda fija. Para otros grupos, crea una plantilla nueva.'
              : 'Elige uno o más grupos. Solo ellos la verán en su catálogo.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AUDIENCIAS.map((a) => (
              <Checkbox
                key={a.valor}
                id={`audiencia-${a.valor}`}
                variant="tarjeta"
                icon={ICONOS_AUDIENCIA[a.valor]}
                label={a.etiqueta}
                description={a.descripcion}
                checked={borrador.audiencia.includes(a.valor)}
                onChange={(marcado) => alternar(a.valor, marcado)}
                disabled={audienciaFija}
              />
            ))}
          </div>
          {errores.audiencia && (
            <p id="plantilla-audiencia-error" role="alert" className="text-xs font-medium text-rose-700">
              {errores.audiencia}
            </p>
          )}
        </fieldset>
      </SectionCard>
    </>
  );
}

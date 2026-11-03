import { Lock } from 'lucide-react';
import { DATOS_DEL_DOCUMENTO } from '../../utils/datosSolicitante';
import { nombreCompletoUnidad } from '../../utils/formatters';

/** Datos automáticos tomados del perfil, cuando el servidor no envía `variablesSistema`. */
const datosDelPerfil = (perfil) =>
  perfil
    ? {
        'auth.nombre_completo': perfil.nombreCompleto,
        'auth.cedula': perfil.cedula,
        'auth.correo': perfil.correo,
        'estudiante.carrera': perfil.carrera?.descripcion,
        'estudiante.escuela': perfil.carrera?.escuela,
        'estudiante.facultad': perfil.unidad ? nombreCompletoUnidad(perfil.unidad) : undefined,
        'personal.cargo': perfil.cargos?.[0]?.nombreCargo,
      }
    : {};

/** No se muestra: es la fecha de envío. */
const OCULTOS = new Set(['sistema.fecha_formal']);

/** Texto de un dato sin valor. */
const textoVacio = (id) => (id === 'solicitud.codigo' ? 'Se asigna al enviar la solicitud' : 'No aplica a tu perfil');

/**
 * Datos que el sistema completa y usa el documento, en solo lectura.
 *
 * @param {Object} props
 * @param {Array<{ id: string, etiqueta: string }>} props.automaticos - Los usados en el documento
 * @param {Object<string, string|null>} props.datos - VariablesSistema
 * @param {Object} [props.perfil] - Respaldo cuando `datos` no viene
 */
export default function DatosAutomaticos({ automaticos: todos, datos, perfil }) {
  const automaticos = todos.filter((v) => !OCULTOS.has(v.id));
  if (automaticos.length === 0) return null;
  const valores = datos ?? datosDelPerfil(perfil);
  const delPerfil = automaticos.filter((v) => !DATOS_DEL_DOCUMENTO.has(v.id));
  const delDocumento = automaticos.filter((v) => DATOS_DEL_DOCUMENTO.has(v.id));

  const lista = (items) => (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {items.map((v) => {
        const valor = valores?.[v.id];
        const vacio = valor === null || valor === undefined || String(valor).trim() === '';
        return (
          <div key={v.id} className="min-w-0">
            <dt className="text-xs text-slate-500">{v.etiqueta}</dt>
            <dd className={`break-words ${vacio ? 'text-xs italic text-slate-500' : 'text-sm md:text-ui text-slate-900'}`}>
              {vacio ? textoVacio(v.id) : valor}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  return (
    <section aria-labelledby="datos-automaticos-titulo" className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
      <div>
        <h3 id="datos-automaticos-titulo" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          Tus datos en el documento
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Salen de tu perfil institucional. Si alguno no es correcto, comunícalo a tu unidad antes de enviar.
        </p>
      </div>
      {delPerfil.length > 0 && lista(delPerfil)}
      {delDocumento.length > 0 && lista(delDocumento)}
    </section>
  );
}

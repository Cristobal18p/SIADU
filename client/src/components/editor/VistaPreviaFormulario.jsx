import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FormularioDinamico from '../../pages/solicitudes/FormularioDinamico';
import DatosAutomaticos from '../../pages/solicitudes/DatosAutomaticos';
import { validarCampo, validarFormulario } from '../../utils/formularios';
import { automaticosDelDocumento, datosDeReferencia } from '../../utils/datosSolicitante';
import { problemasDeVariables, variablesDelFormulario } from '../../utils/variables';

/**
 * Vista previa del formulario del solicitante, con datos automáticos ficticios. No envía nada.
 *
 * @param {Object} props
 * @param {Object} props.borrador
 * @param {() => void} props.onClose
 */
export default function VistaPreviaFormulario({ borrador, onClose }) {
  const { variables, cuerpoDocumento } = borrador;
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [comprobado, setComprobado] = useState(false);

  const campos = useMemo(() => variablesDelFormulario(variables, cuerpoDocumento), [variables, cuerpoDocumento]);
  const problemas = useMemo(() => problemasDeVariables(variables, cuerpoDocumento), [variables, cuerpoDocumento]);
  const automaticos = useMemo(() => automaticosDelDocumento(cuerpoDocumento), [cuerpoDocumento]);

  const datos = useMemo(() => datosDeReferencia(borrador.audiencia), [borrador.audiencia]);

  const cambiar = (id, valor) => {
    setValores((actual) => ({ ...actual, [id]: valor }));
    setComprobado(false);
    if (errores[id]) setErrores(({ [id]: _quitado, ...resto }) => resto);
  };

  const alSalir = (id) => {
    const variable = campos.find((v) => v.id === id);
    const error = variable && validarCampo(variable, valores[id]);
    setErrores((actual) => {
      const { [id]: _quitado, ...resto } = actual;
      return error ? { ...resto, [id]: error } : resto;
    });
  };

  const limpiar = () => {
    setValores({});
    setErrores({});
    setComprobado(false);
  };

  const comprobar = () => {
    setErrores(validarFormulario(campos, valores));
    setComprobado(true);
  };

  const sinErrores = comprobado && Object.keys(errores).length === 0;

  return (
    <Modal
      onClose={onClose}
      title="Vista previa del formulario"
      subtitle="Así lo verá el solicitante. Puedes llenarlo para probar las restricciones; no se envía nada."
      icon={ClipboardList}
      tone="brand"
      size="2xl"
      footer={
        <>
          <span role="status" className="text-xs text-slate-600">
            {sinErrores ? 'Todo correcto: el formulario se podría enviar.' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={limpiar} disabled={campos.length === 0}>
              Limpiar
            </Button>
            <Button size="sm" onClick={comprobar} disabled={campos.length === 0}>
              Comprobar
            </Button>
          </div>
        </>
      }
    >
      <div className="p-5 space-y-5 bg-slate-50">
        {problemas.length > 0 && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Hay variables por completar; el formulario puede verse distinto al publicarlo.</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {problemas.map((p) => (
                  <li key={`${p.id}-${p.mensaje}`}>{p.mensaje}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {automaticos.length > 0 && (
          <p className="text-xs text-slate-500">
            Datos de referencia: cada solicitante verá los suyos.
          </p>
        )}

        {/* Igual que en «Nueva solicitud» */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">{borrador.nombre.trim() || 'Trámite sin nombre'}</h3>
            {borrador.descripcion?.trim() && <p className="text-sm text-slate-500 mt-0.5">{borrador.descripcion.trim()}</p>}
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <DatosAutomaticos automaticos={automaticos} datos={datos} />
            {campos.length === 0 ? (
              <p className="text-sm text-slate-600">Este trámite no requiere datos adicionales.</p>
            ) : (
              <FormularioDinamico variables={campos} valores={valores} errores={errores} onChange={cambiar} onBlur={alSalir} />
            )}
            {campos.length > 0 && (
              <p className="text-xs text-slate-500">
                Los campos marcados con <span className="text-rose-600">*</span> son obligatorios.
              </p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

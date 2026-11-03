import { useMemo, useState } from 'react';
import { SISTEMA_EJEMPLO, datosEjemplo } from '@siadu/documento';
import VistaPreviaDocumento from './VistaPreviaDocumento';
import { datosDeReferencia } from '../../utils/datosSolicitante';
import { construirDisenoFormJson, construirVariableFormJson, pasosDelDocumento } from '../../utils/plantillas';

/**
 * Vista previa de una plantilla en construcción, con datos ficticios y las firmas del flujo pendientes.
 *
 * @param {Object} props
 * @param {Object} props.borrador - Borrador del constructor
 * @param {Array} props.cargos - CargoResumen[]
 * @param {string} [props.altoVisor] - Alto fijo del visor (CSS)
 */
export default function VistaPreviaPlantilla({ borrador, cargos = [], altoVisor }) {
  const [paginas, setPaginas] = useState(null);

  // Referencias estables para no regenerar el iframe
  const { formato, encabezado, cuerpoDocumento, piePagina, variables: variablesBorrador, audiencia, pasosFlujo } = borrador;
  const diseno = useMemo(
    () => construirDisenoFormJson({ formato, encabezado, cuerpoDocumento, piePagina }),
    [formato, encabezado, cuerpoDocumento, piePagina]
  );
  const variables = useMemo(
    () => construirVariableFormJson({ variables: variablesBorrador, cuerpoDocumento }).variables,
    [variablesBorrador, cuerpoDocumento]
  );
  const datos = useMemo(() => datosEjemplo(variables), [variables]);
  // Código ficticio; el real se genera al radicar
  const sistema = useMemo(
    () => ({ ...datosDeReferencia(audiencia), 'solicitud.codigo': SISTEMA_EJEMPLO['solicitud.codigo'] }),
    [audiencia]
  );
  // Por contenido: pasosFlujo y cargos pueden llegar como arreglos nuevos con los mismos datos
  const clavePasos = JSON.stringify([pasosFlujo, cargos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- depende de clavePasos
  const pasos = useMemo(() => pasosDelDocumento(pasosFlujo, cargos), [clavePasos]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Datos de referencia: así se verá el documento con la información de cada solicitud.
        {paginas ? ` · ${paginas} ${paginas === 1 ? 'hoja' : 'hojas'} Carta` : ''}
      </p>
      <VistaPreviaDocumento
        diseno={diseno}
        variables={variables}
        datos={datos}
        sistema={sistema}
        pasos={pasos}
        ejemplo
        titulo={`Vista previa: ${borrador.nombre.trim() || 'documento sin nombre'}`}
        onPaginado={setPaginas}
        alto={altoVisor}
      />
    </div>
  );
}

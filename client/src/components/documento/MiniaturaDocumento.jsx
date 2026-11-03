import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import requestsApi from '../../api/requests.api';
import VistaPreviaDocumento from './VistaPreviaDocumento';

// Caché de detalles ya pedidos
const detalles = new Map();

function obtenerDetalle(idSolicitud) {
  if (!detalles.has(idSolicitud)) {
    const promesa = requestsApi.getRequestById(idSolicitud).catch((err) => {
      detalles.delete(idSolicitud);
      throw err;
    });
    detalles.set(idSolicitud, promesa);
  }
  return detalles.get(idSolicitud);
}

/**
 * Miniatura decorativa de la primera hoja; pide el detalle cuando se acerca a la pantalla.
 *
 * @param {Object} props
 * @param {number} props.idSolicitud
 */
export default function MiniaturaDocumento({ idSolicitud }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let vigente = true;
    obtenerDetalle(idSolicitud)
      .then((d) => vigente && setDetalle(d))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [visible, idSolicitud]);

  return (
    <div ref={ref} aria-hidden="true" inert="" className="relative aspect-[4/5] overflow-hidden bg-slate-200">
      {detalle && !fallo && (
        <div className="pointer-events-none">
          <VistaPreviaDocumento
            diseno={detalle.disenoFormJson}
            variables={detalle.variableFormJson?.variables}
            datos={detalle.datosJson}
            sistema={detalle.variablesSistema}
            pasos={detalle.pasosDocumento}
            estado={detalle.estado}
            titulo={`${detalle.nombrePlantilla} · ${detalle.codigoDocumento}`}
            onPaginado={() => setLista(true)}
          />
        </div>
      )}

      {fallo ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <FileText className="w-10 h-10" />
        </div>
      ) : (
        !lista && <div className="absolute inset-3 rounded-sm bg-white/70 animate-pulse" />
      )}
    </div>
  );
}

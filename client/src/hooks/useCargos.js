import { useCallback, useEffect, useState } from 'react';
import catalogsApi from '../api/catalogs.api';

/**
 * Cargos de la unidad con su titular.
 * @param {number} [codUnidad]
 * @returns {{ cargos: Array, cargando: boolean, error: boolean, recargar: () => void }}
 */
export default function useCargos(codUnidad) {
  const [cargos, setCargos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    catalogsApi
      .getCargos(codUnidad ? { codUnidad } : {})
      .then((lista) => vigente && setCargos(Array.isArray(lista) ? lista : []))
      .catch((err) => {
        console.error('Error al cargar los cargos:', err);
        if (vigente) setError(true);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [codUnidad, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  return { cargos, cargando, error, recargar };
}

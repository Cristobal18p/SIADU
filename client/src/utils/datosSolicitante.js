/** Datos automáticos ficticios para las vistas previas del constructor y catálogo de variables del documento. */
import { SISTEMA_EJEMPLO, VARIABLES_SISTEMA } from '@siadu/documento';
import { usosEnDocumento } from './variables';

/** Datos del documento: no salen del perfil y se fijan al enviar. */
export const DATOS_DEL_DOCUMENTO = new Set(['sistema.fecha_formal', 'solicitud.codigo']);

/** Los datos automáticos que usa el documento, en el orden del catálogo. */
export const automaticosDelDocumento = (cuerpoDocumento) => {
  const usos = usosEnDocumento(cuerpoDocumento);
  return VARIABLES_SISTEMA.filter((v) => usos.has(v.id));
};

/**
 * Solicitante ficticio por estamento; lo que no aplica queda en `null`.
 * @param {'ESTUDIANTE'|'PROFESOR'|'ADMINISTRATIVO'} estamento
 */
const datosDeEjemplo = (estamento) => {
  const datos = { ...SISTEMA_EJEMPLO, 'solicitud.codigo': null };
  if (estamento === 'ESTUDIANTE') {
    datos['personal.cargo'] = null;
    datos['personal.departamento'] = null;
  } else {
    datos['estudiante.carrera'] = null;
    datos['estudiante.escuela'] = null;
    if (estamento === 'PROFESOR') datos['personal.cargo'] = null;
  }
  return datos;
};

const ESTAMENTOS = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO'];

/**
 * Datos automáticos del primer grupo de la audiencia, o de un estudiante si no hay audiencia.
 * @param {string[]} [audiencia]
 */
export const datosDeReferencia = (audiencia) =>
  datosDeEjemplo(ESTAMENTOS.find((e) => Array.isArray(audiencia) && audiencia.includes(e)) ?? 'ESTUDIANTE');

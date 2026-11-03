import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Button from '../../../components/ui/Button';

/**
 * Ventana para el nombre y la descripción de un flujo nuevo; el código se genera solo.
 *
 * @param {Object} props
 * @param {{ nombre: string, descripcion: string }} props.inicial
 * @param {number} props.totalPasos
 * @param {string} props.etiquetaConfirmar
 * @param {boolean} props.enviando
 * @param {(datos: { nombre: string, descripcion: string }) => void} props.onConfirmar
 * @param {() => void} props.onCancelar
 */
export default function ModalNuevoFlujo({ inicial, totalPasos, etiquetaConfirmar, enviando, onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [error, setError] = useState('');

  const enviar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Ponle un nombre al flujo para poder reutilizarlo.');
      document.getElementById('modal-flujo-nombre')?.focus();
      return;
    }
    onConfirmar({ nombre: nombre.trim(), descripcion: descripcion.trim() });
  };

  return (
    <Modal
      onClose={() => !enviando && onCancelar()}
      title="Nuevo flujo de aprobación"
      subtitle="Se guardará para que puedas reutilizarlo en otras plantillas."
      icon={GitBranch}
      tone="brand"
      footer={
        <>
          <Button variant="outline" size="sm" disabled={enviando} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" form="form-nuevo-flujo" loading={enviando}>
            {etiquetaConfirmar}
          </Button>
        </>
      }
    >
      <form id="form-nuevo-flujo" noValidate onSubmit={enviar} className="p-5 space-y-5">
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Este flujo tiene <span className="font-semibold text-slate-700">{totalPasos}</span>{' '}
          {totalPasos === 1 ? 'paso' : 'pasos'} de aprobación. El código se genera automáticamente.
        </p>

        <Field
          id="modal-flujo-nombre"
          label="Nombre del flujo"
          required
          autoFocus
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (error) setError('');
          }}
          error={error}
          hint="Así lo encontrarás al reutilizarlo en otras plantillas."
          placeholder="Ej: Aprobación de Escuela y Decanato"
          maxLength={150}
          autoComplete="off"
          disabled={enviando}
        />

        <Field
          id="modal-flujo-descripcion"
          as="textarea"
          rows={3}
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Para qué tipo de trámites sirve este flujo."
          disabled={enviando}
        />
      </form>
    </Modal>
  );
}

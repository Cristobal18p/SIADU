import { useRef } from 'react';
import { ArrowLeft, Monitor } from 'lucide-react';
import Button from '../ui/Button';
import useEsEscritorio from '../../hooks/useEsEscritorio';

/**
 * Muestra el contenido solo en escritorio (1024 px o más); en pantallas angostas, un aviso.
 * Si la ventana se angosta con el contenido cargado, se oculta sin desmontarse.
 *
 * @param {Object} props
 * @param {string} [props.funcion='La administración'] - Texto del aviso
 * @param {string} [props.volverLabel]
 * @param {function} [props.onVolver] - Sin él, el aviso no tiene botón
 * @param {React.ReactNode} props.children
 */
export default function SoloEscritorio({ funcion = 'La administración', volverLabel = 'Ir al inicio', onVolver, children }) {
  const esEscritorio = useEsEscritorio();
  const montadoRef = useRef(false);
  if (esEscritorio) montadoRef.current = true;

  const aviso = !esEscritorio && (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 text-center max-w-lg mx-auto my-6">
      <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 text-brand flex items-center justify-center mx-auto mb-4">
        <Monitor className="w-7 h-7" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">Disponible solo en computadora</h1>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        {funcion} de SIADU necesita una pantalla amplia para trabajar con comodidad. Ábrela desde una computadora o
        amplía la ventana del navegador.
      </p>
      {onVolver && (
        <Button className="mt-6" variant="outline" icon={ArrowLeft} onClick={onVolver}>
          {volverLabel}
        </Button>
      )}
    </section>
  );

  if (!montadoRef.current) return aviso || null;

  return (
    <>
      {aviso}
      {/* `display: none` conserva el estado de React mientras la ventana está angosta */}
      <div className={esEscritorio ? 'contents' : 'hidden'}>{children}</div>
    </>
  );
}

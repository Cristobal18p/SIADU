import { cloneElement, isValidElement } from 'react';

/**
 * Pantalla con documento: panel a la izquierda y documento a la derecha; en móvil se apilan.
 * Desde `lg` cada panel se desplaza por separado y `pie` queda fijo al final del panel.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.panel
 * @param {React.ReactNode} props.documento
 * @param {React.ReactElement|false|null} [props.pie] - Un solo elemento
 */
export default function MesaTrabajo({ panel, documento, pie }) {
  return (
    // Alto de la ventana menos la cabecera y el relleno del área de trabajo
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] lg:gap-5 lg:h-[calc(100dvh-52px-3.5rem)] lg:min-h-[32rem]">
      <div className="contents lg:flex lg:flex-col lg:min-h-0 lg:gap-3">
        {/* Margen negativo y relleno para que el anillo de foco no se recorte */}
        <div className="order-1 min-w-0 space-y-6 lg:space-y-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:-m-1 lg:p-1">
          {panel}
        </div>
        {isValidElement(pie) && cloneElement(pie, { className: `${pie.props.className ?? ''} order-3 shrink-0` })}
      </div>
      <div className="order-2 min-w-0 lg:min-h-0">{documento}</div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ImageOff, Plus, X } from 'lucide-react';
import { encabezadoHtml } from '@siadu/documento';
import { LOGOS } from '../../utils/plantillas';

const LINEAS = [
  { campo: 'linea1', nombre: 'Línea 1 del membrete', placeholder: 'UNIVERSIDAD DE PANAMÁ' },
  { campo: 'linea2', nombre: 'Línea 2 del membrete', placeholder: 'FACULTAD O UNIDAD' },
  { campo: 'linea3', nombre: 'Línea 3 del membrete (opcional)', placeholder: 'Dependencia (opcional). Para la escuela del estudiante: {{estudiante.escuela}}', opcional: true },
  { campo: 'linea4', nombre: 'Línea 4 del membrete (opcional)', placeholder: 'Sección o despacho (opcional; vacía no se imprime)', opcional: true },
];

/** Una línea opcional se muestra si existe; `null` indica que no va. */
const lineaVisible = (encabezado, l) => !l.opcional || (encabezado[l.campo] !== null && encabezado[l.campo] !== undefined);

/** Id del DOM de cada línea (Enter pasa a la siguiente). */
const idLineaMembrete = (campo) => `membrete-${campo}`;

/** Línea editable del membrete, en un solo renglón; no es controlada mientras tiene el foco. */
function LineaMembrete({ linea, valor, onCambio, onEnter, onSalir }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== (valor ?? '')) el.textContent = valor ?? '';
  }, [valor]);

  return (
    <div
      ref={ref}
      id={idLineaMembrete(linea.campo)}
      className={`doc-encabezado-${linea.campo} doc-membrete-linea`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={linea.nombre}
      data-placeholder={linea.placeholder}
      spellCheck={false}
      onInput={(e) => {
        // Un solo renglón: los saltos de línea pegados se unen
        const texto = e.currentTarget.textContent.replace(/\s*\n\s*/g, ' ').slice(0, 150);
        if (!texto) e.currentTarget.replaceChildren(); // quita el <br> del navegador para mostrar la ayuda
        else if (texto !== e.currentTarget.textContent) e.currentTarget.textContent = texto;
        onCambio(texto);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onSalir();
        }
      }}
      onBlur={(e) => {
        // Una línea opcional vacía se elimina
        if (linea.opcional && !e.currentTarget.textContent.trim()) onCambio(null);
      }}
    />
  );
}

/** Logo del membrete: clic para elegir entre los disponibles o ninguno. */
function LogoMembrete({ lado, url, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const nombre = lado === 'izq' ? 'Logo izquierdo' : 'Logo derecho';

  const cerrar = (devolverFoco = false) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return undefined;
    // Al abrir, el foco va a la opción elegida
    contenedorRef.current?.querySelector('[aria-checked="true"]')?.focus();
    const cerrarFuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    return () => document.removeEventListener('mousedown', cerrarFuera);
  }, [abierto]);

  // Teclado del menú: flechas, Escape y Tab
  const alTeclear = (e) => {
    const opciones = [...contenedorRef.current.querySelectorAll('[role="menuitemradio"]')];
    const actual = opciones.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      opciones[(actual + paso + opciones.length) % opciones.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === 'Tab') {
      cerrar();
    }
  };

  const elegir = (valor) => {
    onCambio(valor);
    cerrar(true);
  };
  const actual = LOGOS.find((l) => l.valor === url);

  return (
    <div ref={contenedorRef} className="doc-encabezado-logo doc-membrete-logo">
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`${nombre}: ${actual?.etiqueta ?? 'ninguno'}. Cambiar`}
        title={`${nombre} · clic para cambiarlo`}
        onClick={() => setAbierto((a) => !a)}
        className="doc-membrete-logo-boton"
      >
        {url ? <img src={url} alt="" /> : <ImageOff className="doc-membrete-logo-vacio" aria-hidden="true" />}
      </button>
      {abierto && (
        <ul role="menu" aria-label={nombre} onKeyDown={alTeclear} className={`doc-membrete-menu doc-membrete-menu-${lado}`}>
          {[...LOGOS, { valor: null, etiqueta: 'Ninguno' }].map((l) => (
            <li key={l.etiqueta} role="none">
              <button type="button" role="menuitemradio" aria-checked={(url ?? null) === l.valor} onClick={() => elegir(l.valor)}>
                <span className="doc-membrete-menu-check">{(url ?? null) === l.valor && <Check aria-hidden="true" />}</span>
                {l.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Membrete de la primera hoja, editable en el sitio con las mismas clases que el motor.
 * Enter pasa a la línea siguiente y Escape vuelve al cuerpo.
 *
 * @param {Object} props
 * @param {Object} props.encabezado - disenoFormJson.encabezado
 * @param {(encabezado: Object) => void} props.onCambio
 * @param {boolean} props.soloLectura
 * @param {() => void} props.onIrAlCuerpo
 * @param {() => void} props.onQuitar
 */
export default function MembreteEditable({ encabezado = {}, onCambio, soloLectura, onIrAlCuerpo, onQuitar }) {
  if (encabezado.activo === false) return null;
  if (soloLectura) return <div dangerouslySetInnerHTML={{ __html: encabezadoHtml(encabezado) }} />;

  const cambiar = (cambios) => onCambio({ ...encabezado, ...cambios });
  const visibles = LINEAS.filter((l) => lineaVisible(encabezado, l));
  const siguienteOpcional = LINEAS.find((l) => !lineaVisible(encabezado, l));

  const enfocar = (campo) => requestAnimationFrame(() => document.getElementById(idLineaMembrete(campo))?.focus());
  const agregarLinea = () => {
    if (!siguienteOpcional) return;
    cambiar({ [siguienteOpcional.campo]: '' });
    enfocar(siguienteOpcional.campo);
  };

  return (
    <header className="doc-encabezado doc-membrete-editable">
      <LogoMembrete lado="izq" url={encabezado.logoIzqUrl} onCambio={(logoIzqUrl) => cambiar({ logoIzqUrl })} />
      <div className="doc-encabezado-lineas">
        {visibles.map((l, i) => (
          <LineaMembrete
            key={l.campo}
            linea={l}
            valor={encabezado[l.campo]}
            onCambio={(texto) => cambiar({ [l.campo]: texto })}
            onEnter={() => (visibles[i + 1] ? enfocar(visibles[i + 1].campo) : onIrAlCuerpo())}
            onSalir={onIrAlCuerpo}
          />
        ))}
      </div>
      <LogoMembrete lado="der" url={encabezado.logoDerUrl} onCambio={(logoDerUrl) => cambiar({ logoDerUrl })} />
      <button type="button" className="doc-membrete-quitar" onMouseDown={(e) => e.preventDefault()} onClick={onQuitar} title="Quitar el membrete del documento">
        <X aria-hidden="true" />
        Quitar
      </button>
      {siguienteOpcional && (
        <button
          type="button"
          className="doc-membrete-agregar"
          onMouseDown={(e) => e.preventDefault()}
          onClick={agregarLinea}
          title="Agregar una línea opcional al membrete"
        >
          <Plus aria-hidden="true" />
          Agregar línea
        </button>
      )}
    </header>
  );
}

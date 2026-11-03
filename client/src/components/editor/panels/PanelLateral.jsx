import { useState } from 'react';
import { AlertCircle, Braces, Eye, Pencil, Plus, Search, UserRound, X } from 'lucide-react';
import Button from '../../ui/Button';
import { GRUPOS_AUTOMATICOS, erroresVariable, nombreTipo, usosEnDocumento } from '../../../utils/variables';
import ConfigVariable from './ConfigVariable';
import PanelAprobacion from './PanelAprobacion';

const PESTANAS = [
  { id: 'formulario', titulo: 'Formulario' },
  { id: 'automaticos', titulo: 'Automáticos' },
  { id: 'aprobacion', titulo: 'Aprobación' },
];

/** Compara sin tildes ni mayúsculas. */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Fila de variable: el clic la inserta y el lápiz abre su configuración. */
function FilaVariable({ icon: Icon, etiqueta, detalle, estado, error, disabled, onInsertar, onEditar }) {
  return (
    <li className="group flex items-stretch rounded-lg hover:bg-slate-50">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // conserva el cursor del documento
        onClick={onInsertar}
        disabled={disabled}
        title={disabled ? undefined : 'Insertar en el cursor'}
        className="flex-1 min-w-0 flex items-start gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {error ? (
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-label="Configuración incompleta" />
        ) : (
          <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800 truncate">{etiqueta}</span>
          <span className="block text-xs text-slate-500 truncate">{detalle}</span>
          {estado && <span className="block text-xs text-amber-700">{estado}</span>}
        </span>
      </button>
      {onEditar && (
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Configurar la variable ${etiqueta}`}
          title="Configurar"
          className="px-2 rounded-lg text-slate-400 hover:text-brand cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/** Buscador de la lista de una pestaña. */
function Buscador({ id, valor, onCambiar, placeholder }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:border-brand focus:ring-brand/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambiar('')}
          aria-label="Limpiar la búsqueda"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const Atajo = () => <kbd className="px-1 rounded border border-slate-300 bg-slate-50 font-mono">@</kbd>;

/**
 * Panel derecho del editor con las pestañas «Formulario», «Automáticos» y «Aprobación».
 *
 * @param {Object} props
 * @param {import('@tiptap/react').Editor|null} props.editor - Editor del cuerpo
 * @param {Object} props.borrador
 * @param {(cambios: Object) => void} props.onCambio
 * @param {boolean} props.soloLectura
 * @param {'formulario'|'automaticos'|'aprobacion'} props.pestana
 * @param {(pestana: string) => void} props.onPestana
 * @param {string|null} props.editando - Variable en configuración
 * @param {(id: string|null) => void} props.onEditar
 * @param {Object} props.acciones - insertar, nueva, actualizar, renombrar, eliminar, ubicar
 * @param {() => void} props.onVistaPrevia
 * @param {Object} props.aprobacion - Props de la pestaña «Aprobación»
 */
export default function PanelLateral({
  editor,
  borrador,
  onCambio,
  soloLectura,
  pestana,
  onPestana,
  editando,
  onEditar,
  acciones,
  onVistaPrevia,
  aprobacion,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAuto, setBusquedaAuto] = useState('');
  const usos = usosEnDocumento(borrador.cuerpoDocumento);
  const variableEditada = editando ? borrador.variables.find((v) => v.id === editando) : null;
  const sinEditor = soloLectura || !editor;

  const coincide = (consulta, ...textos) =>
    !consulta.trim() || textos.some((t) => normalizar(t).includes(normalizar(consulta.trim())));
  const delFormulario = borrador.variables.filter((v) => coincide(busqueda, v.etiqueta, v.pregunta, v.id));
  const enFormulario = borrador.variables.filter((v) => usos.has(v.id)).length;
  const grupos = GRUPOS_AUTOMATICOS.map((g) => ({
    ...g,
    variables: g.variables.filter((v) => coincide(busquedaAuto, v.etiqueta, v.id)),
  })).filter((g) => g.variables.length > 0);

  // Flechas, Inicio y Fin cambian de pestaña; solo la activa recibe Tab
  const alTeclearPestanas = (e) => {
    const actual = PESTANAS.findIndex((p) => p.id === pestana);
    const destino = {
      ArrowRight: (actual + 1) % PESTANAS.length,
      ArrowLeft: (actual - 1 + PESTANAS.length) % PESTANAS.length,
      Home: 0,
      End: PESTANAS.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    onPestana(PESTANAS[destino].id);
    document.getElementById(`panel-tab-${PESTANAS[destino].id}`)?.focus();
  };

  return (
    <aside aria-label="Panel del documento" className="w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col min-h-0">
      <div role="tablist" aria-label="Secciones del panel" className="flex border-b border-slate-200 shrink-0" onKeyDown={alTeclearPestanas}>
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`panel-tab-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={pestana === p.id ? 0 : -1}
            onClick={() => onPestana(p.id)}
            className={`flex-1 h-10 text-sm font-semibold border-b-2 cursor-pointer focus:outline-none focus-visible:bg-slate-50 ${
              pestana === p.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {pestana === 'formulario' && (
        <div role="tabpanel" id="panel-formulario" aria-labelledby="panel-tab-formulario" className="flex-1 overflow-y-auto p-3">
          {variableEditada ? (
            <div className="p-1">
              <ConfigVariable
                variable={variableEditada}
                variables={borrador.variables}
                usos={usos.get(variableEditada.id) ?? 0}
                soloLectura={soloLectura}
                onCambiar={acciones.actualizar}
                onRenombrar={acciones.renombrar}
                onEliminar={() => acciones.eliminar(variableEditada.id)}
                onIrAlDocumento={() => acciones.ubicar(variableEditada.id)}
                onVolver={() => onEditar(null)}
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2 px-1">
                <p className="text-xs text-slate-500">
                  Cada variable que insertes en el texto es un campo que llena el solicitante. Escribe <Atajo /> en el
                  documento o selecciona texto y conviértelo en variable.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" icon={Plus} className="flex-1" disabled={sinEditor} onMouseDown={(e) => e.preventDefault()} onClick={() => acciones.nueva()}>
                    Nueva variable
                  </Button>
                  <Button variant="outline" size="sm" icon={Eye} onClick={onVistaPrevia} title="Vista previa del formulario del solicitante">
                    Vista previa
                  </Button>
                </div>
                {borrador.variables.length > 0 && (
                  <Buscador id="panel-buscar-variable" valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar variable" />
                )}
              </div>

              <section>
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Variables <span className="font-medium normal-case tracking-normal">· {enFormulario} en el formulario</span>
                </h3>
                {borrador.variables.length === 0 ? (
                  <p className="px-3 mt-1 text-xs text-slate-500">Aún no hay variables.</p>
                ) : delFormulario.length === 0 ? (
                  <p className="px-3 mt-1 text-xs text-slate-500">Ninguna coincide con la búsqueda.</p>
                ) : (
                  <ul className="mt-2">
                    {delFormulario.map((v) => {
                      const n = usos.get(v.id) ?? 0;
                      const conError = Object.keys(erroresVariable(v, borrador.variables)).length > 0;
                      return (
                        <FilaVariable
                          key={v.id}
                          icon={Braces}
                          etiqueta={v.etiqueta?.trim() || v.id}
                          detalle={`${nombreTipo(v.tipo)}${v.tipo !== 'checkbox' && v.requerido ? ' · obligatorio' : ''}${n > 1 ? ` · ${n} usos` : ''}`}
                          estado={n === 0 ? 'Sin usar: no irá al formulario' : null}
                          error={n > 0 && conError}
                          disabled={sinEditor}
                          onInsertar={() => acciones.insertar(v.id)}
                          onEditar={() => onEditar(v.id)}
                        />
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {pestana === 'automaticos' && (
        <div role="tabpanel" id="panel-automaticos" aria-labelledby="panel-tab-automaticos" className="flex-1 overflow-y-auto p-3 space-y-5">
          <div className="space-y-2 px-1">
            <p className="text-xs text-slate-500">
              El sistema los completa con los datos de quien solicita y de la solicitud; no se le preguntan. Haz clic
              para insertarlos en el cursor o escribe <Atajo /> en el documento.
            </p>
            <Buscador id="panel-buscar-automatico" valor={busquedaAuto} onCambiar={setBusquedaAuto} placeholder="Buscar dato automático" />
          </div>
          {grupos.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">Ninguno coincide con la búsqueda.</p>
          ) : (
            grupos.map((g) => (
              <section key={g.titulo}>
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{g.titulo}</h3>
                {g.descripcion && <p className="px-3 mt-0.5 text-xs text-slate-500">{g.descripcion}</p>}
                <ul className="mt-1.5">
                  {g.variables.map((v) => {
                    const n = usos.get(v.id) ?? 0;
                    return (
                      <FilaVariable
                        key={v.id}
                        icon={UserRound}
                        etiqueta={v.etiqueta}
                        detalle={n === 0 ? 'Sin usar' : `En el documento${n > 1 ? ` · ${n} usos` : ''}`}
                        disabled={sinEditor}
                        onInsertar={() => acciones.insertar(v.id)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {pestana === 'aprobacion' && (
        <div role="tabpanel" id="panel-aprobacion" aria-labelledby="panel-tab-aprobacion" className="flex-1 overflow-y-auto p-3">
          <PanelAprobacion borrador={borrador} onCambio={onCambio} soloLectura={soloLectura} {...aprobacion} />
        </div>
      )}
    </aside>
  );
}

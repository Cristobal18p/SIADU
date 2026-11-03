import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, LocateFixed, Plus, Trash2, X } from 'lucide-react';
import Button from '../../ui/Button';
import Checkbox from '../../ui/Checkbox';
import Field from '../../ui/Field';
import { claveOtro } from '../../../utils/formularios';
import {
  FORMATOS_TEXTO,
  REGLAS_TEMPORALES,
  TIPOS_VARIABLE,
  cambiarTipo,
  clavesOcupadas,
  erroresVariable,
  generarId,
  generarValorOpcion,
} from '../../../utils/variables';

/** Selector del panel: siempre tiene un valor (sin opción vacía). */
function Selector({ id, etiqueta, value, opciones, disabled, onChange, ayuda }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:border-brand focus:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-slate-500">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Botón de icono de la lista de opciones. */
function BotonIcono({ icon: Icon, etiqueta, disabled, onClick, peligro = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`p-1.5 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        peligro ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}

const Seccion = ({ titulo, children }) => (
  <section className="space-y-3">
    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{titulo}</h4>
    {children}
  </section>
);

/** Número de un campo; vacío significa sin restricción. */
const aNumero = (texto) => (texto === '' || texto === null || texto === undefined ? undefined : Number(texto));
const deNumero = (n) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '');

/**
 * Configuración de una variable en el panel del editor. Los cambios se aplican al momento;
 * el identificador, al salir del campo.
 *
 * @param {Object} props
 * @param {Object} props.variable
 * @param {Array} props.variables - Variables del borrador
 * @param {number} props.usos - Apariciones en el documento
 * @param {boolean} props.soloLectura
 * @param {(variable: Object) => void} props.onCambiar
 * @param {(viejo: string, nuevo: string) => void} props.onRenombrar
 * @param {() => void} props.onEliminar - Quita la definición y sus cápsulas
 * @param {() => ({ indice: number, total: number }|null)} props.onIrAlDocumento - Muestra la siguiente aparición
 * @param {() => void} props.onVolver
 */
export default function ConfigVariable({
  variable: v,
  variables,
  usos,
  soloLectura,
  onCambiar,
  onRenombrar,
  onEliminar,
  onIrAlDocumento,
  onVolver,
}) {
  const [idTexto, setIdTexto] = useState(v.id);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [ubicada, setUbicada] = useState(null); // última aparición mostrada
  const etiquetaAlEnfocar = useRef(v.etiqueta);
  const pref = `var-${v.id}`;

  useEffect(() => {
    setIdTexto(v.id);
    setConfirmandoBorrado(false);
    setUbicada(null);
  }, [v.id]);

  const errores = erroresVariable(v, variables);
  const errorId = idTexto === v.id ? errores.id : erroresVariable({ ...v, id: idTexto }, variables).id;
  const validaciones = v.validaciones || {};

  const cambiar = (cambios) => onCambiar({ ...v, ...cambios });
  const cambiarValidacion = (clave, valor) => {
    const siguiente = { ...validaciones, [clave]: valor };
    if (valor === undefined || valor === '' || valor === false) delete siguiente[clave];
    cambiar({ validaciones: siguiente });
  };

  // ---- identificador: se aplica al salir si es válido
  const aplicarId = () => {
    const nuevo = idTexto.trim();
    if (nuevo === v.id) return;
    if (erroresVariable({ ...v, id: nuevo }, variables).id) {
      setIdTexto(v.id);
      return;
    }
    onRenombrar(v.id, nuevo);
  };

  // ---- etiqueta: el id generado sigue a la etiqueta
  const alSalirDeEtiqueta = () => {
    const anterior = etiquetaAlEnfocar.current;
    if (soloLectura || anterior === v.etiqueta || !v.etiqueta.trim()) return;
    const ocupadas = clavesOcupadas(variables, v);
    if (v.id !== generarId(anterior, ocupadas)) return; // id escrito a mano
    const nuevo = generarId(v.etiqueta, ocupadas);
    if (nuevo !== v.id) onRenombrar(v.id, nuevo);
  };

  // ---- opciones del selector
  const opciones = v.opciones || [];
  const cambiarOpciones = (lista) => cambiar({ opciones: lista });
  const cambiarEtiquetaOpcion = (i, etiqueta) => {
    const otros = new Set(opciones.filter((_, j) => j !== i).map((o) => o.valor));
    cambiarOpciones(opciones.map((o, j) => (j === i ? { etiqueta, valor: generarValorOpcion(etiqueta, otros) } : o)));
  };
  const agregarOpcion = () => {
    const valores = new Set(opciones.map((o) => o.valor));
    cambiarOpciones([...opciones, { etiqueta: '', valor: generarValorOpcion('', valores) }]);
    // El foco pasa a la opción nueva
    requestAnimationFrame(() => document.getElementById(`${pref}-opcion-${opciones.length}`)?.focus());
  };
  const moverOpcion = (i, delta) => {
    const lista = [...opciones];
    [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
    cambiarOpciones(lista);
  };

  const esTexto = v.tipo === 'text' || v.tipo === 'textarea';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="link" size="sm" icon={ArrowLeft} onClick={onVolver}>
          Variables
        </Button>
        <span className="text-xs text-slate-500">
          {usos === 0 ? 'Sin usar en el documento' : `${usos} ${usos === 1 ? 'uso' : 'usos'} en el documento`}
        </span>
      </div>

      <Seccion titulo="Variable">
        <Field
          id={`${pref}-etiqueta`}
          size="sm"
          label="Nombre de la variable"
          required
          value={v.etiqueta}
          maxLength={120}
          autoComplete="off"
          disabled={soloLectura}
          error={errores.etiqueta}
          hint="Nombre corto: así aparece la cápsula en el documento y la respuesta en el resumen de la solicitud."
          onFocus={() => {
            etiquetaAlEnfocar.current = v.etiqueta;
          }}
          onChange={(e) => cambiar({ etiqueta: e.target.value })}
          onBlur={alSalirDeEtiqueta}
        />
        <Field
          id={`${pref}-pregunta`}
          as="textarea"
          rows={2}
          size="sm"
          label="Pregunta del formulario"
          required
          value={v.pregunta ?? ''}
          maxLength={200}
          disabled={soloLectura}
          error={errores.pregunta}
          placeholder="Ej: Indique el motivo por el que solicita el retiro"
          hint="Es lo que lee el solicitante sobre el campo: indica qué debe responder."
          // Dos líneas visibles, un solo renglón
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          onChange={(e) => cambiar({ pregunta: e.target.value.replace(/\s*\n\s*/g, ' ') })}
        />
        <Selector
          id={`${pref}-tipo`}
          etiqueta="Tipo de dato"
          value={v.tipo}
          opciones={TIPOS_VARIABLE}
          disabled={soloLectura}
          onChange={(tipo) => onCambiar(cambiarTipo(v, tipo))}
        />
        {v.tipo === 'checkbox' ? (
          <p className="text-xs text-slate-500">La confirmación legal siempre es obligatoria.</p>
        ) : (
          <Checkbox
            id={`${pref}-requerido`}
            label="Obligatorio"
            description="El solicitante no podrá enviar la solicitud sin completarlo."
            checked={Boolean(v.requerido)}
            disabled={soloLectura}
            onChange={(requerido) => cambiar({ requerido })}
          />
        )}
        {['text', 'textarea', 'number'].includes(v.tipo) && (
          <Field
            id={`${pref}-placeholder`}
            size="sm"
            label="Texto de ejemplo (opcional)"
            value={v.placeholder ?? ''}
            maxLength={120}
            autoComplete="off"
            disabled={soloLectura}
            placeholder="Ej: INF-101 Programación I"
            onChange={(e) => cambiar({ placeholder: e.target.value })}
          />
        )}
      </Seccion>

      {esTexto && (
        <Seccion titulo="Restricciones">
          <div className="grid grid-cols-2 gap-3">
            <Field
              id={`${pref}-min`}
              size="sm"
              type="number"
              min={0}
              step={1}
              label="Mín. caracteres"
              value={deNumero(validaciones.min)}
              disabled={soloLectura}
              error={errores.min}
              onChange={(e) => cambiarValidacion('min', aNumero(e.target.value))}
            />
            <Field
              id={`${pref}-max`}
              size="sm"
              type="number"
              min={1}
              step={1}
              label="Máx. caracteres"
              value={deNumero(validaciones.max)}
              disabled={soloLectura}
              error={errores.max}
              onChange={(e) => cambiarValidacion('max', aNumero(e.target.value))}
            />
          </div>
          {v.tipo === 'textarea' && (
            <p className="text-xs text-slate-500">Un máximo evita que un texto muy largo desborde la hoja.</p>
          )}
          {v.tipo === 'text' && (
            <Selector
              id={`${pref}-formato`}
              etiqueta="Formato"
              value={FORMATOS_TEXTO.some((f) => f.valor === (validaciones.patron ?? '')) ? validaciones.patron ?? '' : ''}
              opciones={FORMATOS_TEXTO}
              disabled={soloLectura}
              onChange={(patron) => cambiarValidacion('patron', patron || undefined)}
            />
          )}
        </Seccion>
      )}

      {v.tipo === 'number' && (
        <Seccion titulo="Restricciones">
          <div className="grid grid-cols-2 gap-3">
            <Field
              id={`${pref}-min`}
              size="sm"
              type="number"
              label="Valor mínimo"
              value={deNumero(validaciones.min)}
              disabled={soloLectura}
              error={errores.min}
              onChange={(e) => cambiarValidacion('min', aNumero(e.target.value))}
            />
            <Field
              id={`${pref}-max`}
              size="sm"
              type="number"
              label="Valor máximo"
              value={deNumero(validaciones.max)}
              disabled={soloLectura}
              error={errores.max}
              onChange={(e) => cambiarValidacion('max', aNumero(e.target.value))}
            />
          </div>
          <Checkbox
            id={`${pref}-decimales`}
            label="Permitir decimales"
            description="Si no se marca, solo se aceptan números enteros."
            checked={validaciones.decimales === true}
            disabled={soloLectura}
            onChange={(marcado) => cambiarValidacion('decimales', marcado)}
          />
        </Seccion>
      )}

      {v.tipo === 'date' && (
        <Seccion titulo="Restricciones">
          <Selector
            id={`${pref}-regla`}
            etiqueta="Fechas permitidas"
            value={validaciones.reglaTemporal ?? 'libre'}
            opciones={REGLAS_TEMPORALES}
            disabled={soloLectura}
            onChange={(regla) => cambiarValidacion('reglaTemporal', regla === 'libre' ? undefined : regla)}
          />
          <Checkbox
            id={`${pref}-habiles`}
            label="Solo días hábiles"
            description="No se pueden elegir sábados ni domingos."
            checked={validaciones.soloDiasHabiles === true}
            disabled={soloLectura}
            onChange={(marcado) => cambiarValidacion('soloDiasHabiles', marcado)}
          />
        </Seccion>
      )}

      {v.tipo === 'select' && (
        <Seccion titulo="Opciones">
          <Selector
            id={`${pref}-presentacion`}
            etiqueta="Se muestra como"
            value={v.presentacion === 'radio' ? 'radio' : 'lista'}
            opciones={[
              { valor: 'lista', etiqueta: 'Lista desplegable' },
              { valor: 'radio', etiqueta: 'Botones de opción' },
            ]}
            disabled={soloLectura}
            onChange={(presentacion) => cambiar({ presentacion })}
          />
          <fieldset aria-describedby={errores.opciones ? `${pref}-opciones-error` : undefined}>
            <legend className="block text-xs font-semibold text-slate-700 mb-1">Lista de opciones</legend>
            <ol className="space-y-1.5">
              {opciones.map((o, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-5 text-xs text-slate-400 tabular-nums text-right shrink-0" aria-hidden="true">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <Field
                      id={`${pref}-opcion-${i}`}
                      size="sm"
                      hideLabel
                      label={`Opción ${i + 1}`}
                      value={o.etiqueta}
                      maxLength={120}
                      autoComplete="off"
                      placeholder="Texto de la opción"
                      disabled={soloLectura}
                      onChange={(e) => cambiarEtiquetaOpcion(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (i === opciones.length - 1) agregarOpcion();
                          else document.getElementById(`${pref}-opcion-${i + 1}`)?.focus();
                        }
                      }}
                    />
                  </div>
                  <BotonIcono icon={ArrowUp} etiqueta={`Subir la opción ${i + 1}`} disabled={soloLectura || i === 0} onClick={() => moverOpcion(i, -1)} />
                  <BotonIcono icon={ArrowDown} etiqueta={`Bajar la opción ${i + 1}`} disabled={soloLectura || i === opciones.length - 1} onClick={() => moverOpcion(i, 1)} />
                  <BotonIcono icon={X} etiqueta={`Quitar la opción ${i + 1}`} peligro disabled={soloLectura} onClick={() => cambiarOpciones(opciones.filter((_, j) => j !== i))} />
                </li>
              ))}
            </ol>
            {errores.opciones && (
              <p id={`${pref}-opciones-error`} className="mt-1 text-xs font-medium text-rose-700">
                {errores.opciones}
              </p>
            )}
            {!soloLectura && (
              <Button variant="link" size="sm" icon={Plus} onClick={agregarOpcion} className="mt-1">
                Agregar opción
              </Button>
            )}
          </fieldset>
          <Checkbox
            id={`${pref}-otro`}
            label="Agregar la opción «Otro»"
            description="Si el solicitante la elige, escribe su respuesta en un campo adicional."
            checked={Boolean(v.opcionOtro)}
            disabled={soloLectura}
            onChange={(opcionOtro) => cambiar({ opcionOtro })}
          />
        </Seccion>
      )}

      {v.tipo === 'checkbox' && (
        <Seccion titulo="Declaración">
          <Field
            id={`${pref}-legal`}
            as="textarea"
            rows={4}
            size="sm"
            label="Texto que acepta el solicitante"
            required
            value={v.textoLegal ?? ''}
            maxLength={600}
            disabled={soloLectura}
            error={errores.textoLegal}
            placeholder="Declaro bajo juramento que la información suministrada es veraz."
            hint="Se muestra junto a la casilla. En el documento, la variable se imprime como «Sí»."
            onChange={(e) => cambiar({ textoLegal: e.target.value })}
          />
        </Seccion>
      )}

      <Seccion titulo="Avanzado">
        <Field
          id={`${pref}-id`}
          size="sm"
          label="Identificador técnico"
          value={idTexto}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          disabled={soloLectura}
          error={errorId}
          hint={
            v.tipo === 'select' && v.opcionOtro
              ? `Clave de la respuesta. El texto de «Otro» se guarda en «${claveOtro(v.id)}».`
              : 'Clave con la que se guarda la respuesta. Se actualiza en todo el documento.'
          }
          onChange={(e) => setIdTexto(e.target.value)}
          onBlur={aplicarId}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              aplicarId();
            } else if (e.key === 'Escape') {
              setIdTexto(v.id);
            }
          }}
        />
      </Seccion>

      <div className="pt-4 border-t border-slate-200 space-y-3">
        {usos > 0 && (
          <Button variant="outline" size="sm" icon={LocateFixed} className="w-full" onClick={() => setUbicada(onIrAlDocumento())}>
            {usos > 1 && ubicada ? `Ubicar la siguiente · vas en ${ubicada.indice} de ${ubicada.total}` : 'Ubicar en el documento'}
          </Button>
        )}
        {!soloLectura &&
          (confirmandoBorrado ? (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
              <p className="text-xs text-rose-900">
                {usos > 0
                  ? `Se quitará la variable y ${usos === 1 ? 'su cápsula' : `sus ${usos} cápsulas`} del documento.`
                  : 'Se quitará la variable.'}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmandoBorrado(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" icon={Trash2} onClick={onEliminar}>
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" icon={Trash2} className="w-full" onClick={() => setConfirmandoBorrado(true)}>
              Eliminar variable
            </Button>
          ))}
      </div>
    </div>
  );
}

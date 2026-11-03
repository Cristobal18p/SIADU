import Field from '../../components/ui/Field';
import Checkbox from '../../components/ui/Checkbox';
import { VALOR_OTRO, claveOtro, etiquetaCampo, hoyISO, opcionesDe } from '../../utils/formularios';

const INPUT_TYPES = { text: 'text', number: 'number', date: 'date' };

/** Máximo de caracteres de un texto en media columna. */
const MAX_TEXTO_CORTO = 40;
/** Largo máximo de las opciones de una lista en media columna. */
const MAX_OPCION_CORTA = 28;
/** Fracción del máximo a partir de la que aparece el contador. */
const AVISO_LARGO = 0.8;

/** Indica si el campo va en media columna: números, fechas, textos cortos y listas de opciones breves. */
const esCorto = (v) => {
  const { max } = v.validaciones || {};
  if (v.tipo === 'number' || v.tipo === 'date') return true;
  if (v.tipo === 'text') return max !== undefined && max <= MAX_TEXTO_CORTO;
  if (v.tipo === 'select' && v.presentacion !== 'radio') {
    return opcionesDe(v).every((o) => String(o.etiqueta).length <= MAX_OPCION_CORTA);
  }
  return false;
};

/** Teclado del móvil para un número según admita decimales o negativos. */
const tecladoNumero = ({ min, decimales } = {}) => {
  if (min === undefined || min < 0) return undefined;
  return decimales === true ? 'decimal' : 'numeric';
};

/** Botones de opción para un select con `presentacion: 'radio'`. */
function GrupoOpciones({ variable, valor, error, onChange, onBlur, disabled }) {
  const errorId = error ? `campo-${variable.id}-error` : undefined;
  return (
    <fieldset aria-describedby={errorId} aria-invalid={error ? true : undefined}>
      <legend className="block text-xs font-medium text-slate-700 mb-2">
        {etiquetaCampo(variable)}
        {variable.requerido && (
          <span className="text-rose-600 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="space-y-1 sm:space-y-2">
        {opcionesDe(variable).map((o) => {
          const id = `campo-${variable.id}-${o.valor}`;
          return (
            // En móvil, una fila de 44 px por opción
            <label
              key={o.valor}
              htmlFor={id}
              className="flex items-center gap-3 sm:gap-2.5 min-h-11 sm:min-h-0 text-sm text-slate-800 cursor-pointer"
            >
              <input
                id={id}
                type="radio"
                name={`campo-${variable.id}`}
                value={o.valor}
                checked={valor === o.valor}
                onChange={() => onChange(o.valor)}
                onBlur={onBlur}
                disabled={disabled}
                className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 accent-brand cursor-pointer"
              />
              {o.etiqueta}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Formulario generado a partir de las variables de una plantilla; cada campo según su `tipo`.
 * El texto libre de «Otro» se guarda en `valores[claveOtro(id)]`.
 *
 * @param {Object} props
 * @param {Array} props.variables - VariableFormulario[]
 * @param {Object} props.valores - Valores por id
 * @param {Object} props.errores - Errores por id
 * @param {function} props.onChange - (id, valor) => void
 * @param {function} [props.onBlur] - (id) => void
 * @param {boolean} [props.disabled]
 */
export default function FormularioDinamico({ variables, valores, errores, onChange, onBlur, disabled = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
      {variables.map((v) => (
        <div key={v.id} className={esCorto(v) ? 'min-w-0' : 'min-w-0 sm:col-span-2'}>
          {campo(v)}
        </div>
      ))}
    </div>
  );

  function campo(v) {
    const { min, max, decimales, reglaTemporal, soloDiasHabiles } = v.validaciones || {};
    const esTexto = v.tipo === 'text' || v.tipo === 'textarea';
    const largo = String(valores[v.id] ?? '').length;

    // ---- confirmación legal
    if (v.tipo === 'checkbox') {
      return (
        <div>
          <Checkbox
            id={`campo-${v.id}`}
            label={etiquetaCampo(v)}
            description={v.textoLegal}
            checked={valores[v.id] === true}
            onChange={(marcado) => onChange(v.id, marcado)}
            disabled={disabled}
          />
          {errores[v.id] && (
            <p role="alert" className="mt-1 ml-7 text-xs font-medium text-rose-700">
              {errores[v.id]}
            </p>
          )}
        </div>
      );
    }

    // ---- select
    if (v.tipo === 'select') {
      const eligioOtro = valores[v.id] === VALOR_OTRO;
      return (
        <div className="space-y-3">
          {v.presentacion === 'radio' ? (
            <GrupoOpciones
              variable={v}
              valor={valores[v.id] ?? ''}
              error={errores[v.id]}
              onChange={(valor) => onChange(v.id, valor)}
              onBlur={() => onBlur?.(v.id)}
              disabled={disabled}
            />
          ) : (
            <Field
              id={`campo-${v.id}`}
              label={etiquetaCampo(v)}
              as="select"
              options={opcionesDe(v)}
              required={v.requerido}
              error={errores[v.id]}
              value={valores[v.id] ?? ''}
              onChange={(e) => onChange(v.id, e.target.value)}
              onBlur={() => onBlur?.(v.id)}
              disabled={disabled}
            />
          )}
          {eligioOtro && (
            <Field
              id={`campo-${claveOtro(v.id)}`}
              label="¿Cuál?"
              required
              placeholder="Escribe tu respuesta"
              error={errores[claveOtro(v.id)]}
              value={valores[claveOtro(v.id)] ?? ''}
              onChange={(e) => onChange(claveOtro(v.id), e.target.value)}
              disabled={disabled}
              autoComplete="off"
            />
          )}
        </div>
      );
    }

    // ---- text, textarea, number, date
    let hint;
    if (esTexto && max !== undefined && largo >= max * AVISO_LARGO) hint = `${largo}/${max} caracteres`;
    else if (v.tipo === 'number') {
      const rango = min !== undefined || max !== undefined ? `Valor entre ${min ?? '—'} y ${max ?? '—'}` : '';
      hint = [rango, decimales === true ? '' : 'Solo números enteros'].filter(Boolean).join(' · ');
    } else if (v.tipo === 'date') {
      hint =
        [
          reglaTemporal === 'pasadas' ? 'Solo fechas pasadas' : reglaTemporal === 'futuras' ? 'Solo fechas futuras' : '',
          soloDiasHabiles ? 'Solo días hábiles' : '',
        ]
          .filter(Boolean)
          .join(' · ') || undefined;
    }

    return (
      <Field
        id={`campo-${v.id}`}
        label={etiquetaCampo(v)}
        as={v.tipo === 'textarea' ? 'textarea' : 'input'}
        type={INPUT_TYPES[v.tipo]}
        required={v.requerido}
        placeholder={v.placeholder}
        min={v.tipo === 'number' ? min : v.tipo === 'date' && reglaTemporal === 'futuras' ? hoyISO() : undefined}
        max={v.tipo === 'number' ? max : v.tipo === 'date' && reglaTemporal === 'pasadas' ? hoyISO() : undefined}
        step={v.tipo === 'number' ? (decimales === true ? 'any' : 1) : undefined}
        inputMode={v.tipo === 'number' ? tecladoNumero(v.validaciones) : undefined}
        enterKeyHint={v.tipo === 'textarea' ? undefined : 'next'}
        maxLength={esTexto ? max : undefined}
        hint={hint}
        error={errores[v.id]}
        value={valores[v.id] ?? ''}
        onChange={(e) => onChange(v.id, e.target.value)}
        onBlur={() => onBlur?.(v.id)}
        disabled={disabled}
      />
    );
  }
}

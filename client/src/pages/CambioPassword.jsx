import { useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { LOGO_UP } from '../utils/logos';
import fondoEntrada from '../assets/images/entrada-UP.webp';
import authApi from '../api/auth.api';
import Field from '../components/ui/Field';
import { REGLAS_PASSWORD, erroresCambioPassword } from '../utils/password';

/** Campo de contraseña con botón para mostrarla; con `siguiente`, Intro pasa a ese campo. */
function CampoPassword({ id, label, value, onChange, error, autoComplete, describedBy, siguiente }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      id={id}
      type={visible ? 'text' : 'password'}
      label={label}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      autoComplete={autoComplete}
      aria-describedby={describedBy}
      maxLength={64}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint={siguiente ? 'next' : 'done'}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || !siguiente) return;
        e.preventDefault();
        document.getElementById(siguiente)?.focus();
      }}
      className="tracking-wider"
      icon={<Lock size={16} strokeWidth={2.25} aria-hidden="true" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="w-10 h-10 -mr-2.5 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
        >
          {visible ? <EyeOff size={16} strokeWidth={2.25} aria-hidden="true" /> : <Eye size={16} strokeWidth={2.25} aria-hidden="true" />}
        </button>
      }
    />
  );
}

/**
 * Cambio obligatorio de la contraseña inicial; no permite continuar hasta cambiarla.
 *
 * @param {Object} props
 * @param {Object} props.usuario
 * @param {() => void} props.onListo - Contraseña cambiada
 * @param {() => void} props.onSalir - Cierra la sesión
 */
export default function CambioPassword({ usuario, onListo, onSalir }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Al escribir se limpia el error de ese campo
  const conLimpieza = (campo, setter) => (valor) => {
    setter(valor);
    if (errores[campo]) setErrores(({ [campo]: _quitado, ...resto }) => resto);
    setErrorGeneral('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    const e1 = erroresCambioPassword({ actual, nueva, confirmacion });
    setErrores(e1);
    if (Object.keys(e1).length > 0) {
      document.getElementById(`password-${Object.keys(e1)[0]}`)?.focus();
      return;
    }
    setEnviando(true);
    setErrorGeneral('');
    try {
      await authApi.cambiarPassword({ passwordActual: actual, passwordNueva: nueva });
      onListo();
    } catch (err) {
      // Errores por campo del servidor
      const porCampo = {};
      (err.detalles || []).forEach((d) => {
        if (d.campo === 'passwordActual') porCampo.actual = d.mensaje;
        if (d.campo === 'passwordNueva') porCampo.nueva = d.mensaje;
      });
      if (err.codigo === 'PASSWORD_ACTUAL_INCORRECTA' && !porCampo.actual) porCampo.actual = err.message;
      if (Object.keys(porCampo).length > 0) {
        setErrores(porCampo);
        document.getElementById(`password-${porCampo.actual ? 'actual' : 'nueva'}`)?.focus();
      } else {
        setErrorGeneral(err.message || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="relative w-full min-h-dvh bg-brand-dark flex items-center justify-center px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] overflow-hidden">
      <img
        src={fondoEntrada}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Capa oscura sobre la foto */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-900/80" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img src={LOGO_UP} alt="" className="h-10 w-auto object-contain" />
              <span className="text-sm font-bold text-brand tracking-tight">SIADU</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand border border-blue-100 flex items-center justify-center shrink-0">
              <KeyRound size={20} strokeWidth={2.25} aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Cambia tu contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">
            {usuario?.nombreCompleto ? `${usuario.nombreCompleto}, es` : 'Es'} tu primer acceso. Por seguridad, reemplaza la
            contraseña inicial antes de continuar.
          </p>
        </header>

        {errorGeneral && (
          <div role="alert" className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={18} strokeWidth={2.25} aria-hidden="true" />
            <span>{errorGeneral}</span>
          </div>
        )}

        <form noValidate onSubmit={enviar} className="space-y-4">
          <CampoPassword
            id="password-actual"
            label="Contraseña actual"
            value={actual}
            onChange={conLimpieza('actual', setActual)}
            error={errores.actual}
            autoComplete="current-password"
            siguiente="password-nueva"
          />
          <CampoPassword
            id="password-nueva"
            label="Contraseña nueva"
            value={nueva}
            onChange={conLimpieza('nueva', setNueva)}
            error={errores.nueva}
            autoComplete="new-password"
            describedBy="password-requisitos"
            siguiente="password-confirmacion"
          />

          <div id="password-requisitos" className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">La contraseña nueva debe tener:</p>
            <ul className="space-y-1">
              {REGLAS_PASSWORD.map((regla) => {
                const ok = regla.cumple(nueva);
                const Icono = ok ? CheckCircle2 : Circle;
                return (
                  <li key={regla.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-700' : 'text-slate-600'}`}>
                    <Icono size={14} strokeWidth={2.25} aria-hidden="true" />
                    <span>
                      {regla.texto}
                      <span className="sr-only">{ok ? ': cumplido' : ': pendiente'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <CampoPassword
            id="password-confirmacion"
            label="Repite la contraseña nueva"
            value={confirmacion}
            onChange={conLimpieza('confirmacion', setConfirmacion)}
            error={errores.confirmacion}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={enviando}
            className="w-full h-12 sm:h-11 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-brand/30 disabled:opacity-75 cursor-pointer"
          >
            {enviando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} strokeWidth={2.25} aria-hidden="true" />
                <span>Guardar y continuar</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onSalir}
            className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            <LogOut size={14} strokeWidth={2.25} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}

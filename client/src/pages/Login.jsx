import { useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Briefcase, Eye, EyeOff, FileText, GraduationCap,
  Headset, IdCard, Info, Lock, Mail, Presentation,
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import Field from '../components/ui/Field'
import { LOGO_UP, LOGO_FIEC } from '../utils/logos'
import facultadBg from '../assets/images/fiec_facultad.webp'
import authApi from '../api/auth.api'

const ESTAMENTOS = [
  { id: 'estudiante', label: 'Estudiante', short: 'Estudiante', icon: GraduationCap },
  { id: 'profesor', label: 'Profesor', short: 'Profesor', icon: Presentation },
  { id: 'administrativo', label: 'Administrativo', short: 'Admin.', icon: Briefcase },
]

export default function Login({ onLogin }) {
  const [estamento, setEstamento] = useState('estudiante')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const estamentoRefs = useRef({})

  const handleEstamentoKeyDown = (e, index) => {
    const last = ESTAMENTOS.length - 1
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1
    if (next === null) return
    e.preventDefault()
    const id = ESTAMENTOS[next].id
    handleEstamentoChange(id)
    estamentoRefs.current[id]?.focus()
  }

  // El identificador se conserva al cambiar de estamento
  const handleEstamentoChange = (nuevoEstamento) => {
    setEstamento(nuevoEstamento)
    setPassword('')
    setError(null)
  }

  // «Siguiente» en el identificador pasa a la contraseña
  const handleIdentifierKeyDown = (e) => {
    if (e.key !== 'Enter' || password) return
    e.preventDefault()
    document.getElementById('password')?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await authApi.login({
        identificador: identifier,
        password,
        estamento,
      })

      if (onLogin) {
        onLogin(response.usuario)
      }
    } catch (err) {
      setError(err.message || 'Error al validar credenciales')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="w-full min-h-dvh flex flex-col md:flex-row bg-white">

      {/* Panel institucional: izquierda en escritorio, franja superior en móvil */}
      <section className="w-full md:w-[46%] lg:w-[58%] xl:w-[60%] relative flex flex-col justify-between flex-1 min-h-48 md:flex-none pt-[calc(1.25rem+env(safe-area-inset-top))] pb-10 md:pt-8 md:pb-14 px-6 sm:px-8 md:p-8 lg:p-12 overflow-hidden bg-brand-dark md:min-h-screen z-10">
        <img
          src={facultadBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[20%_center] scale-105 filter brightness-90 transform duration-700 ease-out"
        />

        {/* Capa de color sobre la foto */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/65 to-slate-900/85 backdrop-blur-[1.5px]" />

        {/* Encabezado (escritorio y tableta) */}
        <header className="relative z-10 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm">
              <FileText size={20} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white font-semibold leading-tight">
                UNIVERSIDAD DE PANAMÁ
              </p>
              <p className="text-xs text-white/70 leading-tight">
                Campus Octavio Méndez Pereira
              </p>
            </div>
          </div>
        </header>

        {/* Logos y título */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto px-4 sm:px-6 max-w-md mx-auto py-1 md:py-8">
          <div className="mb-2.5 sm:mb-6 relative group">
            <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full bg-white p-2 sm:p-3 shadow-2xl flex items-center justify-center ring-4 ring-white/20 transform transition duration-300 hover:scale-105">
              <img src={LOGO_UP} alt="Escudo de la Universidad de Panamá" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-white p-1 shadow-md border-2 border-blue-900 flex items-center justify-center">
              <img src={LOGO_FIEC} alt="Logo FIEC" className="w-full h-full object-contain" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-none tracking-tight mb-1 sm:mb-2 md:mb-4 drop-shadow-sm">
            SIADU
          </h1>

          <p className="text-xs sm:text-sm lg:text-lg font-normal text-slate-200 leading-snug sm:leading-relaxed max-w-[280px] sm:max-w-[340px] lg:max-w-[380px]">
            Sistema Integral de Automatización de Documentos Universitarios
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="w-full md:w-[54%] lg:w-[42%] xl:w-[40%] flex flex-col justify-center items-center shrink-0 md:shrink -mt-6 md:mt-0 rounded-t-3xl md:rounded-none bg-white shadow-[0_-8px_24px_rgb(15_23_42/0.15)] md:shadow-none px-5 sm:px-6 md:px-8 lg:px-12 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:py-12 relative md:min-h-screen z-20">

        <div className="w-full max-w-[400px] flex flex-col">

          <header className="mb-5 sm:mb-8 text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-3xl font-semibold text-slate-900 tracking-tight leading-tight mb-1 sm:mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-normal leading-normal">
              Ingresa con tus credenciales institucionales.
            </p>
          </header>

          {error && (
            <div id="login-error" role="alert" className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={18} strokeWidth={2.25} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col">

            {/* Estamento */}
            <div
              className="w-full bg-slate-100 p-1 rounded-xl flex items-center justify-between mb-5 sm:mb-6"
              role="radiogroup"
              aria-label="Seleccionar estamento"
            >
              {ESTAMENTOS.map(({ id, label, short, icon: Icon }, index) => {
                const selected = estamento === id
                return (
                  <button
                    key={id}
                    ref={(el) => { estamentoRefs.current[id] = el }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => handleEstamentoChange(id)}
                    onKeyDown={(e) => handleEstamentoKeyDown(e, index)}
                    className={`flex-1 min-h-11 sm:min-h-0 sm:py-2 px-1 text-center text-xs rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${selected
                        ? 'font-semibold text-brand bg-white shadow-sm ring-1 ring-black/5'
                        : 'font-medium text-slate-600 hover:text-slate-900 bg-transparent'
                      }`}
                  >
                    <Icon size={16} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
                    {id === 'administrativo' ? (
                      <>
                        <span className="sm:hidden">{short}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </>
                    ) : (
                      <span>{label}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Credenciales */}
            <div className="flex flex-col space-y-4 mb-5">
              <Field
                id="identifier"
                type="text"
                label="Correo institucional o Cédula"
                placeholder="correo@up.ac.pa o cédula"
                autoComplete="username"
                // Sin mayúscula ni autocorrector en el teclado del móvil
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                onKeyDown={handleIdentifierKeyDown}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                icon={
                  identifier.includes('@')
                    ? <Mail size={16} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
                    : <IdCard size={16} strokeWidth={2.25} aria-hidden="true" />
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <Field
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Contraseña"
                placeholder="••••••••••••"
                autoComplete="current-password"
                enterKeyHint="go"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className="tracking-wider"
                icon={<Lock size={16} strokeWidth={2.25} aria-hidden="true" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="w-10 h-10 -mr-2.5 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
                  >
                    {showPassword
                      ? <EyeOff size={16} strokeWidth={2.25} aria-hidden="true" />
                      : <Eye size={16} strokeWidth={2.25} aria-hidden="true" />}
                  </button>
                }
              />
            </div>

            {/* Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-11 bg-brand hover:bg-brand-dark active:bg-brand-dark text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-brand/30 disabled:opacity-75 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Portal</span>
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </>
              )}
            </button>

            {/* Soporte */}
            <div className="mt-4 sm:mt-6 text-center text-xs text-slate-500">
              <span>¿Tienes problemas de acceso?</span>{' '}
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center min-h-11 sm:min-h-0 px-1 text-brand font-semibold underline hover:text-brand-dark transition whitespace-nowrap cursor-pointer"
              >
                Mesa de Ayuda / Soporte IT
              </button>
            </div>

            {/* Pie */}
            <div className="mt-3 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 flex flex-col items-center justify-center text-xs sm:text-xs text-slate-500 text-center gap-0.5">
              <span>© {new Date().getFullYear()} Universidad de Panamá · Facultad de Informática, Electrónica y Comunicación</span>
            </div>

          </form>

        </div>

      </section>

      {/* Ventana de soporte */}
      {showSupportModal && (
        <Modal
          onClose={() => setShowSupportModal(false)}
          title="Mesa de Ayuda SIADU"
          subtitle="Facultad de Informática, Electrónica y Comunicación"
          icon={Headset}
          tone="brand"
        >
            <div className="p-5 text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Si presentas dificultades para iniciar sesión con tu cuenta institucional o tus datos no coinciden, por favor envía un correo a nuestro equipo de soporte técnico:
              </p>

              {/* Correo de soporte */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-semibold font-mono text-xs">
                  <Mail size={14} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
                  <a href="mailto:soporte.fiec@up.ac.pa" className="hover:underline">soporte.fiec@up.ac.pa</a>
                </div>
                <span className="text-xs text-slate-500 font-sans">Oficial FIEC</span>
              </div>

              {/* Datos que incluir en la consulta */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 text-slate-600 space-y-1.5">
                <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <Info size={16} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
                  Por favor incluye en tu mensaje:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600 pl-1">
                  <li>Nombre completo y número de cédula</li>
                  <li>Correo institucional (@up.ac.pa)</li>
                  <li>Estamento (Estudiante, Profesor o Administrativo)</li>
                  <li>Descripción breve o captura de pantalla del inconveniente</li>
                </ul>
              </div>
            </div>
        </Modal>
      )}

    </main>
  )
}

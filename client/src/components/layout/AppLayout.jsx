import { useState, useRef, useEffect } from 'react';
import {
  Home,
  PlusCircle,
  FileText,
  FolderOpen,
  Inbox,
  Archive,
  Files,
  SquarePen,
  LogOut,
  PanelLeft,
  X,
  ChevronDown,
  Menu,
  Monitor
} from 'lucide-react';
import { LOGO_UP } from '../../utils/logos';
import Avatar from '../ui/Avatar';
import useMediaQuery from '../../hooks/useMediaQuery';
import useEsEscritorio from '../../hooks/useEsEscritorio';
import { getIniciales } from '../../utils/formatters';

/**
 * Estructura de la aplicación: menú lateral por rol, cabecera y barra inferior en móvil.
 * La administración solo aparece en escritorio.
 *
 * @param {Object} props
 * @param {Object} props.usuario - Perfil del usuario en sesión
 * @param {string} [props.currentPath='/'] - Ruta activa
 * @param {string[]} [props.breadcrumbs] - Migas de pan de la cabecera
 * @param {number} [props.pendientesCount=0] - Pendientes de la bandeja
 * @param {function} [props.onNavigate] - Navega a una ruta
 * @param {function} [props.onLogout] - Cierra la sesión
 * @param {boolean} [props.modoAmplio=false] - Contenido sin márgenes; la página gestiona su desplazamiento
 * @param {boolean} [props.ocultarCabecera=false] - Oculta la cabecera y el menú lateral
 * @param {React.ReactNode} props.children
 */
export default function AppLayout({
  usuario,
  currentPath = '/inicio',
  breadcrumbs = ['SIADU', 'Inicio'],
  pendientesCount = 0,
  onNavigate,
  onLogout,
  modoAmplio = false,
  ocultarCabecera = false,
  children
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const esEscritorio = useEsEscritorio();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('siadu_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Cierra el menú de perfil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Escape cierra los menús y devuelve el foco
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      } else if (isMobileOpen) {
        setIsMobileOpen(false);
        toggleButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProfileMenuOpen, isMobileOpen]);

  // En escritorio no hay menú móvil
  useEffect(() => {
    if (isDesktop) setIsMobileOpen(false);
  }, [isDesktop]);

  // El menú oculto queda fuera del foco y del lector de pantalla.
  // Sin cabecera se oculta, sin cambiar la preferencia guardada.
  const colapsado = isCollapsed || ocultarCabecera;
  const sidebarHidden = isDesktop ? colapsado : !isMobileOpen;
  useEffect(() => {
    sidebarRef.current?.toggleAttribute('inert', sidebarHidden);
  }, [sidebarHidden]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('siadu_sidebar_collapsed', String(next));
      } catch {
        // sin almacenamiento: solo no se recuerda
      }
      return next;
    });
  };

  // Menú según los roles del usuario
  const getNavSections = () => {
    const roles = Array.isArray(usuario?.roles) ? usuario.roles : ['SOLICITANTE'];
    const tieneRolAdmin = roles.includes('ADMINISTRADOR');
    // La administración solo se ofrece en escritorio
    const esAdmin = tieneRolAdmin && esEscritorio;
    const esAprobador = roles.includes('APROBADOR');
    // Todo usuario autenticado puede solicitar
    const esSolicitante = roles.includes('SOLICITANTE') || (!tieneRolAdmin && !esAprobador);

    const sections = [];

    // Administración
    if (esAdmin) {
      sections.push({
        title: 'Administración',
        items: [
          { label: 'Panel General', path: '/inicio', icon: Home },
          // El inventario consulta; el editor crea y edita
          { label: 'Plantillas', path: '/admin/plantillas', icon: Files },
          { label: 'Editor de plantillas', path: '/admin/editor', icon: SquarePen },
        ],
      });
    }

    // Despacho del aprobador
    if (esAprobador) {
      sections.push({
        title: 'Despacho de Autoridad',
        items: [
          // Sin rol de administrador, el inicio es el despacho
          ...(!esAdmin ? [{ label: 'Despacho', corto: 'Inicio', path: '/inicio', icon: Home }] : []),
          {
            label: 'Bandeja de Entrada',
            corto: 'Bandeja',
            path: '/aprobador/bandeja',
            icon: Inbox,
            badge: pendientesCount > 0 ? pendientesCount : null,
          },
          { label: 'Historial', path: '/aprobador/historial', icon: Archive },
        ],
      });
    }

    // Trámites personales
    if (esSolicitante) {
      const tieneRolGestion = esAdmin || esAprobador;
      sections.push({
        title: tieneRolGestion ? 'Mis Trámites Personales' : null,
        items: [
          // Sin otros roles, el inicio es el portal del solicitante
          ...(!tieneRolGestion ? [{ label: 'Inicio', path: '/inicio', icon: Home }] : []),
          { label: 'Nueva solicitud', corto: 'Nueva', path: '/solicitante/nueva-solicitud', icon: PlusCircle },
          { label: 'Mis solicitudes', corto: 'Solicitudes', path: '/solicitante/mis-solicitudes', icon: FileText },
          { label: 'Documentos', path: '/solicitante/documentos', icon: FolderOpen },
        ],
      });
    }

    return sections;
  };

  const navSections = getNavSections();
  const adminSoloEscritorio = !esEscritorio && !!usuario?.roles?.includes('ADMINISTRADOR');

  // Las rutas de detalle resaltan su apartado
  const esRutaActiva = (path) =>
    currentPath === path || (path !== '/inicio' && currentPath.startsWith(`${path}/`));

  // Barra inferior: hasta 5 apartados; con más, 4 y «Más»
  const MAX_BARRA_INFERIOR = 5;
  const itemsNav = navSections.flatMap((s) => s.items);
  const barraConMas = itemsNav.length > MAX_BARRA_INFERIOR;
  const itemsBarraInferior = barraConMas ? itemsNav.slice(0, MAX_BARRA_INFERIOR - 1) : itemsNav;
  const mostrarBarraInferior = !isDesktop && !ocultarCabecera && itemsNav.length > 0;

  // Los avisos se colocan sobre la barra inferior
  useEffect(() => {
    if (!mostrarBarraInferior) return undefined;
    const raiz = document.documentElement;
    raiz.style.setProperty('--alto-barra-inferior', 'calc(4rem + env(safe-area-inset-bottom))');
    return () => raiz.style.removeProperty('--alto-barra-inferior');
  }, [mostrarBarraInferior]);

  const getPortalLabel = () => {
    const roles = Array.isArray(usuario?.roles) ? usuario.roles : ['SOLICITANTE'];
    if (roles.includes('ADMINISTRADOR')) return 'Control de Documentos';
    // Cargo vigente; sin asignación, solo el rol
    if (roles.includes('APROBADOR')) return usuario?.cargos?.[0]?.nombreCargo || 'Portal Aprobador';
    return 'Portal Solicitante';
  };

  // Inicio de sesión anterior; null en el primer acceso
  const getUltimoAccesoTexto = () => {
    if (!usuario?.ultimoAcceso) return 'Primer acceso';

    const d = new Date(usuario.ultimoAcceso);
    if (Number.isNaN(d.getTime())) return '';

    return `Último acceso: ${d.toLocaleDateString('es-PA', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  const seccionCrumbs = Array.isArray(breadcrumbs)
    ? breadcrumbs.filter((c) => typeof c === 'string' && c.toUpperCase() !== 'SIADU')
    : [];
  const crumbsParaMostrar = seccionCrumbs.length > 0 ? seccionCrumbs : ['Inicio'];

  const ultimoAcceso = getUltimoAccesoTexto();
  const nombreUsuario = usuario?.nombreCompleto || usuario?.correo || '';

  const handleItemClick = (e, path) => {
    // Respeta abrir en una pestaña nueva
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    }
    setIsMobileOpen(false);
  };

  const handleToggleSidebar = () => {
    if (isDesktop) {
      toggleCollapse();
    } else {
      setIsMobileOpen((prev) => !prev);
    }
  };

  return (
    // overflow-clip: el navegador no desplaza estos contenedores al enfocar un elemento
    <div className="flex h-dvh w-full overflow-clip bg-slate-100 text-slate-800 font-sans antialiased relative">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-brand focus:font-semibold focus:text-sm focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* Fondo del menú móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral */}
      <aside
        id="sidebar"
        ref={sidebarRef}
        aria-label="Barra lateral"
        className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-white border-r border-slate-200 flex flex-col justify-between h-full shadow-lg md:shadow-sm
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          transition-all duration-300 ease-in-out shrink-0
          w-[260px]
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${colapsado ? 'md:w-0 md:opacity-0 md:overflow-hidden md:border-r-0 md:pointer-events-none' : 'md:w-[240px] md:opacity-100'}
        `}
      >
        <div className="w-[260px] md:w-[240px] flex flex-col justify-between h-full">
          <div>
            {/* Cabecera Institucional */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={LOGO_UP}
                  alt="Escudo Universidad de Panamá"
                  className="h-10 w-auto object-contain shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-base font-bold text-brand tracking-tight block leading-tight">
                    SIADU
                  </span>
                  <span className="text-xs font-medium text-slate-500 block truncate">
                    {getPortalLabel()}
                  </span>
                </div>
              </div>

              {/* Cerrar (móvil) */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Navegación */}
            <nav aria-label="Navegación principal" className="p-3 space-y-3">
              {navSections.map((section, sIdx) => (
                <div key={section.title || sIdx} className="space-y-1">
                  {section.title && (
                    <div className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {section.title}
                    </div>
                  )}

                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = esRutaActiva(item.path);

                    return (
                      <a
                        key={item.path}
                        href={item.path}
                        onClick={(e) => handleItemClick(e, item.path)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${isActive
                          ? 'bg-brand text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon aria-hidden="true" className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className="bg-amber-700 text-white text-xs font-semibold px-1.5 py-px rounded-full shrink-0">
                            <span aria-hidden="true">{item.badge}</span>
                            <span className="sr-only">{item.badge} pendientes</span>
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              ))}

              {adminSoloEscritorio && (
                <p className="mx-1 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 leading-snug">
                  <Monitor className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>La administración (panel, plantillas y editor) está disponible en computadora.</span>
                </p>
              )}
            </nav>
          </div>

          {/* Perfil */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <Avatar
                size="sm"
                iniciales={getIniciales(usuario)}
                className="shadow-sm"
              />
              <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 leading-snug break-words">
                {nombreUsuario}
              </p>
            </div>

            <div className="mt-2 mb-3 space-y-0.5">
              {ultimoAcceso && (
                <p className="text-xs text-slate-500 leading-snug">
                  {ultimoAcceso}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors pl-0.5 w-full text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Cabecera y contenido */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-clip">
        {/* Cabecera */}
        {!ocultarCabecera && (
        // Respeta la zona segura superior
        <header className="h-[calc(52px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mostrar u ocultar el menú lateral */}
            <button
              ref={toggleButtonRef}
              type="button"
              onClick={handleToggleSidebar}
              className="p-2 -ml-1 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label={sidebarHidden ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
              aria-expanded={!sidebarHidden}
              aria-controls="sidebar"
            >
              <PanelLeft className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Logo con el menú lateral oculto */}
            <div
              className={`items-center gap-2 sm:gap-2.5 shrink-0 ${
                isCollapsed ? 'flex' : 'flex md:hidden'
              }`}
            >
              <img
                src={LOGO_UP}
                alt="Universidad de Panamá"
                className="h-7 w-auto object-contain shrink-0"
              />
              <span className="text-sm font-bold text-brand tracking-tight">
                SIADU
              </span>
              <span className="text-slate-300 font-light mx-0.5">|</span>
            </div>

            {/* Sección activa */}
            <nav aria-label="Ruta de navegación" className="min-w-0">
              <ol className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 truncate">
                {crumbsParaMostrar.map((crumb, idx) => {
                  const isLast = idx === crumbsParaMostrar.length - 1;
                  return (
                    // En móvil solo cabe la sección actual
                    <li key={idx} className={`items-center gap-1.5 sm:gap-2 ${isLast ? 'flex min-w-0' : 'hidden sm:flex'}`}>
                      {idx > 0 && <span aria-hidden="true" className="hidden sm:inline">›</span>}
                      <span
                        aria-current={isLast ? 'page' : undefined}
                        className={isLast ? 'font-medium text-slate-800 truncate' : ''}
                      >
                        {crumb}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Perfil con el menú lateral oculto */}
          <div
            ref={profileMenuRef}
            className={`relative items-center shrink-0 ${isMobileOpen ? 'hidden' : 'flex'
              } ${isCollapsed ? 'md:flex' : 'md:hidden'
              }`}
          >
            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-full sm:rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={`Menú de usuario: ${nombreUsuario}`}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
            >
              <Avatar
                size="sm"
                iniciales={getIniciales(usuario)}
                className="shadow-xs"
              />
              <div className="hidden sm:block text-left pr-0.5 whitespace-nowrap">
                <span className="text-sm font-semibold text-slate-800 block leading-tight">
                  {nombreUsuario}
                </span>
                {ultimoAcceso && (
                  <span className="text-xs text-slate-500 block leading-tight mt-0.5">
                    {ultimoAcceso}
                  </span>
                )}
              </div>
              <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 text-slate-500 hidden sm:block transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menú de perfil */}
            {isProfileMenuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 animate-pop">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </header>
        )}

        {/* Contenido */}
        <main
          id="contenido"
          tabIndex={-1}
          className={`flex-1 min-h-0 focus:outline-none ${modoAmplio ? 'overflow-clip' : 'overflow-y-auto p-4 sm:p-6 md:px-8 md:py-7'}`}
        >
          <div className={modoAmplio ? 'h-full w-full' : 'w-full max-w-6xl mx-auto'}>
            {children}
          </div>
        </main>

        {/* Barra inferior (móvil) */}
        {mostrarBarraInferior && (
          <nav
            aria-label="Navegación inferior"
            className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgb(15_23_42/0.06)] pb-[env(safe-area-inset-bottom)]"
          >
            <ul className="flex h-16">
              {itemsBarraInferior.map((item) => {
                const Icon = item.icon;
                const activo = esRutaActiva(item.path);
                return (
                  <li key={item.path} className="flex-1 min-w-0">
                    <a
                      href={item.path}
                      onClick={(e) => handleItemClick(e, item.path)}
                      aria-current={activo ? 'page' : undefined}
                      className={`h-full flex flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors ${
                        activo ? 'text-brand' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span
                        className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                          activo ? 'bg-brand-light' : ''
                        }`}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        {item.badge && (
                          <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-amber-700 text-white text-[0.625rem] font-semibold leading-4 text-center">
                            <span aria-hidden="true">{item.badge}</span>
                            <span className="sr-only">, {item.badge} pendientes</span>
                          </span>
                        )}
                      </span>
                      <span className="max-w-full truncate">{item.corto || item.label}</span>
                    </a>
                  </li>
                );
              })}
              {barraConMas && (
                <li className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    aria-controls="sidebar"
                    aria-expanded={isMobileOpen}
                    className="w-full h-full flex flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center justify-center w-12 h-7">
                      <Menu className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span>Más</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

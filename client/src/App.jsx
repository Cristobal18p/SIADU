import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import Login from './pages/Login';
import CambioPassword from './pages/CambioPassword';
import AppLayout from './components/layout/AppLayout';
import InicioPage from './pages/inicio/InicioPage';
import NuevaSolicitudPage from './pages/solicitudes/NuevaSolicitudPage';
import MisSolicitudesPage from './pages/solicitudes/MisSolicitudesPage';
import DocumentosPage from './pages/documentos/DocumentosPage';
import BandejaPage from './pages/aprobador/BandejaPage';
import RevisionPage from './pages/aprobador/RevisionPage';
import HistorialPage from './pages/aprobador/HistorialPage';
import PlantillasPage from './pages/admin/PlantillasPage';
import ConstructorPage from './pages/admin/constructor/ConstructorPage';
import SolicitudDetallePage from './pages/solicitudes/SolicitudDetallePage';
import SoloEscritorio from './components/layout/SoloEscritorio';
import useEsEscritorio from './hooks/useEsEscritorio';
import authApi from './api/auth.api';
import approvalsApi from './api/approvals.api';
import Spinner from './components/ui/Spinner';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('siadu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loadingSession, setLoadingSession] = useState(() => {
    return !localStorage.getItem('siadu_user') && !!authApi.getToken();
  });

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setCurrentUser(null);
      localStorage.removeItem('siadu_user');
      setLoadingSession(false);
      return;
    }

    authApi
      .getMe()
      .then((usuario) => {
        if (usuario) {
          setCurrentUser(usuario);
          localStorage.setItem('siadu_user', JSON.stringify(usuario));
        } else {
          authApi.logout();
          localStorage.removeItem('siadu_user');
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        if (err?.status === 401) {
          authApi.logout();
          localStorage.removeItem('siadu_user');
          setCurrentUser(null);
        }
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, []);

  useEffect(() => {
    if (loadingSession) return;

    if (!currentUser) {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    } else {
      if (location.pathname === '/login' || location.pathname === '/') {
        navigate('/inicio', { replace: true });
      }
    }
  }, [currentUser, loadingSession, location.pathname, navigate]);

  // Ante 403 CAMBIO_PASSWORD_REQUERIDO se vuelve a la pantalla de cambio
  useEffect(() => {
    const exigirCambio = () =>
      setCurrentUser((u) => {
        if (!u || u.debeCambiarPassword) return u;
        const actualizado = { ...u, debeCambiarPassword: true };
        localStorage.setItem('siadu_user', JSON.stringify(actualizado));
        return actualizado;
      });
    window.addEventListener('siadu:cambio-password-requerido', exigirCambio);
    return () => window.removeEventListener('siadu:cambio-password-requerido', exigirCambio);
  }, []);

  /** Tras cambiar la contraseña inicial, refresca el perfil y entra al sistema. */
  const alCambiarPassword = async () => {
    let perfil = null;
    try {
      perfil = await authApi.getMe();
    } catch (err) {
      console.warn('No se pudo refrescar el perfil tras cambiar la contraseña:', err);
    }
    const usuarioFinal = { ...currentUser, ...(perfil || {}), debeCambiarPassword: false };
    localStorage.setItem('siadu_user', JSON.stringify(usuarioFinal));
    setCurrentUser(usuarioFinal);
    navigate('/inicio', { replace: true });
  };

  // La administración es solo de escritorio
  const esEscritorio = useEsEscritorio();
  const [pendientesCount, setPendientesCount] = useState(0);
  // El editor del constructor oculta la cabecera global
  const [editorActivo, setEditorActivo] = useState(false);
  const esAprobador = !!currentUser?.roles?.includes('APROBADOR');
  // La bandeja solo se consulta en estas vistas
  const rutaConBandeja =
    location.pathname === '/inicio' || location.pathname.startsWith('/aprobador');

  useEffect(() => {
    if (!esAprobador) {
      setPendientesCount(0);
      return;
    }
    if (!rutaConBandeja) return;
    let cancelled = false;
    approvalsApi
      .getPendingApprovals()
      .then((res) => {
        if (!cancelled) setPendientesCount(Array.isArray(res) ? res.length : 0);
      })
      .catch(() => {
        if (!cancelled) setPendientesCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [esAprobador, rutaConBandeja]);

  const handleLogin = async (usuarioBasico) => {
    try {
      const perfilCompleto = await authApi.getMe();
      if (perfilCompleto) {
        const usuarioFinal = {
          ...usuarioBasico,
          ...perfilCompleto,
          nombreCompleto:
            usuarioBasico?.nombreCompleto ||
            `${perfilCompleto.nombre || ''} ${perfilCompleto.apellido || ''}`.trim(),
        };
        localStorage.setItem('siadu_user', JSON.stringify(usuarioFinal));
        setCurrentUser(usuarioFinal);
        navigate('/inicio');
        return;
      }
    } catch (err) {
      console.warn('No se pudo obtener el perfil extendido inmediatamente:', err);
    }
    localStorage.setItem('siadu_user', JSON.stringify(usuarioBasico));
    setCurrentUser(usuarioBasico);
    navigate('/inicio');
  };

  const handleLogout = () => {
    authApi.logout();
    localStorage.removeItem('siadu_user');
    setCurrentUser(null);
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loadingSession) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner label="Verificando sesión..." />
          <span aria-hidden="true" className="text-xs font-semibold text-slate-500">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Primer acceso: solo el cambio de contraseña
  if (currentUser.debeCambiarPassword) {
    return <CambioPassword usuario={currentUser} onListo={alCambiarPassword} onSalir={handleLogout} />;
  }

  const detalleSolicitudMatch = location.pathname.match(/^\/solicitante\/mis-solicitudes\/(\d+)$/);
  const revisionMatch = location.pathname.match(/^\/aprobador\/bandeja\/(\d+)$/);
  const historialDetalleMatch = location.pathname.match(/^\/aprobador\/historial\/(\d+)$/);
  const editarPlantillaMatch = location.pathname.match(/^\/admin\/editor\/(\d+)$/);

  const getBreadcrumbs = () => {
    if (detalleSolicitudMatch) return ['SIADU', 'Mis solicitudes', 'Detalle'];
    if (revisionMatch) return ['SIADU', 'Bandeja de entrada', 'Revisión'];
    if (historialDetalleMatch) return ['SIADU', 'Historial', 'Detalle'];
    if (location.pathname === '/admin/editor') return ['SIADU', 'Editor de plantillas', 'Nueva plantilla'];
    if (editarPlantillaMatch) return ['SIADU', 'Editor de plantillas', 'Editar plantilla'];

    const sectionName =
      location.pathname === '/inicio'
        ? 'Inicio'
        : location.pathname.split('/').pop().replace(/-/g, ' ');

    return ['SIADU', sectionName.charAt(0).toUpperCase() + sectionName.slice(1)];
  };

  // Con otros roles, el aviso de escritorio permite volver al inicio
  const tieneOtrasFunciones = (currentUser.roles ?? []).some((r) => r !== 'ADMINISTRADOR');
  const soloEscritorio = (funcion, contenido) => (
    <SoloEscritorio funcion={funcion} onVolver={tieneOtrasFunciones ? () => handleNavigate('/inicio') : undefined}>
      {contenido}
    </SoloEscritorio>
  );

  const renderContent = () => {
    if (location.pathname === '/inicio') {
      return <InicioPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (location.pathname === '/solicitante/nueva-solicitud') {
      return <NuevaSolicitudPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (location.pathname === '/solicitante/mis-solicitudes') {
      return <MisSolicitudesPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (location.pathname === '/solicitante/documentos') {
      return <DocumentosPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (location.pathname === '/admin/plantillas') {
      return soloEscritorio(
        'El inventario de plantillas',
        <PlantillasPage
          key={location.search}
          usuario={currentUser}
          estadoInicial={new URLSearchParams(location.search).get('estado') || 'TODOS'}
          onNavigate={handleNavigate}
        />
      );
    }

    if (location.pathname === '/admin/editor' || editarPlantillaMatch) {
      return soloEscritorio(
        'El editor de plantillas',
        <ConstructorPage
          key={location.pathname}
          usuario={currentUser}
          idPlantilla={editarPlantillaMatch ? Number(editarPlantillaMatch[1]) : undefined}
          onNavigate={handleNavigate}
          onEditorActivo={setEditorActivo}
        />
      );
    }

    if (location.pathname === '/aprobador/bandeja') {
      return <BandejaPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (location.pathname === '/aprobador/historial') {
      return <HistorialPage usuario={currentUser} onNavigate={handleNavigate} />;
    }

    if (revisionMatch || historialDetalleMatch) {
      const match = revisionMatch || historialDetalleMatch;
      return (
        <RevisionPage
          key={location.pathname}
          idSolicitud={Number(match[1])}
          origen={revisionMatch ? 'bandeja' : 'historial'}
          onNavigate={handleNavigate}
        />
      );
    }

    if (detalleSolicitudMatch) {
      return (
        <SolicitudDetallePage
          key={detalleSolicitudMatch[1]}
          idSolicitud={Number(detalleSolicitudMatch[1])}
          onNavigate={handleNavigate}
        />
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Página no encontrada</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          La dirección <code className="bg-slate-100 px-2 py-0.5 rounded text-brand font-mono text-xs">{location.pathname}</code> no existe o no está disponible para tu perfil.
        </p>
        <button
          type="button"
          onClick={() => handleNavigate('/inicio')}
          className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    );
  };

  return (
    <AppLayout
      usuario={currentUser}
      currentPath={location.pathname}
      breadcrumbs={getBreadcrumbs()}
      pendientesCount={pendientesCount}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      modoAmplio={esEscritorio && (location.pathname === '/admin/editor' || !!editarPlantillaMatch)}
      ocultarCabecera={esEscritorio && editorActivo}
    >
      {renderContent()}
    </AppLayout>
  );
}

import { useRef, useState } from 'react';
import { ShieldCheck, Files, FileText } from 'lucide-react';
import InicioAdmin from './InicioAdmin';
import InicioAprobador from './InicioAprobador';
import InicioSolicitante from './InicioSolicitante';
import SoloEscritorio from '../../components/layout/SoloEscritorio';
import useEsEscritorio from '../../hooks/useEsEscritorio';

/** Inicio según el rol; con varios roles, pestañas para alternar entre sus paneles. */
export default function InicioPage({ usuario, onNavigate }) {
  const roles = Array.isArray(usuario?.roles) ? usuario.roles : ['SOLICITANTE'];
  const esEscritorio = useEsEscritorio();
  const tieneRolAdmin = roles.includes('ADMINISTRADOR');
  const esAdmin = tieneRolAdmin && esEscritorio;
  const esAprobador = roles.includes('APROBADOR');
  const esSolicitante = roles.includes('SOLICITANTE') || (!tieneRolAdmin && !esAprobador);

  // Pestañas según los roles
  const tabs = [];
  if (esAdmin) {
    tabs.push({
      id: 'ADMINISTRADOR',
      label: 'Panel Administrativo',
      corto: 'Administración',
      icon: Files,
    });
  }
  if (esAprobador) {
    tabs.push({
      id: 'APROBADOR',
      label: 'Despacho de Autoridad',
      corto: 'Despacho',
      icon: ShieldCheck,
    });
  }
  if (esSolicitante) {
    tabs.push({
      id: 'SOLICITANTE',
      label: 'Mi Portal de Solicitudes',
      corto: 'Mis trámites',
      icon: FileText,
    });
  }

  // La primera pestaña es la predeterminada
  const [tabElegida, setActiveTab] = useState(tabs[0]?.id);
  const tabRefs = useRef({});
  // Si la pestaña elegida deja de ofrecerse, se muestra la primera
  const activeTab = tabs.some((t) => t.id === tabElegida) ? tabElegida : tabs[0]?.id;

  const handleTabKeyDown = (e, index) => {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  };

  // Solo administrador en pantalla angosta: sin panel
  if (tabs.length === 0) return <SoloEscritorio funcion="El panel de administración" />;

  // Con un solo rol, sin pestañas
  if (tabs.length === 1) {
    if (esAdmin) return <InicioAdmin usuario={usuario} onNavigate={onNavigate} />;
    if (esAprobador) return <InicioAprobador usuario={usuario} onNavigate={onNavigate} />;
    return <InicioSolicitante usuario={usuario} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6">
      {/* Pestañas por rol */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Contexto institucional" className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="panel-inicio"
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 min-h-11 sm:min-h-0 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon aria-hidden="true" className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {/* Nombre corto en móvil */}
                <span className="sm:hidden">{tab.corto}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline-block text-xs text-slate-500 font-medium pr-2">
          {activeTab === 'SOLICITANTE'
            ? 'Gestionando tus solicitudes personales'
            : 'Gestionando funciones institucionales de tu cargo'}
        </span>
      </div>

      {/* Panel de la pestaña activa */}
      <div role="tabpanel" id="panel-inicio" aria-labelledby={`tab-${activeTab}`}>
      {activeTab === 'ADMINISTRADOR' && (
        <InicioAdmin usuario={usuario} onNavigate={onNavigate} />
      )}
      {activeTab === 'APROBADOR' && (
        <InicioAprobador usuario={usuario} onNavigate={onNavigate} />
      )}
      {activeTab === 'SOLICITANTE' && (
        <InicioSolicitante usuario={usuario} onNavigate={onNavigate} />
      )}
      </div>
    </div>
  );
}

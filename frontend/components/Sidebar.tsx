import React, { useState, useRef, useEffect } from 'react';
import { SystemModule, UserRole, User } from '../types';

interface SidebarProps {
  activeModuleId: string;
  activeView: string;
  onSelectModule: (id: string) => void;
  currentUser: User;
  modules: SystemModule[];
  onViewUsers?: () => void;
  onViewSettings?: () => void;
  onViewSystems?: () => void;
  onViewDashboard?: () => void;
  onViewMyResults?: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onGoHome: () => void;
  isMobileSidebarOpen: boolean;
  onCloseMobile: () => void;
}

const roleNames: Record<UserRole, string> = {
  'ADMIN': 'Administrator',
  'EMPLOYEE': 'Xodim',
  'LEAD': 'Lead',
};

const Sidebar: React.FC<SidebarProps> = ({
  activeModuleId,
  activeView,
  onSelectModule,
  currentUser,
  modules,
  onViewUsers,
  onViewSettings,
  onViewSystems,
  onViewDashboard,
  onViewMyResults,
  onLogout,
  theme,
  onToggleTheme,
  onGoHome,
  isMobileSidebarOpen,
  onCloseMobile,
}) => {
  const role = currentUser.role;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleModules = modules.filter(module => {
    if (role === 'ADMIN' || role === 'EMPLOYEE') return true;
    return currentUser.allowedModules?.includes(module.id);
  });

  const isContentView = activeView === 'CONTENT';

  const navBtn = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    } ${isCollapsed ? 'justify-center' : ''}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 lg:relative lg:translate-x-0 flex-shrink-0`}>
        {/* Sidebar */}
        <aside
          className={`${
            isCollapsed ? 'w-16' : 'w-64'
          } bg-slate-900 text-white h-screen flex flex-col sticky top-0 overflow-hidden transition-all duration-300`}
        >
        {/* Logo */}
        <div className={`p-4 flex items-center justify-center border-b border-slate-800 min-w-0 min-h-[73px]`}>
          <img 
            src="https://bepro.uz/wp-content/uploads/2024/07/logotype-horizontal.png" 
            alt="BePro" 
            className={`cursor-pointer transition-all duration-300 object-contain flex-shrink-0 ${isCollapsed ? 'w-8 h-8' : 'w-32 h-auto'}`}
            onClick={() => { onGoHome(); onCloseMobile(); }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {/* Dashboard Section */}
          <div>
            {!isCollapsed && (
              <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">
                Dashboard
              </p>
            )}

            {onViewDashboard && (
              <button
                onClick={() => { onViewDashboard(); onCloseMobile(); }}
                title={isCollapsed ? 'Natijalar' : undefined}
                className={navBtn(activeView === 'DASHBOARD')}
              >
                <i className="fas fa-chart-line w-5 text-center flex-shrink-0"></i>
                {!isCollapsed && <span>Natijalar</span>}
              </button>
            )}

            {onViewMyResults && (
              <button
                onClick={() => { onViewMyResults(); onCloseMobile(); }}
                title={isCollapsed ? 'Mening natijalarim' : undefined}
                className={navBtn(activeView === 'MY_RESULTS')}
              >
                <i className="fas fa-user-check w-5 text-center flex-shrink-0"></i>
                {!isCollapsed && <span>Mening natijalarim</span>}
              </button>
            )}
          </div>

          {!isCollapsed && (
            <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2 pt-4">
              Tizimlar va Modullar
            </p>
          )}

          {visibleModules.map(module => (
            <button
              key={module.id}
              onClick={() => { onSelectModule(module.id); onCloseMobile(); }}
              title={isCollapsed ? module.name : undefined}
              className={navBtn(activeModuleId === module.id && ['CONTENT', 'MANAGE', 'MODULE_STATS'].includes(activeView))}
            >
              <i className={`fas ${module.icon} w-5 text-center flex-shrink-0`}></i>
              {!isCollapsed && <span className="truncate">{module.name}</span>}
            </button>
          ))}

          {visibleModules.length === 0 && !isCollapsed && (
            <p className="text-xs text-slate-500 px-2 italic">
              Sizga ruxsat etilgan modullar mavjud emas
            </p>
          )}

          {/* Management Section */}
          <div className="pt-4">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">
                Boshqaruv
              </p>
            )}

            {onViewSystems && (
              <button
                onClick={() => { onViewSystems(); onCloseMobile(); }}
                title={isCollapsed ? 'Tizimlar' : undefined}
                className={navBtn(activeView === 'SYSTEMS')}
              >
                <i className="fas fa-layer-group w-5 text-center flex-shrink-0"></i>
                {!isCollapsed && <span>Tizimlar</span>}
              </button>
            )}

            {role === 'ADMIN' && onViewUsers && (
              <button
                onClick={() => { onViewUsers(); onCloseMobile(); }}
                title={isCollapsed ? 'Foydalanuvchilar' : undefined}
                className={navBtn(activeView === 'USERS')}
              >
                <i className="fas fa-users w-5 text-center flex-shrink-0"></i>
                {!isCollapsed && <span>Foydalanuvchilar</span>}
              </button>
            )}

            {onViewSettings && (
              <button
                onClick={() => { onViewSettings(); onCloseMobile(); }}
                title={isCollapsed ? 'Profil' : undefined}
                className={navBtn(activeView === 'SETTINGS')}
              >
                <i className="fas fa-user-gear w-5 text-center flex-shrink-0"></i>
                {!isCollapsed && <span>Profil</span>}
              </button>
            )}
          </div>
        </nav>

        {/* User card + popup menu */}
        <div className="p-3 relative" ref={menuRef}>
          {/* Popup */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-slideUp z-50">
              <button
                onClick={onToggleTheme}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} w-4 text-center text-slate-400`}></i>
                  {!isCollapsed && (theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim')}
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-orange-600' : 'bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => { setShowUserMenu(false); onViewSettings?.(); onCloseMobile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-medium"
              >
                <i className="fas fa-user-gear w-4 text-center text-slate-400"></i>
                {!isCollapsed && 'Profil'}
              </button>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => { setShowUserMenu(false); onLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium"
              >
                <i className="fas fa-power-off w-4 text-center"></i>
                {!isCollapsed && 'Chiqish'}
              </button>
            </div>
          )}

          {/* Clickable user card */}
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            title={isCollapsed ? currentUser.name : undefined}
            className="w-full bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-700/50 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
              role === 'LEAD' ? 'bg-blue-500/20 text-blue-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {role === 'ADMIN' ? <i className="fas fa-user-shield text-lg"></i> :
               role === 'LEAD' ? <i className="fas fa-user-tie text-lg"></i> :
               <i className="fas fa-user text-lg"></i>}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="text-xs font-bold truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{roleNames[role]}</p>
                </div>
                <i className={`fas fa-chevron-up text-slate-500 text-xs transition-transform duration-200 ${showUserMenu ? '' : 'rotate-180'}`}></i>
              </>
            )}
          </button>
        </div>
      </aside>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="hidden lg:flex absolute top-5 -right-3 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center hover:bg-slate-700 transition-all shadow-md"
        >
          <i
            className={`fas fa-chevron-left text-slate-400 text-xs transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          ></i>
        </button>
      </div>
    </>
  );
};

export default Sidebar;

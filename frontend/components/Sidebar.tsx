
import React from 'react';
import { BEPRO_MODULES } from '../constants';
import { SystemModule, UserRole, User } from '../types';

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  currentUser: User;
  modules: SystemModule[];
  onViewUsers?: () => void;
  onViewSettings?: () => void;
  onViewSystems?: () => void;
  onViewDashboard?: () => void;
}

const roleNames: Record<UserRole, string> = {
  'ADMIN': 'Administrator',
  'EMPLOYEE': 'Xodim'
};

const Sidebar: React.FC<SidebarProps> = ({
  activeModuleId,
  onSelectModule,
  currentUser,
  modules,
  onViewUsers,
  onViewSettings,
  onViewSystems,
  onViewDashboard
}) => {
  const role = currentUser.role;

  // Filter modules based on user permissions
  const visibleModules = modules.filter(module => {
    if (role === 'ADMIN') return true;
    return currentUser.allowedModules?.includes(module.id);
  });

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col sticky top-0 overflow-hidden">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <i className="fas fa-graduation-cap text-xl"></i>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Bepro support</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{roleNames[role]} paneli</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Tizimlar va Modullar</p>
        {visibleModules.map((module) => (
          <button
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${activeModuleId === module.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
          >
            <i className={`fas ${module.icon} w-5 text-center`}></i>
            <span>{module.name}</span>
          </button>
        ))}
        {visibleModules.length === 0 && (
          <p className="text-xs text-slate-500 px-2 italic">Sizga ruxsat etilgan modullar mavjud emas</p>
        )}

        <div className="pt-6">
          <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Boshqaruv</p>
          {onViewSystems && (
            <button
              onClick={onViewSystems}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm font-medium"
            >
              <i className="fas fa-layer-group w-5 text-center"></i>
              <span>Tizimlar</span>
            </button>
          )}
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm font-medium"
            >
              <i className="fas fa-chart-line w-5 text-center"></i>
              <span>Umumiy statistika</span>
            </button>
          )}
          {role === 'ADMIN' && onViewUsers && (
            <button
              onClick={onViewUsers}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm font-medium"
            >
              <i className="fas fa-users w-5 text-center"></i>
              <span>Foydalanuvchilar</span>
            </button>
          )}
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm font-medium">
            <i className="fas fa-user-check w-5 text-center"></i>
            <span>Mening natijalarim</span>
          </button>
          <button
            onClick={onViewSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm font-medium"
          >
            <i className="fas fa-gear w-5 text-center"></i>
            <span>Sozlamalar</span>
          </button>
        </div>
      </nav>

      <div className="p-4 bg-slate-800/50 m-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400">
            <i className="fas fa-user"></i>
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{roleNames[role]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

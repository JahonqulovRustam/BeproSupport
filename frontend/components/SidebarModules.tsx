import React from 'react';
import { SystemModule } from '../types';

interface SidebarModulesProps {
  modules: SystemModule[];
  onSelectModule: (module: SystemModule) => void;
  selectedModuleId?: string | number;
}

const SidebarModules: React.FC<SidebarModulesProps> = ({ modules, onSelectModule, selectedModuleId }) => {
  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 h-full p-4 space-y-4">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Modullar</h2>
      <div className="space-y-2">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onSelectModule(mod)}
            className={`w-full text-left px-4 py-2 rounded-xl border transition-all font-semibold ${selectedModuleId === mod.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700'}`}
          >
            {mod.name}
          </button>
        ))}
        {modules.length === 0 && (
          <div className="text-slate-400 italic">Modullar mavjud emas</div>
        )}
      </div>
    </aside>
  );
};

export default SidebarModules;

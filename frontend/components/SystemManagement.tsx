import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SystemModule } from '../types';
import { moduleService } from '../services/moduleService';

interface SystemManagementProps {
  modules: SystemModule[];
  onAddModule: (module: SystemModule) => void;
  onUpdateModule: (module: SystemModule) => void;
  onDeleteModule: (id: string) => void;
}

const ICON_OPTIONS = [
  'fa-fire-extinguisher', 'fa-fire', 'fa-user-shield', 'fa-shield', 'fa-shield-halved', 'fa-badge-sheriff',
  'fa-car-on', 'fa-truck-medical', 'fa-ambulance', 'fa-hospital', 'fa-user-doctor', 'fa-user-nurse',
  'fa-briefcase-medical', 'fa-headset', 'fa-phone-volume', 'fa-wrench', 'fa-toolbox', 'fa-briefcase',
  'fa-user-gear', 'fa-user-tie', 'fa-server', 'fa-gear', 'fa-laptop-code', 'fa-cube'
];

const SystemManagement: React.FC<SystemManagementProps> = ({ modules, onAddModule, onUpdateModule, onDeleteModule }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('fa-folder');
  const [saving, setSaving] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<SystemModule | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setModuleToDelete(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleOpenAdd = () => {
    setEditingModule(null);
    setName('');
    setDescription('');
    setIcon('fa-folder');
    setShowIconPicker(false);
    setShowModal(true);
  };

  const handleOpenEdit = (module: SystemModule) => {
    setEditingModule(module);
    setName(module.name);
    setDescription(module.description);
    setIcon(module.icon || 'fa-folder');
    setShowIconPicker(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingModule) {
        // Send icon as well
        const updated = await moduleService.updateModule(editingModule.id, {
          title: name,
          description,
          icon,
        });
        onUpdateModule({ ...updated, icon });
      } else {
        // Send icon as well
        const created = await moduleService.createModule({
          title: name,
          description,
          icon,
        });
        onAddModule({ ...created, icon });
      }
      setShowModal(false);
    } catch (err) {
      console.error('Saqlashda xatolik:', err);
      alert('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (moduleToDelete) {
      onDeleteModule(moduleToDelete.id);
      setModuleToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tizimlarni boshqarish</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Yangi tizimlar qo'shish va mavjudlarini tahrirlash</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi Tizim
        </button>
      </div>

      {/* Module table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold">Tizim</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold w-1/2">Tavsif</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-center">Sub-modullar</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-right">Harakatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {modules.map(module => (
                <tr key={module.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <i className={`fas ${module.icon || 'fa-folder'} text-sm`}></i>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{module.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2" title={module.description}>
                      {module.description}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full">
                      {module.numberOfSubModules || module.subModules?.length || 0}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(module)}
                      className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Tahrirlash"
                    >
                      <i className="fas fa-pen text-xs"></i>
                    </button>
                    <button
                      onClick={() => setModuleToDelete(module)}
                      className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="O'chirish"
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                      <i className="fas fa-layer-group text-2xl"></i>
                    </div>
                    Hozircha tizimlar mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Delete confirmation */}
    {moduleToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-triangle-exclamation text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">Tizimni o'chirish</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">Quyidagi tizimni o'chirmoqchisiz:</p>

            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl mb-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-red-500 flex items-center justify-center shadow-sm shrink-0">
                <i className={`fas ${moduleToDelete.icon || 'fa-folder'}`}></i>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{moduleToDelete.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {moduleToDelete.lessons.length} ta dars · {moduleToDelete.description.slice(0, 40)}{moduleToDelete.description.length > 40 ? '...' : ''}
                </p>
              </div>
            </div>

            <p className="text-xs text-red-500 text-center mb-6 font-medium">
              ⚠️ Bu amal qaytarilmaydi. Barcha darslar ham o'chiriladi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModuleToDelete(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash-can"></i>
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {editingModule ? 'Tizimni tahrirlash' : 'Yangi Tizim'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tizim nomi *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-slate-100"
                  placeholder="Masalan: Sistema-105"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tavsif</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 h-28 resize-none text-slate-900 dark:text-slate-100"
                  placeholder="Tizim haqida qisqacha ma'lumot..."
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Icon tanlash</label>

                {/* Selected icon preview + toggle */}
                <button
                  type="button"
                  onClick={() => setShowIconPicker(prev => !prev)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-400 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                    <i className={`fas ${icon} text-lg`}></i>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-sm flex-1 text-left font-mono">
                    {icon}
                  </span>
                  <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform ${showIconPicker ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Icon grid */}
                {showIconPicker && (
                  <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-6 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {ICON_OPTIONS.map(iconValue => (
                      <button
                        key={iconValue}
                        type="button"
                        onClick={() => { setIcon(iconValue); setShowIconPicker(false); }}
                        className={`flex items-center justify-center aspect-square rounded-xl transition-all ${
                          icon === iconValue
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <i className={`fas ${iconValue} text-xl`}></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 disabled:opacity-60 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                  : <><i className="fas fa-save"></i> {editingModule ? "O'zgarishlarni saqlash" : 'Tizimni yaratish'}</>
                }
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SystemManagement;

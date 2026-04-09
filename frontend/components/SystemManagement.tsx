import React, { useState } from 'react';
import { SystemModule } from '../types';
import { moduleService } from '../services/moduleService';

interface SystemManagementProps {
  modules: SystemModule[];
  onAddModule: (module: SystemModule) => void;
  onUpdateModule: (module: SystemModule) => void;
  onDeleteModule: (id: string) => void;
}

const ICON_OPTIONS = [
    // Emergency and service-related icons
    { value: 'fa-fire-extinguisher', label: 'O‘t o‘chirgich (Fire Extinguisher)' },
    { value: 'fa-helmet-safety', label: 'Yong‘in xodimi (Firefighter)' },
    { value: 'fa-user-shield', label: 'Politsiya (Police)' },
    { value: 'fa-badge-sheriff', label: 'Sherif (Sheriff)' },
    { value: 'fa-car-on', label: 'Politsiya mashinasi (Police Car)' },
    { value: 'fa-truck-medical', label: 'Tez yordam (Ambulance Truck)' },
    { value: 'fa-ambulance', label: 'Ambulans (Ambulance)' },
    { value: 'fa-user-doctor', label: 'Shifokor (Doctor)' },
    { value: 'fa-user-nurse', label: 'Hamshira (Nurse)' },
    { value: 'fa-headset', label: '911 Dispetcher (Dispatcher)' },
    { value: 'fa-phone-volume', label: 'Aloqa (Emergency Call)' },
    { value: 'fa-wrench', label: 'Santexnik (Plumber)' },
    { value: 'fa-toolbox', label: 'Asboblar (Toolbox)' },
    { value: 'fa-user-gear', label: 'Xizmat ko‘rsatuvchi (Service Worker)' },
    { value: 'fa-user-tie', label: 'Operator (Operator)' },
    { value: 'fa-shield', label: 'Xavfsizlik (Security)' },
  { value: 'fa-server',          label: 'Server' },
  { value: 'fa-briefcase',       label: 'Portfel' },
  { value: 'fa-gear',            label: 'Sozlama' },
  { value: 'fa-shield-halved',   label: 'Himoya' },
  { value: 'fa-laptop-code',     label: 'Laptop' },
  { value: 'fa-cube',            label: 'Modul' },
  // Added fire, doctor, and police related icons
  { value: 'fa-fire',            label: 'Yong‘in' },
  { value: 'fa-user-doctor',     label: 'Shifokor' },
  { value: 'fa-user-nurse',      label: 'Hamshira' },
  { value: 'fa-briefcase-medical', label: 'Tibbiyot sumkasi' },
  { value: 'fa-shield',          label: 'Politsiya' },
  { value: 'fa-badge-sheriff',   label: 'Sherif' },
  { value: 'fa-car-on',          label: 'Politsiya mashinasi' },
  { value: 'fa-truck-medical',   label: 'Tez yordam' },
  { value: 'fa-hospital',        label: 'Shifoxona' },
  { value: 'fa-ambulance',       label: 'Ambulans' },
  { value: 'fa-fire-extinguisher', label: 'O‘t o‘chirgich' },
  { value: 'fa-user-shield',     label: 'Xavfsizlik' },
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tizimlarni boshqarish</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Yangi tizimlar qo'shish va mavjudlarini tahrirlash</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi Tizim
        </button>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <div key={module.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <i className={`fas ${module.icon || 'fa-folder'} text-xl`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{module.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {module.lessons.length} darslar
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEdit(module)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                  title="Tahrirlash"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  onClick={() => setModuleToDelete(module)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="O'chirish"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{module.description}</p>
          </div>
        ))}

        {modules.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
              <i className="fas fa-layer-group text-2xl"></i>
            </div>
            <p className="text-slate-400 font-medium">Hozircha tizimlar mavjud emas</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {moduleToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-slideUp">
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
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slideUp max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  placeholder="Masalan: Sistema-105"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tavsif *</label>
                <textarea
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none text-slate-900 dark:text-slate-100"
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
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <i className={`fas ${icon} text-lg`}></i>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-sm flex-1 text-left">
                    {ICON_OPTIONS.find(o => o.value === icon)?.label || icon}
                  </span>
                  <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform ${showIconPicker ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Icon grid */}
                {showIconPicker && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-5 gap-2">
                    {ICON_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        onClick={() => { setIcon(option.value); setShowIconPicker(false); }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                          icon === option.value
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <i className={`fas ${option.value} text-lg`}></i>
                        <span className="text-[9px] font-medium leading-tight text-center">{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-60 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                  : <><i className="fas fa-save"></i> {editingModule ? "O'zgarishlarni saqlash" : 'Tizimni yaratish'}</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManagement;
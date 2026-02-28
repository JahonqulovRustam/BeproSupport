
import React, { useState } from 'react';
import { SystemModule } from '../types';

interface SystemManagementProps {
  modules: SystemModule[];
  onAddModule: (module: SystemModule) => void;
  onUpdateModule: (module: SystemModule) => void;
  onDeleteModule: (id: string) => void;
}

const SystemManagement: React.FC<SystemManagementProps> = ({ modules, onAddModule, onUpdateModule, onDeleteModule }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('fa-server');

  const icons = [
    'fa-server', 'fa-database', 'fa-network-wired', 'fa-shield-halved', 
    'fa-location-dot', 'fa-microscope', 'fa-flask-vial', 'fa-x-ray',
    'fa-laptop-code', 'fa-cloud', 'fa-terminal', 'fa-gear'
  ];

  const handleOpenAdd = () => {
    setEditingModule(null);
    setName('');
    setDescription('');
    setIcon('fa-server');
    setShowModal(true);
  };

  const handleOpenEdit = (module: SystemModule) => {
    setEditingModule(module);
    setName(module.name);
    setDescription(module.description);
    setIcon(module.icon);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingModule) {
      onUpdateModule({
        ...editingModule,
        name,
        description,
        icon
      });
    } else {
      const newModule: SystemModule = {
        id: `s-${Date.now()}`,
        name,
        description,
        icon,
        lessons: []
      };
      onAddModule(newModule);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Tizimlarni boshqarish</h3>
          <p className="text-slate-500 text-sm">Yangi tizimlar qo'shish va mavjudlarini tahrirlash</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi Tizim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <div key={module.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i className={`fas ${module.icon} text-xl`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{module.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{module.lessons.length} darslar</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenEdit(module)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button 
                  onClick={() => onDeleteModule(module.id)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">{module.description}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingModule ? 'Tizimni tahrirlash' : 'Yangi Tizim'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tizim nomi</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masalan: Sistema-105"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tavsif</label>
                <textarea 
                  required 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  placeholder="Tizim haqida qisqacha ma'lumot..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ikonka tanlang</label>
                <div className="grid grid-cols-6 gap-2">
                  {icons.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                        icon === i ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`fas ${i}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-4"
              >
                {editingModule ? 'O\'zgarishlarni saqlash' : 'Tizimni yaratish'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManagement;

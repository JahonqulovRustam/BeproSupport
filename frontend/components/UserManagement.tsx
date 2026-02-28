
import React, { useState } from 'react';
import { User, UserRole, SystemModule } from '../types';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  modules: SystemModule[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, modules, onAddUser, onDeleteUser, onUpdateUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const getManageableRole = (): UserRole | null => {
    if (currentUser.role === 'ADMIN') return 'EMPLOYEE';
    return null;
  };

  const targetRole = getManageableRole();
  const filteredUsers = users.filter(u => u.role === targetRole);

  const availableModules = modules.filter(module => {
    if (currentUser.role === 'ADMIN') return true;
    return currentUser.allowedModules?.includes(module.id);
  });

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setNewName('');
    setNewLogin('');
    setNewPassword('');
    setSelectedModules([]);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewLogin(user.login);
    setNewPassword(''); // Keep password empty unless changing
    setSelectedModules(user.allowedModules || []);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) return;

    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        name: newName,
        login: newLogin,
        allowedModules: selectedModules,
      };
      if (newPassword) updatedUser.password = newPassword;
      onUpdateUser?.(updatedUser);
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        name: newName,
        login: newLogin,
        password: newPassword,
        role: targetRole,
        avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=default',
        allowedModules: selectedModules
      };
      onAddUser(newUser);
    }

    setShowModal(false);
  };

  if (!targetRole) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {targetRole === 'ADMIN' ? 'Adminlarni boshqarish' : 'Xodimlarni boshqarish'}
          </h3>
          <p className="text-slate-500 text-sm">
            Tizimga yangi {targetRole === 'ADMIN' ? 'admin' : 'xodim'} qo'shish va boshqarish
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi {targetRole === 'ADMIN' ? 'Admin' : 'Xodim'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <i className="fas fa-user text-xl"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{user.name}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEdit(user)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  onClick={() => onDeleteUser(user.id)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Login:</span>
                <span className="text-slate-700 font-mono">{user.login}</span>
              </div>
              {user.allowedModules && user.allowedModules.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ruxsat etilgan modullar:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.allowedModules.map(mid => {
                      const mod = modules.find(m => m.id === mid);
                      return (
                        <span key={mid} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                          {mod?.name || mid}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <i className="fas fa-users text-2xl"></i>
            </div>
            <p className="text-slate-400">Hozircha hech qanday {targetRole.toLowerCase()} mavjud emas</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingUser ? `${targetRole}ni tahrirlash` : `Yangi ${targetRole}`}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ism-sharif</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ismni kiriting"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Login</label>
                <input
                  type="text"
                  required
                  value={newLogin}
                  onChange={e => setNewLogin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="login"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Parol {editingUser && '(o\'zgartirish uchun kiriting)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ruxsat etilgan modullar</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableModules.map(module => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleToggleModule(module.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${selectedModules.includes(module.id)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <i className={`fas ${module.icon}`}></i>
                      <span className="truncate">{module.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-4"
              >
                {editingUser ? 'O\'zgarishlarni saqlash' : 'Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

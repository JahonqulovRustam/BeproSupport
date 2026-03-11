
import React, { useState } from 'react';
import { userService } from '../services/userService';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE' | 'LEED'>('EMPLOYEE');
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
    setFirstName('');
    setLastName('');
    setUsername('');
    setNewPassword('');
    setRole('EMPLOYEE');
    setSelectedModules([]);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    // Split name if possible
    const [f, l] = user.name.split(' ');
    setFirstName(f || '');
    setLastName(l || '');
    setUsername(user.login);
    setNewPassword(''); // Keep password empty unless changing
    setRole(user.role as 'ADMIN' | 'EMPLOYEE' | 'LEED');
    setSelectedModules(user.allowedModules || []);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const userPayload = {
      firstName,
      lastName,
      username,
      password: newPassword,
      role,
    };

    try {
      // POST new user
      await userService.createUser(userPayload);
      // Reload users
      const updatedUsers = await userService.getAllUsers();
      onAddUser && onAddUser(updatedUsers);
      setShowModal(false);
    } catch (error) {
      alert('Xodim qo\'shishda xatolik!');
    }
  };

  if (!targetRole) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Xodimlarni boshqarish</h3>
          <p className="text-slate-500 text-sm">Tizimga yangi xodim qo'shish va boshqarish</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi Xodim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <i className="fas fa-user text-xl"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{user.name}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              {/* Edit/Delete buttons can be added here if needed */}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Login:</span>
                <span className="text-slate-700 font-mono">{user.login}</span>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <i className="fas fa-users text-2xl"></i>
            </div>
            <p className="text-slate-400">Hozircha hech qanday xodim mavjud emas</p>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ism</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ismni kiriting"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Familiya</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Familiyani kiriting"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Username"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Rol</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'ADMIN' | 'EMPLOYEE' | 'LEED')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="LEED">LEED</option>
                </select>
              </div>

              {/* Ruxsat etilgan modullar maydoni olib tashlandi */}

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

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { userService } from '../services/userService';
import { User, UserRole, SystemModule } from '../types';interface UserManagementProps {
  currentUser: User;
  users: User[];
  modules: SystemModule[];
  onAddUser: (users: User[]) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, onAddUser, onDeleteUser, onUpdateUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [saving, setSaving] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setUserToDelete(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setUsername('');
    setNewPassword('');
    setRole('EMPLOYEE');
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    const parts = user.name.split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setUsername(user.login);
    setNewPassword('');
    setRole(user.role);
    setShowModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(String(userToDelete.id));
      onDeleteUser(String(userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      alert("Xatolik yuz berdi!");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (id: string) => {
    const u = users.find(u => String(u.id) === id);
    if (u) setUserToDelete(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingUser) {
        // Edit mode (PATCH)
        const updated = await userService.updateUser(editingUser.id, {
          firstName,
          lastName,
          password: newPassword || undefined,
          role: role as 'ADMIN' | 'EMPLOYEE' | 'LEAD'
        });
        onUpdateUser(updated);
        // Also reload all users just to be safe
        const updatedUsers = await userService.getAllUsers();
        onAddUser(updatedUsers); 
      } else {
        // Add mode (POST)
        await userService.createUser({
          firstName,
          lastName,
          username,
          password: newPassword,
          role: role as 'ADMIN' | 'EMPLOYEE' | 'LEAD'
        });
        const updatedUsers = await userService.getAllUsers();
        onAddUser(updatedUsers);
      }
      setShowModal(false);
    } catch (error) {
      alert("Saqlashda xatolik yuz berdi! Username band bo'lishi mumkin.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Foydalanuvchilarni boshqarish</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tizimga yangi foydalanuvchi qo'shish va tahrirlash</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-900/30 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yangi Foydalanuvchi
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold">Foydalanuvchi</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold">Login (Username)</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold">Rol</th>
                <th className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-right">Harakatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                        user.role === 'LEAD' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {user.role === 'ADMIN' ? <i className="fas fa-user-shield text-lg" title="Admin"></i> :
                         user.role === 'LEAD' ? <i className="fas fa-user-tie text-lg" title="Lead"></i> :
                         <i className="fas fa-user text-lg" title="Xodim"></i>}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {user.login}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 
                      user.role === 'LEAD' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 
                      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenEdit(user)}
                      className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Tahrirlash"
                    >
                      <i className="fas fa-pen text-xs"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id === currentUser.id}
                      className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="O'chirish"
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                      <i className="fas fa-users text-2xl"></i>
                    </div>
                    Hozircha hech qanday foydalanuvchi mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {showModal && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {editingUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 mb-1">Ism *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 transition-all"
                    placeholder="Ism"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 mb-1">Familiya *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 transition-all"
                    placeholder="Familiya"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 mb-1">Login (Username) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 placeholder:text-slate-400 transition-all"
                  placeholder="Username"
                />
                {editingUser && <p className="text-[10px] text-slate-400 mt-1 px-1">Login o'zgartirilmaydi.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 mb-1">
                  Parol {editingUser && <span className="font-normal text-slate-400">(faqat o'zgartirish uchun)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 transition-all"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 mb-1">Rol *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  required
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">XODIM (EMPLOYEE)</option>
                  <option value="LEAD">LEAD</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 hover:bg-orange-700 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                ) : (
                  editingUser ? "O'zgarishlarni saqlash" : "Qo'shish"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {userToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 m-auto" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-user-times text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">Foydalanuvchini o'chirish</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed mb-6">
              Siz rostdan ham <span className="font-bold text-slate-700 dark:text-slate-300">{userToDelete.name}</span> ni o'chirmoqchimisiz? Ushbu jarayonni ortga qaytarib bo'lmaydi va foydalanuvchiga tegishli <span className="font-bold text-red-500">barcha ma'lumotlar, ishlagan testlari va natijalari</span> butunlay o'chib ketadi!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all text-sm"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-trash-can"></i>}
                O'chirish
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default UserManagement;

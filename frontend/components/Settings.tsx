
import React, { useState } from 'react';
import { User } from '../types';

interface SettingsProps {
  currentUser: User;
  onUpdateProfile: (updatedUser: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateProfile }) => {
  const [name, setName] = useState(currentUser.name);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Parollar mos kelmadi!' });
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: name,
    };

    if (password) {
      updatedUser.password = password;
    }

    onUpdateProfile(updatedUser);
    setMessage({ type: 'success', text: 'Profil muvaffaqiyatli yangilandi!' });
    setPassword('');
    setConfirmPassword('');
    
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
              <i className="fas fa-user-gear"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Profil sozlamalari</h3>
              <p className="text-slate-400 text-sm mt-1">Shaxsiy ma'lumotlaringizni boshqaring</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-slideUp ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              <i className={`fas ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Ism-sharif</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ismingizni kiriting"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Login (o'zgartirib bo'lmaydi)</label>
              <input 
                type="text" 
                value={currentUser.login}
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4">Parolni o'zgartirish</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Yangi parol</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Parolni tasdiqlang</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 italic">Parolni o'zgartirmoqchi bo'lsangizgina ushbu maydonlarni to'ldiring.</p>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-save"></i>
              O'zgarishlarni saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;

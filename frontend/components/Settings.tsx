import React, { useState } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';

interface SettingsProps {
  currentUser: User;
  onUpdateProfile: (updatedUser: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateProfile }) => {
  const nameParts = currentUser.name.split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName,  setLastName]  = useState(nameParts.slice(1).join(' ') || '');
  const [password,  setPassword]  = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      showMessage('error', 'Parollar mos kelmadi!');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      showMessage('error', 'Ism va familiya majburiy!');
      return;
    }
    setSaving(true);
    try {
      const payload: { firstName: string; lastName: string; password?: string } = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
      };
      if (password.trim()) payload.password = password.trim();
      const updated = await userService.updateUser(currentUser.id, payload);
      onUpdateProfile(updated);
      localStorage.setItem('bepro_user', JSON.stringify(updated));
      setPassword('');
      setConfirmPassword('');
      showMessage('success', 'Profil muvaffaqiyatli yangilandi!');
    } catch (err: any) {
      console.error('PATCH /api/users error:', err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.message || err?.response?.data || '';
      if (status === 400)            showMessage('error', `Noto'g'ri ma'lumot: ${detail}`);
      else if (status === 401 || status === 403) showMessage('error', "Ruxsat yo'q. Qayta kiring.");
      else if (status === 404)       showMessage('error', 'Foydalanuvchi topilmadi.');
      else showMessage('error', `Server xatosi (${status ?? 'unknown'}). Qayta urinib ko'ring.`);
    } finally {
      setSaving(false);
    }
  };

  const fullName  = `${firstName} ${lastName}`.trim();
  const initials  = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase();
  const mismatch  = !!confirmPassword && password !== confirmPassword;

  const inputBase =
    'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600';

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold tracking-tight shrink-0">
              {initials || <i className="fas fa-user-gear"></i>}
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold truncate">{fullName || 'Profil sozlamalari'}</h3>
              <p className="text-slate-400 text-sm mt-1">@{currentUser.login} · {currentUser.role}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Alert banner */}
          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-slideUp ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
            }`}>
              <i className={`fas ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {message.text}
            </div>
          )}

          {/* Name fields */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <i className="fas fa-id-card text-slate-400 dark:text-slate-500 text-sm"></i>
              Shaxsiy ma'lumotlar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Ism *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inputBase}
                  placeholder="Ismingiz"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Familiya *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={inputBase}
                  placeholder="Familiyangiz"
                />
              </div>
            </div>
          </div>

          {/* Login (readonly) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">
              Login <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(o'zgartirib bo'lmaydi)</span>
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <i className="fas fa-lock text-slate-300 dark:text-slate-600 text-sm"></i>
              <span className="font-mono text-slate-500 dark:text-slate-400">{currentUser.login}</span>
            </div>
          </div>

          {/* Password section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <i className="fas fa-key text-slate-400 dark:text-slate-500 text-sm"></i>
              Parolni o'zgartirish
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(ixtiyoriy)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Yangi parol</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputBase} pr-11`}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Parolni tasdiqlang</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`${inputBase} pr-11 ${mismatch ? '!border-red-300 dark:!border-red-700 focus:!ring-red-400/20' : ''}`}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
                {mismatch && (
                  <p className="text-xs text-red-500 dark:text-red-400 px-1">Parollar mos emas</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving || mismatch}
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saving
                ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                : <><i className="fas fa-save"></i> O'zgarishlarni saqlash</>
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Settings;

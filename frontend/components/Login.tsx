import React, { useState } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';

interface LoginProps {
  onLogin: (user: User) => void;
}

type ErrorType = 'credentials' | 'server' | 'network' | 'unknown';

const errorMessages: Record<ErrorType, { icon: string; text: string }> = {
  credentials: { icon: 'fa-circle-exclamation', text: "Login yoki parol noto'g'ri" },
  server:      { icon: 'fa-server',             text: "Server xatosi yuz berdi. Keyinroq urinib ko'ring." },
  network:     { icon: 'fa-wifi',               text: "Internetga ulanishda muammo. Tarmoqni tekshiring." },
  unknown:     { icon: 'fa-triangle-exclamation', text: "Noma'lum xato yuz berdi. Qayta urinib ko'ring." },
};

const getErrorType = (err: any): ErrorType => {
  // No response at all — network/timeout issue
  if (!err?.response) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') return 'network';
    if (err?.code === 'ECONNABORTED') return 'network'; // timeout
    return 'network';
  }

  const status = err.response.status;
  if (status === 401 || status === 403) return 'credentials';
  if (status >= 500) return 'server';
  if (status === 400) return 'credentials'; // bad request = wrong input
  return 'unknown';
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorType(null);
    try {
      const user = await userService.login(login, password);
      onLogin(user);
    } catch (err: any) {
      console.error('Login xatoligi:', err);
      setErrorType(getErrorType(err));
    } finally {
      setLoading(false);
    }
  };

  const currentError = errorType ? errorMessages[errorType] : null;

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-10 w-full max-w-md border border-transparent dark:border-slate-700">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="https://bepro.uz/wp-content/uploads/2024/07/logotype-horizontal.png" alt="BePro" className="h-16 w-auto object-contain" onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'block';
            }
          }} />
          <h1 className="hidden text-3xl font-bold text-orange-600 mb-2 text-center">
            BePro
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-center">
          Tizimga kirish uchun login va parolingizni kiriting
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Login field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Login
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="fas fa-user"></i>
              </span>
              <input
                type="text"
                value={login}
                onChange={e => { setLogin(e.target.value); setErrorType(null); }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                placeholder="Loginni kiriting"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Parol
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrorType(null); }}
                className="w-full pl-12 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                placeholder="Parolni kiriting"
                required
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

          {/* Error banner */}
          {currentError && (
            <div className={`p-3 text-sm rounded-xl flex items-center gap-3 border animate-slideUp ${
              errorType === 'credentials'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800'
                : errorType === 'network'
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800'
            }`}>
              <i className={`fas ${currentError.icon} shrink-0`}></i>
              {currentError.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> Kirish...
              </span>
            ) : 'Kirish'}
          </button>

        </form>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 text-center">
          © 2024 Bepro Texnik Qo'llab-quvvatlash Xizmati
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.25s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Login;

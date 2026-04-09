import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ModuleContent from './components/ModuleContent';
import LeadDashboard from './components/LeadDashboard';
import ModuleStatsDashboard from './components/ModuleStatsDashboard';
import AdminContentManager from './components/AdminContentManager';
import UserManagement from './components/UserManagement';
import SystemManagement from './components/SystemManagement';
import Settings from './components/Settings';
import Login from './components/Login';
import Quiz from './components/Quiz';
import MyResults from './components/MyResults';
import { INITIAL_USERS } from './constants';
import { SystemModule, Lesson, User } from './types';
import { moduleService } from './services/moduleService';
import { userService } from './services/userService';
import { setAuthCredentials } from './services/apiClient';
import { useTheme } from './src/hooks/useTheme';

type ViewType = 'CONTENT' | 'DASHBOARD' | 'MODULE_STATS' | 'MANAGE' | 'USERS' | 'SYSTEMS' | 'SETTINGS' | 'MY_RESULTS';

const clearSession = () => {
  localStorage.removeItem('bepro_user');
  localStorage.removeItem('bepro_jwt');
  localStorage.removeItem('bepro_view');
};

const restoreUser = (): User | null => {
  try {
    const saved = localStorage.getItem('bepro_user');
    const token = localStorage.getItem('bepro_jwt');
    if (saved && token) return JSON.parse(saved);
  } catch { clearSession(); }
  return null;
};

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [activeModuleId, setActiveModuleId] = useState('');
  const [activeLessonForQuiz, setActiveLessonForQuiz] = useState<Lesson | null>(null);
  const [view, setView] = useState<ViewType>('CONTENT');

  // ─── Validate session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('bepro_jwt');
      const saved = localStorage.getItem('bepro_user');
      if (!token || !saved) { clearSession(); setSessionChecked(true); return; }
      try {
        await userService.getAllUsers();
        const user: User = JSON.parse(saved);
        setCurrentUser(user);
        const savedView = localStorage.getItem('bepro_view') as ViewType | null;
        setView(savedView || (user.role === 'ADMIN' ? 'DASHBOARD' : 'MY_RESULTS'));
      } catch {
        console.warn('Session expired, logging out.');
        clearSession();
      } finally {
        setSessionChecked(true);
      }
    };
    validateSession();
  }, []);

  // ─── URL hash sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { window.location.hash = '/login'; return; }
    const hashMap: Record<ViewType, string> = {
      CONTENT: '/dashboard', DASHBOARD: '/analytics', MODULE_STATS: '/stats',
      MANAGE: '/manage', USERS: '/users', SYSTEMS: '/systems',
      SETTINGS: '/settings', MY_RESULTS: '/my-results',
    };
    window.location.hash = hashMap[view];
    localStorage.setItem('bepro_view', view);
  }, [view, currentUser]);

  // ─── Load modules ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchModules = async () => {
      const token = localStorage.getItem('bepro_jwt');
      if (!token || !currentUser) return;
      try {
        const fetched = await moduleService.getAllModules();
        if (fetched.length > 0) {
          setModules(fetched);
          setActiveModuleId(prev => prev || fetched[0].id);
        }
      } catch (err) { console.error('Modullarni yuklashda xatolik:', err); }
    };
    fetchModules();
  }, [currentUser]);

  // ─── Load users (admin only) ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser || currentUser.role !== 'ADMIN') return;
      try { setUsers(await userService.getAllUsers()); }
      catch (err) { console.error('Foydalanuvchilarni yuklashda xatolik:', err); }
    };
    fetchUsers();
  }, [currentUser]);

  // ─── Auth ────────────────────────────────────────────────────────────────────
  const handleLogin = (user: User) => {
    localStorage.setItem('bepro_user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.login && user.password) setAuthCredentials(user.login, user.password);
    if (user.role === 'EMPLOYEE') {
      if (user.allowedModules?.length) setActiveModuleId(user.allowedModules[0]);
      setView('MY_RESULTS');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setModules([]);
    setActiveModuleId('');
    setView('CONTENT');
  };

  // ─── User management ─────────────────────────────────────────────────────────
  const handleAddUser    = (_: User) => userService.getAllUsers().then(setUsers);
  const handleDeleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  const handleUpdateUser = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser?.id === updated.id) {
      localStorage.setItem('bepro_user', JSON.stringify(updated));
      setCurrentUser(updated);
    }
  };

  // ─── Module management ───────────────────────────────────────────────────────
  const handleSelectModule = (id: string) => { setActiveModuleId(id); setView('CONTENT'); };
  const handleUpdateModule = (u: SystemModule) => setModules(prev => prev.map(m => m.id === u.id ? u : m));
  const handleAddModule = (m: SystemModule) => {
    setModules(prev => [...prev, m]);
  };
  const handleDeleteModule = async (id: string) => {
    try { await moduleService.deleteModule(id); } catch (err) { console.error(err); }
    finally {
      const next = modules.filter(m => m.id !== id);
      setModules(next);
      if (activeModuleId === id) setActiveModuleId(next[0]?.id || '');
    }
  };

  // ─── Loading screen ───────────────────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <i className="fas fa-graduation-cap text-white text-3xl"></i>
          </div>
          <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const isAdmin = currentUser.role === 'ADMIN';
  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

  const pageTitle: Record<ViewType, string> = {
    DASHBOARD:    `${activeModule?.name || 'Tizim'}: Analitika`,
    MODULE_STATS: `${activeModule?.name || 'Tizim'}: Jamoa statistikasi`,
    USERS:        'Foydalanuvchilar',
    SYSTEMS:      'Tizimlar',
    SETTINGS:     'Sozlamalar',
    MY_RESULTS:   'Mening natijalarim',
    CONTENT:      activeModule?.name || 'Tizim',
    MANAGE:       `${activeModule?.name || 'Tizim'}: Tahrirlash`,
  };

  const pageSubtitle: Record<ViewType, string> = {
    DASHBOARD:    "Barcha tizimlar bo'yicha jamoa samaradorligi",
    MODULE_STATS: "Xodimlarning ushbu modulni o'zlashtirish darajasi",
    USERS:        'Tizim foydalanuvchilarini boshqarish paneli',
    SYSTEMS:      "O'quv tizimlarini boshqarish",
    SETTINGS:     "Shaxsiy ma'lumotlarni tahrirlash",
    MY_RESULTS:   'Barcha test natijalari va statistikangiz',
    CONTENT:      activeModule?.description || '',
    MANAGE:       "Darslar va media fayllarni boshqarish",
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
      <p className="text-slate-400">Hech qanday tizim topilmadi</p>
    </div>
  );

  // ─── Render content — NO setView() calls inside here ─────────────────────────
  const renderContent = () => {
    console.log('view:', view, '| activeLessonForQuiz:', activeLessonForQuiz);
    // Quiz takes priority over everything
    if (activeLessonForQuiz) {
      return (
        <Quiz
          questions={activeLessonForQuiz.questions}
          lessonId={activeLessonForQuiz.id}
          lessonTitle={activeLessonForQuiz.title}
          currentUserId={currentUser.id}
          onComplete={score => { console.log('Ball:', score); setActiveLessonForQuiz(null); }}
          onCancel={() => setActiveLessonForQuiz(null)}
        />
      );
    }

    switch (view) {
      case 'MY_RESULTS':
        return <MyResults currentUser={currentUser} />;

      case 'SETTINGS':
        return <Settings currentUser={currentUser} onUpdateProfile={handleUpdateUser} />;

      case 'USERS':
        // Non-admins simply see empty — sidebar won't show this option anyway
        if (!isAdmin) return emptyState;
        return (
          <UserManagement
            currentUser={currentUser}
            users={users}
            modules={modules}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
          />
        );

      case 'SYSTEMS':
        if (!isAdmin) return emptyState;
        return (
          <SystemManagement
            modules={modules}
            onAddModule={handleAddModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
          />
        );

      case 'DASHBOARD':
        if (!isAdmin) return emptyState;
        return <LeadDashboard activeModule={activeModule} />;

      case 'MODULE_STATS':
        if (!isAdmin || !activeModule) return emptyState;
        return <ModuleStatsDashboard module={activeModule} />;

      case 'MANAGE':
        // ✅ Admin-only: manage lessons and media for the active module
        if (!isAdmin || !activeModule) return emptyState;
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setView('CONTENT')}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
              >
                <i className="fas fa-eye"></i> Ko'rish rejimiga qaytish
              </button>
            </div>
            <AdminContentManager
              module={activeModule}
              onUpdateModule={handleUpdateModule}
            />
          </div>
        );

      case 'CONTENT':
      default:
        if (!activeModule) return emptyState;
        return (
          <ModuleContent
            module={activeModule}
            currentUser={currentUser}
            onTakeTest={setActiveLessonForQuiz}
            onUpdateModule={handleUpdateModule}
            onManage={isAdmin ? () => setView('MANAGE') : undefined}
          />
        );
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar
          activeModuleId={activeModuleId}
          activeView={view}
          onSelectModule={handleSelectModule}
          currentUser={currentUser}
          modules={modules}
          onViewUsers={isAdmin ? () => setView('USERS') : undefined}
          onViewSettings={() => setView('SETTINGS')}
          onViewSystems={isAdmin ? () => setView('SYSTEMS') : undefined}
          onViewDashboard={isAdmin ? () => setView('DASHBOARD') : undefined}
          onViewMyResults={() => setView('MY_RESULTS')}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-8 max-h-screen overflow-y-auto custom-scrollbar">
          <header className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {pageTitle[view]}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {pageSubtitle[view]}
            </p>
          </header>

          {renderContent()}
        </main>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(10px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.4s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default App;
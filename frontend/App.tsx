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
import { BEPRO_MODULES, INITIAL_USERS } from './constants';
import { UserRole, SystemModule, Lesson, User } from './types';
import { moduleService } from './services/moduleService';
import { userService } from './services/userService';
import { setAuthCredentials } from './services/apiClient';

type ViewType = 'CONTENT' | 'DASHBOARD' | 'MODULE_STATS' | 'MANAGE' | 'USERS' | 'SYSTEMS' | 'SETTINGS';

// ─── Restore user from localStorage on first load ───────────────────────────
const restoreUser = (): User | null => {
  try {
    const saved = localStorage.getItem('bepro_user');
    const token = localStorage.getItem('bepro_jwt');
    if (saved && token) return JSON.parse(saved);
  } catch {
    // corrupted storage — clear it
    localStorage.removeItem('bepro_user');
    localStorage.removeItem('bepro_jwt');
  }
  return null;
};

const App: React.FC = () => {
  // ✅ Restore user immediately — no flicker to login screen on reload
  const [currentUser, setCurrentUser] = useState<User | null>(restoreUser);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [modules, setModules] = useState<SystemModule[]>(BEPRO_MODULES);
  const [activeModuleId, setActiveModuleId] = useState(BEPRO_MODULES[0]?.id || '');
  const [activeLessonForQuiz, setActiveLessonForQuiz] = useState<Lesson | null>(null);
  const [view, setView] = useState<ViewType>(() => {
    // Only restore last view if user session exists — otherwise always start fresh
    const user = restoreUser();
    if (!user) return 'CONTENT';
    const saved = localStorage.getItem('bepro_view') as ViewType | null;
    return saved || 'CONTENT';
  });

  // ─── Update URL hash to reflect current view ────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      window.location.hash = '/login';
      return;
    }
    const hashMap: Record<ViewType, string> = {
      CONTENT: '/dashboard',
      DASHBOARD: '/analytics',
      MODULE_STATS: '/stats',
      MANAGE: '/manage',
      USERS: '/users',
      SYSTEMS: '/systems',
      SETTINGS: '/settings',
    };
    window.location.hash = hashMap[view];
    localStorage.setItem('bepro_view', view);
  }, [view, currentUser]);

  // ─── Load modules from backend whenever user changes ────────────────────────
  useEffect(() => {
    const fetchModules = async () => {
      const token = localStorage.getItem('bepro_jwt');
      if (!token || !currentUser) return; // ✅ guard on actual JWT, not bepro_auth

      try {
        const fetchedModules = await moduleService.getAllModules();
        if (fetchedModules.length > 0) {
          setModules(fetchedModules);
          setActiveModuleId(prev => prev || fetchedModules[0].id);
        }
      } catch (error) {
        console.error('Modullarni yuklashda xatolik:', error);
      }
    };

    fetchModules();
  }, [currentUser]);

  // ─── Load users from backend if ADMIN ───────────────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser || currentUser.role !== 'ADMIN') return;
      try {
        const fetchedUsers = await userService.getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Foydalanuvchilarni yuklashda xatolik:', error);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // ─── Auth handlers ───────────────────────────────────────────────────────────
  const handleLogin = (user: User) => {
    // ✅ Persist user to localStorage so reload restores session
    localStorage.setItem('bepro_user', JSON.stringify(user));

    setCurrentUser(user);

    if (user.login && user.password) {
      setAuthCredentials(user.login, user.password);
    }

    if (user.role === 'EMPLOYEE') {
      if (user.allowedModules && user.allowedModules.length > 0) {
        setActiveModuleId(user.allowedModules[0]);
      }
    }

    if (user.role === 'ADMIN') setView('USERS');
    else setView('CONTENT');
  };

  const handleLogout = () => {
    // ✅ Clear all persisted auth data on logout
    localStorage.removeItem('bepro_user');
    localStorage.removeItem('bepro_jwt');
    localStorage.removeItem('bepro_view');
    setCurrentUser(null);
    setView('CONTENT');
  };

  // ─── User management ─────────────────────────────────────────────────────────
  const handleAddUser = (_newUser: User) => {
    userService.getAllUsers().then(fetchedUsers => setUsers(fetchedUsers));
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      const updated = { ...updatedUser };
      localStorage.setItem('bepro_user', JSON.stringify(updated));
      setCurrentUser(updated);
    }
  };

  // ─── Module management ───────────────────────────────────────────────────────
  const handleSelectModule = (id: string) => {
    setActiveModuleId(id);
    setView('CONTENT');
  };

  const handleUpdateModule = (updatedModule: SystemModule) => {
    setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
  };

  const handleAddModule = async (newModule: SystemModule) => {
    try {
      const created = await moduleService.createModule({
        title: newModule.name,
        description: newModule.description,
      });
      setModules(prev => [...prev, created]);
    } catch (error) {
      console.error('Modul qo\'shishda xatolik:', error);
      setModules(prev => [...prev, newModule]);
    }
  };

  const handleDeleteModule = async (id: string) => {
    try {
      await moduleService.deleteModule(id);
    } catch (error) {
      console.error('Modul o\'chirishda xatolik:', error);
    } finally {
      const newModules = modules.filter(m => m.id !== id);
      setModules(newModules);
      if (activeModuleId === id) {
        setActiveModuleId(newModules.length > 0 ? newModules[0].id : '');
      }
    }
  };

  // ─── Show login if no user ───────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

  // ─── Render main content by view ─────────────────────────────────────────────
  const renderContent = () => {
    if (activeLessonForQuiz) {
      return (
        <Quiz
          questions={activeLessonForQuiz.questions}
          onComplete={(score) => {
            console.log('Test yakunlandi, ball:', score);
            setActiveLessonForQuiz(null);
          }}
          onCancel={() => setActiveLessonForQuiz(null)}
        />
      );
    }

    if (!activeModule && view !== 'USERS' && view !== 'SYSTEMS' && view !== 'DASHBOARD') {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400">Hech qanday tizim topilmadi</p>
        </div>
      );
    }

    switch (view) {
      case 'USERS':
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
        return (
          <SystemManagement
            modules={modules}
            onAddModule={handleAddModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
          />
        );
      case 'SETTINGS':
        return <Settings currentUser={currentUser} onUpdateProfile={handleUpdateUser} />;
      case 'DASHBOARD':
        return <LeadDashboard activeModule={activeModule} />;
      case 'MODULE_STATS':
        return activeModule ? <ModuleStatsDashboard module={activeModule} /> : null;
      case 'CONTENT':
      default:
        return activeModule ? (
          <ModuleContent
            module={activeModule}
            currentUser={currentUser}
            onTakeTest={(lesson) => setActiveLessonForQuiz(lesson)}
            onUpdateModule={handleUpdateModule}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400">Hech qanday tizim topilmadi</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          activeModuleId={activeModuleId}
          onSelectModule={handleSelectModule}
          currentUser={currentUser}
          modules={modules}
          onViewUsers={currentUser.role === 'ADMIN' ? () => setView('USERS') : undefined}
          onViewSettings={() => setView('SETTINGS')}
          onViewSystems={currentUser.role === 'ADMIN' ? () => setView('SYSTEMS') : undefined}
          onViewDashboard={currentUser.role === 'ADMIN' ? () => setView('DASHBOARD') : undefined}
        />

        <main className="flex-1 p-8 max-h-screen overflow-y-auto custom-scrollbar">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {view === 'DASHBOARD' ? `${activeModule?.name || 'Tizim'}: Analitika`
                  : view === 'MODULE_STATS' ? `${activeModule?.name || 'Tizim'}: Jamoa statistikasi`
                  : view === 'USERS' ? 'Foydalanuvchilar'
                  : view === 'SYSTEMS' ? 'Tizimlar'
                  : view === 'SETTINGS' ? 'Sozlamalar'
                  : activeModule?.name || 'Tizim'}
              </h2>
              <p className="text-slate-500 mt-1">
                {view === 'DASHBOARD' ? 'Barcha tizimlar bo\'yicha jamoa samaradorligi'
                  : view === 'MODULE_STATS' ? 'Xodimlarning ushbu modulni o\'zlashtirish darajasi'
                  : view === 'USERS' ? 'Tizim foydalanuvchilarini boshqarish paneli'
                  : view === 'SYSTEMS' ? 'O\'quv tizimlarini boshqarish'
                  : view === 'SETTINGS' ? 'Shaxsiy ma\'lumotlarni tahrirlash'
                  : activeModule?.description || ''}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 mr-4 pr-4 border-r border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                  <i className="fas fa-user"></i>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{currentUser.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                title="Chiqish"
              >
                <i className="fas fa-power-off"></i>
              </button>
            </div>
          </header>

          {renderContent()}
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { SystemModule, Lesson, User } from '../types';
import { geminiService } from '../services/geminiService';
import { moduleService } from '../services/moduleService';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.241:8080';

interface ModuleContentProps {
  module: SystemModule;
  currentUser: User;
  onTakeTest: (lesson: Lesson) => void;
  onUpdateModule: (updatedModule: SystemModule) => void;
  onManage?: () => void; // ← only passed for ADMIN, triggers MANAGE view in App
}

interface SubModule {
  id: string | number;
  name: string;
  lessons: Lesson[];
}

interface MediaItem {
  id: string | number;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

const toEmbedUrl = (url: string): string => {
  try {
    if (url.includes('youtube.com/embed/')) return url;
    const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    return url;
  } catch { return url; }
};

const buildMediaUrl = (url: string): string => {
  const token = localStorage.getItem('bepro_jwt');
  const fullUrl = BASE_URL + url;
  return token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;
};

const normalizeSubModules = (module: SystemModule): SubModule[] => {
  const maybeSubModules = (module as any).subModules;
  if (Array.isArray(maybeSubModules) && maybeSubModules.length > 0) {
    return maybeSubModules as SubModule[];
  }

  const fallbackLessons = module.lessons;
  if (Array.isArray(fallbackLessons) && fallbackLessons.length > 0) {
    return [{ id: 'all-lessons', name: 'Barcha darslar', lessons: fallbackLessons }];
  }

  return [];
};

// ─── MediaRenderer ────────────────────────────────────────────────────────────
const MediaRenderer: React.FC<{ media: MediaItem; title: string }> = ({ media, title }) => {
  const isStream = media.url.startsWith('/api/media/stream');
  if (media.type === 'VIDEO') {
    if (isStream) {
      return (
        <video key={String(media.id)} className="w-full h-full" controls src={buildMediaUrl(media.url)}>
          Sizning brauzeringiz videoni qo'llab-quvvatlamaydi.
        </video>
      );
    }
    return (
      <iframe key={String(media.id)} className="w-full h-full" src={toEmbedUrl(media.url)} title={title}
        frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    );
  }
  if (media.type === 'IMAGE') {
    const src = isStream ? buildMediaUrl(media.url) : media.url;
    return (
      <img key={String(media.id)} className="w-full h-full object-contain" src={src} alt={title}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    );
  }
  return <div className="w-full h-full flex items-center justify-center text-white text-lg">Media mavjud emas</div>;
};

// ─── Lesson Edit Modal ────────────────────────────────────────────────────────
interface LessonEditModalProps {
  lesson: Lesson;
  onClose: () => void;
  onSaved: (updated: Lesson) => void;
}

const LessonEditModal: React.FC<LessonEditModalProps> = ({ lesson, onClose, onSaved }) => {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Sarlavha kiritilishi shart'); return; }
    setSaving(true); setError('');
    try {
      await moduleService.updateLesson(lesson.id, { title, description });
      onSaved({ ...lesson, title, description });
      onClose();
    } catch (err) { setError('Saqlashda xatolik yuz berdi'); console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slideUp">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Darsni tahrirlash</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sarlavha *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
              placeholder="Dars sarlavhasi" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tavsif</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 h-28 resize-none text-slate-900 dark:text-slate-100"
              placeholder="Dars haqida qisqacha..." />
          </div>
          {error && <p className="text-red-500 text-sm flex items-center gap-2"><i className="fas fa-exclamation-circle"></i> {error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
            Bekor qilish
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-70 transition-all flex items-center justify-center gap-2">
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</> : <><i className="fas fa-save"></i> Saqlash</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ModuleContent: React.FC<ModuleContentProps> = ({ module, currentUser, onTakeTest, onUpdateModule, onManage }) => {
  const [subModules, setSubModules] = useState<SubModule[]>(normalizeSubModules(module));
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | number | null>(() => {
    const normalized = normalizeSubModules(module);
    return normalized.length > 0 ? normalized[0].id : null;
  });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(() => {
    const normalized = normalizeSubModules(module);
    return normalized.length > 0 && normalized[0].lessons.length > 0 ? normalized[0].lessons[0] : null;
  });
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({});
  const [isAddSubModuleOpen, setIsAddSubModuleOpen] = useState(false);
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonDescription, setNewLessonDescription] = useState('');
  const [lessonSubModuleId, setLessonSubModuleId] = useState<string | number | null>(null);

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const normalized = normalizeSubModules(module);
    setSubModules(normalized);
    const firstSub = normalized[0] ?? null;
    const firstLesson = firstSub?.lessons?.[0] ?? null;
    setSelectedSubModuleId(firstSub ? firstSub.id : null);
    setSelectedLesson(firstLesson);
    setMediaIndex(0);
    // default collapse state for each submodule to expanded
    const initialCollapse = normalized.reduce((acc, sm) => ({ ...acc, [sm.id]: false }), {} as Record<string | number, boolean>);
    setCollapsed(initialCollapse);
  }, [module]);

  useEffect(() => { setMediaIndex(0); }, [selectedLesson]);

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !selectedLesson) return;
    setIsAsking(true);
    const answer = await geminiService.getTutorAdvice(selectedLesson.title, aiQuestion);
    setAiResponse(answer || "Kechirasiz, ma'lumotni qayta ishlashda xatolik yuz berdi.");
    setIsAsking(false);
  };

  const handleAddSubModule = async () => {
    if (!newSubModuleName.trim()) return;
    try {
      const created = await moduleService.createSubModule({
        name: newSubModuleName.trim(),
        systemModuleId: parseInt(module.id, 10),
      });
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      setNewSubModuleName('');
      setIsAddSubModuleOpen(false);
      setSelectedSubModuleId(created.id);
    } catch (err) {
      console.error('Sub-module yaratishda xato:', err);
      alert('Sub-module yaratishda xatolik yuz berdi.');
    }
  };

  const handleAddLesson = async () => {
    if (!newLessonName.trim() || !lessonSubModuleId) {
      alert('Dars sarlavhasi va sub-module tanlanishi kerak.');
      return;
    }
    try {
      const moduleIdAsNumber = parseInt(module.id, 10);
      await moduleService.createLesson({
        title: newLessonName.trim(),
        description: newLessonDescription.trim(),
        moduleId: moduleIdAsNumber,
        subModuleId: Number(lessonSubModuleId),
        questions: [],
      }, []);
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      setNewLessonName('');
      setNewLessonDescription('');
      setIsAddLessonOpen(false);

      // Set active submodule and first lesson
      const sub = updatedModule.subModules?.find(sm => sm.id === lessonSubModuleId.toString());
      if (sub && sub.lessons.length > 0) {
        setSelectedSubModuleId(sub.id);
        setSelectedLesson(sub.lessons[0]);
      }
    } catch (err) {
      console.error('Dars yaratishda xato:', err);
      alert('Dars yaratishda xatolik yuz berdi.');
    }
  };

  const handleStartSubmoduleQuiz = (sub: SubModule) => {
    const questions = sub.lessons.flatMap(lesson => lesson.questions || []);
    if (questions.length < 1) {
      alert('Bu sub-module uchun hech qanday savol yo‘q, iltimos avval dars savollarini qo‘shing.');
      return;
    }
    const quizLesson: Lesson = {
      id: `quiz-${sub.id}`,
      title: `${sub.name} uchun sub-module quiz`,
      description: `Ushbu quiz ${sub.lessons.length} darsning savollariga asoslangan.`,
      videoUrl: '',
      media: [],
      questions,
    };
    onTakeTest(quizLesson);
  };

  const handleLessonSaved = (updated: Lesson) => {
    setSelectedLesson(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));

    const updatedSubModules = subModules.map(sub => ({
      ...sub,
      lessons: sub.lessons.map(lesson => lesson.id === updated.id ? { ...lesson, ...updated } : lesson),
    }));

    setSubModules(updatedSubModules);

    // Update parent module with new nested structure and preserve legacy lessons if present
    onUpdateModule({
      ...module,
      subModules: updatedSubModules,
      lessons: module.lessons ? module.lessons.map(lesson => lesson.id === updated.id ? { ...lesson, ...updated } : lesson) : module.lessons,
    });
  };

  const currentSubModule = subModules.find(sm => sm.id === selectedSubModuleId) || subModules[0] || null;
  const lessonList = currentSubModule?.lessons ?? [];

  // ─── No lessons ──────────────────────────────────────────────────────────────
  if (!currentSubModule || lessonList.length === 0 || !selectedLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 animate-fadeIn">
        {onManage && (
          <div className="flex justify-end w-full px-8 mb-8">
            <button onClick={onManage}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2">
              <i className="fas fa-tools"></i> Dars qo'shish
            </button>
          </div>
        )}
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500">
          <i className="fas fa-book-open text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Darslar mavjud emas</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs text-center mt-2">
          Ushbu modul uchun hali darslar qo'shilmagan.
        </p>
      </div>
    );
  }

  const mediaList: MediaItem[] = Array.isArray(selectedLesson?.media) ? selectedLesson.media : [];
  const currentMedia = mediaList[mediaIndex] || null;
  const hasTest = selectedLesson.questions && selectedLesson.questions.length > 0;

  return (
    <>
      {editingLesson && (
        <LessonEditModal lesson={editingLesson} onClose={() => setEditingLesson(null)} onSaved={handleLessonSaved} />
      )}

      {isAddSubModuleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Yangi Sub-Module qo'shish</h4>
            <input
              type="text"
              value={newSubModuleName}
              onChange={e => setNewSubModuleName(e.target.value)}
              placeholder="Sub-module nomi"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAddSubModuleOpen(false); setNewSubModuleName(''); }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                Bekor qilish
              </button>
              <button onClick={handleAddSubModule}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddLessonOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Yangi Dars qo'shish</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={newLessonName}
                onChange={e => setNewLessonName(e.target.value)}
                placeholder="Dars sarlavhasi"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <textarea
                value={newLessonDescription}
                onChange={e => setNewLessonDescription(e.target.value)}
                placeholder="Dars tavsifi"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-24"
              />
              <select
                value={lessonSubModuleId ?? ''}
                onChange={e => setLessonSubModuleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Sub-module tanlang</option>
                {subModules.map(sub => (
                  <option key={String(sub.id)} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setIsAddLessonOpen(false); setNewLessonName(''); setNewLessonDescription(''); setLessonSubModuleId(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                Bekor qilish
              </button>
              <button onClick={handleAddLesson}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ─── Left column ─────────────────────────────────────────────── */}
          <div className="flex-1 space-y-6 min-w-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

              {/* Video/media */}
              <div className="aspect-video bg-black flex flex-col relative">
                {currentMedia
                  ? <MediaRenderer media={currentMedia} title={selectedLesson.title} />
                  : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                      <i className="fas fa-photo-film text-4xl"></i>
                      <span>Media mavjud emas</span>
                    </div>
                  )
                }
                {mediaList.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-3">
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === 0} onClick={() => setMediaIndex(mediaIndex - 1)}>
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                      {mediaIndex + 1} / {mediaList.length}
                    </span>
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === mediaList.length - 1} onClick={() => setMediaIndex(mediaIndex + 1)}>
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Lesson info */}
              <div className="p-6">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {selectedLesson.title}
                  </h2>
                  {/* Edit title button — admin only */}
                  {onManage && (
                    <button onClick={() => setEditingLesson(selectedLesson)}
                      className="shrink-0 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center gap-1.5">
                      <i className="fas fa-edit"></i> Tahrirlash
                    </button>
                  )}
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 leading-relaxed">
                  {selectedLesson.description}
                </p>

                {/* Action row */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => { if (hasTest) onTakeTest(selectedLesson); }}
                    disabled={!hasTest}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                      hasTest
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <i className="fas fa-file-lines"></i> Test Topshirish
                  </button>

                  {!hasTest && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <i className="fas fa-info-circle"></i> Bu dars uchun test mavjud emas
                    </p>
                  )}

                  {/* Manage button — admin only */}
                  {onManage && (
                    <button onClick={onManage}
                      className="ml-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2">
                      <i className="fas fa-tools"></i> Modulni boshqarish
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* AI Tutor */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                  <i className="fas fa-robot"></i>
                </div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300">Bepro AI Repetitor</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                {selectedLesson.title} bo'yicha tushunmagan savollaringizni AI mentorimizdan so'rang.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Masalan: Tizim xatosini qanday tuzataman...?"
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                />
                <button onClick={handleAskAi} disabled={isAsking}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0">
                  {isAsking ? "O'ylamoqda..." : "So'rash"}
                </button>
              </div>
              {aiResponse && (
                <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/50 text-sm text-slate-700 dark:text-slate-300 animate-slideUp">
                  <p className="font-bold text-blue-800 dark:text-blue-400 mb-1">Javob:</p>
                  {aiResponse}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right column: lesson list ───────────────────────────────── */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Modul darslari</h3>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => setIsAddSubModuleOpen(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                    <i className="fas fa-layer-group"></i> Sub-module qo'shish
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => {
                    setLessonSubModuleId(selectedSubModuleId);
                    setIsAddLessonOpen(true);
                  }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                    <i className="fas fa-plus-circle"></i> Dars qo'shish
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {subModules.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Modulga tegishli sub-module yo'q.</p>
              )}
              {subModules.map((sub) => {
                const isCollapsed = collapsed[String(sub.id)];
                return (
                  <div key={String(sub.id)} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-sm">
                    <button
                      onClick={() => {
                        setSelectedSubModuleId(sub.id);
                        const subFirstLesson = sub.lessons?.[0] ?? null;
                        setSelectedLesson(subFirstLesson);
                        setAiResponse('');
                        setAiQuestion('');
                        setMediaIndex(0);
                        setCollapsed(prev => ({ ...prev, [sub.id]: !prev[sub.id] }));
                      }}
                      className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{sub.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{sub.lessons.length} ta dars · {sub.lessons.flatMap(lesson=>lesson.questions||[]).length} ta savol</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isCollapsed && sub.lessons.length >= 3 && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStartSubmoduleQuiz(sub); }}
                            className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs rounded-full font-semibold hover:bg-blue-100 dark:hover:bg-blue-900"
                          >
                            Submodule quiz
                          </button>
                        )}
                        <span className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-slate-500`} />
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-2 space-y-2">
                        {sub.lessons.map((lesson, idx) => (
                          <button
                            key={lesson.id}
                            onClick={() => { setSelectedLesson(lesson); setSelectedSubModuleId(sub.id); setAiResponse(''); setAiQuestion(''); setMediaIndex(0); }}
                            className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all ${
                              selectedLesson?.id === lesson.id
                                ? 'border-blue-600 bg-blue-50 dark:bg-slate-700 shadow-sm'
                                : 'border-transparent bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{lesson.title}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{lesson.questions.length} savol</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default ModuleContent;
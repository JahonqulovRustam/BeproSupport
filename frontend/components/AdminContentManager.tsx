import React, { useState, useEffect } from 'react';
import { SystemModule, Lesson, Question } from '../types';
import { moduleService } from '../services/moduleService';
import { quizService } from '../services/quizService';
import { API_BASE_URL } from '../services/config';

interface AdminContentManagerProps {
  module: SystemModule;
  onUpdateModule: (updatedModule: SystemModule) => void;
}

interface InternalMediaItem {
  kind: 'internal';
  file: File;
  id: string;
}

interface ExternalMediaItem {
  kind: 'external';
  url: string;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  id: string;
}

type MediaItem = InternalMediaItem | ExternalMediaItem;

interface AdminSubModule {
  id: string | number;
  name: string;
  lessons: Lesson[];
  quizResponse?: any; // Quiz object if exists
}

const normalizeSubModules = (module: SystemModule): AdminSubModule[] => {
  const maybeSubModules = (module as any).subModules;

  if (Array.isArray(maybeSubModules) && maybeSubModules.length > 0) {
    // Submodules already have lessons nested inside
    return maybeSubModules.map((sm: any) => ({
      id: sm.id,
      name: sm.name || sm.title || 'Sub-module',
      lessons: Array.isArray(sm.lessons) ? sm.lessons : [],
      quizResponse: sm.quizResponse || null,
    }));
  }

  // Fallback to top-level lessons if no submodules exist
  const allLessons = Array.isArray((module as any).lessons) ? (module as any).lessons as Lesson[] : [];
  if (allLessons.length > 0) {
    return [{ id: 'all-lessons', name: 'Barcha darslar', lessons: allLessons, quizResponse: null }];
  }

  return [];
};

const AdminContentManager: React.FC<AdminContentManagerProps> = ({ module, onUpdateModule }) => {
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addMode, setAddMode] = useState<'SUB_MODULE' | 'LESSON' | 'QUIZ'>('LESSON');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: '', videoUrl: '', description: '',
  });
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [lessonSubModuleId, setLessonSubModuleId] = useState<string | number | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizCurrentQuestion, setQuizCurrentQuestion] = useState<Partial<Question>>({ text: '', options: ['', '', '', ''], correctAnswer: 0 });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalType, setExternalType] = useState<'VIDEO' | 'IMAGE' | 'OTHER'>('VIDEO');
  const [isUploading, setIsUploading] = useState(false);

  // ─── Existing media on the lesson being edited ───────────────────────────
  const [existingMedia, setExistingMedia] = useState<{ id: string; type: string; url: string }[]>([]);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [subModules, setSubModules] = useState<AdminSubModule[]>(normalizeSubModules(module));
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({});
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | number | null>(subModules[0]?.id ?? null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        // Fetch full module data from API
        const fullModule = await moduleService.getModuleById(module.id);
        const normalized = normalizeSubModules(fullModule);
        setSubModules(normalized);
        setCollapsed(normalized.reduce((acc, sub) => ({ ...acc, [sub.id]: true }), {} as Record<string | number, boolean>));
        setSelectedSubModuleId(normalized[0]?.id ?? null);
        setSelectedLesson(normalized[0]?.lessons?.[0] ?? null);
      } catch (err) {
        console.error('Failed to fetch module data:', err);
        // Fallback to normalizing the provided module if API fails
        const normalized = normalizeSubModules(module);
        setSubModules(normalized);
        setCollapsed(normalized.reduce((acc, sub) => ({ ...acc, [sub.id]: true }), {} as Record<string | number, boolean>));
        setSelectedSubModuleId(normalized[0]?.id ?? null);
        setSelectedLesson(normalized[0]?.lessons?.[0] ?? null);
      }
    };
    fetchModuleData();
  }, [module]);

  const resetForm = () => {
    setNewLesson({ title: '', videoUrl: '', description: '' });
    setNewSubModuleName('');
    setQuizTitle('');
    setQuizDescription('');
    setQuizQuestions([]);
    setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
    setMediaItems([]);
    setExternalUrl('');
    setExternalType('VIDEO');
    setEditingLessonId(null);
    setExistingMedia([]);
    setLessonSubModuleId(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newItems: InternalMediaItem[] = files.map(file => ({
      kind: 'internal', file, id: `internal-${Date.now()}-${Math.random()}`,
    }));
    setMediaItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleAddExternal = () => {
    if (!externalUrl.trim()) return;
    const item: ExternalMediaItem = {
      kind: 'external', url: externalUrl.trim(), type: externalType,
      id: `external-${Date.now()}`,
    };
    setMediaItems(prev => [...prev, item]);
    setExternalUrl('');
  };

  const handleRemoveMedia = (id: string) => setMediaItems(prev => prev.filter(m => m.id !== id));

  // ─── Delete existing media from server ───────────────────────────────────
  const handleDeleteExistingMedia = async (mediaId: string) => {
    if (!window.confirm("Bu media faylni o'chirishni istaysizmi?")) return;
    setDeletingMediaId(mediaId);
    try {
      await moduleService.deleteMedia(mediaId);
      setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch {
      alert("Media o'chirishda xatolik yuz berdi");
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleAddLesson = async () => {
    if (!newLesson.title) { alert('Dars sarlavhasi kiritilishi shart'); return; }
    if (!editingLessonId && !lessonSubModuleId) { 
      alert('Sub-modulni tanlasiniz'); 
      return; 
    }
    if (!editingLessonId && mediaItems.length === 0) {
      alert("Kamida bitta media (fayl yoki havola) qo'shilishi shart");
      return;
    }

    setIsUploading(true);
    try {
      if (editingLessonId) {
        // EDIT: Use PUT (JSON)
        await moduleService.updateLesson(editingLessonId, {
          title: newLesson.title!,
          description: newLesson.description || '',
        });
      } else {
        // ADD: Use POST (multipart/form-data)
        const internalFiles = mediaItems
          .filter((m): m is InternalMediaItem => m.kind === 'internal')
          .map(m => m.file);

        const externalMedia = mediaItems
          .filter((m): m is ExternalMediaItem => m.kind === 'external')
          .map(m => ({ externalUrl: m.url, type: m.type }));

        await moduleService.createLesson(
          newLesson.title!,
          newLesson.description || '',
          parseInt(module.id),
          lessonSubModuleId ? parseInt(String(lessonSubModuleId)) : undefined,
          internalFiles,
          externalMedia
        );
      }
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      resetForm();
      setIsAddPanelOpen(false);
      setAddMode('LESSON');
    } catch (error) {
      console.error('Darsni saqlashda xatolik:', error);
      alert('Darsni saqlashda xatolik yuz berdi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSubModule = async () => {
    if (!newSubModuleName.trim()) { alert('Sub-module nomi kiriting'); return; }
    try {
      if (editingLessonId && addMode === 'SUB_MODULE') {
        // EDIT mode
        await moduleService.updateSubModule(editingLessonId, { name: newSubModuleName.trim() });
      } else {
        // CREATE mode - using the correct signature
        await moduleService.createSubModule(newSubModuleName.trim(), parseInt(module.id, 10));
      }
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      resetForm();
      setIsAddPanelOpen(false);
      setAddMode('SUB_MODULE');
    } catch (err) {
      console.error('Sub-module saqlashda xatolik', err);
      alert('Sub-module saqlashda xatolik yuz berdi');
    }
  };

  const handleAddQuiz = async () => {
    if (!quizTitle.trim()) { alert('Quiz nomini kiriting'); return; }
    if (!lessonSubModuleId) { alert('Sub-module tanlanishi shart'); return; }
    if (quizQuestions.length === 0) { alert('Kamida bitta savol qo\'shilishi shart'); return; }

    try {
      // Prepare questions in the format the API expects
      const questionRequests = quizQuestions.map(q => ({
        text: q.text,
        options: q.options,
        correctAns: q.options[q.correctAnswer],
      }));

      // Create quiz with questions
      await quizService.createQuizWithQuestions(
        quizTitle.trim(),
        parseInt(String(lessonSubModuleId)),
        questionRequests
      );

      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      resetForm();
      setIsAddPanelOpen(false);
      setAddMode('LESSON');
      setQuizQuestions([]);
    } catch (err) {
      console.error('Quiz yaratishda xatolik', err);
      alert('Quiz yaratishda xatolik yuz berdi');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Darsni o'chirishni istaysizmi? Bu amal qaytarilmaydi.")) return;
    try {
      await moduleService.deleteLesson(lessonId);
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
    } catch {
      alert("Darsni o'chirishda xatolik yuz berdi");
    }
  };

  const handleDeleteSubModule = async (subModuleId: string | number) => {
    if (!window.confirm("Sub-modulni o'chirishni istaysizmi? Bu amal qaytarilmaydi.")) return;
    try {
      await moduleService.deleteSubModule(String(subModuleId));
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
    } catch {
      alert("Sub-modulni o'chirishda xatolik yuz berdi");
    }
  };

  const handleEditSubModule = (subModule: AdminSubModule) => {
    setNewSubModuleName(subModule.name);
    setEditingLessonId(String(subModule.id)); // Repurpose editingLessonId for subModuleId
    setIsAddPanelOpen(true);
    setAddMode('SUB_MODULE');
  };

  const handleAddQuizQuestion = () => {
    if (!quizCurrentQuestion.text || !quizCurrentQuestion.options?.every(o => o.trim())) {
      alert('Savol va barcha javob variantlarini to&#39;ldiring');
      return;
    }
    setQuizQuestions(prev => [...prev, {
      id: `q-${Date.now()}`,
      text: quizCurrentQuestion.text || '',
      options: quizCurrentQuestion.options as string[],
      correctAnswer: quizCurrentQuestion.correctAnswer || 0,
    }]);
    setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson(lesson);
    setMediaItems([]);
    // Populate existing media from the lesson
    setExistingMedia((lesson.media || []).map((m: any) => ({
      id: String(m.id),
      type: m.type,
      url: m.url,
    })));
    setIsAddPanelOpen(true);
    setAddMode('LESSON');
  };



  const fileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return 'fa-file-video text-blue-500';
    if (file.type.startsWith('image/')) return 'fa-file-image text-green-500';
    return 'fa-file text-slate-400';
  };

  const mediaTypeIcon = (type: string) => {
    if (type === 'VIDEO') return 'fa-film text-blue-500';
    if (type === 'IMAGE') return 'fa-image text-green-500';
    return 'fa-file-alt text-slate-400';
  };

  const buildMediaUrl = (url: string): string => {
    const token = localStorage.getItem('bepro_jwt');
    const fullUrl = API_BASE_URL + url;
    return token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;
  };

  const PreviewMediaRenderer: React.FC<{ media: MediaItem; title: string }> = ({ media, title }) => {
    if (media.kind === 'internal') {
      return (
        <div className="w-full h-full flex items-center justify-center text-white text-lg">
          Local file preview not available
        </div>
      );
    }

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
        <iframe
          key={String(media.id)}
          className="w-full h-full"
          src={media.url}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (media.type === 'IMAGE') {
      return (
        <img
          key={String(media.id)}
          className="w-full h-full object-contain"
          src={media.url}
          alt={title}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-white text-lg">
        Media mavjud emas
      </div>
    );
  };

  const currentSubModule = subModules.find((sub) => sub.id === selectedSubModuleId) || subModules[0] || null;
  const currentVisibleLessons = currentSubModule ? currentSubModule.lessons : [];

  const currentMediaList = selectedLesson ? [
    ...((Array.isArray((selectedLesson as any).media) ? (selectedLesson as any).media : []) as any[]).map((item) => ({ kind: 'external' as const, id: item.id || item.url, type: item.type, url: item.url })),
    ...(selectedLesson.videoUrl ? [{ kind: 'external' as const, id: `video-${selectedLesson.id}`, type: 'VIDEO' as const, url: selectedLesson.videoUrl }] : []),
  ] : [];

  const currentMedia = currentMediaList[0] || null;

  useEffect(() => {
    if (!currentSubModule) return;
    const visible = currentVisibleLessons;
    if (!visible.length) {
      setSelectedLesson(null);
      return;
    }
    if (!selectedLesson || !visible.some((lesson) => lesson.id === selectedLesson.id)) {
      setSelectedLesson(visible[0]);
      setSelectedSubModuleId(currentSubModule.id);
    }
  }, [currentSubModule, currentVisibleLessons]);

  const totalLessons = subModules.reduce((sum, sub) => sum + sub.lessons.length, 0);

  if (isPreviewMode) {
    return (
      <div className="space-y-6 animate-fadeIn pb-20">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-slate-800 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <i className="fas fa-eye text-lg"></i>
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Xodimlar Ko'rinishi</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Faqat darslar va media kontenti ko'rsatiladi</p>
            </div>
          </div>
          <button
            onClick={() => setIsPreviewMode(false)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600"
          >
            <i className="fas fa-arrow-left mr-2"></i> Orqaga
          </button>
        </div>

        <div className="grid lg:grid-cols-[1.7fr,0.9fr] gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {currentMedia ? (
                <PreviewMediaRenderer media={currentMedia} title={selectedLesson?.title ?? 'Media'} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                  <i className="fas fa-photo-film text-4xl"></i>
                  <span>Media yoki video mavjud emas</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{selectedLesson?.title || 'Tanlanmagan dars'}</h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{selectedLesson?.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {subModules.map((sub) => {
              const visibleLessons = sub.lessons;
              const isCollapsed = collapsed[String(sub.id)];

              return (
                <div key={String(sub.id)} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={() => {
                      const nextCollapsed = !collapsed[String(sub.id)];
                      setCollapsed((prev) => ({ ...prev, [sub.id]: nextCollapsed }));
                      if (!nextCollapsed && visibleLessons.length > 0) {
                        setSelectedSubModuleId(sub.id);
                        setSelectedLesson(visibleLessons[0]);
                      }
                    }}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-900 dark:hover:to-slate-800 transition-all bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <i className="fas fa-layer-group text-blue-600 dark:text-blue-400 text-sm"></i>
                        {sub.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <i className="fas fa-book text-xs mr-1"></i>
                        {visibleLessons.length} ta dars
                      </p>
                    </div>
                    <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-slate-500 transition-transform`} />
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2 p-4">
                      {visibleLessons.length > 0 ? visibleLessons.map((lesson: Lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setSelectedSubModuleId(sub.id);
                            setSelectedLesson(lesson);
                          }}
                          className={`w-full text-left rounded-xl px-4 py-3 transition-all border-2 flex items-center gap-3 ${selectedLesson?.id === lesson.id ? 'bg-blue-50 dark:bg-slate-950 border-blue-300 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selectedLesson?.id === lesson.id ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                            <i className="fas fa-book"></i>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate flex-1">{lesson.title}</span>
                        </button>
                      )) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-3">Bu sub-module uchun ko'rish uchun darslar mavjud emas.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Shared input class
  const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600';

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Modul tarkibini boshqarish</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Hozirgi darslar soni: {totalLessons} ta</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setIsAddPanelOpen(true); setAddMode('LESSON'); }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Yangi kontent
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
          >
            <i className="fas fa-eye"></i> Xodimlar ko'rinishi
          </button>
        </div>
      </div>

      {/* ─── Add / Edit form ─────────────────────────────────────────────── */}
      {isAddPanelOpen && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-blue-100 dark:border-blue-900/50 overflow-hidden animate-slideUp">
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h4 className="text-white font-bold flex items-center gap-2">
              <i className="fas fa-plus-circle"></i>
              {addMode === 'SUB_MODULE' && (editingLessonId ? 'Sub-modulni tahrirlash' : 'Yangi Sub-module')}
              {addMode === 'LESSON' && (editingLessonId ? 'Darsni tahrirlash' : 'Yangi dars formasi')}
              {addMode === 'QUIZ' && 'Yangi Quiz'}
            </h4>
            <button onClick={() => { setIsAddPanelOpen(false); setAddMode('LESSON'); resetForm(); }}
              className="text-white hover:text-slate-200">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setAddMode('SUB_MODULE')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${addMode === 'SUB_MODULE' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                Sub-module
              </button>
              <button
                onClick={() => setAddMode('LESSON')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${addMode === 'LESSON' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                Dars
              </button>
              <button
                onClick={() => setAddMode('QUIZ')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${addMode === 'QUIZ' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                Quiz
              </button>
            </div>

            {addMode === 'SUB_MODULE' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sub-module nomi *</label>
                  <input
                    type="text" value={newSubModuleName}
                    onChange={e => setNewSubModuleName(e.target.value)}
                    className={inputCls}
                    placeholder="Sub-module nomini kiriting"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setIsAddPanelOpen(false); resetForm(); }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">Bekor qilish</button>
                  <button onClick={handleAddSubModule}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
                    {editingLessonId ? "O'zgarishlarni saqlash" : 'Saqlash'}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'QUIZ' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quiz nomi *</label>
                  <input type="text" className={inputCls} placeholder="Quiz sarlavhasi" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quiz tavsifi</label>
                  <textarea className={inputCls} value={quizDescription} onChange={e => setQuizDescription(e.target.value)} rows={3} placeholder="Quiz tavsifi" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sub-module tanlang</label>
                  <select value={lessonSubModuleId ?? ''} onChange={e => setLessonSubModuleId(e.target.value)} className={inputCls}>
                    <option value="">Sub-module tanlang</option>
                    {module.subModules?.map(sm => (<option key={String(sm.id)} value={sm.id}>{sm.name}</option>))}
                  </select>
                </div>
                <div className="border p-4 rounded-xl space-y-3 bg-slate-50 dark:bg-slate-900">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Savol matni</label>
                    <input className={inputCls} value={quizCurrentQuestion.text} onChange={e => setQuizCurrentQuestion(prev => ({ ...prev, text: e.target.value }))} placeholder="Savol..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(quizCurrentQuestion.options || []).map((opt, idx) => (
                      <input key={idx} className={inputCls} value={opt} onChange={e => {
                        const next = [...(quizCurrentQuestion.options || [])]; next[idx] = e.target.value;
                        setQuizCurrentQuestion(prev => ({ ...prev, options: next }));
                      }} placeholder={`Variant ${idx + 1}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">To'g'ri javob:</span>
                    <select className={inputCls} value={quizCurrentQuestion.correctAnswer} onChange={e => setQuizCurrentQuestion(prev => ({ ...prev, correctAnswer: Number(e.target.value) }))}>
                      {(quizCurrentQuestion.options || []).map((_, idx) => (<option key={idx} value={idx}>Variant {String.fromCharCode(65 + idx)}</option>))}
                    </select>
                    <button onClick={handleAddQuizQuestion} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs">Savol qo'shish</button>
                  </div>
                </div>
                {quizQuestions.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Qo'shilgan savollar ({quizQuestions.length})</p>
                    <ul className="text-xs list-decimal ml-4 mt-2 space-y-1">
                      {quizQuestions.map((q, i) => <li key={i}>{q.text}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2 pb-2">
                  <button onClick={() => { setIsAddPanelOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">Bekor qilish</button>
                  <button onClick={handleAddQuiz} className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold">Quizni saqlash</button>
                </div>
              </div>
            )}

            {addMode === 'LESSON' && (
              <>

            {/* Title & Description & SubModule Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dars sarlavhasi *</label>
                <input
                  type="text" className={inputCls}
                  placeholder="Masalan: Tizim loglari bilan ishlash"
                  value={newLesson.title}
                  onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Qisqacha tavsif</label>
                <input
                  type="text" className={inputCls}
                  placeholder="Dars haqida qisqacha..."
                  value={newLesson.description}
                  onChange={e => setNewLesson({ ...newLesson, description: e.target.value })}
                />
              </div>
            </div>

            {/* SubModule Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sub-module tanlang *</label>
              <select 
                value={lessonSubModuleId ?? ''} 
                onChange={e => setLessonSubModuleId(e.target.value ? parseInt(e.target.value) : null)}
                className={inputCls}
              >
                <option value="">-- Sub-module tanlang --</option>
                {module.subModules?.map(sm => (
                  <option key={String(sm.id)} value={sm.id}>{sm.name}</option>
                ))}
              </select>
              {!lessonSubModuleId && !editingLessonId && (
                <p className="text-xs text-red-500 font-semibold">Sub-modulni tanlash shart!</p>
              )}
            </div>

            {/* ─── MEDIA SECTION ─────────────────────────────────────────── */}
            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                  <i className="fas fa-photo-film text-blue-600"></i>
                  Media fayllar
                  <span className="ml-1 text-xs font-normal text-slate-400">(bir nechta qo'shish mumkin)</span>
                </h5>
              </div>

              <div className="p-5 space-y-5">

                {/* ── Existing media (edit mode only) ────────────────────── */}
                {editingLessonId && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                      <i className="fas fa-database text-slate-400"></i>
                      Serverda saqlangan media
                      <span className="font-normal text-slate-400">({existingMedia.length} ta)</span>
                    </label>

                    {existingMedia.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Bu darsda hali media fayl yo'q
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {existingMedia.map((media, idx) => (
                          <div
                            key={media.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700"
                          >
                            <span className="text-slate-400 text-xs font-bold w-5 text-center">{idx + 1}</span>
                            <i className={`fas ${mediaTypeIcon(media.type)} text-lg w-5 text-center`}></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                                {media.url.length > 60 ? '...' + media.url.slice(-60) : media.url}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{media.type}</p>
                            </div>

                            {/* Preview thumbnail for images */}
                            {media.type === 'IMAGE' && (
                              <img
                                src={media.url}
                                alt="preview"
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}

                            <button
                              onClick={() => handleDeleteExistingMedia(media.id)}
                              disabled={deletingMediaId === media.id}
                              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                              title="O'chirish"
                            >
                              {deletingMediaId === media.id
                                ? <i className="fas fa-spinner fa-spin text-sm"></i>
                                : <i className="fas fa-trash-can text-sm"></i>
                              }
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">
                        Yangi media qo'shish
                      </p>
                    </div>
                  </div>
                )}

                {/* File upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Fayl yuklash (video, rasm)
                  </label>
                  <label
                    htmlFor="media-upload"
                    className="flex items-center justify-center gap-3 w-full px-4 py-4 bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-slate-500 dark:text-slate-400 text-sm"
                  >
                    <i className="fas fa-cloud-upload-alt text-xl text-blue-400"></i>
                    <span>Fayllarni tanlash yoki shu yerga tashlang</span>
                  </label>
                  <input
                    id="media-upload" type="file" className="hidden"
                    accept="video/*,image/*" multiple onChange={handleFileSelect}
                  />
                </div>

                {/* External URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Tashqi havola (YouTube, boshqa)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={externalType}
                      onChange={e => setExternalType(e.target.value as 'VIDEO' | 'IMAGE' | 'OTHER')}
                      className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
                    >
                      <option value="VIDEO">🎬 Video</option>
                      <option value="IMAGE">🖼️ Rasm</option>
                      <option value="OTHER">📄 Boshqa</option>
                    </select>
                    <input
                      type="text" className={`flex-1 ${inputCls}`}
                      placeholder="https://www.youtube.com/embed/..."
                      value={externalUrl}
                      onChange={e => setExternalUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddExternal()}
                    />
                    <button
                      onClick={handleAddExternal}
                      disabled={!externalUrl.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 transition-all"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                {/* Newly added media (not yet uploaded) */}
                {mediaItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Yangi qo'shilgan ({mediaItems.length} ta) — hali yuklanmagan
                    </p>
                    {mediaItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30"
                      >
                        <span className="text-slate-400 text-xs font-bold w-5 text-center">{idx + 1}</span>
                        {item.kind === 'internal' ? (
                          <>
                            <i className={`fas ${fileIcon(item.file)} text-lg w-5 text-center`}></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.file.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {(item.file.size / (1024 * 1024)).toFixed(1)} MB · Lokal fayl
                              </p>
                            </div>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                              UPLOAD
                            </span>
                          </>
                        ) : (
                          <>
                            <i className={`fas ${mediaTypeIcon(item.type)} text-lg w-5 text-center`}></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.url}</p>
                              <p className="text-[10px] text-slate-400">Tashqi havola · {item.type}</p>
                            </div>
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                              {item.type}
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveMedia(item.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors ml-1 shrink-0"
                          title="Ro'yxatdan olib tashlash"
                        >
                          <i className="fas fa-times-circle text-lg"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {mediaItems.length === 0 && !editingLessonId && (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Hali media qo'shilmagan
                  </p>
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleAddLesson}
                disabled={isUploading}
                className={`px-8 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 ${
                  isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isUploading
                  ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                  : <><i className="fas fa-save"></i> {editingLessonId ? "O'zgarishlarni saqlash" : 'Darsni saqlash'}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )}

      {/* ─── Sub-modules and Lessons List ────────────────────────────────── */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 px-1">Sub-modullar va Darslar</h4>
        {subModules.length > 0 ? (
          <div className="space-y-3">
            {subModules.map((subModule) => (
              <div key={String(subModule.id)} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Sub-module header */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-850 dark:to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                  <div className="flex-1">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <i className="fas fa-layer-group text-blue-600 dark:text-blue-400 text-sm"></i>
                      {subModule.name}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <i className="fas fa-book text-sm mr-1"></i>
                      {subModule.lessons.length} ta dars
                      {subModule.quizResponse && (
                        <span className="ml-2">
                          <i className="fas fa-tasks text-sm mr-1 text-amber-600 dark:text-amber-400"></i>
                          1 ta test
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEditSubModule(subModule)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm"
                      title="Tahrirlash"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteSubModule(subModule.id)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm"
                      title="O'chirish"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Sub-module lessons and quiz */}
                {subModule.lessons.length > 0 || subModule.quizResponse ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {/* Lessons */}
                    {subModule.lessons.length > 0 && (
                      <>
                        {subModule.lessons.map((lesson, idx) => (
                          <div key={lesson.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-all shrink-0">
                              <i className="fas fa-book text-xs"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{lesson.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {lesson.media?.length || 0} ta media
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEditLesson(lesson)}
                                className="w-7 h-7 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs"
                                title="Tahrirlash"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="w-7 h-7 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs"
                                title="O'chirish"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Quiz */}
                    {subModule.quizResponse && (
                      <div className="px-4 py-3 flex items-center gap-3 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/40 transition-all shrink-0">
                          <i className="fas fa-tasks text-xs"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-2">
                            {subModule.quizResponse.name}
                            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                              {subModule.quizResponse.questions?.length || 0} Q
                            </span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Test
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setQuizTitle(subModule.quizResponse.name);
                              setQuizQuestions(subModule.quizResponse.questions || []);
                              setAddMode('QUIZ');
                              setLessonSubModuleId(subModule.id);
                              setIsAddPanelOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs"
                            title="Tahrirlash"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${subModule.quizResponse.name}" testni o'chirmoqchimisiz?`)) {
                                console.log('Delete quiz:', subModule.quizResponse.id);
                              }
                            }}
                            className="w-7 h-7 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs"
                            title="O'chirish"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
                    Bu sub-modulda darslar yoki testlar mavjud emas
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            Hozircha sub-modullar mavjud emas
          </div>
        )}
      </div>

      {/* ─── Existing lessons list ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 px-1">Mavjud darslar</h4>
        {module.lessons.map((lesson, idx) => (
          <div
            key={lesson.id}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-all shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 truncate">{lesson.title}</h5>
              <p className="text-xs text-slate-400 mt-0.5">
                {lesson.media?.length || 0} ta media
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleEditLesson(lesson)}
                className="w-9 h-9 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                title="Tahrirlash"
              >
                <i className="fas fa-edit text-sm"></i>
              </button>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="w-9 h-9 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                title="O'chirish"
              >
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>
          </div>
        ))}
        {module.lessons.length === 0 && (
          <div className="py-10 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            Hozircha darslar mavjud emas
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContentManager;
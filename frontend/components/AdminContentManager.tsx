import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SystemModule, Lesson, Question } from '../types';
import { moduleService } from '../services/moduleService';
import { quizService } from '../services/quizService';
import { API_BASE_URL } from '../services/config';
import QuizSolver from './QuizSolver';

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
  const [quizTab, setQuizTab] = useState<'BASIC' | 'QUESTIONS'>('BASIC');
  const [quizHasTimeLimit, setQuizHasTimeLimit] = useState(false);
  const [quizTimeLimitInMinutes, setQuizTimeLimitInMinutes] = useState<number>(30);
  const [quizHasPassingScore, setQuizHasPassingScore] = useState(false);
  const [quizPassingScore, setQuizPassingScore] = useState<number>(85);
  const [editingQuizQuestionIndex, setEditingQuizQuestionIndex] = useState<number | 'new' | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<number | string | null>(null);

  const [lessonTab, setLessonTab] = useState<'BASIC' | 'MEDIA'>('BASIC');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
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
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);

  // --- Modal Delete State ---
  const [itemToDelete, setItemToDelete] = useState<{ id: string | number; type: 'SUB_MODULE' | 'LESSON' | 'QUIZ' | 'QUESTION' | 'MEDIA'; name: string, quizSubModuleId?: string | number, extraId?: string | number } | null>(null);

  // --- Quiz Questions Modal States ---
  const [managingQuiz, setManagingQuiz] = useState<{ quiz: any, subModuleId: string | number } | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | number | 'new' | null>(null);
  const [questionForm, setQuestionForm] = useState<{ text: string; options: string[]; correctAnswer: number }>({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const closeTopModal = () => {
    if (managingQuiz) {
      setManagingQuiz(null);
      setEditingQuestionId(null);
      return;
    }

    if (itemToDelete) {
      setItemToDelete(null);
      return;
    }

    if (isAddPanelOpen) {
      setIsAddPanelOpen(false);
      resetForm();
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTopModal();
      }
    };
    if (isAddPanelOpen || itemToDelete || managingQuiz) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
    return undefined;
  }, [isAddPanelOpen, itemToDelete, managingQuiz]);

  useEffect(() => {
    if (isAddPanelOpen || itemToDelete || managingQuiz) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddPanelOpen, itemToDelete, managingQuiz]);

  const handleSaveQuestion = async (subModuleId: number, quizId: number | string) => {
    if (!questionForm.text.trim()) {
      alert("Savol matnini kiriting!");
      return;
    }
    if (questionForm.options.some(opt => !opt.trim())) {
      alert("Barcha variantlarni kiriting!");
      return;
    }
    
    try {
      setIsSavingQuestion(true);
      const correctAnsStr = questionForm.options[questionForm.correctAnswer];
      if (editingQuestionId === 'new') {
        await quizService.createQuestion(quizId, questionForm.text, questionForm.options, correctAnsStr, subModuleId);
      } else if (editingQuestionId) {
        await quizService.updateQuestion(quizId, Number(editingQuestionId), questionForm.text, questionForm.options, correctAnsStr, subModuleId);
      }
      
      const fullModule = await moduleService.getModuleById(module.id);
      const normalized = normalizeSubModules(fullModule);
      setSubModules(normalized);
      const freshSub = normalized.find(s => s.id === subModuleId);
      if (freshSub && freshSub.quizResponse) {
        setManagingQuiz({ quiz: freshSub.quizResponse, subModuleId });
      }
      setEditingQuestionId(null);
    } catch (err) {
      console.error('Failed to save question:', err);
      alert("Savolni saqlashda xatolik yuz berdi");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = (qId: number, quizId: number | string, subModuleId: number | string) => {
    setItemToDelete({ id: qId, type: 'QUESTION', name: 'Savol', extraId: quizId, quizSubModuleId: subModuleId });
  };

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
    setQuizTab('BASIC');
    setQuizHasTimeLimit(false);
    setQuizTimeLimitInMinutes(30);
    setQuizHasPassingScore(false);
    setQuizPassingScore(85);
    setEditingQuizQuestionIndex(null);
    setEditingQuizId(null);
    setExternalUrl('');
    setExternalType('VIDEO');
    setEditingLessonId(null);
    setExistingMedia([]);
    setLessonSubModuleId(null);
    setLessonTab('BASIC');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!editingLessonId || files.length === 0) return;
    
    setIsUploadingMedia(true);
    try {
      for (const file of files) {
        const uploaded = await moduleService.uploadMedia(editingLessonId, file);
        setExistingMedia(prev => [...prev, { id: String(uploaded.id), type: uploaded.type, url: uploaded.url }]);
      }
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
    } catch (err) {
      console.error("File upload error:", err);
      alert("Fayllarni yuklashda xatolik yuz berdi");
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleAddExternal = async () => {
    if (!externalUrl.trim() || !editingLessonId) return;
    
    setIsUploadingMedia(true);
    try {
      const added = await moduleService.addExternalMedia(editingLessonId, externalUrl.trim(), externalType);
      setExistingMedia(prev => [...prev, { id: String(added.id), type: added.type, url: added.url }]);
      
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      setExternalUrl('');
    } catch (err) {
      console.error("External media error:", err);
      alert("Havolani qo'shishda xatolik yuz berdi");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // ─── Delete existing media from server ───────────────────────────────────
  const handleDeleteExistingMedia = (mediaId: string) => {
    setItemToDelete({ id: mediaId, type: 'MEDIA', name: 'Media fayl' });
  };

  const handleAddLesson = async () => {
    if (!newLesson.title) { alert('Dars sarlavhasi kiritilishi shart'); return; }
    if (!editingLessonId && !lessonSubModuleId) { 
      alert('Sub-modulni tanlang'); 
      return; 
    }

    setIsUploading(true);
    try {
      if (editingLessonId) {
        // EDIT: Update metadata
        await moduleService.updateLesson(editingLessonId, {
          title: newLesson.title!,
          description: newLesson.description || '',
        });
        
        const updatedModule = await moduleService.getModuleById(module.id);
        onUpdateModule(updatedModule);
        resetForm();
        setIsAddPanelOpen(false);
        setAddMode('LESSON');
      } else {
        // CREATE: Only save metadata first, switch to MEDIA tab on success
        const created = await moduleService.createLesson(
          newLesson.title!,
          newLesson.description || '',
          parseInt(module.id),
          lessonSubModuleId ? parseInt(String(lessonSubModuleId)) : undefined,
          [], // No files upfront
          []
        );
        
        const updatedModule = await moduleService.getModuleById(module.id);
        onUpdateModule(updatedModule);
        
        // Transition to media upload state automatically
        setEditingLessonId(String(created.id));
        setLessonTab('MEDIA');
      }
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

    try {
      if (editingQuizId) {
        await quizService.updateQuiz(
          editingQuizId,
          quizTitle.trim(),
          quizHasTimeLimit ? quizTimeLimitInMinutes : null,
          quizHasPassingScore ? quizPassingScore : null
        );
      } else {
        if (quizQuestions.length === 0) { alert('Kamida bitta savol qo\'shilishi shart'); return; }
        const questionRequests = quizQuestions.map(q => ({
          text: q.text,
          options: q.options,
          correctAns: q.options[q.correctAnswer],
        }));

        await quizService.createQuizWithQuestions(
          quizTitle.trim(),
          parseInt(String(lessonSubModuleId)),
          questionRequests,
          quizHasTimeLimit ? quizTimeLimitInMinutes : null,
          quizHasPassingScore ? quizPassingScore : null
        );
      }

      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
      resetForm();
      setIsAddPanelOpen(false);
      setAddMode('LESSON');
      setQuizQuestions([]);
    } catch (err) {
      console.error('Quiz saqlashda xatolik', err);
      alert('Quiz saqlashda xatolik yuz berdi');
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'LESSON') {
        await moduleService.deleteLesson(String(itemToDelete.id));
        const updatedModule = await moduleService.getModuleById(module.id);
        onUpdateModule(updatedModule);
      } else if (itemToDelete.type === 'SUB_MODULE') {
        await moduleService.deleteSubModule(String(itemToDelete.id));
        const updatedModule = await moduleService.getModuleById(module.id);
        onUpdateModule(updatedModule);
      } else if (itemToDelete.type === 'QUIZ') {
        console.log('Delete quiz API needed:', itemToDelete.id);
        const updatedModule = await moduleService.getModuleById(module.id);
        onUpdateModule(updatedModule);
      } else if (itemToDelete.type === 'QUESTION') {
        await quizService.deleteQuestion(itemToDelete.extraId as string | number, itemToDelete.id as number);
        const fullModule = await moduleService.getModuleById(module.id);
        const normalized = normalizeSubModules(fullModule);
        setSubModules(normalized);
        const freshSub = normalized.find(s => s.id === itemToDelete.quizSubModuleId);
        if (freshSub && freshSub.quizResponse) {
          setManagingQuiz({ quiz: freshSub.quizResponse, subModuleId: itemToDelete.quizSubModuleId as string | number });
        }
      } else if (itemToDelete.type === 'MEDIA') {
        setDeletingMediaId(String(itemToDelete.id));
        await moduleService.deleteMedia(String(itemToDelete.id));
        setExistingMedia(prev => prev.filter(m => m.id !== String(itemToDelete.id)));
        setDeletingMediaId(null);
      }
    } catch {
      alert("O'chirishda xatolik yuz berdi");
      setDeletingMediaId(null);
    } finally {
      setItemToDelete(null);
    }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setItemToDelete({ id: lesson.id, type: 'LESSON', name: lesson.title });
  };

  const handleDeleteSubModule = (subModule: AdminSubModule) => {
    setItemToDelete({ id: subModule.id, type: 'SUB_MODULE', name: subModule.name });
  };

  const handleDeleteQuiz = (quiz: any, subModuleId: string | number) => {
    setItemToDelete({ id: quiz.id, type: 'QUIZ', name: quiz.name, quizSubModuleId: subModuleId });
  };

  const handleEditSubModule = (subModule: AdminSubModule) => {
    setNewSubModuleName(subModule.name);
    setEditingLessonId(String(subModule.id)); // Repurpose editingLessonId for subModuleId
    setIsAddPanelOpen(true);
    setAddMode('SUB_MODULE');
  };

  const handleAddQuizQuestion = () => {
    if (!quizCurrentQuestion.text || !quizCurrentQuestion.options?.every(o => o.trim())) {
      alert('Savol va barcha javob variantlarini to\'ldiring');
      return;
    }

    if (typeof editingQuizQuestionIndex === 'number') {
      setQuizQuestions(prev => {
        const next = [...prev];
        next[editingQuizQuestionIndex] = {
          ...next[editingQuizQuestionIndex],
          text: quizCurrentQuestion.text || '',
          options: quizCurrentQuestion.options as string[],
          correctAnswer: quizCurrentQuestion.correctAnswer || 0,
        };
        return next;
      });
      setEditingQuizQuestionIndex(null);
    } else {
      setQuizQuestions(prev => [...prev, {
        id: `q-${Date.now()}`,
        text: quizCurrentQuestion.text || '',
        options: quizCurrentQuestion.options as string[],
        correctAnswer: quizCurrentQuestion.correctAnswer || 0,
      }]);
    }
    setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
  };

  const handleEditQuizQuestion = (idx: number) => {
    setEditingQuizQuestionIndex(idx);
    setQuizCurrentQuestion(quizQuestions[idx]);
  };

  const handleDeleteQuizQuestionLocally = (idx: number) => {
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
    if (editingQuizQuestionIndex === idx) {
      setEditingQuizQuestionIndex(null);
      setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson(lesson);
    setLessonTab('BASIC');
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
    if (file.type.startsWith('video/')) return 'fa-file-video text-orange-500';
    if (file.type.startsWith('image/')) return 'fa-file-image text-green-500';
    return 'fa-file text-slate-400';
  };

  const mediaTypeIcon = (type: string) => {
    if (type === 'VIDEO') return 'fa-film text-orange-500';
    if (type === 'IMAGE') return 'fa-image text-green-500';
    return 'fa-file-alt text-slate-400';
  };

  const buildMediaUrl = (url: string): string => {
    const token = localStorage.getItem('bepro_jwt');
    const fullUrl = API_BASE_URL + url;
    return token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;
  };

  const renderMedia = (media: MediaItem, title: string) => {
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

  const currentMediaList = (() => {
    if (!selectedLesson) return [];
    const list: any[] = [];
    const addedUrls = new Set<string>();
    const mediaArray = Array.isArray((selectedLesson as any).media) ? (selectedLesson as any).media : [];
    for (const item of mediaArray) {
      if (item?.url && !addedUrls.has(item.url)) {
        addedUrls.add(item.url);
        list.push({ kind: 'external' as const, id: item.id || item.url, type: item.type, url: item.url });
      }
    }
    if (selectedLesson.videoUrl && !addedUrls.has(selectedLesson.videoUrl)) {
      addedUrls.add(selectedLesson.videoUrl);
      list.push({ kind: 'external' as const, id: `video-${selectedLesson.id}`, type: 'VIDEO' as const, url: selectedLesson.videoUrl });
    }
    return list;
  })();

  const currentMedia = currentMediaList[0] || null;

  useEffect(() => {
    if (!currentSubModule) return;
    const visible = currentVisibleLessons;
    
    const hasValidLesson = selectedLesson && visible.some((lesson) => lesson.id === selectedLesson.id);
    const hasValidQuiz = selectedQuiz && currentSubModule.quizResponse?.id === selectedQuiz.id;
    
    if (!hasValidLesson && !hasValidQuiz) {
      if (visible.length > 0) {
        setSelectedLesson(visible[0]);
        setSelectedQuiz(null);
      } else if (currentSubModule.quizResponse) {
        setSelectedQuiz(currentSubModule.quizResponse);
        setSelectedLesson(null);
      } else {
        setSelectedLesson(null);
        setSelectedQuiz(null);
      }
      setSelectedSubModuleId(currentSubModule.id);
    }
  }, [currentSubModule, currentVisibleLessons, selectedLesson, selectedQuiz]);

  const totalLessons = subModules.reduce((sum, sub) => sum + sub.lessons.length, 0);

  if (isPreviewMode) {
    return (
      <div className="space-y-6 animate-fadeIn pb-20">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-slate-800 p-5 rounded-2xl border-2 border-orange-200 dark:border-orange-800 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <i className="fas fa-eye text-lg"></i>
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Ko'rib chiqish (Preview)</p>
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
            {selectedQuiz ? (
              <QuizSolver quiz={selectedQuiz} />
            ) : (
              <>
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  {currentMedia ? (
                    renderMedia(currentMedia, selectedLesson?.title ?? 'Media')
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
              </>
            )}
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
                    }}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-900 dark:hover:to-slate-800 transition-all bg-gradient-to-r from-slate-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <i className="fas fa-layer-group text-orange-600 dark:text-orange-400 text-sm"></i>
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
                          className={`w-full text-left rounded-xl px-4 py-3 transition-all border-2 flex items-center gap-3 ${selectedLesson?.id === lesson.id ? 'bg-orange-50 dark:bg-slate-950 border-orange-300 dark:border-orange-700' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selectedLesson?.id === lesson.id ? 'bg-orange-600 text-white' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                            <i className="fas fa-book"></i>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate flex-1">{lesson.title}</span>
                        </button>
                      )) : !sub.quizResponse && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-3">Bu sub-module uchun ko'rish uchun darslar mavjud emas.</p>
                      )}
                      {sub.quizResponse && (
                        <button className="w-full text-left rounded-xl px-4 py-3 transition-all border-2 border-amber-200 dark:border-amber-900/30 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 hover:border-amber-300 dark:hover:border-amber-700 mt-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                            <i className="fas fa-tasks"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate block">{sub.quizResponse.name}</span>
                            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded inline-block mt-0.5">
                              {sub.quizResponse.questions?.length || 0} Q
                            </span>
                          </div>
                        </button>
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
  const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600';

  return (
    <>
      <div className="space-y-6 animate-fadeIn pb-20">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Modul tarkibini boshqarish</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Hozirgi darslar soni: {totalLessons} ta</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setIsAddPanelOpen(true); setAddMode('SUB_MODULE'); }}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition-all flex items-center gap-2"
          >
            <i className="fas fa-layer-group"></i> Yangi sub-modul
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
          >
            <i className="fas fa-eye"></i> Ko'rib chiqish (Preview)
          </button>
        </div>
      </div>

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────── */}
      {isAddPanelOpen && createPortal(
        <div onClick={closeTopModal} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] m-auto">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0">
              <h4 className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                {addMode === 'SUB_MODULE' && (
                  <><i className="fas fa-layer-group text-orange-500"></i> {editingLessonId ? 'Sub-modulni tahrirlash' : 'Yangi Sub-module'}</>
                )}
                {addMode === 'LESSON' && (
                  <><i className="fas fa-book text-orange-500"></i> {editingLessonId ? 'Darsni tahrirlash' : 'Yangi dars formasi'}</>
                )}
                {addMode === 'QUIZ' && (
                  <><i className="fas fa-tasks text-orange-500"></i> Yangi Quiz</>
                )}
              </h4>
              <button onClick={() => { setIsAddPanelOpen(false); setAddMode('LESSON'); resetForm(); }}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">

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
                  <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => { setIsAddPanelOpen(false); resetForm(); }}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">Bekor qilish</button>
                    <button onClick={handleAddSubModule}
                      className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-md shadow-orange-500/20">
                      {editingLessonId ? "O'zgarishlarni saqlash" : 'Saqlash'}
                    </button>
                  </div>
                </div>
              )}

              {addMode === 'QUIZ' && (
                <div className="space-y-6">
                  {/* Tabs Header */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <button
                      onClick={() => setQuizTab('BASIC')}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                        quizTab === 'BASIC'
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <i className="fas fa-info-circle mr-2"></i> Asosiy Ma'lumotlar
                    </button>
                    <button
                      onClick={() => setQuizTab('QUESTIONS')}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        quizTab === 'QUESTIONS'
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <i className="fas fa-list-ul"></i> Savollar
                    </button>
                  </div>

                  {quizTab === 'BASIC' && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quiz nomi *</label>
                          <input type="text" className={inputCls} placeholder="Quiz sarlavhasi" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sub-module</label>
                          <div className={`${inputCls} bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-80 flex items-center gap-2`}>
                            <i className="fas fa-layer-group text-slate-400"></i>
                            {module.subModules?.find(sm => String(sm.id) === String(lessonSubModuleId))?.name || 'Tanlanmagan'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Quiz sozlamalari</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Time Limit Block */}
                          <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${quizHasTimeLimit ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-900/10 shadow-md shadow-orange-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-orange-300 dark:hover:border-slate-600'}`}>
                            {quizHasTimeLimit && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full pointer-events-none"></div>}
                            <div className="p-5">
                              <label className="flex items-start gap-4 cursor-pointer w-full">
                                <div className="mt-1 relative flex items-center justify-center">
                                  <input type="checkbox" checked={quizHasTimeLimit} onChange={e => setQuizHasTimeLimit(e.target.checked)} className="peer sr-only" />
                                  <div className="w-5 h-5 border-2 rounded transition-all duration-200 peer-checked:bg-orange-600 peer-checked:border-orange-600 border-slate-300 dark:border-slate-600"></div>
                                  <i className="fas fa-check absolute text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${quizHasTimeLimit ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                      <i className="fas fa-stopwatch text-sm"></i>
                                    </div>
                                    <span className={`font-bold text-sm transition-colors ${quizHasTimeLimit ? 'text-orange-900 dark:text-orange-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                      Vaqt chegarasi
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Foydalanuvchi quizni ishlash uchun belgilangan vaqtga ega bo'ladi.
                                  </p>
                                </div>
                              </label>
                              
                              <div className={`mt-4 pl-[3.25rem] transition-all duration-300 overflow-hidden ${quizHasTimeLimit ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-24">
                                    <input type="number" min="1" className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/50 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none text-slate-900 dark:text-slate-100 font-bold text-center shadow-sm`} value={quizTimeLimitInMinutes} onChange={e => setQuizTimeLimitInMinutes(Number(e.target.value))} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">daqiqa</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Passing Score Block */}
                          <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${quizHasPassingScore ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10 shadow-md shadow-green-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-green-300 dark:hover:border-slate-600'}`}>
                            {quizHasPassingScore && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full pointer-events-none"></div>}
                            <div className="p-5">
                              <label className="flex items-start gap-4 cursor-pointer w-full">
                                <div className="mt-1 relative flex items-center justify-center">
                                  <input type="checkbox" checked={quizHasPassingScore} onChange={e => setQuizHasPassingScore(e.target.checked)} className="peer sr-only" />
                                  <div className="w-5 h-5 border-2 rounded transition-all duration-200 peer-checked:bg-green-600 peer-checked:border-green-600 border-slate-300 dark:border-slate-600"></div>
                                  <i className="fas fa-check absolute text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${quizHasPassingScore ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                      <i className="fas fa-award text-sm"></i>
                                    </div>
                                    <span className={`font-bold text-sm transition-colors ${quizHasPassingScore ? 'text-green-900 dark:text-green-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                      O'tish balli
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Quizdan muvaffaqiyatli o'tish uchun talab qilinadigan minimal foiz.
                                  </p>
                                </div>
                              </label>
                              
                              <div className={`mt-4 pl-[3.25rem] transition-all duration-300 overflow-hidden ${quizHasPassingScore ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-24">
                                    <input type="number" min="1" max="100" className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800/50 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-slate-900 dark:text-slate-100 font-bold text-center shadow-sm`} value={quizPassingScore} onChange={e => setQuizPassingScore(Number(e.target.value))} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {quizTab === 'QUESTIONS' && (
                    <div className="space-y-4 animate-fadeIn">
                      {editingQuizId ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 text-center">
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-list-check text-2xl"></i>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Savollarni tahrirlash</h4>
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">
                            Ushbu quiz allaqachon yaratilgan. Savollarni tahrirlash uchun quyidagi tugmani bosing. O'zgarishlar darhol saqlanadi.
                          </p>
                          <button
                            onClick={(e) => {
                               e.preventDefault();
                               const activeSub = subModules.find(sm => String(sm.id) === String(lessonSubModuleId));
                               if (activeSub && activeSub.quizResponse) {
                                 setManagingQuiz({ quiz: activeSub.quizResponse, subModuleId: activeSub.id });
                               }
                            }}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mx-auto"
                          >
                            <i className="fas fa-external-link-alt"></i> Savollarni ochish
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pb-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Savollar jadvali ({quizQuestions.length})</h4>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setEditingQuizQuestionIndex('new');
                                setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
                              }}
                              className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-plus"></i> Yangi savol
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/30 relative">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                  <th className="px-4 py-4 w-12 text-center">#</th>
                                  <th className="px-4 py-4 min-w-[250px] w-1/2">Savol matni</th>
                                  <th className="px-4 py-4 min-w-[250px] w-1/2">Variantlar</th>
                                  <th className="px-4 py-4 w-28 text-center">Amallar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {/* New question form */}
                                {editingQuizQuestionIndex === 'new' && (
                                  <tr className="bg-orange-50/50 dark:bg-orange-900/10 relative z-0">
                                    <td className="px-4 py-4 text-center text-orange-600 font-bold">*</td>
                                    <td className="px-4 py-4 whitespace-normal align-top">
                                      <textarea rows={4} placeholder="Savolni kiriting..." className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-shadow text-slate-900 dark:text-slate-100" value={quizCurrentQuestion.text} onChange={e => setQuizCurrentQuestion(p => ({ ...p, text: e.target.value }))} />
                                    </td>
                                    <td className="px-4 py-4 whitespace-normal align-top">
                                      <div className="grid grid-cols-1 gap-2 w-full">
                                        {(quizCurrentQuestion.options || ['', '', '', '']).map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center gap-2">
                                            <input type="radio" name="new-question-correct" checked={quizCurrentQuestion.correctAnswer === oIdx} onChange={() => setQuizCurrentQuestion(p => ({ ...p, correctAnswer: oIdx }))} className="accent-orange-600 w-4 h-4 cursor-pointer shrink-0" title="To'g'ri javobni belgilash" />
                                            <input type="text" placeholder={`Variant ${String.fromCharCode(65 + oIdx)}`} className={`flex-1 text-sm px-3 py-2 rounded-xl border ${quizCurrentQuestion.correctAnswer === oIdx ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 font-medium' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'} outline-none focus:border-orange-500 transition-colors`} value={opt} onChange={e => {
                                              const newOpts = [...(quizCurrentQuestion.options || ['', '', '', ''])];
                                              newOpts[oIdx] = e.target.value;
                                              setQuizCurrentQuestion(p => ({ ...p, options: newOpts }));
                                            }} />
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      <div className="flex gap-2 justify-center">
                                        <button onClick={(e) => { e.preventDefault(); handleAddQuizQuestion(); }} className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-all" title="Qo'shish">
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); setEditingQuizQuestionIndex(null); setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 }); }} className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm transition-all" title="Bekor qilish">
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}

                                {/* Existing questions */}
                                {quizQuestions.length > 0 ? quizQuestions.map((q, qIdx) => {
                                  if (editingQuizQuestionIndex === qIdx) {
                                    return (
                                      <tr key={qIdx} className="bg-orange-50/50 dark:bg-orange-900/10 relative z-0">
                                        <td className="px-4 py-4 text-center text-orange-600 font-bold">✎</td>
                                        <td className="px-4 py-4 whitespace-normal align-top">
                                          <textarea rows={4} placeholder="Savolni kiriting..." className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-shadow text-slate-900 dark:text-slate-100" value={quizCurrentQuestion.text} onChange={e => setQuizCurrentQuestion(p => ({ ...p, text: e.target.value }))} />
                                        </td>
                                        <td className="px-4 py-4 whitespace-normal align-top">
                                          <div className="grid grid-cols-1 gap-2 w-full">
                                            {(quizCurrentQuestion.options || ['', '', '', '']).map((opt, oIdx) => (
                                              <div key={oIdx} className="flex items-center gap-2">
                                                <input type="radio" name={`edit-question-correct-${qIdx}`} checked={quizCurrentQuestion.correctAnswer === oIdx} onChange={() => setQuizCurrentQuestion(p => ({ ...p, correctAnswer: oIdx }))} className="accent-orange-600 w-4 h-4 cursor-pointer shrink-0" title="To'g'ri javobni belgilash" />
                                                <input type="text" placeholder={`Variant ${String.fromCharCode(65 + oIdx)}`} className={`flex-1 text-sm px-3 py-2 rounded-xl border ${quizCurrentQuestion.correctAnswer === oIdx ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 font-medium' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'} outline-none focus:border-orange-500 transition-colors`} value={opt} onChange={e => {
                                                  const newOpts = [...(quizCurrentQuestion.options || ['', '', '', ''])];
                                                  newOpts[oIdx] = e.target.value;
                                                  setQuizCurrentQuestion(p => ({ ...p, options: newOpts }));
                                                }} />
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          <div className="flex gap-2 justify-center">
                                            <button onClick={(e) => { e.preventDefault(); handleAddQuizQuestion(); }} className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-all" title="Saqlash">
                                              <i className="fas fa-check"></i>
                                            </button>
                                            <button onClick={(e) => { e.preventDefault(); setEditingQuizQuestionIndex(null); setQuizCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 }); }} className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm transition-all" title="Bekor qilish">
                                              <i className="fas fa-times"></i>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={qIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="px-4 py-4 text-center text-slate-500 font-bold align-top">{qIdx + 1}</td>
                                      <td className="px-4 py-4 text-slate-800 dark:text-slate-200 whitespace-normal align-top leading-relaxed text-sm font-medium">
                                        {q.text}
                                      </td>
                                      <td className="px-4 py-4 whitespace-normal align-top">
                                        <ul className="text-sm space-y-1.5 w-full">
                                          {q.options.map((opt, oIdx) => {
                                            const isCorrect = oIdx === q.correctAnswer;
                                            return (
                                              <li key={oIdx} className={`px-3 py-2 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 font-bold shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400'}`}>
                                                <span className="w-5 inline-block font-bold opacity-70">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </td>
                                      <td className="px-4 py-4 align-top">
                                        <div className="flex gap-2 justify-center">
                                          <button 
                                            onClick={(e) => { e.preventDefault(); handleEditQuizQuestion(qIdx); }}
                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all flex items-center justify-center"
                                            title="Tahrirlash"
                                          >
                                            <i className="fas fa-edit"></i>
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteQuizQuestionLocally(qIdx)}
                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center"
                                            title="O'chirish"
                                          >
                                            <i className="fas fa-trash"></i>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }) : (
                                  editingQuizQuestionIndex !== 'new' && (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        Hali savollar qo'shilmagan
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                    <button onClick={() => { setIsAddPanelOpen(false); resetForm(); }} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">Bekor qilish</button>
                    <button onClick={handleAddQuiz} className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors shadow-md shadow-green-500/20 flex items-center gap-2">
                      <i className="fas fa-save"></i> Quizni saqlash
                    </button>
                  </div>
                </div>
              )}

              {addMode === 'LESSON' && (
                <div className="space-y-6">
                  {/* Tabs Header */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <button
                      onClick={() => setLessonTab('BASIC')}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                        lessonTab === 'BASIC'
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <i className="fas fa-info-circle mr-2"></i> Asosiy Ma'lumotlar
                    </button>
                    <button
                      onClick={() => setLessonTab('MEDIA')}
                      disabled={!editingLessonId}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        lessonTab === 'MEDIA'
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      } ${!editingLessonId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={!editingLessonId ? "Media yuklash uchun avval darsni saqlang" : ""}
                    >
                      <i className="fas fa-photo-film"></i> Media Fayllar
                      {!editingLessonId && <i className="fas fa-lock text-xs ml-1"></i>}
                    </button>
                  </div>

                  {/* Tab Content: BASIC INFO */}
                  {lessonTab === 'BASIC' && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sub-module</label>
                          <div className={`${inputCls} bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-80 flex items-center gap-2`}>
                            <i className="fas fa-layer-group text-slate-400"></i>
                            {module.subModules?.find(sm => String(sm.id) === String(lessonSubModuleId))?.name || 'Tanlanmagan'}
                          </div>
                          {!lessonSubModuleId && !editingLessonId && (
                            <p className="text-xs text-red-500 font-medium">Sub-modul topilmadi!</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Qisqacha tavsif</label>
                        <textarea
                          className={inputCls}
                          rows={3}
                          placeholder="Dars haqida qisqacha ma'lumot..."
                          value={newLesson.description}
                          onChange={e => setNewLesson({ ...newLesson, description: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab Content: MEDIA */}
                  {lessonTab === 'MEDIA' && editingLessonId && (
                    <div className="animate-fadeIn space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                        {/* Left Column: Actions (Upload & Link) */}
                        <div className="space-y-6">
                          {/* File upload Container */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                              <i className="fas fa-cloud-upload-alt text-orange-500"></i> Fayl yuklash (Video, Rasm)
                            </label>
                            <label
                              htmlFor="media-upload"
                              className="flex flex-col items-center justify-center gap-3 w-full p-8 bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-600 transition-all text-slate-500 dark:text-slate-400 group relative overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="w-14 h-14 bg-white dark:bg-slate-800 text-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700 z-10">
                                <i className="fas fa-plus text-xl"></i>
                              </div>
                              <div className="text-center z-10">
                                <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm mb-1">Kompyuterdan tanlash</span>
                                <span className="text-xs text-slate-400">Yoki faylni shu yerga tashlang</span>
                              </div>
                            </label>
                            <input
                              id="media-upload" type="file" className="hidden"
                              accept="video/*,image/*" multiple onChange={handleFileSelect}
                            />
                            {/* Uploading State inside container */}
                            {isUploadingMedia && (
                              <div className="flex items-center justify-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400 gap-3 border border-orange-100 dark:border-orange-800 mt-3">
                                <i className="fas fa-circle-notch fa-spin text-lg"></i>
                                <span className="font-bold text-xs">Media yuklanmoqda...</span>
                              </div>
                            )}
                          </div>

                          {/* External URL Container */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                              <i className="fas fa-link text-blue-500"></i> Tashqi havola (YouTube)
                            </label>
                            <div className="flex flex-col gap-3">
                              <div className="flex gap-2">
                                <select
                                  value={externalType}
                                  onChange={e => setExternalType(e.target.value as 'VIDEO' | 'IMAGE' | 'OTHER')}
                                  className="w-[110px] px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-300 font-medium"
                                >
                                  <option value="VIDEO">🎬 Video</option>
                                  <option value="IMAGE">🖼️ Rasm</option>
                                  <option value="OTHER">📄 Boshq</option>
                                </select>
                                <input
                                  type="text" className={`flex-1 ${inputCls}`}
                                  placeholder="https://youtube.com/..."
                                  value={externalUrl}
                                  onChange={e => setExternalUrl(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddExternal()}
                                />
                              </div>
                              <button
                                onClick={handleAddExternal}
                                disabled={!externalUrl.trim()}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                              >
                                Havolani ulash <i className="fas fa-arrow-right text-xs"></i>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Saved Media */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[400px]">
                          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                              <i className="fas fa-database text-slate-400"></i>
                              Saqlangan Media
                            </label>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                              {existingMedia.length}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4">
                            {existingMedia.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                  <i className="fas fa-folder-open text-2xl text-slate-300 dark:text-slate-600"></i>
                                </div>
                                <span className="text-sm font-medium">Hali hech qanday media yo'q</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {existingMedia.map((media, idx) => (
                                  <div
                                    key={media.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                                      <i className={`fas ${mediaTypeIcon(media.type)} text-slate-400`}></i>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium truncate" title={media.url}>
                                        {media.url.split('/').pop() || media.url}
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 flex items-center gap-1">
                                        {media.type}
                                      </p>
                                    </div>

                                    {/* Preview thumbnail for images */}
                                    {media.type === 'IMAGE' && (
                                      <img
                                        src={media.url}
                                        alt="preview"
                                        className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 object-cover shrink-0"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    )}

                                    <button
                                      onClick={() => handleDeleteExistingMedia(media.id)}
                                      disabled={deletingMediaId === media.id}
                                      className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                                      title="O'chirish"
                                    >
                                      {deletingMediaId === media.id
                                        ? <i className="fas fa-spinner fa-spin text-sm"></i>
                                        : <i className="fas fa-trash-alt text-sm"></i>
                                      }
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Save button - ONLY FOR BASIC INFO */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => { setIsAddPanelOpen(false); resetForm(); }}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">Yopish</button>
                    {lessonTab === 'BASIC' && (
                      <button
                        onClick={handleAddLesson}
                        disabled={isUploading}
                        className={`px-8 py-2.5 bg-orange-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-orange-500/20 ${
                          isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'
                        }`}
                      >
                        {isUploading
                          ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                          : <><i className="fas fa-save"></i> {editingLessonId ? "O'zgarishlarni saqlash" : "Darsni yaratish va Media qo'shish"}</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Sub-modules and Lessons List ────────────────────────────────── */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 px-1">Sub-modullar va Darslar</h4>
        {subModules.length > 0 ? (
          <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10 text-center">#</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sub-module nomi</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Darslar / Testlar</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {subModules.map((subModule, index) => {
                  const isCollapsed = collapsed[String(subModule.id)];
                  return (
                    <React.Fragment key={String(subModule.id)}>
                      {/* Sub-module Row */}
                      <tr 
                        className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!isCollapsed ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                        onClick={() => setCollapsed((prev) => ({ ...prev, [subModule.id]: !isCollapsed }))}
                      >
                        <td className="px-6 py-4">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold mx-auto shadow-sm">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} text-slate-400 w-4 text-center transition-transform text-xs`}></i>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <i className="fas fa-layer-group text-orange-500 text-sm"></i>
                              {subModule.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 shadow-sm">
                              <i className="fas fa-book text-slate-400"></i> {subModule.lessons.length} ta dars
                            </span>
                            {subModule.quizResponse && (
                              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 shadow-sm">
                                <i className="fas fa-tasks text-amber-500"></i> 1 ta test
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLessonSubModuleId(subModule.id);
                                setIsAddPanelOpen(true);
                                setAddMode('LESSON');
                              }}
                              className="px-3 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors inline-flex items-center justify-center shadow-sm border border-blue-200 dark:border-blue-800/50 text-xs font-bold gap-1.5 opacity-0 group-hover:opacity-100"
                              title="Dars qo'shish"
                            >
                              <i className="fas fa-plus"></i> Dars
                            </button>
                            {!subModule.quizResponse && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLessonSubModuleId(subModule.id);
                                  setIsAddPanelOpen(true);
                                  setAddMode('QUIZ');
                                }}
                                className="px-3 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors inline-flex items-center justify-center shadow-sm border border-amber-200 dark:border-amber-800/50 text-xs font-bold gap-1.5 opacity-0 group-hover:opacity-100"
                                title="Quiz qo'shish"
                              >
                                <i className="fas fa-plus"></i> Quiz
                              </button>
                            )}
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 opacity-0 group-hover:opacity-100 mx-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSubModule(subModule);
                              }}
                              className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm border border-orange-200 dark:border-orange-800/50"
                              title="Tahrirlash"
                            >
                              <i className="fas fa-pen text-xs"></i>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubModule(subModule);
                              }}
                              className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm border border-red-200 dark:border-red-800/50"
                              title="O'chirish"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Nested Lessons / Quiz */}
                      {!isCollapsed && (
                        <tr>
                          <td colSpan={4} className="p-0 border-b-2 border-orange-100 dark:border-orange-900/30 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="pl-6 sm:pl-20 pr-6 py-4 animate-in slide-in-from-top-2 duration-200">
                              {subModule.lessons.length > 0 || subModule.quizResponse ? (
                                <div className="space-y-2">
                                  {/* Lessons */}
                                  {subModule.lessons.map((lesson, idx) => (
                                    <div key={lesson.id} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-orange-200 dark:hover:border-orange-800 transition-colors group">
                                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                                          <i className="fas fa-play-circle text-orange-500"></i> {lesson.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {lesson.media?.length || 0} ta media fayl
                                        </p>
                                      </div>
                                      <div className="flex gap-2 shrink-0">
                                        <button
                                          onClick={() => handleEditLesson(lesson)}
                                          className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-700"
                                          title="Darsni tahrirlash"
                                        >
                                          <i className="fas fa-pen text-xs"></i>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLesson(lesson)}
                                          className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-700"
                                          title="Darsni o'chirish"
                                        >
                                          <i className="fas fa-trash text-xs"></i>
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Quiz */}
                                  {subModule.quizResponse && (
                                    <div className="flex items-center gap-4 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-colors group cursor-pointer"
                                         onClick={() => setManagingQuiz({ quiz: subModule.quizResponse, subModuleId: subModule.id })}>
                                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                                        <i className="fas fa-tasks"></i>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate flex items-center gap-2">
                                          {subModule.quizResponse.name}
                                          <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                            {subModule.quizResponse.questions?.length || 0} Savol
                                          </span>
                                        </p>
                                        <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                                          Modul testi
                                        </p>
                                      </div>
                                      <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQuizTitle(subModule.quizResponse.name);
                                            setQuizQuestions(subModule.quizResponse.questions || []);
                                            setQuizHasTimeLimit(subModule.quizResponse.timeLimitInMinutes !== null);
                                            setQuizTimeLimitInMinutes(subModule.quizResponse.timeLimitInMinutes || 30);
                                            setQuizHasPassingScore(subModule.quizResponse.passingScore !== null);
                                            setQuizPassingScore(subModule.quizResponse.passingScore || 85);
                                            setEditingQuizId(subModule.quizResponse.id);
                                            setAddMode('QUIZ');
                                            setLessonSubModuleId(subModule.id);
                                            setIsAddPanelOpen(true);
                                          }}
                                          className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-700 shadow-sm"
                                          title="Testni tahrirlash"
                                        >
                                          <i className="fas fa-pen text-xs"></i>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteQuiz(subModule.quizResponse, subModule.id);
                                          }}
                                          className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-700 shadow-sm"
                                          title="Testni o'chirish"
                                        >
                                          <i className="fas fa-trash text-xs"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-sm font-medium">
                                  Hali darslar va testlar mavjud emas
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-2xl">
              <i className="fas fa-layer-group text-slate-400"></i>
            </div>
            <p className="font-medium">Hozircha sub-modullar mavjud emas</p>
            <button
              onClick={() => { setIsAddPanelOpen(true); setAddMode('SUB_MODULE'); }}
              className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-md shadow-orange-500/20 mt-2"
            >
              Yangi sub-modul qo'shish
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {itemToDelete && createPortal(
      <div onClick={closeTopModal} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6">
        <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 m-auto">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-triangle-exclamation text-red-500 text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
            {itemToDelete.type === 'SUB_MODULE' && "Sub-modulni o'chirish"}
            {itemToDelete.type === 'LESSON' && "Darsni o'chirish"}
            {itemToDelete.type === 'QUIZ' && "Quizni o'chirish"}
            {itemToDelete.type === 'QUESTION' && "Savolni o'chirish"}
            {itemToDelete.type === 'MEDIA' && "Media faylini o'chirish"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">Quyidagi kontentni o'chirmoqchisiz:</p>

          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-red-500 flex items-center justify-center shadow-sm shrink-0">
              <i className={`fas ${itemToDelete.type === 'SUB_MODULE' ? 'fa-layer-group' : itemToDelete.type === 'QUIZ' ? 'fa-tasks' : itemToDelete.type === 'QUESTION' ? 'fa-question-circle' : itemToDelete.type === 'MEDIA' ? 'fa-photo-film' : 'fa-book'}`}></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{itemToDelete.name}</p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium truncate mt-0.5">Bu amal qaytarilmaydi!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setItemToDelete(null)}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all text-sm"
            >
              Bekor qilish
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all text-sm flex items-center justify-center gap-2"
            >
              <i className="fas fa-trash-can"></i> O'chirish
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Quiz Questions Modal */}
    {managingQuiz && createPortal(
      <div onClick={closeTopModal} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6">
        <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col m-auto">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <i className="fas fa-tasks text-amber-500"></i>
                {managingQuiz.quiz.name}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Savollarni boshqarish</p>
            </div>
            <button onClick={() => { setManagingQuiz(null); setEditingQuestionId(null); }} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 shrink-0">
            <h6 className="text-sm font-bold text-slate-700 dark:text-slate-300">Savollar jadvali ({managingQuiz.quiz.questions?.length || 0})</h6>
            <button
              onClick={() => {
                setEditingQuestionId('new');
                setQuestionForm({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
              }}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Yangi savol
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/30 relative">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">#</th>
                  <th className="px-4 py-4 min-w-[250px] w-1/2">Savol matni</th>
                  <th className="px-4 py-4 min-w-[250px] w-1/2">Variantlar</th>
                  <th className="px-4 py-4 w-28 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Add/Edit question form row */}
                {(editingQuestionId === 'new' || managingQuiz.quiz.questions?.some((q: any) => q.id === editingQuestionId)) && (() => {
                  return (
                    <tr className="bg-orange-50/50 dark:bg-orange-900/10 relative z-0">
                      <td className="px-4 py-4 text-center text-orange-600 font-bold">{editingQuestionId === 'new' ? '*' : '✎'}</td>
                      <td className="px-4 py-4 whitespace-normal align-top">
                        <textarea rows={4} placeholder="Savolni kiriting..." className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-shadow" value={questionForm.text} onChange={e => setQuestionForm(p => ({ ...p, text: e.target.value }))} />
                      </td>
                      <td className="px-4 py-4 whitespace-normal align-top">
                        <div className="grid grid-cols-1 gap-2 w-full">
                          {questionForm.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input type="radio" name="modal-question-correct" checked={questionForm.correctAnswer === oIdx} onChange={() => setQuestionForm(p => ({ ...p, correctAnswer: oIdx }))} className="accent-orange-600 w-4 h-4 cursor-pointer shrink-0" title="To'g'ri javobni belgilash" />
                              <input type="text" placeholder={`Variant ${String.fromCharCode(65 + oIdx)}`} className={`flex-1 text-sm px-3 py-2 rounded-xl border ${questionForm.correctAnswer === oIdx ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 font-medium' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900'} outline-none focus:border-orange-500 transition-colors`} value={opt} onChange={e => {
                                const newOpts = [...questionForm.options];
                                newOpts[oIdx] = e.target.value;
                                setQuestionForm(p => ({ ...p, options: newOpts }));
                              }} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleSaveQuestion(Number(managingQuiz.subModuleId), managingQuiz.quiz.id)} disabled={isSavingQuestion} className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-all disabled:opacity-50" title="Saqlash">
                            {isSavingQuestion ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                          </button>
                          <button onClick={() => setEditingQuestionId(null)} className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm transition-all" title="Bekor qilish">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })()}

                {/* Existing questions */}
                {managingQuiz.quiz.questions && managingQuiz.quiz.questions.length > 0 ? (
                  managingQuiz.quiz.questions.map((q: any, qIdx: number) => {
                    if (editingQuestionId === q.id) return null; // Handled above

                    return (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4 text-center text-slate-500 font-bold align-top">{qIdx + 1}</td>
                        <td className="px-4 py-4 text-slate-800 dark:text-slate-200 whitespace-normal align-top leading-relaxed text-sm font-medium">
                          {q.text}
                        </td>
                        <td className="px-4 py-4 whitespace-normal align-top">
                          <ul className="text-sm space-y-1.5 w-full">
                            {q.options.map((opt: string, oIdx: number) => {
                              const isCorrect = oIdx === q.correctAnswer;
                              return (
                                <li key={oIdx} className={`px-3 py-2 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 font-bold shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400'}`}>
                                  <span className="w-5 inline-block font-bold opacity-70">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => {
                                setQuestionForm({
                                  text: q.text,
                                  options: q.options.length >= 4 ? q.options : [...q.options, '', '', '', ''].slice(0, 4),
                                  correctAnswer: q.correctAnswer >= 0 ? q.correctAnswer : 0
                                });
                                setEditingQuestionId(q.id);
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all flex items-center justify-center"
                              title="Tahrirlash"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteQuestion(q.id, managingQuiz.quiz.id, managingQuiz.subModuleId)}
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center"
                              title="O'chirish"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  editingQuestionId !== 'new' && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-clipboard-list text-2xl text-slate-400"></i>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Hali savollar kiritilmagan</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Yangi savol qo'shish tugmasini bosing</p>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
};

export default AdminContentManager;

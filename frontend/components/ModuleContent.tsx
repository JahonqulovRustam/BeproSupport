import React, { useState, useEffect } from 'react';
import { SystemModule, Lesson, User, Quiz } from '../types';
import { API_BASE_URL } from '../services/config';
import { progressService } from '../services/progressService';
import QuizSolver from './QuizSolver';

interface ModuleContentProps {
  module: SystemModule;
  currentUser: User;
  onTakeTest: (lesson: Lesson) => void;
}

interface SubModule {
  id: string | number | undefined;
  name: string;
  lessons: Lesson[];
  moduleResponse?: string;
  quizResponse?: Quiz | null;
}

interface ContentItem {
  id: string;
  type: 'lesson' | 'quiz';
  title: string;
  data: Lesson | Quiz;
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
  } catch {
    return url;
  }
};

const buildMediaUrl = (url: string): string => {
  const token = localStorage.getItem('bepro_jwt');
  const fullUrl = API_BASE_URL + url;
  return token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;
};

const normalizeSubModules = (module: SystemModule | null | undefined): SubModule[] => {
  if (!module) return [];
  const maybeSubModules = (module as any).subModules;

  if (Array.isArray(maybeSubModules) && maybeSubModules.length > 0) {
    // Submodules already have lessons nested inside
    return maybeSubModules.map((sm: any) => ({
      id: sm.id,
      name: sm.name || sm.title || 'Sub-module',
      lessons: Array.isArray(sm.lessons) ? sm.lessons : [],
      moduleResponse: sm.moduleResponse?.toString?.() || sm.moduleResponse,
      quizResponse: sm.quizResponse || null,
    }));
  }

  // Fallback to top-level lessons if no submodules exist
  const allLessons = Array.isArray((module as any).lessons) ? (module as any).lessons as Lesson[] : [];
  if (allLessons.length > 0) {
    return [{ id: 'all-lessons', name: 'Barcha darslar', lessons: allLessons, moduleResponse: module.id, quizResponse: null }];
  }

  return [];
};

const isQuizLesson = (lesson: Lesson): boolean => Boolean((lesson as any).questions && (lesson as any).questions.length > 0);

const MediaRenderer: React.FC<{ media: MediaItem; title: string; lessonId?: string | number; currentUser?: User; onProgressUpdate?: (percentage: number) => void }> = ({ media, title, lessonId, currentUser, onProgressUpdate }) => {
  const isStream = media.url.startsWith('/api/media/stream');

  const maxTimeRef = React.useRef(0);
  const lastPostTimeRef = React.useRef(0);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!lessonId || !currentUser) return;
    const video = e.currentTarget;
    if (!video.duration) return;
    
    if (video.currentTime > maxTimeRef.current) {
      maxTimeRef.current = video.currentTime;
    }
    
    const percentage = (maxTimeRef.current / video.duration) * 100;
    
    const now = Date.now();
    if (now - lastPostTimeRef.current > 5000) {
      lastPostTimeRef.current = now;
      progressService.updateLessonProgress(currentUser.id, Number(lessonId), percentage);
      if (onProgressUpdate) onProgressUpdate(percentage);
    }
  };

  const handleVideoEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!lessonId || !currentUser) return;
    const video = e.currentTarget;
    if (!video.duration) return;
    
    maxTimeRef.current = video.duration;
    progressService.updateLessonProgress(currentUser.id, Number(lessonId), 100);
    if (onProgressUpdate) onProgressUpdate(100);
  };

  if (media.type === 'VIDEO') {
    if (isStream) {
      return (
        <video 
          key={String(media.id)} 
          className="w-full h-full" 
          controls 
          src={buildMediaUrl(media.url)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        >
          Sizning brauzeringiz videoni qo'llab-quvvatlamaydi.
        </video>
      );
    }
    return (
      <iframe
        key={String(media.id)}
        className="w-full h-full"
        src={toEmbedUrl(media.url)}
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
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-white text-lg">
      Media mavjud emas
    </div>
  );
};

const ModuleContent: React.FC<ModuleContentProps> = ({ module, currentUser }) => {
  const [subModules, setSubModules] = useState<SubModule[]>(normalizeSubModules(module));
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | number | null>(subModules[0]?.id ?? null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({});
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lessonCompleted, setLessonCompleted] = useState<Record<string, boolean>>({});

  const filterVisibleLessons = (lessons: Lesson[] | undefined): Lesson[] => {
    return (lessons ?? []).filter((lesson) => !isQuizLesson(lesson));
  };
  const currentSubModule = subModules.find((sub) => sub.id === selectedSubModuleId) || subModules[0] || null;

  useEffect(() => {
    if (!currentSubModule || !currentUser) return;
    
    const fetchProgress = async () => {
      const newCompleted: Record<string, boolean> = {};
      const visibleLessons = filterVisibleLessons(currentSubModule.lessons);
      
      const promises = visibleLessons.map(async (lesson) => {
        if (!lesson.id) return;
        const p = await progressService.getLessonProgress(currentUser.id, Number(lesson.id));
        if (p) {
          // Allow for both 'completed' and 'complated' (backend typo)
          newCompleted[String(lesson.id)] = p.completed || p.complated || false;
        }
      });
      
      await Promise.all(promises);
      setLessonCompleted(prev => ({ ...prev, ...newCompleted }));
    };
    
    fetchProgress();
  }, [selectedSubModuleId, currentUser, module]);

  useEffect(() => {
    const normalized = normalizeSubModules(module);
    setSubModules(normalized);
    setSelectedSubModuleId(normalized[0]?.id ?? null);
    const visibleLessons = normalized[0]?.lessons?.filter((lesson) => !isQuizLesson(lesson)) ?? [];
    if (visibleLessons.length > 0) {
      setSelectedContent({ id: visibleLessons[0].id, type: 'lesson', title: visibleLessons[0].title, data: visibleLessons[0] });
    } else {
      setSelectedContent(null);
    }
    setCollapsed(normalized.reduce((acc, sub) => ({ ...acc, [String(sub.id)]: true }), {} as Record<string | number, boolean>));
    setMediaIndex(0);
  }, [module]);
  const visibleLessons = currentSubModule ? filterVisibleLessons(currentSubModule.lessons) : [];
  const selectedLesson = selectedContent?.type === 'lesson' ? (selectedContent.data as Lesson) : null;
  const selectedQuiz = selectedContent?.type === 'quiz' ? (selectedContent.data as Quiz) : null;

  useEffect(() => {
    if (!currentSubModule) return;
    const visible = filterVisibleLessons(currentSubModule.lessons);
    
    // Only reset content if the currently selected content is no longer available
    if (selectedContent && selectedContent.type === 'lesson') {
      const stillExists = visible.some((lesson) => lesson.id === selectedContent.id);
      if (!stillExists && visible.length > 0) {
        // Only switch if current one is deleted
        setSelectedContent({ id: visible[0].id, type: 'lesson', title: visible[0].title, data: visible[0] });
        setMediaIndex(0);
      }
    } else if (!selectedContent && visible.length > 0) {
      // Only auto-select if nothing is selected
      setSelectedContent({ id: visible[0].id, type: 'lesson', title: visible[0].title, data: visible[0] });
    }
  }, [currentSubModule]);

  const currentMediaList: MediaItem[] = [];
  const addedUrls = new Set<string>();
  if (selectedLesson) {
    if (Array.isArray((selectedLesson as any).media)) {
      for (const item of (selectedLesson as any).media) {
        if (item?.url && item?.type && !addedUrls.has(item.url)) {
          addedUrls.add(item.url);
          currentMediaList.push({ id: item.id || item.url, type: item.type, url: item.url });
        }
      }
    }
    if (selectedLesson.videoUrl && !addedUrls.has(selectedLesson.videoUrl)) {
      addedUrls.add(selectedLesson.videoUrl);
      currentMediaList.push({ id: `video-${selectedLesson.id}`, type: 'VIDEO', url: selectedLesson.videoUrl });
    }
  }

  const currentMedia = currentMediaList[mediaIndex] || null;
  const hasContent = selectedContent !== null && (selectedLesson !== null || selectedQuiz !== null);

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 animate-fadeIn">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500">
          <i className="fas fa-book-open text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Hali darslar mavjud emas</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs text-center mt-2">
          Ushbu modulga hali darslar qo'shilmagan yoki ko'rish uchun matnli kontent mavjud emas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid lg:grid-cols-[1.7fr,0.9fr] gap-6">
        <div>
          {selectedLesson ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {currentMedia ? (
                  <MediaRenderer 
                    media={currentMedia} 
                    title={selectedLesson.title} 
                    lessonId={selectedLesson.id}
                    currentUser={currentUser}
                    onProgressUpdate={(percentage) => {
                      if (percentage >= 90) {
                        setLessonCompleted(prev => {
                          if (!prev[String(selectedLesson.id)]) {
                            return { ...prev, [String(selectedLesson.id)]: true };
                          }
                          return prev;
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                    <i className="fas fa-photo-film text-4xl"></i>
                    <span>Media yoki video mavjud emas</span>
                  </div>
                )}
                {currentMediaList.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-3 px-4">
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === 0}
                      onClick={() => setMediaIndex((index: number) => Math.max(index - 1, 0))}
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                      {mediaIndex + 1} / {currentMediaList.length}
                    </span>
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === currentMediaList.length - 1}
                      onClick={() => setMediaIndex((index: number) => Math.min(index + 1, currentMediaList.length - 1))}
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{selectedLesson.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{selectedLesson.description}</p>
              </div>
            </div>
          ) : selectedQuiz ? (
            <QuizSolver
              quiz={selectedQuiz}
              onComplete={(results) => {
                console.log('Quiz completed:', results);
              }}
            />
          ) : null}
        </div>

        <div className="space-y-4">
          {subModules.map((sub) => {
            const visibleLessons = filterVisibleLessons(sub.lessons);
            const quiz = sub.quizResponse; // Get quiz directly from submodule
            const isCollapsed = collapsed[String(sub.id)];
            const itemCount = visibleLessons.length + (quiz ? 1 : 0);

            return (
              <div key={String(sub.id)} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => {
                    const nextCollapsed = !collapsed[String(sub.id)];
                    setCollapsed((prev) => ({ ...prev, [String(sub.id)]: nextCollapsed }));
                    if (!nextCollapsed) {
                      if (visibleLessons.length > 0) {
                        setSelectedSubModuleId(sub.id ?? null);
                        setSelectedContent({ id: visibleLessons[0].id, type: 'lesson', title: visibleLessons[0].title, data: visibleLessons[0] });
                        setMediaIndex(0);
                      }
                    }
                  }}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {visibleLessons.length} ta dars {quiz && `• 1 ta test`}
                    </p>
                  </div>
                  <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-slate-500`} />
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 p-4">
                    {itemCount > 0 ? (
                      <>
                        {/* Lessons Section */}
                        {visibleLessons.length > 0 && (
                          <>
                            {visibleLessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                onClick={() => {
                                  setSelectedSubModuleId(sub.id ?? null);
                                  setSelectedContent({ id: lesson.id, type: 'lesson', title: lesson.title, data: lesson });
                                  setMediaIndex(0);
                                }}
                                className={`w-full text-left rounded-2xl px-4 py-3 transition-all ${selectedContent?.id === lesson.id && selectedContent?.type === 'lesson' ? 'bg-orange-50 dark:bg-slate-900 border border-orange-200 dark:border-orange-700' : 'bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-2">
                                    <i className={`fas fa-book text-xs ${lessonCompleted[String(lesson.id)] ? 'text-green-500' : 'text-slate-500'}`}></i>
                                    {lesson.title}
                                    {lessonCompleted[String(lesson.id)] && (
                                      <i className="fas fa-check-circle text-green-500 ml-1" title="Dars yakunlangan"></i>
                                    )}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </>
                        )}

                        {/* Quiz Section */}
                        {quiz && (
                          <button
                            onClick={() => {
                              setSelectedSubModuleId(sub.id ?? null);
                              setSelectedContent({ id: quiz.id, type: 'quiz', title: quiz.name, data: quiz });
                              setMediaIndex(0);
                            }}
                            className={`w-full text-left rounded-2xl px-4 py-3 transition-all ${selectedContent?.id === quiz.id && selectedContent?.type === 'quiz' ? 'bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-700' : 'bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-2">
                                <i className="fas fa-tasks text-xs text-amber-500"></i>
                                {quiz.name}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-slate-800 px-2 py-1 rounded">
                                {quiz.questions?.length || 0}
                              </span>
                            </div>
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-3">
                        Bu sub-module uchun ko'rish uchun darslar mavjud emas.
                      </p>
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
};

export default ModuleContent;

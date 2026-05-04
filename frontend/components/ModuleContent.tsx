import React, { useState, useEffect } from 'react';
import { SystemModule, Lesson, User, Quiz } from '../types';
import { API_BASE_URL } from '../services/config';
import { progressService } from '../services/progressService';
import QuizSolver from './QuizSolver';

const playbackMemory: Record<string, number> = {};

interface ModuleContentProps {
  module: SystemModule;
  currentUser: User;
}

interface SubModule {
  id: string | number | undefined;
  name: string;
  lessons: Lesson[];
  moduleResponse?: string;
  quizResponse?: Quiz | null;
  isQuizAccessible?: boolean;
}

interface ContentItem {
  id: string;
  type: 'lesson' | 'quiz' | 'quizError';
  title: string;
  data: Lesson | Quiz | null;
}

interface MediaItem {
  id: string | number;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

const parseVideoUrl = (url: string): string => {
  if (!url) return '';
  let parsedUrl = url.trim();

  // If user pasted an iframe code, extract the src
  if (parsedUrl.includes('<iframe') && parsedUrl.includes('src=')) {
    const match = parsedUrl.match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      parsedUrl = match[1];
    }
  }

  // Ensure it has protocol
  if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://') && !parsedUrl.startsWith('/')) {
    if (parsedUrl.includes('youtube.com') || parsedUrl.includes('youtu.be')) {
      parsedUrl = 'https://' + parsedUrl;
    }
  }
  return parsedUrl;
};

const toEmbedUrl = (url: string): string => {
  const parsed = parseVideoUrl(url);
  try {
    if (parsed.includes('youtube.com/embed/')) return parsed;
    const watchMatch = parsed.match(/youtube\.com\/watch\?.*v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = parsed.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    return parsed;
  } catch {
    return parsed;
  }
};

const YouTubePlayer: React.FC<{ mediaId: string; url: string; onProgress: (percentage: number) => void; onEnded: () => void }> = ({ mediaId, url, onProgress, onEnded }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<any>(null);

  React.useEffect(() => {
    let isMounted = true;
    
    // Extract video ID
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    const videoId = match ? match[1] : null;

    if (!videoId) return;

    const loadPlayer = () => {
      if (!isMounted || !containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 0, rel: 0, playsinline: 1, start: Math.floor(playbackMemory[mediaId] || 0) },
        events: {
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getDuration) {
                  const current = playerRef.current.getCurrentTime();
                  playbackMemory[mediaId] = current;
                  const total = playerRef.current.getDuration();
                  if (total > 0) {
                    onProgress((current / total) * 100);
                  }
                }
              }, 5000);
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }

            if (event.data === (window as any).YT.PlayerState.ENDED) {
              onEnded();
            }
          }
        }
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      const oldReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (oldReady) oldReady();
        loadPlayer();
      };
    } else if ((window as any).YT && (window as any).YT.Player) {
      loadPlayer();
    } else {
      // API is loading but not ready
      const oldReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (oldReady) oldReady();
        loadPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [url]);

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  if (!match) {
    return <iframe src={toEmbedUrl(url)} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }

  return <div ref={containerRef} className="w-full h-full"></div>;
};

const buildMediaUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const token = localStorage.getItem('bepro_jwt');
  const fullUrl = API_BASE_URL + url;
  return token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;
};

const normalizeSubModules = (module: SystemModule | null | undefined): SubModule[] => {
  // We no longer normalize from the module object since it doesn't contain the full data.
  // Instead, we will fetch the submodules directly from the API.
  return [];
};

const isQuizLesson = (lesson: Lesson): boolean => Boolean((lesson as any).questions && (lesson as any).questions.length > 0);

const MediaRenderer: React.FC<{ media: MediaItem; title: string; lessonId?: string | number; currentUser?: User; onProgressUpdate?: (percentage: number) => void }> = ({ media, title, lessonId, currentUser, onProgressUpdate }) => {
  const isLocalVideo = media.url.startsWith('/');

  const maxTimeRef = React.useRef(0);
  const maxPercentageRef = React.useRef(0);
  const lastPostTimeRef = React.useRef(0);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!lessonId || !currentUser) return;
    const video = e.currentTarget;
    if (!video.duration) return;
    
    playbackMemory[String(media.id)] = video.currentTime;

    if (video.currentTime > maxTimeRef.current) {
      maxTimeRef.current = video.currentTime;
    }
    
    const percentage = (maxTimeRef.current / video.duration) * 100;
    
    const now = Date.now();
    if (now - lastPostTimeRef.current > 5000) {
      lastPostTimeRef.current = now;
      progressService.updateLessonProgress(Number(currentUser.id), Number(lessonId), percentage);
      if (onProgressUpdate) onProgressUpdate(percentage);
    }
  };

  const handleVideoEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!lessonId || !currentUser) return;
    const video = e.currentTarget;
    if (video) maxTimeRef.current = video.duration;
    progressService.updateLessonProgress(Number(currentUser.id), Number(lessonId), 100);
    if (onProgressUpdate) onProgressUpdate(100);
  };

  if (media.type === 'VIDEO') {
    if (isLocalVideo) {
      return (
        <video 
          key={String(media.id)} 
          className="w-full h-full bg-black" 
          controls 
          src={buildMediaUrl(media.url)}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = playbackMemory[String(media.id)] || 0;
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        >
          Sizning brauzeringiz videoni qo'llab-quvvatlamaydi.
        </video>
      );
    }
    return (
      <div className="w-full h-full bg-black relative">
        <YouTubePlayer
          mediaId={String(media.id)}
          url={parseVideoUrl(media.url)}
          onProgress={(percentage) => {
            if (!lessonId || !currentUser) return;
            if (percentage > maxPercentageRef.current) {
              maxPercentageRef.current = percentage;
            }
            const now = Date.now();
            if (now - lastPostTimeRef.current > 5000) {
              lastPostTimeRef.current = now;
              progressService.updateLessonProgress(Number(currentUser.id), Number(lessonId), maxPercentageRef.current);
              if (onProgressUpdate) onProgressUpdate(maxPercentageRef.current);
            }
          }}
          onEnded={() => {
            if (!lessonId || !currentUser) return;
            maxPercentageRef.current = 100;
            progressService.updateLessonProgress(Number(currentUser.id), Number(lessonId), 100);
            if (onProgressUpdate) onProgressUpdate(100);
          }}
        />
      </div>
    );
  }

  if (media.type === 'IMAGE') {
    return (
      <img
        key={String(media.id)}
        className="w-full h-full object-contain"
        src={buildMediaUrl(media.url)}
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
  const [subModules, setSubModules] = useState<SubModule[]>([]);
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | number | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({});
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lessonCompleted, setLessonCompleted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [quizError, setQuizError] = useState<string | null>(null);

  const filterVisibleLessons = (lessons: Lesson[] | undefined): Lesson[] => {
    return (lessons ?? []).filter((lesson) => !isQuizLesson(lesson));
  };
  const currentSubModule = subModules.find((sub) => sub.id === selectedSubModuleId) || subModules[0] || null;

  useEffect(() => {
    if (!subModules.length || !currentUser) return;
    
    const fetchProgress = async () => {
      const newCompleted: Record<string, boolean> = {};
      const allLessons = subModules.flatMap(sub => filterVisibleLessons(sub.lessons));
      
      const promises = allLessons.map(async (lesson) => {
        if (!lesson.id) return;
        const p = await progressService.getLessonProgress(Number(currentUser.id), Number(lesson.id));
        if (p) {
          // Allow for both 'completed' and 'complated' (backend typo)
          newCompleted[String(lesson.id)] = p.completed || p.complated || false;
        }
      });
      
      await Promise.all(promises);
      setLessonCompleted(prev => ({ ...prev, ...newCompleted }));
    };
    
    fetchProgress();
  }, [subModules, currentUser]);

  useEffect(() => {
    if (Object.keys(lessonCompleted).length === 0) return;
    setSubModules(prevSubs => {
      let changed = false;
      const nextSubs = prevSubs.map(sub => {
        const visibleLessons = filterVisibleLessons(sub.lessons);
        // Only auto-unlock if it was previously false and all lessons are now complete
        if (visibleLessons.length > 0 && visibleLessons.every(l => lessonCompleted[String(l.id)])) {
          if (sub.isQuizAccessible === false) {
            changed = true;
            return { ...sub, isQuizAccessible: true };
          }
        }
        return sub;
      });
      return changed ? nextSubs : prevSubs;
    });
  }, [lessonCompleted]);

  useEffect(() => {
    if (!module) return;
    const fetchModuleData = async () => {
      setIsLoading(true);
      try {
        const fetchedSubModules = await import('../services/moduleService').then(m => m.moduleService.getSubModulesByModuleId(module.id));
        setSubModules(fetchedSubModules);
        
        // Default collapse state to true for all submodules
        const newCollapsed: Record<string | number, boolean> = {};
        fetchedSubModules.forEach(sub => {
          if (sub.id) newCollapsed[String(sub.id)] = true;
        });
        setCollapsed(newCollapsed);

        if (fetchedSubModules.length > 0) {
          const firstSub = fetchedSubModules[0];
          setSelectedSubModuleId(firstSub.id ?? null);
          const visibleLessons = firstSub.lessons?.filter((lesson) => !isQuizLesson(lesson)) ?? [];
          if (visibleLessons.length > 0) {
            handleSelectLesson(firstSub.id ?? null, visibleLessons[0]);
          } else if ((firstSub as any).quiz || firstSub.quizResponse) {
            handleSelectQuiz(firstSub.id ?? null, ((firstSub as any).quiz || firstSub.quizResponse) as Quiz);
          } else {
            setSelectedContent(null);
          }
        } else {
          setSelectedContent(null);
          setSelectedSubModuleId(null);
        }
      } catch (error) {
        console.error('Failed to fetch submodules:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModuleData();
  }, [module]);

  const handleSelectLesson = async (subModuleId: string | number | null, basicLesson: Lesson) => {
    setSelectedSubModuleId(subModuleId);
    setMediaIndex(0);
    // Fetch full lesson details since ListOfLessons only has id and title
    try {
      const fullLesson = await import('../services/moduleService').then(m => m.moduleService.getLessonById(basicLesson.id));
      setSelectedContent({ id: fullLesson.id, type: 'lesson', title: fullLesson.title, data: fullLesson });
    } catch (error) {
      console.error('Failed to load lesson details:', error);
      // Fallback to basic lesson if fetch fails
      setSelectedContent({ id: basicLesson.id, type: 'lesson', title: basicLesson.title, data: basicLesson });
    }
  };

  const handleSelectQuiz = async (subModuleId: string | number | null, basicQuiz: Quiz) => {
    setSelectedSubModuleId(subModuleId);
    setMediaIndex(0);
    setQuizError(null);
    // Fetch quiz questions
    try {
      const questions = await import('../services/quizService').then(m => m.quizService.startQuiz(basicQuiz.id));
      const fullQuiz = { ...basicQuiz, questions };
      setSelectedContent({ id: fullQuiz.id, type: 'quiz', title: fullQuiz.name, data: fullQuiz });
    } catch (error: any) {
      console.error('Failed to load quiz details:', error);
      if (error.response?.status === 403) {
        setQuizError("Testni ishlash uchun ushbu moduldagi barcha darslarni to'liq yakunlashingiz kerak.");
        setSelectedContent({ id: basicQuiz.id, type: 'quizError', title: basicQuiz.name, data: null });
      } else {
        setQuizError("Testni yuklashda xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.");
        setSelectedContent({ id: basicQuiz.id, type: 'quizError', title: basicQuiz.name, data: null });
      }
    }
  };
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
        handleSelectLesson(currentSubModule.id ?? null, visible[0]);
      }
    } else if (!selectedContent) {
      // Only auto-select if nothing is selected
      if (visible.length > 0) {
        handleSelectLesson(currentSubModule.id ?? null, visible[0]);
      } else if ((currentSubModule as any).quiz || currentSubModule.quizResponse) {
        handleSelectQuiz(currentSubModule.id ?? null, ((currentSubModule as any).quiz || currentSubModule.quizResponse) as Quiz);
      }
    }
  }, [currentSubModule]);

  useEffect(() => {
    if (!selectedLesson || !currentUser) return;

    let hasVideo = false;
    if (Array.isArray((selectedLesson as any).media)) {
      hasVideo = (selectedLesson as any).media.some((m: any) => m.type === 'VIDEO');
    }
    if (selectedLesson.videoUrl) {
      hasVideo = true;
    }

    if (!hasVideo) {
      const timer = setTimeout(() => {
        progressService.updateLessonProgress(Number(currentUser.id), Number(selectedLesson.id), 100);
        setLessonCompleted(prev => {
          if (!prev[String(selectedLesson?.id)]) {
            return { ...prev, [String(selectedLesson?.id)]: true };
          }
          return prev;
        });
      }, 60000); // 1 minute auto-complete
      return () => clearTimeout(timer);
    }
  }, [selectedLesson?.id, currentUser?.id]);

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
  const hasContent = selectedContent !== null && (selectedLesson !== null || selectedQuiz !== null || selectedContent.type === 'quizError');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 animate-fadeIn">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ma'lumotlar yuklanmoqda...</h3>
      </div>
    );
  }

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
            (!currentMedia && (!selectedLesson.description || selectedLesson.description.trim() === '')) ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-12 text-center border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300 dark:text-slate-600">
                  <i className="fas fa-folder-open text-3xl"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{selectedLesson.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Ushbu dars uchun administrator tomonidan hali media (video/rasm) yoki matnli ma'lumotlar qo'shilmagan. Iltimos, keyinroq qayta tekshiring yoki adminga murojaat qiling.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden">
                {currentMedia && (
                  <div className="aspect-video bg-black flex items-center justify-center relative">
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
                )}

                <div className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">{selectedLesson.title}</h2>
                  {selectedLesson.description && selectedLesson.description.trim() !== '' && (
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed prose prose-slate dark:prose-invert max-w-none">
                      {selectedLesson.description}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : selectedContent?.type === 'quizError' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-lock text-3xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Test qulflangan</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {quizError}
              </p>
            </div>
          ) : selectedQuiz ? (
            <QuizSolver
              quiz={selectedQuiz}
              onComplete={(results) => {
                console.log('Quiz completed:', results);
                const visibleLessons = currentSubModule ? filterVisibleLessons(currentSubModule.lessons) : [];
                if (visibleLessons.length > 0) {
                  handleSelectLesson(currentSubModule?.id ?? null, visibleLessons[0]);
                } else {
                  setSelectedContent(null);
                }
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
                                onClick={() => handleSelectLesson(sub.id ?? null, lesson)}
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
                              if (sub.isQuizAccessible === false) return;
                              handleSelectQuiz(sub.id ?? null, quiz);
                            }}
                            disabled={sub.isQuizAccessible === false}
                            className={`w-full text-left rounded-2xl px-4 py-3 transition-all ${
                              selectedContent?.id === quiz.id && selectedContent?.type === 'quiz' 
                                ? 'bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-700' 
                                : sub.isQuizAccessible === false
                                  ? 'bg-slate-50 dark:bg-slate-800/30 opacity-70 cursor-not-allowed'
                                  : 'bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-2">
                                {sub.isQuizAccessible === false ? (
                                  <i className="fas fa-lock text-xs text-slate-400"></i>
                                ) : (
                                  <i className="fas fa-tasks text-xs text-amber-500"></i>
                                )}
                                {quiz.name}
                              </span>
                              {sub.isQuizAccessible !== false && (
                                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-slate-800 px-2 py-1 rounded">
                                  TEST
                                </span>
                              )}
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

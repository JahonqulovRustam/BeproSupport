import React, { useState, useEffect, useRef } from 'react';
import { SystemModule, Lesson, User } from '../types';
import { geminiService } from '../services/geminiService';
import AdminContentManager from './AdminContentManager';
import apiClient from '../services/apiClient';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.113:8080';

interface ModuleContentProps {
  module: SystemModule;
  currentUser: User;
  onTakeTest: (lesson: Lesson) => void;
  onUpdateModule: (updatedModule: SystemModule) => void;
}

interface MediaItem {
  id: string | number;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  url: string;
}

// ─── Hook: TRUE streaming via MediaSource API ─────────────────────────────────
// Video plays immediately as first chunks arrive — no waiting for full download.
// Images use simple blob fetch (small files, streaming not needed).
const useProtectedMedia = (url: string | null, mediaType: 'VIDEO' | 'IMAGE' | 'OTHER' = 'VIDEO') => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!url) { setBlobUrl(null); return; }

    let objectUrl: string;
    let mediaSource: MediaSource | null = null;
    let cancelled = false;

    setLoading(true);
    setBlobUrl(null);
    setProgress(0);

    const token = localStorage.getItem('bepro_jwt');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    if (mediaType === 'VIDEO') {
      // ── MediaSource streaming — playback starts with first chunk ──────────
      mediaSource = new MediaSource();
      objectUrl = URL.createObjectURL(mediaSource);
      setBlobUrl(objectUrl);   // give <video> the URL immediately
      setLoading(false);

      mediaSource.addEventListener('sourceopen', async () => {
        if (cancelled || !mediaSource) return;
        try {
          const response = await fetch(url, { headers });
          if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

          const contentLength = response.headers.get('Content-Length');
          const total = contentLength ? parseInt(contentLength) : 0;

          // Detect MIME — default to video/mp4 if server returns octet-stream
          const serverType = response.headers.get('Content-Type') || '';
          const mimeType = serverType.includes('webm') ? 'video/webm'
                         : serverType.includes('ogg')  ? 'video/ogg'
                         : 'video/mp4';

          // If browser doesn't support MediaSource for this codec, fall back to blob
          if (!MediaSource.isTypeSupported(mimeType)) {
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: mimeType });
            URL.revokeObjectURL(objectUrl);
            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
            if (mediaSource.readyState === 'open') mediaSource.endOfStream();
            return;
          }

          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          const reader = response.body.getReader();
          let received = 0;

          const appendChunk = async (chunk: Uint8Array): Promise<void> => {
            if (cancelled) return;
            // Wait if sourceBuffer is busy
            if (sourceBuffer.updating) {
              await new Promise<void>(r => sourceBuffer.addEventListener('updateend', () => r(), { once: true }));
            }
            if (cancelled || mediaSource?.readyState !== 'open') return;
            sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
            await new Promise<void>(r => sourceBuffer.addEventListener('updateend', () => r(), { once: true }));
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done || cancelled) break;
            await appendChunk(value);
            received += value.length;
            if (total > 0) setProgress(Math.round((received / total) * 100));
          }

          if (!cancelled && mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
          }
        } catch (err) {
          console.error('MediaSource stream error, falling back to blob:', err);
          // Fallback: fetch entire file as blob
          if (cancelled) return;
          try {
            const res = await fetch(url, { headers });
            const arrayBuffer = await res.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
          } catch { setBlobUrl(null); }
        }
      });

    } else {
      // ── Images: simple fetch with progress ────────────────────────────────
      const fetchImage = async () => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const contentLength = response.headers.get('Content-Length');
          const total = contentLength ? parseInt(contentLength) : 0;
          const serverType = response.headers.get('Content-Type') || '';
          const mimeType = serverType.startsWith('image/') ? serverType : 'image/jpeg';

          const arrayBuffer = await response.arrayBuffer();
          if (cancelled) return;
          if (total > 0) setProgress(100);

          const blob = new Blob([arrayBuffer], { type: mimeType });
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        } catch (err) {
          console.error('Image fetch error:', err);
          setBlobUrl(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      fetchImage();
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, mediaType]);

  return { blobUrl, loading, progress };
};

// ─── MediaRenderer ────────────────────────────────────────────────────────────
const MediaRenderer: React.FC<{ media: MediaItem; title: string }> = ({ media, title }) => {
  const isStream = media.url.startsWith('/api/media/stream');
  const fullUrl = isStream ? BASE_URL + media.url : media.url;

  const { blobUrl, loading, progress } = useProtectedMedia(
    isStream ? fullUrl : null,
    media.type
  );

  // Loading state — only shown for images (videos start immediately via MediaSource)
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4 bg-slate-900">
        <i className="fas fa-image text-4xl text-slate-500"></i>
        <div className="w-48 space-y-2">
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress || 20}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">
            {progress > 0 ? `Yuklanmoqda... ${progress}%` : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>
    );
  }

  if (media.type === 'VIDEO') {
    if (isStream) {
      return blobUrl ? (
        <video key={String(media.id)} className="w-full h-full" controls autoPlay={false}>
          <source src={blobUrl} type="video/mp4" />
          Sizning brauzeringiz videoni qo'llab-quvvatlamaydi.
        </video>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3 bg-slate-900">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-400"></i>
          <span className="text-sm text-slate-400">Video tayyorlanmoqda...</span>
        </div>
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
    if (isStream) {
      return blobUrl ? (
        <img key={String(media.id)} className="w-full h-full object-contain" src={blobUrl} alt={title} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <i className="fas fa-exclamation-circle mr-2" /> Rasm yuklanmadi
        </div>
      );
    }
    return <img key={String(media.id)} className="w-full h-full object-contain" src={media.url} alt={title} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-white text-lg">
      Media mavjud emas
    </div>
  );
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
    setSaving(true);
    setError('');
    try {
      const response = await apiClient.put(`/api/lessons/${lesson.id}`, { title, description });
      onSaved({ ...lesson, title, description });
      onClose();
    } catch (err) {
      setError('Saqlashda xatolik yuz berdi');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slideUp">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Darsni tahrirlash</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Sarlavha *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Dars sarlavhasi"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tavsif</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 h-28 resize-none"
              placeholder="Dars haqida qisqacha..."
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</> : <><i className="fas fa-save"></i> Saqlash</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ModuleContent: React.FC<ModuleContentProps> = ({ module, currentUser, onTakeTest, onUpdateModule }) => {
  const [selectedLesson, setSelectedLesson] = useState<any>(
    module.lessons.length > 0 ? module.lessons[0] : null
  );
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    setMediaIndex(0);
    setSelectedLesson(module.lessons.length > 0 ? module.lessons[0] : null);
  }, [module]);

  useEffect(() => { setMediaIndex(0); }, [selectedLesson]);

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !selectedLesson) return;
    setIsAsking(true);
    const answer = await geminiService.getTutorAdvice(selectedLesson.title, aiQuestion);
    setAiResponse(answer || "Kechirasiz, ma'lumotni qayta ishlashda xatolik yuz berdi.");
    setIsAsking(false);
  };

  const handleUpdateModule = async (updatedModule: SystemModule) => {
    onUpdateModule(updatedModule);
    if (selectedLesson) {
      const updatedLesson = updatedModule.lessons.find((l: any) => l.id === selectedLesson.id);
      if (updatedLesson) { setSelectedLesson(updatedLesson); setMediaIndex(0); }
    }
  };

  // Called when lesson title/description saved from modal
  const handleLessonSaved = (updated: Lesson) => {
    setSelectedLesson((prev: any) => prev?.id === updated.id ? { ...prev, ...updated } : prev);
    const updatedModule = {
      ...module,
      lessons: module.lessons.map(l => l.id === updated.id ? { ...l, ...updated } : l)
    };
    onUpdateModule(updatedModule);
  };

  if (isManaging && currentUser.role === 'ADMIN') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Modulni tahrirlash: {module.name}</h3>
          <button
            onClick={() => setIsManaging(false)}
            className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <i className="fas fa-eye"></i> Ko'rish rejimiga qaytish
          </button>
        </div>
        <AdminContentManager module={module} onUpdateModule={handleUpdateModule} />
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 animate-fadeIn">
        <div className="flex justify-between items-center w-full px-8 mb-8">
          <div></div>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsManaging(true)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              <i className="fas fa-tools"></i> Dars qo'shish
            </button>
          )}
        </div>
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
          <i className="fas fa-book-open text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Darslar mavjud emas</h3>
        <p className="text-slate-500 max-w-xs text-center mt-2">Ushbu modul uchun hali darslar qo'shilmagan.</p>
      </div>
    );
  }

  const mediaList: MediaItem[] = Array.isArray(selectedLesson?.media) ? selectedLesson.media : [];
  const currentMedia = mediaList[mediaIndex] || null;

  return (
    <>
      {/* Lesson edit modal */}
      {editingLesson && (
        <LessonEditModal
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={handleLessonSaved}
        />
      )}

      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Media Player */}
              <div className="aspect-video bg-black flex flex-col relative">
                {currentMedia ? (
                  <MediaRenderer media={currentMedia} title={selectedLesson.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                    <i className="fas fa-photo-film text-4xl"></i>
                    <span>Media mavjud emas</span>
                  </div>
                )}
                {mediaList.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-3">
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === 0}
                      onClick={() => setMediaIndex(mediaIndex - 1)}
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                      {mediaIndex + 1} / {mediaList.length}
                    </span>
                    <button
                      className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-all"
                      disabled={mediaIndex === mediaList.length - 1}
                      onClick={() => setMediaIndex(mediaIndex + 1)}
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-2xl font-bold text-slate-900">{selectedLesson.title}</h2>
                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => setEditingLesson(selectedLesson)}
                          className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-edit"></i> Tahrirlash
                        </button>
                      )}
                    </div>
                    <p className="text-slate-500">{selectedLesson.description}</p>
                  </div>
                  <button
                    onClick={() => onTakeTest(selectedLesson)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-file-lines"></i> Test Topshirish
                  </button>
                </div>
              </div>
            </div>

            {/* AI Tutor */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <i className="fas fa-robot"></i>
                </div>
                <h3 className="font-bold text-blue-900">Bepro AI Repetitor</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                {selectedLesson.title} bo'yicha tushunmagan savollaringizni AI mentorimizdan so'rang.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Masalan: Tizim xatosini qanday tuzataman...?"
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-sm"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                />
                <button
                  onClick={handleAskAi}
                  disabled={isAsking}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {isAsking ? "O'ylamoqda..." : "So'rash"}
                </button>
              </div>
              {aiResponse && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 text-sm text-slate-700 animate-slideUp">
                  <p className="font-bold text-blue-800 mb-1">Javob:</p>
                  {aiResponse}
                </div>
              )}
            </div>
          </div>

          {/* Lesson sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-900">Modul darslari</h3>
              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => setIsManaging(true)}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <i className="fas fa-plus"></i> Dars qo'shish
                </button>
              )}
            </div>
            <div className="space-y-2">
              {module.lessons.map((lesson, idx) => (
                <button
                  key={lesson.id}
                  onClick={() => { setSelectedLesson(lesson); setAiResponse(''); setAiQuestion(''); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedLesson.id === lesson.id
                      ? 'border-blue-600 bg-white shadow-md'
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedLesson.id === lesson.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${selectedLesson.id === lesson.id ? 'text-slate-900' : 'text-slate-600'}`}>
                        {lesson.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                        {lesson.questions.length} ta savol
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModuleContent;
import React, { useState } from 'react';
import { SystemModule, Lesson, Question } from '../types';
import { moduleService } from '../services/moduleService';

interface AdminContentManagerProps {
  module: SystemModule;
  onUpdateModule: (updatedModule: SystemModule) => void;
}

// ─── Media item types ─────────────────────────────────────────────────────────
interface InternalMediaItem {
  kind: 'internal';
  file: File;
  id: string; // temp local id
}

interface ExternalMediaItem {
  kind: 'external';
  url: string;
  type: 'VIDEO' | 'IMAGE' | 'OTHER';
  id: string; // temp local id
}

type MediaItem = InternalMediaItem | ExternalMediaItem;

const AdminContentManager: React.FC<AdminContentManagerProps> = ({ module, onUpdateModule }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: '',
    videoUrl: '',
    description: '',
    questions: [],
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });

  // ─── Multiple media state ─────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalType, setExternalType] = useState<'VIDEO' | 'IMAGE' | 'OTHER'>('VIDEO');
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setNewLesson({ title: '', videoUrl: '', description: '', questions: [] });
    setMediaItems([]);
    setExternalUrl('');
    setExternalType('VIDEO');
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
    setEditingLessonId(null);
  };

  // ─── Add internal file(s) ────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newItems: InternalMediaItem[] = files.map(file => ({
      kind: 'internal',
      file,
      id: `internal-${Date.now()}-${Math.random()}`,
    }));
    setMediaItems(prev => [...prev, ...newItems]);
    e.target.value = ''; // reset input so same file can be re-added
  };

  // ─── Add external URL ────────────────────────────────────────────────────
  const handleAddExternal = () => {
    if (!externalUrl.trim()) return;
    const item: ExternalMediaItem = {
      kind: 'external',
      url: externalUrl.trim(),
      type: externalType,
      id: `external-${Date.now()}`,
    };
    setMediaItems(prev => [...prev, item]);
    setExternalUrl('');
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
  };

  // ─── Save lesson ──────────────────────────────────────────────────────────
  const handleAddLesson = async () => {
    if (!newLesson.title) {
      alert('Dars sarlavhasi kiritilishi shart');
      return;
    }
    if (mediaItems.length === 0) {
      alert('Kamida bitta media (fayl yoki havola) qo\'shilishi shart');
      return;
    }

    setIsUploading(true);
    try {
      const internalFiles = mediaItems
        .filter((m): m is InternalMediaItem => m.kind === 'internal')
        .map(m => m.file);

      const externalMedia = mediaItems
        .filter((m): m is ExternalMediaItem => m.kind === 'external')
        .map(m => ({ externalUrl: m.url, type: m.type }));

      const lessonData = {
        title: newLesson.title!,
        description: newLesson.description || '',
        moduleId: parseInt(module.id),
        questions: (newLesson.questions || []).map(q => ({
          text: q.text,
          options: q.options,
          correctAns: q.options[q.correctAnswer],
        })),
        externalMedia,
      };

      await moduleService.createLesson(lessonData, internalFiles);

      // Refetch module to get fresh data
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);

      resetForm();
      setIsAdding(false);
    } catch (error) {
      console.error('Darsni saqlashda xatolik:', error);
      alert('Darsni saqlashda xatolik yuz berdi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Darsni o\'chirishni istaysizmi? Bu amal qaytarilmaydi.')) return;
    try {
      await moduleService.deleteLesson(lessonId);
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
    } catch {
      alert('Darsni o\'chirishda xatolik yuz berdi');
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson(lesson);
    setMediaItems([]); // existing media shown separately; new uploads added here
    setIsAdding(true);
  };

  const handleAddQuestionToNewLesson = () => {
    if (!currentQuestion.text || currentQuestion.options?.some(o => !o)) return;
    const questionToAdd: Question = {
      id: `q-${Date.now()}`,
      text: currentQuestion.text!,
      options: currentQuestion.options as string[],
      correctAnswer: currentQuestion.correctAnswer!,
    };
    setNewLesson(prev => ({ ...prev, questions: [...(prev.questions || []), questionToAdd] }));
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
  };

  // ─── Helper: file type icon ───────────────────────────────────────────────
  const fileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return 'fa-file-video text-blue-500';
    if (file.type.startsWith('image/')) return 'fa-file-image text-green-500';
    return 'fa-file text-slate-400';
  };

  const externalTypeIcon = (type: string) => {
    if (type === 'VIDEO') return 'fa-film text-blue-500';
    if (type === 'IMAGE') return 'fa-image text-green-500';
    return 'fa-file-alt text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Modul tarkibini boshqarish</h3>
          <p className="text-slate-500 text-sm">Hozirgi darslar soni: {module.lessons.length} ta</p>
        </div>
        <button
          onClick={() => {
            if (isAdding) resetForm();
            setIsAdding(!isAdding);
          }}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
          }`}
        >
          <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2`}></i>
          {isAdding ? 'Bekor qilish' : "Yangi dars qo'shish"}
        </button>
      </div>

      {/* Add/Edit Lesson Form */}
      {isAdding && (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-slideUp">
          <div className="bg-blue-600 px-6 py-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              <i className="fas fa-file-video"></i>
              {editingLessonId ? 'Darsni tahrirlash' : 'Yangi dars formasi'}
            </h4>
          </div>

          <div className="p-6 space-y-6">
            {/* Title & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Dars sarlavhasi *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Masalan: Tizim loglari bilan ishlash"
                  value={newLesson.title}
                  onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Qisqacha tavsif</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Dars haqida qisqacha..."
                  value={newLesson.description}
                  onChange={e => setNewLesson({ ...newLesson, description: e.target.value })}
                />
              </div>
            </div>

            {/* ─── MEDIA SECTION ─────────────────────────────────────────── */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <i className="fas fa-photo-film text-blue-600"></i>
                  Media fayllar
                  <span className="ml-1 text-xs font-normal text-slate-400">(bir nechta qo'shish mumkin)</span>
                </h5>
              </div>

              <div className="p-5 space-y-4">
                {/* Internal file upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Fayl yuklash (video, rasm)
                  </label>
                  <label
                    htmlFor="media-upload"
                    className="flex items-center justify-center gap-3 w-full px-4 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all text-slate-500 text-sm"
                  >
                    <i className="fas fa-cloud-upload-alt text-xl text-blue-400"></i>
                    <span>Fayllarni tanlash yoki shu yerga tashlang</span>
                  </label>
                  <input
                    id="media-upload"
                    type="file"
                    className="hidden"
                    accept="video/*,image/*"
                    multiple
                    onChange={handleFileSelect}
                  />
                </div>

                {/* External URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Tashqi havola (YouTube, boshqa)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={externalType}
                      onChange={e => setExternalType(e.target.value as 'VIDEO' | 'IMAGE' | 'OTHER')}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="VIDEO">🎬 Video</option>
                      <option value="IMAGE">🖼️ Rasm</option>
                      <option value="OTHER">📄 Boshqa</option>
                    </select>
                    <input
                      type="text"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
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

                {/* ─── Added media list ──────────────────────────────────── */}
                {mediaItems.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Qo'shilgan media ({mediaItems.length} ta)
                    </p>
                    {mediaItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <span className="text-slate-400 text-xs font-bold w-5 text-center">{idx + 1}</span>
                        {item.kind === 'internal' ? (
                          <>
                            <i className={`fas ${fileIcon(item.file)} text-lg w-5 text-center`}></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{item.file.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {(item.file.size / (1024 * 1024)).toFixed(1)} MB · Lokal fayl
                              </p>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                              UPLOAD
                            </span>
                          </>
                        ) : (
                          <>
                            <i className={`fas ${externalTypeIcon(item.type)} text-lg w-5 text-center`}></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{item.url}</p>
                              <p className="text-[10px] text-slate-400">Tashqi havola · {item.type}</p>
                            </div>
                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">
                              {item.type}
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveMedia(item.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                          title="O'chirish"
                        >
                          <i className="fas fa-times-circle text-lg"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {mediaItems.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Hali media qo'shilmagan
                  </p>
                )}
              </div>
            </div>

            {/* ─── QUESTIONS SECTION ─────────────────────────────────────── */}
            <div className="border-t border-slate-100 pt-6">
              <h5 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fas fa-tasks text-blue-600"></i>
                Test savollarini yaratish
              </h5>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 mb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Savol matni</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="Savolni kiriting..."
                    value={currentQuestion.text}
                    onChange={e => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options?.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <button
                        onClick={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: idx })}
                        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                          currentQuestion.correctAnswer === idx
                            ? 'bg-green-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-400'
                        }`}
                        title="To'g'ri javob sifatida belgilash"
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                        placeholder={`Variant ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const newOpts = [...(currentQuestion.options || [])];
                          newOpts[idx] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOpts });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddQuestionToNewLesson}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"
                >
                  Savolni ro'yxatga qo'shish
                </button>
              </div>

              {/* Added Questions */}
              {(newLesson.questions?.length || 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 px-1">
                    Qo'shilgan savollar ({newLesson.questions?.length || 0}):
                  </p>
                  {newLesson.questions?.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm"
                    >
                      <p className="text-xs font-medium text-slate-700 truncate max-w-md">
                        <span className="font-bold mr-2">{idx + 1}.</span> {q.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          To'g'ri: {String.fromCharCode(65 + q.correctAnswer)}
                        </span>
                        <button
                          onClick={() =>
                            setNewLesson({
                              ...newLesson,
                              questions: newLesson.questions?.filter((_, i) => i !== idx),
                            })
                          }
                          className="text-red-400 hover:text-red-600"
                        >
                          <i className="fas fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleAddLesson}
                disabled={isUploading}
                className={`px-8 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center gap-2 ${
                  isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...</>
                ) : (
                  <><i className="fas fa-save"></i> {editingLessonId ? "O'zgarishlarni saqlash" : 'Darsni saqlash'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Lessons List */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 px-1">Mavjud darslar</h4>
        {module.lessons.map((lesson, idx) => (
          <div
            key={lesson.id}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
              {idx + 1}
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-slate-900">{lesson.title}</h5>
              <p className="text-xs text-slate-400">
                {lesson.questions.length} ta savol ·{' '}
                {(lesson.media?.length || 0)} ta media
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditLesson(lesson)}
                className="w-9 h-9 rounded-lg border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <i className="fas fa-edit text-sm"></i>
              </button>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="w-9 h-9 rounded-lg border border-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>
          </div>
        ))}
        {module.lessons.length === 0 && (
          <div className="py-10 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Hozircha darslar mavjud emas
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContentManager;
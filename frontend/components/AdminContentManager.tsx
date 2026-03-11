import React, { useState } from 'react';
import { SystemModule, Lesson, Question } from '../types';
import { moduleService } from '../services/moduleService';

interface AdminContentManagerProps {
  module: SystemModule;
  onUpdateModule: (updatedModule: SystemModule) => void;
}

const AdminContentManager: React.FC<AdminContentManagerProps> = ({ module, onUpdateModule }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: '',
    videoUrl: '',
    description: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddLesson = async () => {
    // Basic validation: must have title and either a video file or a video URL
    if (!newLesson.title || (!newLesson.videoUrl && !videoFile)) {
      alert('Sarlavha va video (fayl yoki havola) kiritilishi shart');
      return;
    }

    setIsUploading(true);
    try {
      const lessonData = {
        title: newLesson.title,
        description: newLesson.description || '',
        moduleId: parseInt(module.id),
        questions: (newLesson.questions || []).map(q => ({
          text: q.text,
          options: q.options,
          correctAns: q.options[q.correctAnswer]
        })),
        externalMedia: newLesson.videoUrl ? [{
          externalUrl: newLesson.videoUrl,
          type: 'VIDEO'
        }] : []
      };

      const files = videoFile ? [videoFile] : [];

      const savedLesson = await moduleService.createLesson(lessonData, files);

      // Fetch updated module from backend to get fresh lesson/media
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);

      setNewLesson({ title: '', videoUrl: '', description: '', questions: [] });
      setVideoFile(null);
      setIsAdding(false);
      setEditingLessonId(null);
    } catch (error) {
      console.error('Darsni saqlashda xatolik:', error);
      alert('Darsni saqlashda xatolik yuz berdi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Darsni o‘chirishni istaysizmi? Bu amal qaytarilmaydi.')) return;
    try {
      await moduleService.deleteLesson(lessonId); // You need to implement this in moduleService
      // Fetch updated module from backend
      const updatedModule = await moduleService.getModuleById(module.id);
      onUpdateModule(updatedModule);
    } catch (error) {
      alert('Darsni o‘chirishda xatolik yuz berdi');
    }
  };
  

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson(lesson);
    setIsAdding(true);
  };

  const handleAddQuestionToNewLesson = () => {
    if (!currentQuestion.text || currentQuestion.options?.some(o => !o)) return;

    const questionToAdd: Question = {
      id: `q-${Date.now()}`,
      text: currentQuestion.text!,
      options: currentQuestion.options as string[],
      correctAnswer: currentQuestion.correctAnswer!
    };

    setNewLesson(prev => ({
      ...prev,
      questions: [...(prev.questions || []), questionToAdd]
    }));

    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Modul tarkibini boshqarish</h3>
          <p className="text-slate-500 text-sm">Hozirgi darslar soni: {module.lessons.length} ta</p>
        </div>
        <button
          onClick={() => {
            if (isAdding) {
              setEditingLessonId(null);
              setNewLesson({ title: '', videoUrl: '', description: '', questions: [] });
            }
            setIsAdding(!isAdding);
          }}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            }`}
        >
          <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2`}></i>
          {isAdding ? 'Bekor qilish' : 'Yangi dars qo\'shish'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-slideUp">
          <div className="bg-blue-600 px-6 py-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              <i className="fas fa-file-video"></i>
              {editingLessonId ? 'Darsni tahrirlash' : 'Yangi video dars formasi'}
            </h4>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Dars sarlavhasi</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Masalan: Tizim loglari bilan ishlash"
                  value={newLesson.title}
                  onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">YouTube Embed URL</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="https://www.youtube.com/embed/..."
                  value={newLesson.videoUrl}
                  onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Video yuklash</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="video-upload"
                    className="hidden"
                    accept="video/*"
                    onChange={e => setVideoFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-slate-500 text-sm"
                  >
                    <i className="fas fa-cloud-upload-alt text-lg"></i>
                    {videoFile ? videoFile.name : 'Video faylni tanlang'}
                  </label>
                  {videoFile && (
                    <button
                      onClick={() => setVideoFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <i className="fas fa-times-circle text-xl"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Qisqacha tavsif</label>
                <textarea
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none h-20 resize-none"
                  placeholder="Dars haqida batafsilroq ma'lumot..."
                  value={newLesson.description}
                  onChange={e => setNewLesson({ ...newLesson, description: e.target.value })}
                ></textarea>
              </div>
            </div>

            {/* Questions Section */}
            <div className="border-t border-slate-100 pt-6">
              <h5 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fas fa-tasks text-blue-600"></i>
                Test savollarini yaratish
              </h5>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 mb-6">
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
                        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${currentQuestion.correctAnswer === idx ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-400'
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

              {/* Added Questions List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 px-1">Qo'shilgan savollar ({newLesson.questions?.length || 0}):</p>
                {newLesson.questions?.map((q, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <p className="text-xs font-medium text-slate-700 truncate max-w-md">
                      <span className="font-bold mr-2">{idx + 1}.</span> {q.text}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        To'g'ri javob: {String.fromCharCode(65 + q.correctAnswer)}
                      </span>
                      <button
                        onClick={() => {
                          const newQs = newLesson.questions?.filter((_, i) => i !== idx);
                          setNewLesson({ ...newLesson, questions: newQs });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <i className="fas fa-trash-can text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleAddLesson}
                disabled={isUploading}
                className={`px-8 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
              >
                {isUploading ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> Saqlanmoqda...</>
                ) : (
                  editingLessonId ? 'O\'zgarishlarni saqlash' : 'Darsni saqlash'
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
          <div key={lesson.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all group">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
              {idx + 1}
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-slate-900">{lesson.title}</h5>
              <p className="text-xs text-slate-400">{lesson.questions.length} ta savol • {lesson.videoUrl.split('/').pop()}</p>
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

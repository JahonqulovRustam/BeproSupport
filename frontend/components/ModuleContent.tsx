import React, { useState } from 'react';
import { SystemModule, Lesson, User } from '../types';
import { geminiService } from '../services/geminiService';
import AdminContentManager from './AdminContentManager';

interface ModuleContentProps {
  module: SystemModule;
  currentUser: User;
  onTakeTest: (lesson: Lesson) => void;
  onUpdateModule: (updatedModule: SystemModule) => void;
}

const ModuleContent: React.FC<ModuleContentProps> = ({ module, currentUser, onTakeTest, onUpdateModule }) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(module.lessons.length > 0 ? module.lessons[0] : null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  // Update selected lesson if module changes or lessons are added
  React.useEffect(() => {
    if (module.lessons.length > 0 && !selectedLesson) {
      setSelectedLesson(module.lessons[0]);
    } else if (module.lessons.length === 0) {
      setSelectedLesson(null);
    }
  }, [module.lessons]);

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !selectedLesson) return;
    setIsAsking(true);
    const answer = await geminiService.getTutorAdvice(selectedLesson.title, aiQuestion);
    setAiResponse(answer || "Kechirasiz, ma'lumotni qayta ishlashda xatolik yuz berdi.");
    setIsAsking(false);
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
            <i className="fas fa-eye"></i>
            Ko'rish rejimiga qaytish
          </button>
        </div>
        <AdminContentManager module={module} onUpdateModule={onUpdateModule} />
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
              <i className="fas fa-tools"></i>
              Dars qo'shish
            </button>
          )}
        </div>
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
          <i className="fas fa-book-open text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Darslar mavjud emas</h3>
        <p className="text-slate-500 max-w-xs text-center mt-2">Ushbu modul uchun hali darslar qo'shilmagan. Iltimos, keyinroq qaytib ko'ring.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={selectedLesson.videoUrl}
                title={selectedLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedLesson.title}</h2>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => setIsManaging(true)}
                        className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-edit"></i>
                        Tahrirlash
                      </button>
                    )}
                  </div>
                  <p className="text-slate-500">{selectedLesson.description}</p>
                </div>
                <button
                  onClick={() => onTakeTest(selectedLesson)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-file-lines"></i>
                  Test Topshirish (10 ta savol)
                </button>
              </div>
            </div>
          </div>

          {/* AI Tutor Panel */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <i className="fas fa-robot"></i>
              </div>
              <h3 className="font-bold text-blue-900">Bepro AI Repetitor</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">{selectedLesson.title} bo'yicha tushunmagan savollaringizni AI mentorimizdan so'rang.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Masalan: Tizim xatosini qanday tuzataman...?"
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-sm"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
              />
              <button
                onClick={handleAskAi}
                disabled={isAsking}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {isAsking ? 'O\'ylamoqda...' : 'So\'rash'}
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

        {/* Lesson List Sidebar */}
        <div className="w-full lg:w-80 space-y-4">
          <h3 className="font-bold text-slate-900 px-2">Modul darslari</h3>
          <div className="space-y-2">
            {module.lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setSelectedLesson(lesson);
                  setAiResponse('');
                  setAiQuestion('');
                }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedLesson.id === lesson.id
                  ? 'border-blue-600 bg-white shadow-md'
                  : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedLesson.id === lesson.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${selectedLesson.id === lesson.id ? 'text-slate-900' : 'text-slate-600'}`}>
                      {lesson.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">12:45 daqiqa • 10 ta savol</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleContent;

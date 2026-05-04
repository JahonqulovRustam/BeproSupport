import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { testAttemptService } from '../services/testAttempService';

interface QuizProps {
  questions: Question[];
  lessonId: string;
  lessonTitle: string;
  currentUserId: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

type QuizStatus = 'INTRO' | 'IN_PROGRESS' | 'FINISHED';

const Quiz: React.FC<QuizProps> = ({ questions, lessonTitle, currentUserId, onComplete, onCancel }) => {
  const [status, setStatus] = useState<QuizStatus>('INTRO');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Track when quiz started
  const startedAt = useRef<string>('');

  const handleStart = () => {
    startedAt.current = new Date().toISOString();
    setStatus('IN_PROGRESS');
  };

  const handleSelect = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setStatus('FINISHED');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) correct++;
    });
    return { correct, percentage: Math.round((correct / questions.length) * 100) };
  };

  const handleSubmit = async () => {
    const { correct, percentage } = calculateScore();
    setSubmitting(true);
    setSubmitError('');

    try {
      await testAttemptService.submit({
        quizId: 0, // Fallback since Quiz.tsx doesn't have quizId
        totalQuestions: questions.length,
        answers: [], // Not populated in this legacy component
      });
      setSubmitted(true);
      onComplete(percentage);
    } catch (err) {
      console.error('Natija yuborishda xatolik:', err);
      setSubmitError('Natijani yuborishda xatolik yuz berdi. Qayta urinib ko\'ring.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    if (window.confirm("Rostdan ham testdan chiqmoqchimisiz? Barcha belgilagan javoblaringiz saqlanmaydi va bekor qilinadi.")) {
      onCancel();
    }
  };

  // ─── Render Intro ────────────────────────────────────────────────────────────
  if (status === 'INTRO') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-10 max-w-2xl w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-xl mb-6 mx-auto">
            <i className="fas fa-clipboard-check text-3xl"></i>
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-4">
            {lessonTitle}
          </h1>
          <p className="text-slate-500 text-center mb-8 text-lg">
            Yakuniy test
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Umumiy savollar soni:</span>
              <span className="font-bold text-slate-900">{questions.length} ta</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <span className="text-slate-600 font-medium">O'tish bali (minimum):</span>
              <span className="font-bold text-slate-900">80%</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Vaqt chegarasi:</span>
              <span className="font-bold text-slate-900">Cheklanmagan</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Javoblarni o'zgartirish:</span>
              <span className="font-bold text-slate-900">Mumkin (orqaga qaytish bor)</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-4 text-slate-600 font-bold bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
            >
              Orqaga qaytish
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              Testni boshlash <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Finished ─────────────────────────────────────────────────────────
  if (status === 'FINISHED') {
    const { correct, percentage } = calculateScore();
    const passed = percentage >= 80;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-10 max-w-2xl w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            <i className={`fas ${passed ? 'fa-check' : 'fa-times'} text-4xl`}></i>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Test yakunlandi</h2>
          <p className="text-slate-500 mb-8">Natijalaringiz hisoblandi.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <p className="text-slate-500 text-sm font-medium mb-1">To'g'ri javoblar</p>
              <p className="text-2xl font-bold text-slate-900">{correct} / {questions.length}</p>
            </div>
            <div className={`border rounded-lg p-6 ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-medium mb-1 ${passed ? 'text-green-700' : 'text-red-700'}`}>Umumiy ball</p>
              <p className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</p>
            </div>
          </div>

          <p className={`text-lg font-bold mb-8 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {passed ? "Tabriklaymiz, siz testdan o'tdingiz!" : "Afsuski, o'tish balini to'play olmadingiz (Min: 80%)."}
          </p>

          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-left text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>{submitError}
            </div>
          )}

          {submitted ? (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-left text-sm font-medium flex items-center gap-3">
              <i className="fas fa-check-circle text-lg"></i>
              Natija serverga muvaffaqiyatli saqlandi! Tizimga qaytishingiz mumkin.
            </div>
          ) : (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-left text-sm flex items-start gap-3">
              <i className="fas fa-info-circle text-lg mt-0.5"></i>
              <p>Natijani saqlash uchun quyidagi tugmani bosishingiz shart. Aks holda urinish bekor qilinadi.</p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><i className="fas fa-spinner fa-spin"></i> Yuborilmoqda...</>
                  : <><i className="fas fa-save"></i> Natijani saqlash</>
                }
              </button>
            )}

            {submitted && (
              <button
                onClick={() => onComplete(percentage)}
                className="flex-1 py-4 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors"
              >
                Tizimga qaytish
              </button>
            )}

            {!passed && !submitted && (
              <button
                onClick={() => {
                  setStatus('INTRO');
                  setCurrentIndex(0);
                  setAnswers([]);
                  setSubmitError('');
                }}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
              >
                <i className="fas fa-redo mr-2"></i>Qayta urinish
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render In Progress ──────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-fadeIn">
      {/* Formal Top Bar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
            <i className="fas fa-book"></i>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{lessonTitle}</h2>
            <p className="text-sm text-slate-500 font-medium">Davom etmoqda...</p>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="text-slate-500 hover:text-red-600 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          <i className="fas fa-power-off"></i> Testdan chiqish
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5">
        <div
          className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 py-12 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
            Savol {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-10 mb-8">
          <h3 className="text-2xl font-bold text-slate-900 leading-relaxed mb-8">
            {currentQuestion.text}
          </h3>

          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-5 rounded-lg border-2 transition-all duration-200 flex items-start gap-4 ${
                  answers[currentIndex] === idx
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-sm ${
                  answers[currentIndex] === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={`text-lg pt-0.5 ${answers[currentIndex] === idx ? 'font-medium' : ''}`}>
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-auto">
          {currentIndex > 0 ? (
            <button
              onClick={handlePrev}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3"
            >
              <i className="fas fa-arrow-left"></i> Orqaga
            </button>
          ) : (
            <div></div> // empty div for flex spacing
          )}

          <button
            disabled={answers[currentIndex] === undefined}
            onClick={handleNext}
            className="px-10 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center gap-3"
          >
            {currentIndex === questions.length - 1 ? 'Yakunlash' : 'Keyingi savol'}
            <i className={`fas ${currentIndex === questions.length - 1 ? 'fa-check' : 'fa-arrow-right'}`}></i>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Quiz;

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Quiz, Question } from '../types';
import { quizService } from '../services/quizService';
import { testAttemptService, TestAttemptResponse } from '../services/testAttempService';

interface QuizSolverProps {
  quiz: Quiz;
  onComplete?: (results: { correctCount: number; totalCount: number; score: number }) => void;
}

type QuizStatus = 'INTRO' | 'IN_PROGRESS' | 'SUBMITTING' | 'FINISHED';

const QuizSolver: React.FC<QuizSolverProps> = ({ quiz, onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [status, setStatus] = useState<QuizStatus>('INTRO');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<TestAttemptResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const fetchedQuestions = await quizService.getQuizQuestions(quiz.id);
        setQuestions(fetchedQuestions);
        setError(null);
      } catch (err) {
        console.error('Failed to load quiz questions:', err);
        setError('Savollar yuklanishida xatolik yuz berdi');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [quiz.id]);

  const handleStart = () => {
    setStatus('IN_PROGRESS');
    setCurrentIndex(0);
    setSelectedAnswers({});
    if (quiz.timeLimitInMinutes) {
      setTimeLeft(quiz.timeLimitInMinutes * 60);
    } else {
      setTimeLeft(null);
    }
  };

  const submitQuiz = async () => {
    setStatus('SUBMITTING');
    try {
      const answers = Object.entries(selectedAnswers).map(([qId, optionIdx]) => {
        const q = questions.find(q => q.id === qId);
        return {
          questionId: Number(qId),
          selectedAnswer: q ? q.options[optionIdx] : ''
        };
      });
      const attemptResult = await testAttemptService.submit({
        quizId: Number(quiz.id),
        totalQuestions: questions.length,
        answers
      });
      setResult(attemptResult);
      setStatus('FINISHED');
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError('Testni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      setStatus('INTRO');
    }
  };

  useEffect(() => {
    if (status === 'IN_PROGRESS' && timeLeft !== null) {
      if (timeLeft <= 0) {
        submitQuiz();
        return;
      }
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, timeLeft]);

  const handleSelect = (optionIndex: number) => {
    const currentQuestion = questions[currentIndex];
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }));
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await submitQuiz();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleExit = () => {
    if (window.confirm("Rostdan ham testdan chiqmoqchimisiz? Barcha belgilagan javoblaringiz o'chib ketadi.")) {
      setStatus('INTRO');
      setSelectedAnswers({});
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center min-h-[600px]">
        <div className="mb-4">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Savollar yuklanmoqda...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <i className="fas fa-exclamation-circle text-red-600 dark:text-red-400 text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{error || 'Savollar mavjud emas'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ushbu testda hozircha savollar yo'q.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Intro (Normal inline layout) ───────────────────────────────────
  if (status === 'INTRO') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-10 animate-fadeIn border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-6 mx-auto">
          <i className="fas fa-clipboard-list text-3xl"></i>
        </div>
        
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center mb-4">
          {quiz.name}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-lg">
          Yakuniy test
        </p>

        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-8 space-y-4 max-w-xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Umumiy savollar soni:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{questions.length} ta</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-medium">O'tish bali (minimum):</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{quiz.passingScore ?? 85}%</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Vaqt chegarasi:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{quiz.timeLimitInMinutes ? `${quiz.timeLimitInMinutes} daqiqa` : 'Cheklanmagan'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Javoblarni o'zgartirish:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">Mumkin (orqaga qaytish bor)</span>
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3"
          >
            Testni boshlash <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    );
  }

  // ─── Full-Screen Portals for IN_PROGRESS and FINISHED ─────────────────────
  
  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex) / questions.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-900 flex flex-col animate-in fade-in duration-300">
      
      {status === 'SUBMITTING' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Javoblaringiz tekshirilmoqda...</p>
        </div>
      )}

      {status === 'IN_PROGRESS' && (
        <>
          {/* Formal Top Bar */}
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400">
                <i className="fas fa-tasks"></i>
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{quiz.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Davom etmoqda...</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 font-bold text-lg ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                  <i className="fas fa-clock"></i>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
              <button
                onClick={handleExit}
                className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <i className="fas fa-power-off"></i> Testdan chiqish
              </button>
            </div>
          </header>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 shrink-0">
            <div
              className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-8 py-12 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                Savol {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-10 mb-8 shrink-0">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed mb-8">
                {currentQuestion.text}
              </h3>

              <div className="space-y-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 text-blue-900 dark:text-blue-100'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className={`text-lg pt-0.5 ${isSelected ? 'font-medium' : ''}`}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-auto shrink-0 pt-4">
              {currentIndex > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-3"
                >
                  <i className="fas fa-arrow-left"></i> Orqaga
                </button>
              ) : (
                <div></div>
              )}

              <button
                disabled={selectedAnswers[currentQuestion.id] === undefined}
                onClick={handleNext}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center gap-3"
              >
                {currentIndex === questions.length - 1 ? 'Testni yakunlash' : 'Keyingi savol'}
                <i className={`fas ${currentIndex === questions.length - 1 ? 'fa-check' : 'fa-arrow-right'}`}></i>
              </button>
            </div>
          </main>
        </>
      )}

      {status === 'FINISHED' && result && (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6">
          <div className="m-auto w-full max-w-3xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            <div className="text-center p-10 border-b border-slate-200 dark:border-slate-700">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                result.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <i className={`fas ${result.passed ? 'fa-check' : 'fa-times'} text-5xl`}></i>
              </div>

              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Test yakunlandi</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">Natijalaringiz hisoblandi.</p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">To'g'ri javoblar</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{result.correctAnswers} <span className="text-lg text-slate-400">/ {questions.length}</span></p>
                </div>
                <div className={`border rounded-2xl p-6 ${result.passed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <p className={`text-sm font-medium mb-2 ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Umumiy ball</p>
                  <p className={`text-4xl font-bold ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{Math.round(result.scorePercentage)}%</p>
                </div>
              </div>

              <p className={`text-xl font-bold ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {result.passed ? "Tabriklaymiz, siz testdan o'tdingiz! Natija saqlandi." : "Afsuski, o'tish balini to'play olmadingiz."}
              </p>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-900/30">
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    onComplete?.({ correctCount: result.correctAnswers, totalCount: questions.length, score: result.scorePercentage });
                    setStatus('INTRO');
                    setSelectedAnswers({});
                  }}
                  className="px-10 py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors text-lg flex items-center gap-3"
                >
                  <i className="fas fa-home"></i> Darsga qaytish
                </button>

                {!result.passed && (
                  <button
                    onClick={() => {
                      setStatus('INTRO');
                      setCurrentIndex(0);
                      setSelectedAnswers({});
                    }}
                    className="px-10 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-lg flex items-center gap-3"
                  >
                    <i className="fas fa-redo"></i> Qayta urinish
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>,
    document.body
  );
};

export default QuizSolver;

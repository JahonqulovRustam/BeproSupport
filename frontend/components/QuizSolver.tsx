import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
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
  const [fullQuizData, setFullQuizData] = useState<Quiz | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const [fetchedQuestions, fetchedQuizData] = await Promise.all([
          quizService.getQuizQuestions(quiz.id),
          quizService.getQuizById(Number(quiz.id)).catch(() => null)
        ]);
        setQuestions(fetchedQuestions);
        setFullQuizData(fetchedQuizData);
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
    const activeTimeLimit = fullQuizData?.timeLimitInMinutes ?? quiz.timeLimitInMinutes;
    if (activeTimeLimit) {
      setTimeLeft(activeTimeLimit * 60);
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

  useEffect(() => {
    if (status === 'FINISHED' && result) {
      if (result.passed) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
      }
    }
  }, [status, result]);

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
    setShowExitDialog(true);
  };

  const confirmExit = async () => {
    setShowExitDialog(false);
    await submitQuiz();
  };

  const cancelExit = () => {
    setShowExitDialog(false);
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
    const activePassingScore = fullQuizData?.passingScore ?? quiz.passingScore ?? 85;
    const activeTimeLimit = fullQuizData?.timeLimitInMinutes ?? quiz.timeLimitInMinutes;
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-10 animate-fadeIn border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-6 mx-auto">
          <i className="fas fa-clipboard-list text-3xl"></i>
        </div>
        
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center mb-4">
          {fullQuizData?.name || quiz.name}
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
            <span className="font-bold text-slate-900 dark:text-slate-100">{activePassingScore}%</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Vaqt chegarasi:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{activeTimeLimit ? `${activeTimeLimit} daqiqa` : 'Cheklanmagan'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Urinishlar soni:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">Cheklanmagan</span>
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
      
      {showExitDialog && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">Testdan chiqish</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
              Rostdan ham testdan chiqmoqchimisiz? Barcha belgilagan javoblaringiz o'chib ketadi va natijangiz saqlanmaydi.
            </p>
            <div className="flex gap-4">
              <button
                onClick={cancelExit}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-600/20"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'SUBMITTING' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-bold">Javoblaringiz tekshirilmoqda...</p>
        </div>
      )}

      {status === 'IN_PROGRESS' && (
        <>
          {/* Strict Top Bar */}
          <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i className="fas fa-laptop-code text-lg"></i>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white tracking-wide text-base uppercase">{quiz.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase mt-0.5">Rasmiy Test Jarayoni</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg border ${timeLeft < 60 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 animate-pulse' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}>
                  <i className="fas fa-hourglass-half text-xs"></i>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
              <button
                onClick={handleExit}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
              >
                <i className="fas fa-sign-out-alt"></i> Chiqish
              </button>
            </div>
          </header>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 shrink-0">
            <div
              className="bg-blue-500 h-2 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 py-6 md:py-8 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                Savol {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-3xl p-6 md:p-8 mb-6 shrink-0 backdrop-blur-sm">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
                {currentQuestion.text}
              </h3>

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-white shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-base transition-colors ${
                        isSelected ? 'bg-blue-500 text-white shadow-inner' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className={`text-base ${isSelected ? 'font-medium' : ''}`}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-auto shrink-0 pt-2">
              {currentIndex > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
                >
                  <i className="fas fa-arrow-left"></i> Oldingi
                </button>
              ) : (
                <div></div>
              )}

              <button
                disabled={selectedAnswers[currentQuestion.id] === undefined}
                onClick={handleNext}
                className={`px-8 py-3 rounded-xl font-bold text-base transition-all flex items-center gap-2 ${
                  selectedAnswers[currentQuestion.id] === undefined
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : currentIndex === questions.length - 1
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.3)]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                }`}
              >
                {currentIndex === questions.length - 1 ? 'Yakunlash va Jo\'natish' : 'Keyingi'}
                <i className={`fas ${currentIndex === questions.length - 1 ? 'fa-paper-plane' : 'fa-arrow-right'}`}></i>
              </button>
            </div>
          </main>
        </>
      )}

      {status === 'FINISHED' && result && (
        <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 transition-colors duration-1000 ${result.passed ? 'bg-slate-50 dark:bg-slate-900' : 'bg-red-50 dark:bg-red-950/20'}`}>
          <div className={`m-auto w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border ${result.passed ? 'border-slate-200 dark:border-slate-800' : 'border-red-200 dark:border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.1)]'} overflow-hidden relative`}>
            
            {!result.passed && (
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            )}
            {result.passed && (
              <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            )}

            <div className="text-center p-10 border-b border-slate-100 dark:border-slate-800">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                result.passed ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              }`}>
                <i className={`fas ${result.passed ? 'fa-check-double' : 'fa-times'} text-5xl`}></i>
              </div>

              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{result.passed ? 'Muvaqqiyatli!' : 'Sinovdan O\'ta Olmadingiz'}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg font-medium tracking-wide">Rasmiy natijalar e'lon qilindi</p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">To'g'ri javoblar</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white">{result.correctAnswers} <span className="text-xl text-slate-400">/ {questions.length}</span></p>
                </div>
                <div className={`border rounded-2xl p-6 ${result.passed ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-500/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/30'}`}>
                  <p className={`text-xs uppercase tracking-widest font-bold mb-2 ${result.passed ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>Umumiy ball</p>
                  <p className={`text-4xl font-black ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500'}`}>{Math.round(result.scorePercentage)}%</p>
                </div>
              </div>

              <p className={`text-xl font-bold ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {result.passed ? "Tabriklaymiz! Siz o'tish balini to'pladingiz va sertifikatga loyiq ko'rildingiz." : "Afsuski, talab qilingan o'tish balini to'play olmadingiz."}
              </p>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    onComplete?.({ correctCount: result.correctAnswers, totalCount: questions.length, score: result.scorePercentage });
                    setStatus('INTRO');
                    setSelectedAnswers({});
                  }}
                  className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-base flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <i className="fas fa-sign-out-alt"></i> Natijani saqlash va chiqish
                </button>

                {!result.passed && (
                  <button
                    onClick={() => {
                      setStatus('INTRO');
                      setCurrentIndex(0);
                      setSelectedAnswers({});
                    }}
                    className="px-8 py-3 bg-red-50 dark:bg-red-600/10 border-2 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-600/20 transition-colors text-base flex items-center gap-2 shadow-sm"
                  >
                    <i className="fas fa-redo-alt"></i> Qayta urinib ko'rish
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

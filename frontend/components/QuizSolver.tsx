import React, { useState, useEffect } from 'react';
import { Quiz, Question } from '../types';
import { quizService } from '../services/quizService';

interface QuizSolverProps {
  quiz: Quiz;
  onComplete?: (results: { correctCount: number; totalCount: number; score: number }) => void;
}

const QuizSolver: React.FC<QuizSolverProps> = ({ quiz, onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
            <p className="text-sm text-slate-500 dark:text-slate-400">Iltimos, keyinroq urinib ko'ring</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isSubmitted) {
    const correctCount = Object.entries(selectedAnswers).reduce((count, [qId, answer]) => {
      const question = questions.find((q) => q.id === qId);
      return count + (question && question.correctAnswer === answer ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / questions.length) * 100);

    onComplete?.({ correctCount, totalCount: questions.length, score });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            score >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            <i className={`fas ${score >= 70 ? 'fa-check-circle' : 'fa-info-circle'} text-3xl ${
              score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}></i>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {score}%
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            {correctCount} ta / {questions.length} ta savolga to'g'ri javob
          </p>
          <p className={`text-sm font-medium ${
            score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {score >= 70 ? '✓ Siz testni muvaffaqiyatli tumushtadingiz!' : '📚 Yana urinib ko\'ring'}
          </p>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Test Natijalari:</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {questions.map((q, idx) => {
              const userAnswer = selectedAnswers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div key={q.id} className={`p-3 rounded-lg border ${
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCorrect
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Savol {idx + 1}: {q.text}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        To'g'ri javob: <span className="font-semibold">{q.options[q.correctAnswer]}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Sizning javobingiz: <span className="font-semibold">{q.options[userAnswer]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
            setIsSubmitted(false);
          }}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
        >
          <i className="fas fa-redo mr-2"></i> Qayta Boshlash
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden">
      {/* Header with title and progress */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{quiz.name}</h2>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question section */}
      <div className="p-8">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full mb-3">
            Savol {currentQuestionIndex + 1}
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed mt-2">
            {currentQuestion.text}
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestion.id] === idx;
            const isCorrectAnswer = idx === currentQuestion.correctAnswer;

            return (
              <button
                key={idx}
                onClick={() => {
                  if (!isSubmitted) {
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: idx,
                    }));
                  }
                }}
                className={`w-full p-4 text-left rounded-2xl border-2 transition-all group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-500'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <i className="fas fa-check text-white text-xs"></i>}
                  </div>
                  <span className={`text-sm font-medium leading-relaxed ${
                    isSelected
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentQuestionIndex === 0}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <i className="fas fa-chevron-left mr-2"></i> Oldingi
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={() => {
                // Check if all questions are answered
                const allAnswered = questions.every((q) => selectedAnswers[q.id] !== undefined);
                if (!allAnswered) {
                  alert('Iltimos, barcha savollarni javob bering');
                  return;
                }
                setIsSubmitted(true);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-check"></i> Testni Tugatish
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              Keyingi <i className="fas fa-chevron-right ml-2"></i>
            </button>
          )}
        </div>

        {/* Answer indicator */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Javob bergan savollar:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-9 h-9 rounded-lg font-semibold text-xs transition-all flex items-center justify-center ${
                  selectedAnswers[q.id] !== undefined
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                } ${currentQuestionIndex === idx ? 'ring-2 ring-blue-400 scale-125' : ''}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSolver;

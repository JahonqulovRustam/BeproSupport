import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { testAttemptService } from '../services/testAttempService';

interface QuizProps {
  questions: Question[];
  lessonId: string;
  lessonTitle: string;     // ← needed: backend wants lesson as String
  currentUserId: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, lessonId, lessonTitle, currentUserId, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Track when quiz started
  const startedAt = useRef<string>(new Date().toISOString());

  const handleSelect = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
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
        userId: parseInt(currentUserId),
        lesson: lessonTitle,          // ← String as backend expects
        totalQuestions: questions.length,
        correctAnswers: correct,
        startedAt: startedAt.current,
        submittedAt: new Date().toISOString(),
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

  if (isFinished) {
    const { correct, percentage } = calculateScore();
    const passed = percentage >= 80;

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-center border border-slate-100 animate-fadeIn">
        {/* Result icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          passed ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
        }`}>
          <i className={`fas ${passed ? 'fa-check' : 'fa-exclamation'} text-3xl`}></i>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-2">Test yakunlandi!</h2>
        <p className="text-slate-500 mb-2">Siz ushbu dars bo'yicha imtihonni topshirdingiz.</p>
        <p className="text-slate-400 text-sm mb-6">
          {correct} / {questions.length} ta to'g'ri javob
        </p>

        {/* Score */}
        <div className={`text-6xl font-extrabold mb-2 ${passed ? 'text-green-600' : 'text-orange-500'}`}>
          {percentage}%
        </div>
        <p className={`text-sm font-bold mb-8 ${passed ? 'text-green-600' : 'text-orange-500'}`}>
          {passed ? "✅ O'tdingiz!" : "❌ Minimum ball: 80%"}
        </p>

        {/* Error message */}
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>{submitError}
          </div>
        )}

        {/* Submitted success */}
        {submitted && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-bold">
            <i className="fas fa-check-circle mr-2"></i>Natija muvaffaqiyatli saqlandi!
          </div>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          {/* Submit button — only show if not yet submitted */}
          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {submitting
                ? <><i className="fas fa-spinner fa-spin"></i> Yuborilmoqda...</>
                : <><i className="fas fa-paper-plane"></i> Natijani yuborish</>
              }
            </button>
          )}

          {/* Close button */}
          {submitted && (
            <button
              onClick={() => onComplete(percentage)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-home mr-2"></i>Darsga qaytish
            </button>
          )}

          {/* Retry button */}
          {!passed && (
            <button
              onClick={() => {
                setCurrentIndex(0);
                setAnswers([]);
                setIsFinished(false);
                setSubmitted(false);
                setSubmitError('');
                startedAt.current = new Date().toISOString();
              }}
              className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <i className="fas fa-redo mr-2"></i>Qayta urinish
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            {currentIndex + 1}-savol ({questions.length} tadan)
          </span>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-8">{currentQuestion.text}</h3>

        <div className="space-y-4 mb-10">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                answers[currentIndex] === idx
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-100 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  answers[currentIndex] === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {option}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex-1 h-2 bg-slate-100 rounded-full mr-12 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <button
            disabled={answers[currentIndex] === undefined}
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {currentIndex === questions.length - 1 ? 'Yakunlash' : 'Keyingisi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
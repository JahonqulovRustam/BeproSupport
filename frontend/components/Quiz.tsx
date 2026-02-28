
import React, { useState } from 'react';
import { Question } from '../types';

interface QuizProps {
  questions: Question[];
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

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
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      }
    });
    return (score / questions.length) * 100;
  };

  if (isFinished) {
    const finalScore = calculateScore();
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-center border border-slate-100">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${finalScore >= 80 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
          <i className={`fas ${finalScore >= 80 ? 'fa-check' : 'fa-exclamation'} text-3xl`}></i>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Test yakunlandi!</h2>
        <p className="text-slate-500 mb-6">Siz ushbu modul bo'yicha imtihonni topshirdingiz.</p>
        <div className="text-5xl font-extrabold text-blue-600 mb-8">{finalScore}%</div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onComplete(finalScore)}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Natijani yuborish
          </button>
          {finalScore < 80 && (
            <button
              onClick={() => {
                setCurrentIndex(0);
                setAnswers([]);
                setIsFinished(false);
              }}
              className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Qayta urinish
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{currentIndex + 1}-savol ({questions.length} tadan)</span>
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
            ></div>
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

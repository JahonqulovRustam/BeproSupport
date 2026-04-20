import React, { useState, useEffect } from 'react';
import { User, Question } from '../types';
import { testAttemptService, TestAttemptResponse } from '../services/testAttempService';
import { quizService } from '../services/quizService';

interface MyResultsProps {
  currentUser: User;
}

const MyResults: React.FC<MyResultsProps> = ({ currentUser }) => {
  const [attempts, setAttempts] = useState<TestAttemptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<Record<number, Question[]>>({});

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await testAttemptService.getAttemptsByUser(currentUser.id);
        setAttempts([...data].sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        ));
      } catch (err) {
        console.error('Natijalarni yuklashda xatolik:', err);
        setError('Natijalarni yuklashda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser.id]);

  const totalTests  = attempts.length;
  const passedTests = attempts.filter(a => a.passed).length;
  const avgScore    = totalTests > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercentage, 0) / totalTests) : 0;
  const bestScore   = totalTests > 0 ? Math.round(Math.max(...attempts.map(a => a.scorePercentage))) : 0;

  const toggleAttempt = async (attempt: TestAttemptResponse) => {
    if (expandedAttemptId === attempt.id) {
      setExpandedAttemptId(null);
      return;
    }
    setExpandedAttemptId(attempt.id);
    if (attempt.quizId && !attemptQuestions[attempt.quizId]) {
      try {
        const questions = await quizService.getQuizQuestions(attempt.quizId);
        setAttemptQuestions(prev => ({ ...prev, [attempt.quizId]: questions }));
      } catch (err) {
        console.error('Failed to fetch questions for attempt:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <i className="fas fa-spinner fa-spin text-3xl text-orange-500"></i>
          <p className="text-slate-400 text-sm">Natijalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* ─── Hero card — muted, not neon ─────────────────────────────────── */}
      <div className="bg-slate-800 dark:bg-slate-900 rounded-3xl p-8 text-white border border-slate-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
            <i className="fas fa-user-graduate"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{currentUser.name}</h2>
            <p className="text-slate-400 text-sm">{currentUser.login} · {currentUser.role}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jami testlar',   value: totalTests,      icon: 'fa-list-check'  },
            { label: "O'tilgan",       value: passedTests,     icon: 'fa-circle-check'},
            { label: "O'rtacha ball",  value: `${avgScore}%`,  icon: 'fa-chart-line'  },
            { label: 'Eng yuqori',     value: `${bestScore}%`, icon: 'fa-trophy'      },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <i className={`fas ${stat.icon} text-slate-400 text-xs`}></i>
                <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
          <i className="fas fa-exclamation-circle text-lg"></i>
          {error}
        </div>
      )}

      {/* ─── Empty state ─────────────────────────────────────────────────── */}
      {!error && attempts.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
            <i className="fas fa-clipboard-list text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Hali test topshirmagansiz</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto text-sm">
            Darslarni o'rganing va test topshiring — natijalaringiz shu yerda ko'rinadi.
          </p>
        </div>
      )}

      {/* ─── Results list ────────────────────────────────────────────────── */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <i className="fas fa-history text-orange-600"></i>
              Test tarixi
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {attempts.map((attempt, idx) => {
              const score = Math.round(attempt.scorePercentage);
              const date  = new Date(attempt.submittedAt).toLocaleDateString('uz-UZ', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <div key={attempt.id} className="flex flex-col border-b border-slate-100 dark:border-slate-700 last:border-0 overflow-hidden">
                  <div 
                    onClick={() => toggleAttempt(attempt)}
                    className="p-5 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    {/* Index */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>

                    {/* Lesson name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{attempt.lesson || `Test #${attempt.quizId}`}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                    </div>

                    {/* Correct / Total */}
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {attempt.correctAnswers} / {attempt.totalQuestions}
                      </p>
                      <p className="text-[10px] text-slate-400">to'g'ri javob</p>
                    </div>

                    {/* Score bar */}
                    <div className="w-24 hidden md:block">
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : 'bg-orange-400'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    {/* Score % */}
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-extrabold ${score >= 80 ? 'text-green-500' : 'text-orange-400'}`}>
                        {score}%
                      </p>
                    </div>

                    {/* Pass/Fail badge */}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 mr-4 ${
                      attempt.passed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {attempt.passed ? "O'tdi" : 'Yiqildi'}
                    </span>
                    
                    <i className={`fas fa-chevron-down text-slate-400 transition-transform ${expandedAttemptId === attempt.id ? 'rotate-180' : ''}`}></i>
                  </div>
                  
                  {expandedAttemptId === attempt.id && attempt.answers && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <i className="fas fa-list-ol text-blue-500"></i> Javoblar tafsiloti
                      </h4>
                      <div className="space-y-4">
                        {attempt.answers.map((answer, i) => {
                          const q = attemptQuestions[attempt.quizId]?.find(q => q.id === answer.questionId.toString());
                          return (
                            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm leading-relaxed">
                                <span className="text-slate-400 mr-1">{i + 1}.</span> {q ? q.text : `Savol #${answer.questionId}`}
                              </p>
                              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${answer.correct ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  <i className={`fas fa-${answer.correct ? 'check' : 'times'} text-sm`}></i>
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-0.5">Sizning javobingiz</p>
                                  <p className={`text-sm font-bold truncate ${answer.correct ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                                    {answer.selectedAnswer || 'Belgilanmagan'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResults; 

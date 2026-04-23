import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Question } from '../types';
import { testAttemptService, TestAttemptResponse, TestAnswerResponse } from '../services/testAttempService';
import { quizService } from '../services/quizService';
import * as XLSX from 'xlsx';

interface MyResultsProps {
  currentUser: User;
}

interface EnrichedAttempt {
  id: number;
  userName: string;
  quizId: number;
  quizName: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  submittedAt: string;
  answers: TestAnswerResponse[];
}

const MyResults: React.FC<MyResultsProps> = ({ currentUser }) => {
  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // States for Analysis Modal
  const [selectedAttemptForAnalysis, setSelectedAttemptForAnalysis] = useState<EnrichedAttempt | null>(null);
  const [analysisQuestions, setAnalysisQuestions] = useState<Question[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAttemptForAnalysis(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await testAttemptService.getAttemptsByUser(currentUser.id);
        const enriched: EnrichedAttempt[] = data.map(a => ({
          id: a.id,
          userName: currentUser.name,
          quizId: a.quizId ?? 0,
          quizName: (a as any).name || (a as any).lesson || `Test #${a.quizId}`,
          totalQuestions: a.totalQuestions,
          correctAnswers: a.correctAnswers,
          scorePercentage: Math.round(a.scorePercentage),
          passed: a.passed,
          submittedAt: new Date(a.submittedAt).toLocaleDateString('uz-UZ'),
          answers: a.answers || [],
        }));
        setAttempts(enriched.sort((a, b) => 
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

  const handleAnalyze = async (attempt: EnrichedAttempt) => {
    setSelectedAttemptForAnalysis(attempt);
    setLoadingAnalysis(true);
    try {
      const questions = await quizService.getQuizQuestions(attempt.quizId);
      setAnalysisQuestions(questions);
    } catch (err) {
      console.error('Failed to load questions for analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const filteredAttempts = attempts.filter(a =>
    a.quizName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `Test #${a.quizId}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.submittedAt.includes(searchTerm)
  );

  const handleExportExcel = () => {
    if (filteredAttempts.length === 0) return;
    const dataToExport = filteredAttempts.map(a => ({
      'Test Nomi': a.quizName,
      'Jami savollar': a.totalQuestions,
      "To'g'ri javoblar": a.correctAnswers,
      'Ball (%)': a.scorePercentage,
      'Sana': a.submittedAt,
      'Holat': a.passed ? "O'tdi" : 'Yiqildi',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mening Natijalarim');
    XLSX.writeFile(wb, `mening_natijalarim_${new Date().toLocaleDateString()}.xlsx`);
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

      {/* ─── Results list (Table like LeadDashboard) ───────────────────── */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <i className="fas fa-clipboard-list text-orange-600"></i>
              Mening test natijalarim
            </h3>
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="Test ID yoki sana..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-slate-100"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Dars</th>
                  <th className="px-6 py-4 text-center">To'g'ri / Jami</th>
                  <th className="px-6 py-4 text-center">Ball</th>
                  <th className="px-6 py-4">Sana</th>
                  <th className="px-6 py-4">Holat</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredAttempts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/80 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-slate-100 font-medium text-sm">{a.quizName}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{a.correctAnswers} / {a.totalQuestions}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${a.scorePercentage >= 80 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                        {a.scorePercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{a.submittedAt}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {a.passed ? "O'tdi" : 'Yiqildi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleAnalyze(a)}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                      >
                        <i className="fas fa-search"></i> Tahlil qilish
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAttempts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                      {attempts.length === 0 ? 'Hali test topshirmagansiz' : "Ma'lumot topilmadi"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-xs text-slate-400 dark:text-slate-500">{filteredAttempts.length} ta natija</span>
            <button
              onClick={handleExportExcel}
              disabled={filteredAttempts.length === 0}
              className="text-orange-600 dark:text-orange-500 text-sm font-bold hover:underline disabled:text-slate-400 dark:disabled:text-slate-600 flex items-center gap-2"
            >
              <i className="fas fa-file-excel"></i> Excel yuklab olish
            </button>
          </div>
        </div>
      )}

      {/* ─── Analysis Modal (Same as LeadDashboard) ──────────────────────── */}
      {selectedAttemptForAnalysis && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 p-4 sm:p-8">
          <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-full sm:h-auto sm:max-h-[95vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/20 dark:border-slate-700/50">
            {/* Header: Readonly Proof Style */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl items-center justify-center text-xl shadow-inner">
                  <i className="fas fa-file-contract"></i>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl">
                      Test Natijasi
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 w-max">Read-Only</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Xodim: <span className="text-slate-700 dark:text-slate-300">{selectedAttemptForAnalysis.userName}</span> · {selectedAttemptForAnalysis.quizName} · {selectedAttemptForAnalysis.submittedAt}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAttemptForAnalysis(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0 ml-2"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.02]">
                <i className="fas fa-certificate text-[30rem]"></i>
              </div>
              {loadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-20 relative z-10">
                  <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4 drop-shadow-md"></i>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Ma'lumotlar olinmoqda...</p>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto relative z-10">
                  {selectedAttemptForAnalysis.answers.map((ans, idx) => {
                    const question = analysisQuestions.find(q => q.id === ans.questionId.toString());
                    return (
                      <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${ans.correct ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="flex items-start gap-4 mb-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg shadow-sm ${ans.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-[15px] sm:text-[16px] leading-relaxed">
                              {question ? question.text : `Savol ID: ${ans.questionId}`}
                            </p>
                          </div>
                        </div>

                        {question && (
                          <div className="ml-14 grid grid-cols-1 gap-3 mb-2">
                            {question.options.map((opt, oIdx) => {
                              const isSelected = ans.selectedAnswer === opt;
                              let optClass = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400';
                              
                              if (isSelected) {
                                if (ans.correct) {
                                  optClass = 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 ring-1 ring-green-400 dark:ring-green-600';
                                } else {
                                  optClass = 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 ring-1 ring-red-400 dark:ring-red-600';
                                }
                              }

                              return (
                                <div key={oIdx} className={`flex items-center gap-3 text-sm p-3 rounded-xl border transition-all ${optClass}`}>
                                  <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? (ans.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="font-medium">{opt}</span>
                                  {isSelected && (
                                    <div className="ml-auto flex items-center gap-2">
                                      <span className={`text-[10px] uppercase font-bold tracking-wider hidden sm:inline ${ans.correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Tanlangan</span>
                                      <i className={`fas fa-${ans.correct ? 'check-circle' : 'times-circle'} text-xl ${ans.correct ? 'text-green-500' : 'text-red-500'}`}></i>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!question && (
                           <div className="ml-14">
                              <p className={`font-semibold text-sm ${ans.correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                Tanlangan javob: {ans.selectedAnswer || 'Belgilanmagan'}
                              </p>
                           </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedAttemptForAnalysis.answers.length === 0 && (
                    <div className="text-center py-10 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
                      Ushbu test urinishida javoblar mavjud emas.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setSelectedAttemptForAnalysis(null)}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md w-full sm:w-auto"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyResults;
 

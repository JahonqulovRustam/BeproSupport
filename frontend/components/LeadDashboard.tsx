import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { SystemModule, Question } from '../types';
import { testAttemptService, TestAttemptResponse, TestAnswerResponse } from '../services/testAttempService';
import { userService } from '../services/userService';
import { quizService } from '../services/quizService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface LeadDashboardProps {
  activeModule?: SystemModule;
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
  rawDate: string;
  answers: TestAnswerResponse[];
}

const LeadDashboard: React.FC<LeadDashboardProps> = ({ activeModule }) => {
  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttemptForAnalysis, setSelectedAttemptForAnalysis] = useState<EnrichedAttempt | null>(null);
  const [analysisQuestions, setAnalysisQuestions] = useState<Question[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAttemptForAnalysis(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rawAttempts, allUsers] = await Promise.all([
          testAttemptService.getLastAttempts(),
          userService.getAllUsers(),
        ]);

        const userMap: Record<number, string> = {};
        allUsers.forEach(u => { userMap[parseInt(u.id)] = u.name; });

        const enriched: EnrichedAttempt[] = rawAttempts.map(a => ({
          id: a.id,
          userName: a.user || userMap[(a as any).userId] || `Foydalanuvchi #${(a as any).userId || a.id}`,
          quizId: a.quizId ?? 0,
          quizName: (a as any).name || (a as any).lesson || `Test #${a.quizId}`,
          totalQuestions: a.totalQuestions,
          correctAnswers: a.correctAnswers,
          scorePercentage: Math.round(a.scorePercentage),
          passed: a.passed,
          submittedAt: new Date(a.submittedAt).toLocaleString('uz-UZ', { 
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          rawDate: a.submittedAt,
          answers: a.answers || [],
        }));

        setAttempts(enriched);
      } catch (err) {
        console.error('Dashboard xatolik:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercentage, 0) / attempts.length)
    : 0;
  const passedCount = attempts.filter(a => a.passed).length;
  const activeUserCount = new Set(attempts.map(a => a.userName)).size;

  const trendMap: Record<string, { passed: number; failed: number; dateStr: string }> = {};
  attempts.forEach(a => {
    try {
      const d = new Date(a.rawDate);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().split('T')[0];
        if (!trendMap[key]) {
          trendMap[key] = { passed: 0, failed: 0, dateStr: `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}` };
        }
        if (a.passed) trendMap[key].passed += 1;
        else trendMap[key].failed += 1;
      }
    } catch (e) {}
  });

  const chartData = Object.keys(trendMap).sort().map(key => ({
    name: trendMap[key].dateStr,
    Muaffaqiyatli: trendMap[key].passed,
    Yiqildi: trendMap[key].failed,
  })).slice(-14);

  // Still keeping userScoreMap for "Eng yaxshi mutaxassislar"
  const userScoreMap: Record<string, { total: number; count: number }> = {};
  attempts.forEach(a => {
    if (!userScoreMap[a.userName]) userScoreMap[a.userName] = { total: 0, count: 0 };
    userScoreMap[a.userName].total += a.scorePercentage;
    userScoreMap[a.userName].count += 1;
  });

  const topUsersData = Object.entries(userScoreMap)
    .map(([name, { total, count }]) => ({
      name: name.split(' ')[0],
      fullName: name,
      score: Math.round(total / count),
      completed: count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Just top 5 to fit nicely

  const filteredAttempts = attempts.filter(a =>
    a.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    if (filteredAttempts.length === 0) return;
    const dataToExport = filteredAttempts.map(a => ({
      'Xodim': a.userName,
      'Test Nomi': a.quizName,
      'Jami savollar': a.totalQuestions,
      "To'g'ri javoblar": a.correctAnswers,
      'Ball (%)': a.scorePercentage,
      'Sana': a.submittedAt,
      'Holat': a.passed ? "O'tdi" : 'Yiqildi',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Natijalari');
    XLSX.writeFile(wb, `natijalar_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleAnalyze = async (attempt: EnrichedAttempt) => {
    setSelectedAttemptForAnalysis(attempt);
    setLoadingAnalysis(true);
    try {
      const promises = attempt.answers.map(ans => 
        quizService.getQuestionById(attempt.quizId || 1, ans.questionId).catch(() => null)
      );
      const results = await Promise.all(promises);
      const validQuestions = results.filter(q => q !== null) as Question[];
      setAnalysisQuestions(validQuestions);
    } catch (err) {
      console.error('Failed to load questions for analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <i className="fas fa-spinner fa-spin text-3xl text-orange-500"></i>
          <p className="text-slate-400 text-sm">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">O'rtacha o'zlashtirish</p>
            <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-percentage text-xs"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-bold text-slate-900">{avgScore}%</h4>
            <span className={`text-xs font-bold ${avgScore >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
              {avgScore >= 80 ? '✅ Yaxshi' : '⚠️ Past'}
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">Muvaffaqiyatli testlar</p>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-double text-xs"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-bold text-slate-900">{passedCount}</h4>
            <span className="text-slate-400 text-xs font-bold">jami {attempts.length} tadan</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">Faol xodimlar</p>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-users text-xs"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-bold text-slate-900">{activeUserCount}</h4>
            <span className="text-orange-500 text-xs font-bold">test topshirgan</span>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <i className="fas fa-chart-area text-blue-600"></i>
              Test topshirish dinamikasi
            </h3>
            <div style={{ width: '100%', height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="Muaffaqiyatli" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPassed)" />
                  <Area type="monotone" dataKey="Yiqildi" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorFailed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <i className="fas fa-trophy text-yellow-500"></i>
              Eng yaxshi mutaxassislar
            </h3>
            <div className="space-y-3">
              {topUsersData.map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700'
                      : idx === 1 ? 'bg-slate-200 text-slate-500'
                      : idx === 2 ? 'bg-orange-100 text-orange-600'
                      : 'bg-slate-100 text-slate-500'
                    }`}>{idx + 1}</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{emp.fullName}</p>
                      <p className="text-xs text-slate-500">{emp.completed} test topshirgan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-orange-600 rounded-full" style={{ width: `${emp.score}%` }} />
                    </div>
                    <p className={`font-bold text-xs ${emp.score >= 80 ? 'text-green-600' : 'text-orange-500'}`}>{emp.score}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <i className="fas fa-clipboard-list text-orange-600"></i>
            So'nggi test natijalari
          </h3>
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Xodim nomi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Xodim</th>
                <th className="px-6 py-4">Dars</th>
                <th className="px-6 py-4 text-center">To'g'ri / Jami</th>
                <th className="px-6 py-4 text-center">Ball</th>
                <th className="px-6 py-4">Sana</th>
                <th className="px-6 py-4">Holat</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 text-sm">{a.userName}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{a.quizName}</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-600">{a.correctAnswers} / {a.totalQuestions}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${a.scorePercentage >= 80 ? 'text-green-600' : 'text-orange-500'}`}>
                      {a.scorePercentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{a.submittedAt}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {a.passed ? "O'tdi" : 'Yiqildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleAnalyze(a)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                    >
                      <i className="fas fa-search"></i> Tahlil qilish
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAttempts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                    {attempts.length === 0 ? 'Hali hech kim test topshirmagan' : "Ma'lumot topilmadi"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-400">{filteredAttempts.length} ta natija</span>
          <button
            onClick={handleExportExcel}
            disabled={filteredAttempts.length === 0}
            className="text-orange-600 text-sm font-bold hover:underline disabled:text-slate-400 flex items-center gap-2"
          >
            <i className="fas fa-file-excel"></i> Excel yuklab olish
          </button>
        </div>
      </div>

      {/* Analysis Modal */}
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
                              const isSelected = ans.selectedAnswer?.trim() === opt?.trim();
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
                            {!question.options.some(opt => ans.selectedAnswer?.trim() === opt?.trim()) && ans.selectedAnswer && (
                               <p className={`font-semibold text-sm mt-2 ${ans.correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  Tanlangan javob (eski variant): {ans.selectedAnswer}
                               </p>
                            )}
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

export default LeadDashboard;

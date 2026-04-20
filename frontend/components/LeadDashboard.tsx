import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  submittedAt: string;
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
          totalQuestions: a.totalQuestions,
          correctAnswers: a.correctAnswers,
          scorePercentage: Math.round(a.scorePercentage),
          passed: a.passed,
          submittedAt: new Date(a.submittedAt).toLocaleDateString('uz-UZ'),
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

  const userScoreMap: Record<string, { total: number; count: number }> = {};
  attempts.forEach(a => {
    if (!userScoreMap[a.userName]) userScoreMap[a.userName] = { total: 0, count: 0 };
    userScoreMap[a.userName].total += a.scorePercentage;
    userScoreMap[a.userName].count += 1;
  });

  const chartData = Object.entries(userScoreMap)
    .map(([name, { total, count }]) => ({
      name: name.split(' ')[0],
      fullName: name,
      score: Math.round(total / count),
      completed: count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const filteredAttempts = attempts.filter(a =>
    a.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    if (filteredAttempts.length === 0) return;
    const dataToExport = filteredAttempts.map(a => ({
      'Xodim': a.userName,
      'Test ID': a.quizId,
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
      const questions = await quizService.getQuizQuestions(attempt.quizId);
      setAnalysisQuestions(questions);
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
              <i className="fas fa-chart-bar text-orange-600"></i>
              Jamoa samaradorligi
            </h3>
            <div style={{ width: '100%', height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value}%`, "O'rtacha ball"]}
                    labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <i className="fas fa-trophy text-yellow-500"></i>
              Eng yaxshi mutaxassislar
            </h3>
            <div className="space-y-3">
              {chartData.map((emp, idx) => (
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
                  <td className="px-6 py-4 text-slate-500 text-sm">Test #{a.quizId}</td>
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
      {selectedAttemptForAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <i className="fas fa-microscope text-blue-600"></i>
                  Test Tahlili: {selectedAttemptForAnalysis.userName}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Test #{selectedAttemptForAnalysis.quizId} · {selectedAttemptForAnalysis.submittedAt}</p>
              </div>
              <button
                onClick={() => setSelectedAttemptForAnalysis(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
              {loadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <i className="fas fa-circle-notch fa-spin text-3xl text-blue-500 mb-4"></i>
                  <p className="text-slate-500">Savollar yuklanmoqda...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedAttemptForAnalysis.answers.map((ans, idx) => {
                    const question = analysisQuestions.find(q => q.id === ans.questionId.toString());
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${ans.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[15px] leading-relaxed">
                              {question ? question.text : `Savol ID: ${ans.questionId}`}
                            </p>
                          </div>
                        </div>

                        {question && (
                          <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {question.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2 text-sm p-2 rounded-lg border border-slate-100 bg-slate-50">
                                <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{String.fromCharCode(65 + oIdx)}</span>
                                <span className="text-slate-700">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="ml-12 flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Xodim javobi</p>
                            <div className="flex items-center gap-2">
                              <i className={`fas fa-${ans.correct ? 'check-circle text-green-500' : 'times-circle text-red-500'}`}></i>
                              <p className={`font-semibold text-sm ${ans.correct ? 'text-green-700' : 'text-red-700'}`}>
                                {ans.selectedAnswer || 'Belgilanmagan'}
                              </p>
                            </div>
                          </div>
                          {!ans.correct && question && question.correctAnswer !== undefined && (
                            <div className="flex-1 sm:border-l border-slate-200 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To'g'ri javob</p>
                              <div className="flex items-center gap-2">
                                <i className="fas fa-check-circle text-green-500"></i>
                                <p className="font-semibold text-sm text-green-700">
                                  {question.options[question.correctAnswer]}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {selectedAttemptForAnalysis.answers.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                      Ushbu test urinishida javoblar mavjud emas.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
              <button
                onClick={() => setSelectedAttemptForAnalysis(null)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDashboard;

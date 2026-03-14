import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { SystemModule } from '../types';

interface TestResult {
  id: string;
  employeeName: string;
  system: string;
  lesson: string;
  score: number;
  date: string;
  status: 'passed' | 'failed';
}

const MOCK_TEAM_DATA = [
  { name: 'Ali V.', score: 85, completed: 12 },
  { name: 'Olim T.', score: 92, completed: 15 },
  { name: 'Zuhra K.', score: 78, completed: 10 },
  { name: 'Sardor A.', score: 88, completed: 14 },
  { name: 'Madina O.', score: 95, completed: 18 }
];

const MOCK_TEST_RESULTS: TestResult[] = [
  { id: '1', employeeName: 'Ali Valiev', system: 'Sistema-101', lesson: 'Kirish darsi', score: 85, date: '2024-02-20', status: 'passed' },
  { id: '2', employeeName: 'Olim Toshmatov', system: 'Sistema-101', lesson: 'Xavfsizlik asoslari', score: 92, date: '2024-02-21', status: 'passed' },
  { id: '3', employeeName: 'Zuhra Karimova', system: 'Sistema-102', lesson: 'Ma\'lumotlar bazasi', score: 65, date: '2024-02-22', status: 'failed' }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface LeadDashboardProps {
  activeModule?: SystemModule;
}

const LeadDashboard: React.FC<LeadDashboardProps> = ({ activeModule }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResults = MOCK_TEST_RESULTS.filter(res => {
    const matchesSearch = res.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         res.system.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = activeModule ? res.system === activeModule.name : true;
    return matchesSearch && matchesModule;
  });

  const handleExportExcel = () => {
    if (filteredResults.length === 0) return;

    const dataToExport = filteredResults.map(res => ({
      'Xodim': res.employeeName,
      'Tizim / Modul': res.system,
      'Dars': res.lesson,
      'Ball (%)': res.score,
      'Sana': res.date,
      'Holat': res.status === 'passed' ? "O'tdi" : "Yiqildi"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Natijalari');

    const fileName = activeModule
      ? `${activeModule.name}_natijalari_${new Date().toLocaleDateString()}.xlsx`
      : `Barcha_natijalar_${new Date().toLocaleDateString()}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // ✅ FIX: [...spread] before sort to avoid mutating read-only array
  const sortedTeamData = [...MOCK_TEAM_DATA].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Yuqori statistik ko'rsatkichlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">O'rtacha o'zlashtirish</p>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-percentage text-xs"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-bold text-slate-900">89.4%</h4>
            <span className="text-green-500 text-xs font-bold"><i className="fas fa-arrow-up"></i> 2.4%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">Yakunlangan modullar</p>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-double text-xs"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h4 className="text-3xl font-bold text-slate-900">142</h4>
            <span className="text-slate-400 text-xs font-bold">jami 180 tadan</span>
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
            <h4 className="text-3xl font-bold text-slate-900">24</h4>
            <span className="text-blue-500 text-xs font-bold">12 tasi hozir onlayn</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <i className="fas fa-chart-bar text-blue-600"></i>
            Jamoa samaradorligi (O'rtacha ball)
          </h3>
          {/* ✅ FIX: explicit pixel height wrapper to fix recharts -1 width/height error */}
          <div style={{ width: '100%', height: 256 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TEAM_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {MOCK_TEAM_DATA.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top mutaxassislar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <i className="fas fa-trophy text-yellow-500"></i>
            Eng yaxshi mutaxassislar
          </h3>
          <div className="space-y-4">
            {/* ✅ FIX: use sortedTeamData (pre-sorted copy) instead of .sort() inline */}
            {sortedTeamData.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.completed} dars yakunlangan</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-blue-600" style={{ width: `${emp.score}%` }}></div>
                  </div>
                  <p className="font-bold text-blue-600 text-xs">{emp.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test natijalari jadvali */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <i className="fas fa-clipboard-list text-blue-600"></i>
            {activeModule ? `${activeModule.name}: Test natijalari` : "Xodimlarning so'nggi test natijalari"}
          </h3>
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Xodim yoki tizim..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Xodim</th>
                <th className="px-6 py-4">Tizim / Modul</th>
                <th className="px-6 py-4">Dars</th>
                <th className="px-6 py-4 text-center">Ball</th>
                <th className="px-6 py-4">Sana</th>
                <th className="px-6 py-4">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 text-sm">{result.employeeName}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{result.system}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm italic">{result.lesson}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${result.score >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                      {result.score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{result.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      result.status === 'passed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {result.status === 'passed' ? "O'tdi" : 'Yiqildi'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                    Ma'lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={handleExportExcel}
            disabled={filteredResults.length === 0}
            className="text-blue-600 text-sm font-bold hover:underline disabled:text-slate-400 disabled:no-underline"
          >
            Barcha natijalarni yuklab olish (Excel)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;
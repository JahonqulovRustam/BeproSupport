
import React from 'react';
import { SystemModule } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ModuleStatsDashboardProps {
  module: SystemModule;
}

const MOCK_MODULE_STATS = {
  's101': { 
    passed: 45, 
    failed: 12, 
    avgScore: 82, 
    lessonPerformance: [
      { name: 'Kirish', score: 95 },
      { name: 'Xavfsizlik', score: 78 },
      { name: 'Loglar', score: 84 },
      { name: 'Monitoring', score: 72 }
    ] 
  },
  'default': { 
    passed: 10, 
    failed: 2, 
    avgScore: 75, 
    lessonPerformance: [
      { name: 'Dars 1', score: 80 },
      { name: 'Dars 2', score: 70 }
    ] 
  }
};

const COLORS = ['#10b981', '#ef4444'];

const ModuleStatsDashboard: React.FC<ModuleStatsDashboardProps> = ({ module }) => {
  const stats = MOCK_MODULE_STATS[module.id as keyof typeof MOCK_MODULE_STATS] || MOCK_MODULE_STATS['default'];
  
  const pieData = [
    { name: "O'tganlar", value: stats.passed },
    { name: "Yiqilganlar", value: stats.failed }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 md:col-span-2">
          <h3 className="font-bold text-slate-900 mb-2">Modul umumiy statistikasi</h3>
          <p className="text-slate-500 text-sm mb-6">Ushbu modul bo'yicha jamoaning umumiy natijalari</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{stats.avgScore}%</p>
              <p className="text-xs text-slate-400 uppercase font-bold mt-1">O'rtacha ball</p>
            </div>
            <div className="h-12 w-px bg-slate-100"></div>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900">{stats.passed + stats.failed}</p>
              <p className="text-xs text-slate-400 uppercase font-bold mt-1">Jami urinishlar</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h4 className="text-sm font-bold text-slate-900 mb-4 self-start">O'tish koeffitsienti</h4>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold text-slate-500">O'tdi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-bold text-slate-500">Yiqildi</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Muvaffaqiyatli xodimlar</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-600">{stats.passed}</span>
            <span className="text-slate-400 text-sm">/ {stats.passed + stats.failed}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-green-500 h-full rounded-full" 
              style={{ width: `${(stats.passed / (stats.passed + stats.failed)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Darslar bo'yicha samaradorlik</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.lessonPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={120}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Eng qiyin savollar tahlili</h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs font-bold text-red-700 uppercase mb-1">Eng ko'p xato qilingan savol:</p>
              <p className="text-sm text-slate-700 font-medium italic">"Ushbu holatda tizimning asosiy ulanish xatosini qanday bartaraf qilasiz?"</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-600">Xatolik darajasi: 42%</span>
                <button className="text-[10px] font-bold text-blue-600 hover:underline">Savolni ko'rish</button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Tavsiya etilgan qo'shimcha darslar:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-slate-700">
                  <i className="fas fa-circle-info text-blue-500"></i>
                  SQL optimallashtirish bo'yicha master-klass
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-700">
                  <i className="fas fa-circle-info text-blue-500"></i>
                  API xatolarini tahlil qilish texnikasi
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleStatsDashboard;

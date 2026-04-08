import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const dataProcessamento = [
  { name: 'Jan', total: 4000, impostos: 2400 },
  { name: 'Fev', total: 3000, impostos: 1398 },
  { name: 'Mar', total: 2000, impostos: 9800 },
  { name: 'Abr', total: 2780, impostos: 3908 },
  { name: 'Mai', total: 1890, impostos: 4800 },
  { name: 'Jun', total: 2390, impostos: 3800 },
];

const dataAbsentismo = [
  { name: 'TI', faltas: 4, justificadas: 2 },
  { name: 'RH', faltas: 1, justificadas: 1 },
  { name: 'Operações', faltas: 12, justificadas: 8 },
  { name: 'Financeiro', faltas: 2, justificadas: 0 },
];

const Relatorios: React.FC = () => {
  return (
    <div className="p-8 animate-in fade-in slide-up">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Relatórios & Gráficos</h1>
          <p className="text-sm text-slate-500 mt-1">Análises detalhadas, mapas de absentismo e métricas departamentais.</p>
        </div>
        <button className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">download</span>
          Exportar Relatório Geral
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="glass-card p-6 h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Evolução de Custos Salariais (Anual)</h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={dataProcessamento} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Taxa de Absentismo por Departamento</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={dataAbsentismo} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="faltas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="justificadas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;

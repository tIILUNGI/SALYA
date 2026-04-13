import React, { useEffect, useState, useContext } from 'react';
import { api } from '../services/api';
import { AppContext } from '../App';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  const { empresa, empresaId } = useContext(AppContext);
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalColaboradores: 0,
    totalProcessamentos: 0,
    custoTotalAproximado: 0
  });
  const [alertas, setAlertas] = useState({
    contratosExpirando: 0,
    documentosExpirando: 0,
    salariosPendentes: 0
  });
  const [chartProcessamento, setChartProcessamento] = useState<any[]>([]);
  const [chartAbsentismo, setChartAbsentismo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) return;
      
      try {
        const response = await api.get(`/dashboard/stats?empresaId=${empresaId}`);
        setStats(response);

        try {
          const alertasData = await api.get(`/alertas/resumo?empresaId=${empresaId}`);
          setAlertas(alertasData);
        } catch (e) {
          console.error('Error fetching alerts', e);
        }

        try {
          const charts = await api.get(`/dashboard/charts?empresaId=${empresaId}`);
          setChartProcessamento(charts.processamentoMensal || []);
          setChartAbsentismo(charts.absentismoDepartamento || []);
        } catch (e) {
          console.error('Error fetching charts', e);
          setChartProcessamento([]);
          setChartAbsentismo([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [empresaId]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Painel de Controlo</h1>
          <p className="text-sm text-slate-500 mt-1">Resumo geral das operações da {empresa?.nome || 'sua empresa'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="glass-card p-6 border-l-4 border-l-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Empresas Geridas</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalEmpresas}</h3>
              </div>
              <div className="size-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-500">domain</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Colaboradores</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalColaboradores}</h3>
              </div>
              <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500">groups</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Processamentos Emitidos</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalProcessamentos}</h3>
              </div>
              <div className="size-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500">receipt_long</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Estimado (AOA)</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(stats.custoTotalAproximado)}
                </h3>
              </div>
              <div className="size-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500">account_balance</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Bloco de Alertas Automáticos */}
      <div className="mt-8 mb-8">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-500">notifications_active</span>
          Alertas de Compliance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 flex items-start gap-4">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">{alertas.contratosExpirando} contratos expirando</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">Nos próximos 30 dias</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 flex items-start gap-4">
            <span className="material-symbols-outlined text-amber-500">description</span>
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-400">{alertas.documentosExpirando} documentos vencem</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Validades nos próximos 30 dias</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 flex items-start gap-4">
            <span className="material-symbols-outlined text-indigo-500">account_balance_wallet</span>
            <div>
              <p className="font-bold text-indigo-700 dark:text-indigo-400">{alertas.salariosPendentes} Salários Pendentes</p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Aguardando processamento este mês</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-[320px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Evolução de Custos Salariais</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartProcessamento} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotalDb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotalDb)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[320px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Absentismo por Departamento</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartAbsentismo} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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

export default Dashboard;



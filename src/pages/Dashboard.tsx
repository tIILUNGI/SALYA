import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

import { api } from '../services/api';
import { AppContext } from '../App';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { empresaId } = useContext(AppContext);
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalColaboradores: 0,
    totalProcessamentos: 0,
    valorFolhaMensal: 0,
    acumuladoTotal: 0
  });
  const [alertas, setAlertas] = useState<{
    contratosExpirando: number;
    documentosExpirando: number;
  }>({
    contratosExpirando: 0,
    documentosExpirando: 0,
  });
  const [chartProcessamento, setChartProcessamento] = useState<any[]>([]);
  const [chartAbsentismo, setChartAbsentismo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) return;
      
      try {
        setLoading(true);
        // Fetch raw history for REAL data calculations
        const historico: any[] = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
        const colaboradores: any[] = await api.get(`/colaboradores?empresaId=${empresaId}`);
        const empresas: any[] = await api.get('/empresas');

        // 1. Valor da Folha (Monthly processing potential)
        const valorFolha = colaboradores
          .filter(c => c.status === 'Ativo')
          .reduce((acc, c) => acc + (c.salarioBase || 0) + (c.subsidioAlimentacao || 0) + (c.subsidioTransporte || 0), 0);

        // 2. Acumulado Total (Sum of everything already processed)
        const acumulado = historico.reduce((acc, h) => acc + (h.totalBruto || 0), 0);

        // 3. Evolução de Custos (Real chart data)
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentYear = new Date().getFullYear();
        
        const processamentoPorMes = meses.map((nome, index) => {
          const mesNum = index + 1;
          const totalMes = historico
            .filter(h => h.mes === mesNum && h.ano === currentYear)
            .reduce((acc, h) => acc + (h.totalBruto || 0), 0);
          return { name: nome, total: totalMes };
        });

        // 4. Absentismo (Real absences from processing records)
        const depts = Array.from(new Set(colaboradores.map(c => c.departamento || 'Geral')));
        const statsAbsentismo = depts.map(dept => {
          const colabsNoDept = colaboradores.filter(c => (c.departamento || 'Geral') === dept).map(c => c.id);
          const faltasNoDept = historico
            .filter(h => colabsNoDept.includes(h.colaboradorId))
            .reduce((acc, h) => ({
              faltas: acc.faltas + (h.faltasTotal || 0),
              justificadas: acc.justificadas + (h.faltasJustificadas || 0)
            }), { faltas: 0, justificadas: 0 });

          return {
            name: dept,
            faltas: faltasNoDept.faltas,
            justificadas: faltasNoDept.justificadas
          };
        });

        setStats({
          totalEmpresas: empresas.length,
          totalColaboradores: colaboradores.filter(c => c.status === 'Ativo').length,
          totalProcessamentos: historico.length,
          valorFolhaMensal: valorFolha,
          acumuladoTotal: acumulado
        });

        setChartProcessamento(processamentoPorMes);
        setChartAbsentismo(statsAbsentismo);

        try {
          const alertasData = await api.get(`/alertas/resumo?empresaId=${empresaId}`);
          setAlertas(alertasData);
        } catch (e) {
          console.error('Erro ao buscar resumo de alertas:', e);
        }

      } catch (error) {
        console.error('Erro geral no Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [empresaId]);

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Painel Executivo</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral da folha de pagamento e compliance corporativo</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Executive Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            
            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Entidades Geridas</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalEmpresas}</h3>
                  <p className="text-xs text-slate-400 mt-1">Empresas registadas no sistema</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">domain</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Colaboradores</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalColaboradores}</h3>
                  <p className="text-xs text-slate-400 mt-1">Funcionários ativos monitorados</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <span className="material-symbols-outlined text-2xl">groups</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Processamentos</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalProcessamentos}</h3>
                  <p className="text-xs text-slate-400 mt-1">Folhas de pagamento geradas</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all border-l-4 border-l-purple-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Valor da Folha</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(stats.valorFolhaMensal)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Estimativa mensal (Ativos)</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                  <span className="material-symbols-outlined text-2xl">account_balance</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Acumulado Histórico</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(stats.acumuladoTotal)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Total bruto processado</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
              </div>
            </div>

          </div>

          {/* Alertas de Compliance Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Módulos de Sistema & Alertas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Alerta Contratos como um Card de Módulo */}
              <div className="glass-card p-6 flex flex-col justify-between shadow-soft">
                <div>
                  <div className="size-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-red-500">assignment_late</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Contratos</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Gerencie prazos de expiração de contratos de trabalho.</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <span className="block text-lg font-bold text-red-600">{alertas.contratosExpirando}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Expirando</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(alertas.contratosExpirando > 0 ? '/alertas' : '/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-4 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  {alertas.contratosExpirando > 0 ? 'Ver Alertas' : 'Gerir Colaboradores'}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>

              {/* Alerta Documentos como um Card de Módulo */}
              <div className="glass-card p-6 flex flex-col justify-between shadow-soft">
                <div>
                  <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-amber-500">description</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Documentos</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Monitoramento de validades e compliance documental.</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <span className="block text-lg font-bold text-amber-600">{alertas.documentosExpirando}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Vencendo</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(alertas.documentosExpirando > 0 ? '/alertas' : '/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-4 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  {alertas.documentosExpirando > 0 ? 'Ver Alertas' : 'Gerir Arquivo'}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 min-h-[400px] shadow-soft">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Evolução de Custos</h3>
                  <p className="text-xs text-slate-400 mt-1">Histórico mensal de massa salarial</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartProcessamento} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalDb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area isAnimationActive={false} type="monotone" dataKey="total" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalDb)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-8 min-h-[400px] shadow-soft">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Absentismo Mensal</h3>
                  <p className="text-xs text-slate-400 mt-1">Faltas por departamento</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartAbsentismo} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  <Bar name="Faltas Injustificadas" isAnimationActive={false} dataKey="faltas" fill="#cbd5e1" radius={[4, 4, 4, 4]} barSize={12} />
                  <Bar name="Faltas Justificadas" isAnimationActive={false} dataKey="justificadas" fill="#9333ea" radius={[4, 4, 4, 4]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
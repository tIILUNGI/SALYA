import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, Line } from 'recharts';

import { api } from '../services/api';
import { AppContext } from '../App';

// Formatação profissional para gráficos
const formatKzShort = (value: number) => {
  const v = Number(value) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
};

const formatKzTooltip = (value: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(Number(value) || 0);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-semibold text-slate-800 dark:text-white">{
            typeof entry.value === 'number' && ['bruto', 'liquido', 'descontoFaltas', 'total'].includes(entry.dataKey)
              ? formatKzTooltip(entry.value)
              : entry.value
          }</span>
        </p>
      ))}
    </div>
  );
};

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[280px] flex flex-col items-center justify-center text-center px-6">
    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">bar_chart</span>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
  </div>
);
const normalizeList = (data: any, key?: string): any[] => {
  if (Array.isArray(data)) return data;
  if (key && data?._embedded?.[key]) return data._embedded[key];
  // try any embedded key
  if (data?._embedded) {
    const firstKey = Object.keys(data._embedded)[0];
    if (firstKey) return data._embedded[firstKey];
  }
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { empresaId, colaboradores: ctxColaboradores, empresas: ctxEmpresas } = useContext(AppContext);
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalColaboradores: 0,
    totalProcessamentos: 0,
    valorFolhaMensal: 0,
    custoTotalEmpresa: 0,
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
  const [chartDepartamentos, setChartDepartamentos] = useState<any[]>([]);
  const [processamentosMes, setProcessamentosMes] = useState(0);
  const [loading, setLoading] = useState(true);

  const DEPT_COLORS = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) return;
      
      try {
        setLoading(true);

        // Fetch raw history and collaborators; normalize paged Spring responses
        const [historicoRaw, colaboradoresRaw] = await Promise.all([
          api.get(`/processamentos/historico?empresaId=${empresaId}`),
          api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`)
        ]);

        const historico: any[] = normalizeList(historicoRaw, 'processamentos');
        // Prefer context collaborators (already loaded+normalized in App.tsx); fallback to fresh fetch
        const colaboradores: any[] = ctxColaboradores.length > 0
          ? ctxColaboradores
          : normalizeList(colaboradoresRaw, 'colaboradores');

        const totalEmpresas = ctxEmpresas.length;

        // 1. Valor da Folha (Monthly processing potential)
        const colaboradoresAtivos = colaboradores.filter(c => c.status === 'Ativo');
        const valorFolha = colaboradoresAtivos
          .reduce((acc, c) => acc + (c.salarioBase || 0) + (c.subsidioAlimentacao || 0) + (c.subsidioTransporte || 0), 0);

        // INSS Patronal 8% sobre Salário Base
        const totalInssPatronal = colaboradoresAtivos
          .reduce((acc, c) => acc + ((c.salarioBase || 0) * 0.08), 0);
        const custoTotalEmpresa = valorFolha + totalInssPatronal;

        // 2. Acumulado Total (Sum of everything already processed)
        const acumulado = historico.reduce((acc, h) => acc + (h.totalBruto || 0), 0);

        // 3. Evolução de Custos (Real chart data)
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentYear = new Date().getFullYear();
        
        const processamentoPorMes = meses.map((nome, index) => {
          const mesNum = index + 1;
          const doMes = historico.filter(
            (h) => (h.mes === mesNum || h.mes === String(mesNum)) && (h.ano === currentYear || h.ano === String(currentYear))
          );
          return {
            name: nome,
            bruto: doMes.reduce((acc, h) => acc + Number(h.totalBruto || 0), 0),
            liquido: doMes.reduce((acc, h) => acc + Number(h.salarioLiquido || 0), 0),
            processamentos: doMes.length,
          };
        });

        const historicoAno = historico.filter((h) => h.ano === currentYear || h.ano === String(currentYear));
        const mesActual = new Date().getMonth() + 1;
        const historicoMesActual = historicoAno.filter((h) => h.mes === mesActual || h.mes === String(mesActual));
        setProcessamentosMes(historicoMesActual.length);

        const depts = Array.from(new Set(colaboradores.map((c) => c.departamento || 'Geral')));

        const statsAbsentismo = depts.map((dept) => {
          const colabsNoDept = colaboradores.filter((c) => (c.departamento || 'Geral') === dept).map((c) => c.id);
          const registosDept = historicoAno.filter((h) => colabsNoDept.includes(h.colaboradorId));
          const descontoFaltas = registosDept.reduce((acc, h) => acc + Number(h.valorFaltas || 0), 0);
          const diasPerdidos = registosDept.reduce((acc, h) => {
            const diasUteis = Number(h.diasUteis) || 22;
            const diasTrab = Number(h.diasTrabalhados) ?? diasUteis;
            return acc + Math.max(0, diasUteis - diasTrab);
          }, 0);
          return { name: dept.length > 12 ? `${dept.slice(0, 12)}…` : dept, dept, descontoFaltas, diasPerdidos };
        }).filter((d) => d.descontoFaltas > 0 || d.diasPerdidos > 0);

        const distribuicaoDept = depts.map(dept => ({
          name: dept,
          value: colaboradoresAtivos.filter(c => (c.departamento || 'Geral') === dept).length,
        })).filter(d => d.value > 0);

        setStats({
          totalEmpresas,
          totalColaboradores: colaboradoresAtivos.length,
          totalProcessamentos: historico.length,
          valorFolhaMensal: valorFolha,
          custoTotalEmpresa: custoTotalEmpresa,
          acumuladoTotal: acumulado
        });

        setChartProcessamento(processamentoPorMes);
        setChartAbsentismo(statsAbsentismo);
        setChartDepartamentos(distribuicaoDept.length > 0 ? distribuicaoDept : [{ name: 'Geral', value: colaboradoresAtivos.length || 1 }]);

        let alertasLocal = { contratosExpirando: 0, documentosExpirando: 0 };
        try {
          const alertasData = await api.get(`/alertas/resumo?empresaId=${empresaId}`);
          if (alertasData && typeof alertasData === 'object') {
            alertasLocal = {
              contratosExpirando: alertasData.contratosExpirando || 0,
              documentosExpirando: alertasData.documentosExpirando || 0,
            };
            setAlertas(alertasLocal);
          }
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
  }, [empresaId, ctxColaboradores, ctxEmpresas]);

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Painel Executivo</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Executive Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            
            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all dark:bg-slate-900/90 dark:border-slate-800">
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

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all dark:bg-slate-900/90 dark:border-slate-800">
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

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Processamentos</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalProcessamentos}</h3>
                  <p className="text-xs text-slate-400 mt-1">Folhas de pagamento geradas</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all border-l-4 border-l-purple-500 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Valor da Folha</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(stats.valorFolhaMensal)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Estimativa líquida base</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                  <span className="material-symbols-outlined text-2xl">account_balance</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 shadow-soft hover:shadow-lg transition-all border-l-4 border-l-blue-500 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Custo Total Empresa</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(stats.custoTotalEmpresa)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Inclui INSS Patronal (8%)</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                  <span className="material-symbols-outlined text-2xl">monitoring</span>
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
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Módulos de Sistema & Alertas</h2>
            <p className="text-xs text-slate-400 mb-6">Dados reais da sua empresa — actualizados a partir do processamento e alertas activos</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Processamento do Mês */}
              <div className="glass-card p-6 flex flex-col justify-between shadow-soft dark:bg-slate-900/90 dark:border-slate-800">
                <div>
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary">payments</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Processamento</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Recibos emitidos no mês corrente ({new Date().toLocaleDateString('pt-AO', { month: 'long' })}).</p>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-2xl font-black text-primary">{processamentosMes}</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">de {stats.totalColaboradores} activos</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/processamento')}
                  className="flex items-center justify-between w-full py-2 px-4 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  Ir ao Processamento
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
              
              {/* Alerta Contratos */}
              <div className={`glass-card p-6 flex flex-col justify-between shadow-soft dark:bg-slate-900/90 dark:border-slate-800 ${alertas.contratosExpirando === 0 ? 'border border-emerald-100 dark:border-emerald-900/30' : 'border border-rose-100 dark:border-rose-900/30'}`}>
                <div>
                  <div className="size-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-red-500">assignment_late</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Contratos</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Gerencie prazos de expiração de contratos de trabalho.</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <span className={`block text-2xl font-black ${alertas.contratosExpirando === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{alertas.contratosExpirando}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{alertas.contratosExpirando === 0 ? 'Sem pendências' : 'A expirar'}</span>
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

              {/* Alerta Documentos */}
              <div className={`glass-card p-6 flex flex-col justify-between shadow-soft dark:bg-slate-900/90 dark:border-slate-800 ${alertas.documentosExpirando === 0 ? 'border border-emerald-100 dark:border-emerald-900/30' : 'border border-rose-100 dark:border-rose-900/30'}`}>
                <div>
                  <div className="size-10 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-rose-500">description</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Documentos</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Monitoramento de validades e compliance documental.</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <span className={`block text-2xl font-black ${alertas.documentosExpirando === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{alertas.documentosExpirando}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{alertas.documentosExpirando === 0 ? 'Todos válidos' : 'A vencer'}</span>
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

              {/* Colaboradores Activos */}
              <div className="glass-card p-6 flex flex-col justify-between shadow-soft dark:bg-slate-900/90 dark:border-slate-800">
                <div>
                  <div className="size-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-violet-600">groups</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Colaboradores</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Equipa activa registada na entidade actual.</p>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-2xl font-black text-violet-600">{stats.totalColaboradores}</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">activos</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-4 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  Gerir Equipa
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 min-h-[400px] shadow-soft lg:col-span-1">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Distribuição por Departamento</h3>
                  <p className="text-xs text-slate-400 mt-1">Colaboradores activos por área</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartDepartamentos}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {chartDepartamentos.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [`${value} colaborador(es)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-8 min-h-[400px] shadow-soft lg:col-span-1 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Evolução de Custos</h3>
                  <p className="text-xs text-slate-400 mt-1">Massa salarial processada em {new Date().getFullYear()} — dados reais</p>
                </div>
              </div>
              {chartProcessamento.every((m) => m.bruto === 0) ? (
                <EmptyChart message="Ainda não há processamentos registados este ano." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartProcessamento} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBrutoDb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatKzShort} width={56} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Area isAnimationActive={false} type="monotone" dataKey="bruto" name="Total Bruto" stroke="#9333ea" strokeWidth={2} fill="url(#colorBrutoDb)" />
                    <Line isAnimationActive={false} type="monotone" dataKey="liquido" name="Total Líquido" stroke="#10b981" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card p-8 min-h-[400px] shadow-soft lg:col-span-1 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Absentismo por Departamento</h3>
                  <p className="text-xs text-slate-400 mt-1">Dias não trabalhados e descontos por faltas ({new Date().getFullYear()})</p>
                </div>
              </div>
              {chartAbsentismo.length === 0 ? (
                <EmptyChart message="Nenhuma falta registada nos processamentos deste ano." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartAbsentismo} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatKzShort} width={56} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Bar yAxisId="left" name="Dias Perdidos" isAnimationActive={false} dataKey="diasPerdidos" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="right" name="Desconto Faltas (Kz)" isAnimationActive={false} dataKey="descontoFaltas" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
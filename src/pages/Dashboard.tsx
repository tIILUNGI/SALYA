import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, Line } from 'recharts';

import { api } from '../services/api';
import { AppContext } from '../App';
import { formatKz, formatKzAxis, formatNumberAngola } from '../utils/formatMoney';

// Formatação profissional para gráficos
const formatKzShort = formatKzAxis;
const formatKzTooltip = (value: number) => formatKz(value, 0);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-semibold text-slate-800 dark:text-white">{
            typeof entry.value === 'number' && ['bruto', 'liquido', 'descontoFaltas', 'total', 'inss', 'irt'].includes(entry.dataKey)
              ? formatKzTooltip(entry.value)
              : typeof entry.value === 'number'
                ? formatNumberAngola(entry.value)
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

const dashboardCacheRef = new Map<string, {
  loadedAt: number;
  data: {
    stats: {
      totalEmpresas: number;
      totalColaboradores: number;
      totalProcessamentos: number;
      valorFolhaMensal: number;
      custoTotalEmpresa: number;
      acumuladoTotal: number;
    };
    alertas: {
      contratosExpirando: number;
      documentosExpirando: number;
    };
    chartProcessamento: any[];
    chartAbsentismo: any[];
    chartDepartamentos: any[];
    processamentosMes: number;
  };
}>();

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

  const DEPT_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'];

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) {
        setLoading(false);
        return;
      }

      const currentYear = new Date().getFullYear();
      const cacheKey = `${empresaId}:${currentYear}`;
      const cachedSnapshot = dashboardCacheRef.get(cacheKey);
      const isFresh = cachedSnapshot && Date.now() - cachedSnapshot.loadedAt < 15000;

      if (isFresh) {
        setStats(cachedSnapshot.data.stats);
        setAlertas(cachedSnapshot.data.alertas);
        setChartProcessamento(cachedSnapshot.data.chartProcessamento);
        setChartAbsentismo(cachedSnapshot.data.chartAbsentismo);
        setChartDepartamentos(cachedSnapshot.data.chartDepartamentos);
        setProcessamentosMes(cachedSnapshot.data.processamentosMes);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const alertasPromise = api.get(`/alertas/resumo?empresaId=${empresaId}`).catch((error) => {
          console.error('Erro ao buscar resumo de alertas:', error);
          return null;
        });
        const colaboradoresPromise = ctxColaboradores.length > 0
          ? Promise.resolve(ctxColaboradores)
          : api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`).then((data) => normalizeList(data, 'colaboradores'));
        const [historicoRaw, colaboradores, alertasData] = await Promise.all([
          api.get(`/processamentos/historico?empresaId=${empresaId}&ano=${currentYear}`),
          colaboradoresPromise,
          alertasPromise
        ]);

        const historico: any[] = normalizeList(historicoRaw, 'processamentos');
        const totalEmpresas = ctxEmpresas.length;

        const colaboradoresAtivos = colaboradores.filter(c => c.status === 'Ativo');
        const valorFolha = colaboradoresAtivos.reduce((acc, c) => acc + (c.salarioBase || 0) + (c.subsidioAlimentacao || 0) + (c.subsidioTransporte || 0), 0);
        const totalInssPatronal = colaboradoresAtivos.reduce((acc, c) => acc + ((c.salarioBase || 0) * 0.08), 0);
        const custoTotalEmpresa = valorFolha + totalInssPatronal;
        const acumulado = historico.reduce((acc, h) => acc + (h.totalBruto || 0), 0);

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const processamentoPorMes = meses.map((name) => ({ name, bruto: 0, liquido: 0, processamentos: 0 }));
        const colaboradorDepartamento = new Map(
          colaboradores.map((colaborador) => [colaborador.id, colaborador.departamento || 'Geral'])
        );
        const absentismoPorDepartamento = new Map<string, { descontoFaltas: number; diasPerdidos: number }>();

        historico.forEach((item) => {
          const monthIndex = Number(item.mes) - 1;
          if (monthIndex >= 0 && monthIndex < processamentoPorMes.length) {
            const monthly = processamentoPorMes[monthIndex];
            monthly.bruto += Number(item.totalBruto || 0);
            monthly.liquido += Number(item.salarioLiquido || 0);
            monthly.processamentos++;
          }

          const departamento = colaboradorDepartamento.get(item.colaboradorId);
          if (departamento) {
            const resumo = absentismoPorDepartamento.get(departamento) || { descontoFaltas: 0, diasPerdidos: 0 };
            const diasUteis = Number(item.diasUteis) || 22;
            const diasTrab = Number(item.diasTrabalhados) ?? diasUteis;
            resumo.descontoFaltas += Number(item.valorFaltas || 0);
            resumo.diasPerdidos += Math.max(0, diasUteis - diasTrab);
            absentismoPorDepartamento.set(departamento, resumo);
          }
        });

        const mesActual = new Date().getMonth() + 1;
        const nextProcessamentosMes = processamentoPorMes[mesActual - 1]?.processamentos || 0;
        const nextAlertas = alertasData && typeof alertasData === 'object'
          ? {
              contratosExpirando: alertasData.contratosExpirando || 0,
              documentosExpirando: alertasData.documentosExpirando || 0,
            }
          : { contratosExpirando: 0, documentosExpirando: 0 };

        const nextStats = {
          totalEmpresas,
          totalColaboradores: colaboradoresAtivos.length,
          totalProcessamentos: historico.length,
          valorFolhaMensal: valorFolha,
          custoTotalEmpresa: custoTotalEmpresa,
          acumuladoTotal: acumulado
        };

        const nextChartAbsentismo = Array.from(absentismoPorDepartamento, ([dept, resumo]) => ({
          name: dept.length > 12 ? `${dept.slice(0, 12)}…` : dept,
          dept,
          ...resumo
        })).filter((d) => d.descontoFaltas > 0 || d.diasPerdidos > 0);

        const depts = Array.from(new Set(colaboradoresAtivos.map((c) => (c.departamento || 'Geral')))).filter(Boolean) as string[];
        const nextChartDepartamentos = depts.map((dept) => ({
          name: dept,
          value: colaboradoresAtivos.filter((c) => (c.departamento || 'Geral') === dept).length,
        })).filter((d) => d.value > 0);

        const snapshot = {
          stats: nextStats,
          alertas: nextAlertas,
          chartProcessamento: processamentoPorMes,
          chartAbsentismo: nextChartAbsentismo,
          chartDepartamentos: nextChartDepartamentos.length > 0 ? nextChartDepartamentos : [{ name: 'Geral', value: colaboradoresAtivos.length || 1 }],
          processamentosMes: nextProcessamentosMes,
        };

        dashboardCacheRef.set(cacheKey, { loadedAt: Date.now(), data: snapshot });

        setStats(nextStats);
        setAlertas(nextAlertas);
        setChartProcessamento(processamentoPorMes);
        setChartAbsentismo(nextChartAbsentismo);
        setChartDepartamentos(snapshot.chartDepartamentos);
        setProcessamentosMes(nextProcessamentosMes);

      } catch (error) {
        console.error('Erro geral no Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [empresaId, ctxColaboradores, ctxEmpresas]);

  return (
    <div className="p-4 md:p-8 w-full max-w-full font-app">
      {/* Cabeçalho Corporativo de Visão Geral */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Visão geral</h1>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="size-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 shadow-xs transition-all"
          title="Atualizar dados"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Grelha de Cartões Executivos com Ícones Originais Salya */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            {[
              { title: "Entidades Geridas", value: stats.totalEmpresas, sub: "Empresas no sistema", icon: "/entidades.png", link: '/configuracoes' },
              { title: "Total Colaboradores", value: stats.totalColaboradores, sub: "Funcionários activos", icon: "/total de colaboradores.png", link: '/colaboradores' },
              { title: "Processamentos", value: stats.totalProcessamentos, sub: "Folhas geradas", icon: "/processamento.png", link: '/processamento' },
              { title: "Valor da Folha", value: formatKz(stats.valorFolhaMensal), sub: "Estimativa líquida base", icon: "/valor em folha.png", link: '/processamento' },
              { title: "Custo Total Empresa", value: formatKz(stats.custoTotalEmpresa), sub: "Com INSS Patronal (8%)", icon: "/custo.png", link: '/processamento' },
              { title: "Acumulado Histórico", value: formatKz(stats.acumuladoTotal), sub: "Total bruto processado", icon: "/valor em folha.png", link: '/relatorios' },
            ].map((card, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(card.link)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between h-[135px]"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 truncate">{card.title}</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{card.value}</h3>
                  </div>
                  <div className="shrink-0 flex items-center justify-center size-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <img src={card.icon} alt={card.title} className="w-5 h-5 object-contain" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Secção de Módulos & Alertas */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Módulos Operacionais &amp; Compliance
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Processamento do Mês */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <img src="/processamento.png" alt="Processamento" className="w-5 h-5 object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Processamento</h4>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-black text-primary">{processamentosMes}</span>
                    <span className="text-xs text-slate-400 font-medium">de {stats.totalColaboradores} activos</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/processamento')}
                  className="flex items-center justify-between w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  Ir ao Processamento
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
              
              {/* Alerta Contratos */}
              <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border flex flex-col justify-between ${alertas.contratosExpirando === 0 ? 'border-slate-200/80 dark:border-slate-800' : 'border-purple-200 dark:border-purple-900/50'}`}>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <img src="/contratos.png" alt="Contratos" className="w-5 h-5 object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Contratos</h4>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <span className={`block text-3xl font-black ${alertas.contratosExpirando === 0 ? 'text-purple-700' : 'text-slate-900'}`}>{alertas.contratosExpirando}</span>
                      <span className="text-xs text-slate-400 font-medium">{alertas.contratosExpirando === 0 ? 'Sem Pendências' : 'A expirar'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(alertas.contratosExpirando > 0 ? '/alertas' : '/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  {alertas.contratosExpirando > 0 ? 'Ver Alertas' : 'Gerir Colaboradores'}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>

              {/* Alerta Documentos */}
              <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border flex flex-col justify-between ${alertas.documentosExpirando === 0 ? 'border-slate-200/80 dark:border-slate-800' : 'border-purple-200 dark:border-purple-900/50'}`}>
                <div>
                   <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <img src="/Documentos.png" alt="Documentos" className="w-5 h-5 object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Documentos</h4>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <span className={`block text-3xl font-black ${alertas.documentosExpirando === 0 ? 'text-purple-700' : 'text-slate-900'}`}>{alertas.documentosExpirando}</span>
                      <span className="text-xs text-slate-400 font-medium">{alertas.documentosExpirando === 0 ? 'Todos Válidos' : 'A vencer'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(alertas.documentosExpirando > 0 ? '/alertas' : '/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                >
                  {alertas.documentosExpirando > 0 ? 'Ver Alertas' : 'Gerir Arquivo'}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>

              {/* Colaboradores Activos */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <img src="/total de colaboradores.png" alt="Colaboradores" className="w-5 h-5 object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Colaboradores</h4>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-black text-purple-700">{stats.totalColaboradores}</span>
                    <span className="text-xs text-slate-400 font-medium">activos</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/colaboradores')}
                  className="flex items-center justify-between w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
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
                    formatter={(value: number, name: string) => [`${formatNumberAngola(value)} colaborador(es)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-8 min-h-[400px] shadow-soft lg:col-span-1 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Evolução de Custos</h3>
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
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatKzShort} width={72} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Area isAnimationActive={false} type="monotone" dataKey="bruto" name="Total Bruto" stroke="#9333ea" strokeWidth={2} fill="url(#colorBrutoDb)" />
                    <Line isAnimationActive={false} type="monotone" dataKey="liquido" name="Total Líquido" stroke="#334155" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card p-8 min-h-[400px] shadow-soft lg:col-span-1 dark:bg-slate-900/90 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Absentismo por Departamento</h3>
                </div>
              </div>
              {chartAbsentismo.length === 0 ? (
                <EmptyChart message="Nenhuma falta registada nos processamentos deste ano." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartAbsentismo} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatNumberAngola} width={40} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatKzShort} width={72} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Bar yAxisId="left" name="Dias Perdidos" isAnimationActive={false} dataKey="diasPerdidos" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="right" name="Desconto Faltas (Kz)" isAnimationActive={false} dataKey="descontoFaltas" fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
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
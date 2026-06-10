import React, { useEffect, useState, useContext } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Download, AlertCircle, FileText } from 'lucide-react';

import { api } from '../services/api';
import { AppContext } from '../App';

const Relatórios: React.FC = () => {
  const { empresaId } = useContext(AppContext);
  const [chartProcessamento, setChartProcessamento] = useState<any[]>([]);
  const [chartAbsentismo, setChartAbsentismo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCharts = async () => {
      if (!empresaId) return;
      
      setLoading(true);
      try {
        const charts = await api.get(`/dashboard/charts?empresaId=${empresaId}`);
        setChartProcessamento(charts.processamentoMensal || []);
        setChartAbsentismo(charts.absentismoDepartamento || []);
      } catch {
        setChartProcessamento([]);
        setChartAbsentismo([]);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchEntities = async () => {
      try {
        const data = await api.get('/reports/entities');
        setEntities(data || []);
      } catch (error) {
        console.error('Erro ao carregar entidades:', error);
      }
    };
    
    fetchCharts();
    fetchEntities();
  }, [empresaId]);

  const handleDownloadReport = async (entityId: number) => {
    setDownloading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('salya_token') || localStorage.getItem('token');
      const baseUrl = (api as any).API_BASE_URL || 'http://localhost:8082/api';
      
      const response = await fetch(`${baseUrl}/reports/entity/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao gerar PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Relatorio_Entidade_${entityId}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      setMessage('✅ Relatório baixado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ Erro ao baixar relatório: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Relatórios & Insights</h1>
          <p className="text-sm font-medium text-slate-500">Acompanhe as métricas de desempenho e custos em tempo real.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 shadow-soft hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">calendar_today</span>
            Últimos 12 Meses
          </button>
        </div>
      </div>

      {/* Seção de Download de Relatórios PDF */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Relatórios Completos em PDF</h3>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.length > 0 ? (
            entities.map((entity: any) => (
              <div key={entity.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{entity.nome}</p>
                  <p className="text-xs text-slate-500">ID: {entity.id}</p>
                </div>
                <button
                  onClick={() => handleDownloadReport(entity.id)}
                  disabled={downloading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 font-medium text-sm"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Gerando...' : 'Baixar'}
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">Nenhuma entidade disponível</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">O PDF contém:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Informações completas da entidade</li>
              <li>Lista de colaboradores</li>
              <li>Histórico de processamentos de salários</li>
              <li>Estatísticas e totalizações</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Folha de Pagamento Anual</h3>
            <div className="px-3 py-1 bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-bold">+12% vs ano ant.</div>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Analizando Dados...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartProcessamento} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Absentismo por Dept.</h3>
            <span className="material-symbols-outlined text-slate-300">more_horiz</span>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Calculando Taxas...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartAbsentismo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="faltas" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="justificadas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Relatórios;

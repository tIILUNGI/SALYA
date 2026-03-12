import React from 'react';
import { useNavigate } from 'react-router-dom';
import { processamentos, colaboradores } from '../data/mockData';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo! Aqui está o resumo da folha de pagamento.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/colaboradores')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Novo Colaborador
          </button>
          <button 
            onClick={() => navigate('/processamento')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">sync</span>
            Processar Salário
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> +2.4%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Colaboradores</p>
          <p className="text-2xl font-bold mt-1">{colaboradores.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> +5.1%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Salários Processados</p>
          <p className="text-2xl font-bold mt-1">Kz 4.250.000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">priority_high</span> 12 pendentes
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Faturas Pendentes</p>
          <p className="text-2xl font-bold mt-1">12</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">beach_access</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Férias neste Mês</p>
          <p className="text-2xl font-bold mt-1">5</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-bold">Histórico de Processamento</h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Referência</th>
                  <th className="px-6 py-4 font-semibold">Colaboradores</th>
                  <th className="px-6 py-4 font-semibold">Valor Total</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {processamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{p.mes}/{p.ano}</td>
                    <td className="px-6 py-4">{p.colaboradores}</td>
                    <td className="px-6 py-4">Kz {p.valorTotal.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{p.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-lg font-bold">Ações Rápidas</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/bancario')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-left shadow-sm"
            >
              <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Emitir Contracheques</p>
                <p className="text-xs text-slate-500">Geração em massa (PDF)</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/bancario')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-left shadow-sm"
            >
              <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Arquivo Bancário</p>
                <p className="text-xs text-slate-500">Gerar remessa CNAB 240</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/multicaixa')}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-left shadow-sm"
            >
              <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">qr_code</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Integração Multicaixa</p>
                <p className="text-xs text-slate-500">Transferências automáticas</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

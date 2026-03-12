import React, { useState } from 'react';
import { guias } from '../data/mockData';

const Guias: React.FC = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredGuias = guias.filter(g => {
    if (selectedType !== 'all' && g.tipo !== selectedType) return false;
    if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
    return true;
  });

  const totalPendente = guias.filter(g => g.status === 'Pendente').reduce((sum, g) => sum + g.valor, 0);
  const totalPago = guias.filter(g => g.status === 'Pago').reduce((sum, g) => sum + g.valor, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="hover:text-primary cursor-pointer">Início</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="hover:text-primary cursor-pointer">Folha de Pagamento</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Guias DLI</span>
        </nav>
        <h1 className="text-3xl font-black tracking-tight">Guias de Pagamento DLI/AGT</h1>
        <p className="text-slate-500 mt-1">Gere e gerencie guias de pagamento de impostos e contribuições para Angola.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pendentes</p>
          <p className="text-2xl font-bold mt-1">{totalPendente.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pagos</p>
          <p className="text-2xl font-bold mt-1">{totalPago.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">receipt</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Guias</p>
          <p className="text-2xl font-bold mt-1">{guias.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Valor</p>
          <p className="text-2xl font-bold mt-1">{(totalPendente + totalPago).toLocaleString()} Kz</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <option value="all">Todos os Tipos</option>
          <option value="INSS">INSS</option>
          <option value="IRT">IRT</option>
          <option value="AGT">AGT</option>
        </select>
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <option value="all">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Pago">Pago</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
          <span className="material-symbols-outlined">add</span>
          Nova Guia
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Referência</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Período</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGuias.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="p-4 font-mono text-sm">{g.referencia}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      g.tipo === 'INSS' ? 'bg-blue-100 text-blue-700' :
                      g.tipo === 'IRT' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{g.tipo}</span>
                  </td>
                  <td className="p-4 font-medium">{g.descricao}</td>
                  <td className="p-4">{g.periodo}</td>
                  <td className="p-4 text-right font-bold">{g.valor.toLocaleString()} Kz</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      g.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{g.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      {g.status === 'Pendente' && (
                        <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg">
                          <span className="material-symbols-outlined">payment</span>
                        </button>
                      )}
                      <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Guias;

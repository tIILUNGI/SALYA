import React, { useState, useContext } from 'react';
import { faturas } from '../data/mockData';
import { AppContext } from '../App';

const Faturas: React.FC = () => {
  const { empresa } = useContext(AppContext);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<typeof faturas[0] | null>(null);

  const filteredFaturas = faturas.filter(f => {
    if (selectedStatus === 'all') return true;
    return f.status === selectedStatus;
  });

  const totalEmitidas = faturas.filter(f => f.status === 'Emitida').reduce((sum, f) => sum + f.valor, 0);
  const totalPagas = faturas.filter(f => f.status === 'Paga').reduce((sum, f) => sum + f.valor, 0);
  const totalPendentes = faturas.filter(f => f.status === 'Pendente').reduce((sum, f) => sum + f.valor, 0);

  const openFatura = (fatura: typeof faturas[0]) => {
    setSelectedFatura(fatura);
    setShowModal(true);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="hover:text-primary cursor-pointer">Início</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Faturação</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Fatura Eletrónica</h1>
            <p className="text-slate-500 mt-1">Gerencie as faturas eletrónicas e conformidade com a AGT.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90">
            <span className="material-symbols-outlined">add</span>
            Nova Fatura
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Emitidas</p>
          <p className="text-2xl font-bold mt-1">{totalEmitidas.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Pagas</p>
          <p className="text-2xl font-bold mt-1">{totalPagas.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pendentes</p>
          <p className="text-2xl font-bold mt-1">{totalPendentes.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Faturas</p>
          <p className="text-2xl font-bold mt-1">{faturas.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <option value="all">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Emitida">Emitida</option>
          <option value="Paga">Paga</option>
          <option value="Cancelada">Cancelada</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <span className="material-symbols-outlined">download</span>
          Exportar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Número</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">IVA (14%)</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Retenção (6.5%)</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFaturas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => openFatura(f)}>
                  <td className="p-4 font-mono font-medium">{f.numero}</td>
                  <td className="p-4 font-medium">{f.cliente}</td>
                  <td className="p-4 text-sm">{f.data}</td>
                  <td className="p-4 text-right font-bold">{f.valor.toLocaleString()} Kz</td>
                  <td className="p-4 text-right text-sm text-slate-500">{(f.valor * 0.14).toLocaleString()} Kz</td>
                  <td className="p-4 text-right text-sm text-slate-500">{(f.valor * 0.065).toLocaleString()} Kz</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      f.status === 'Emitida' ? 'bg-emerald-100 text-emerald-700' :
                      f.status === 'Paga' ? 'bg-blue-100 text-blue-700' :
                      f.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{f.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <span className="material-symbols-outlined">download</span>
                      </button>
                      <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <span className="material-symbols-outlined">send</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Preview da Fatura */}
      {showModal && selectedFatura && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-xl uppercase tracking-wider">{empresa?.nome || 'Empresa'}</h2>
                <div className="text-slate-500 text-sm mt-2">
                  <p>NIF: {empresa?.nif || '-'}</p>
                  <p>{empresa?.endereco || '-'}</p>
                  <p>{empresa?.municipio}{empresa?.municipio && empresa?.provincia ? ', ' : ''}{empresa?.provincia || '-'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">{selectedFatura.numero}</h3>
                  <p className="text-sm text-slate-500">Data de Emissão: {selectedFatura.data}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium uppercase mb-1">Para</p>
                  <p className="font-bold text-lg">{selectedFatura.cliente}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{selectedFatura.valor.toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">IVA (14%)</span>
                  <span>{(selectedFatura.valor * 0.14).toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-slate-500">Retenção na Fonte (6.5%)</span>
                  <span>- {(selectedFatura.valor * 0.065).toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 dark:border-slate-700 pt-4">
                  <span>Total a Pagar</span>
                  <span className="text-primary">{(selectedFatura.valor * 1.14 * 0.935).toLocaleString()} Kz</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between opacity-60">
                <p className="text-xs text-slate-500 font-medium">Os produtos/serviços foram prestados onde é aplicável a isenção de IVA, exceto indicação contrária.</p>
                <div className="flex flex-col items-center ml-4 shrink-0">
                  <img src="/Captura%20de%20Ecr%C3%A3%20(87).png" alt="SALYA Icon" className="w-8 h-8 rounded-md mb-1 object-cover shadow-sm bg-primary" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span className="text-[10px] font-bold text-slate-400">Gerado por SALYA</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">send</span>
                Enviar por Email
              </button>
              <button className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faturas;

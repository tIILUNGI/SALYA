import React, { useState } from 'react';
import { colaboradores } from '../data/mockData';

const Bancario: React.FC = () => {
  const [selectedBank, setSelectedBank] = useState('bai');
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const banks = [
    { id: 'bai', name: 'Banco Angolano de Investimento (BAI)', code: '0040' },
    { id: 'bfa', name: 'Banco de Fomento Angola (BFA)', code: '0041' },
    { id: 'bpa', name: 'Banco de Poupança e Crédito (BPC)', code: '0042' },
    { id: 'bma', name: 'Banco Millennium Atlântico (BMA)', code: '0043' },
    { id: 'santander', name: 'Santander Angola', code: '0046' },
    { id: 'atlas', name: 'Banco Atlas', code: '0047' },
  ];

  const filteredColaboradores = colaboradores.filter(c => c.salarioBase > 0);
  const totalAmount = filteredColaboradores.reduce((sum, c) => sum + c.salarioBase, 0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="hover:text-primary cursor-pointer">Início</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="hover:text-primary cursor-pointer">Folha de Pagamento</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Emissão CNAB</span>
        </nav>
        <h1 className="text-3xl font-black tracking-tight">Emissão de Arquivo Bancário (CNAB 240)</h1>
        <p className="text-slate-500 mt-1">Gere e valide o ficheiro de transferência em lote para o ano fiscal de 2026.</p>
      </div>

      <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-100 dark:border-green-800 mb-8 w-fit">
        <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
        <span className="text-sm font-semibold text-green-700 dark:text-green-300 tracking-tight">Processamento Mensal: Concluído</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Configuração do Ficheiro</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Banco de Destino</label>
                <select 
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Mês de Referência</label>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Tipo de Movimento</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <option>Pagamento de Salários</option>
                  <option>Pagamento de Fornecedores</option>
                  <option>Transferência Interna</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Totais do Lote</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Total Registos:</span>
                <span className="font-bold">{filteredColaboradores.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Valor Total:</span>
                <span className="font-bold text-primary">{totalAmount.toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Banco:</span>
                <span className="font-medium">{banks.find(b => b.id === selectedBank)?.name}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                A Gerar...
              </>
            ) : generated ? (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Ficheiro Gerado
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">download</span>
                Gerar CNAB 240
              </>
            )}
          </button>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold">Colaboradores Incluídos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nº</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">NIF</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">IBAN</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Valor (Kz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredColaboradores.map((colab, index) => (
                    <tr key={colab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-4 text-sm">{index + 1}</td>
                      <td className="p-4 font-medium">{colab.nome}</td>
                      <td className="p-4 text-sm font-mono">{colab.nif}</td>
                      <td className="p-4 text-sm font-mono">{colab.iban}</td>
                      <td className="p-4 text-sm text-right font-medium">{colab.salarioBase.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <tr>
                    <td className="p-4" colSpan={4}>Total</td>
                    <td className="p-4 text-right text-primary">{totalAmount.toLocaleString()} Kz</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {generated && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Ficheiro CNAB Gerado com Sucesso!</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Nome do Ficheiro:</p>
                  <p className="font-mono font-medium">CB{selectedMonth.replace('-', '')}001.REM</p>
                </div>
                <div>
                  <p className="text-slate-500">Banco:</p>
                  <p className="font-medium">{banks.find(b => b.id === selectedBank)?.code}</p>
                </div>
                <div>
                  <p className="text-slate-500">Registos:</p>
                  <p className="font-medium">{filteredColaboradores.length}</p>
                </div>
                <div>
                  <p className="text-slate-500">Data Geração:</p>
                  <p className="font-medium">10/03/2026</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
                  <span className="material-symbols-outlined">download</span>
                  Download
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50">
                  <span className="material-symbols-outlined">email</span>
                  Enviar ao Banco
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bancario;

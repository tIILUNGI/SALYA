import React, { useState } from 'react';
import { colaboradores } from '../data/mockData';

const MRT: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [selectedUnit, setSelectedUnit] = useState('sede');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const units = [
    { id: 'sede', name: 'Sede - Luanda' },
    { id: 'benguela', name: 'Filial Benguela' },
    { id: 'lubango', name: 'Filial Lubango' },
  ];

  // Calcular IRT para cada colaborador
  const calculateIRT = (salario: number) => {
    if (salario <= 100000) return 0;
    if (salario <= 150000) return (salario - 100000) * 0.05 - 5000;
    if (salario <= 200000) return (salario - 150000) * 0.10 - 12500;
    if (salario <= 300000) return (salario - 200000) * 0.15 - 22500;
    if (salario <= 500000) return (salario - 300000) * 0.20 - 37500;
    if (salario <= 750000) return (salario - 500000) * 0.22 - 47500;
    if (salario <= 1000000) return (salario - 750000) * 0.25 - 70000;
    if (salario <= 1500000) return (salario - 1000000) * 0.27 - 95000;
    return (salario - 1500000) * 0.32 - 174500;
  };

  const activeColaboradores = colaboradores.filter(c => c.status === 'Ativo');
  const totalBruto = activeColaboradores.reduce((sum, c) => sum + c.salarioBase, 0);
  const totalIRT = activeColaboradores.reduce((sum, c) => sum + calculateIRT(c.salarioBase), 0);
  const totalINSS = activeColaboradores.reduce((sum, c) => sum + (c.salarioBase * 0.03), 0);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 2500);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="hover:text-primary cursor-pointer">Início</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="hover:text-primary cursor-pointer">Folha de Pagamento</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Submissão MRT</span>
        </nav>
        <h1 className="text-3xl font-black tracking-tight">Submissão do Modelo MRT (AGT)</h1>
        <p className="text-slate-500 mt-1">Submeta a declaração de movimentos relativos a trabalhadores para a Administração Geral Tributária.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Configuração da Submissão</h3>
            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Unidade de Negócio</label>
                <select 
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Resumo de Impostos</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Rendimento Bruto:</span>
                <span className="font-bold">{totalBruto.toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Total IRT:</span>
                <span className="font-bold text-amber-600">{totalIRT.toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Total INSS:</span>
                <span className="font-bold text-blue-600">{totalINSS.toLocaleString()} Kz</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total a Pagar:</span>
                  <span className="font-bold text-primary text-lg">{(totalIRT + totalINSS).toLocaleString()} Kz</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                A Submeter...
              </>
            ) : submitted ? (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Submetido
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">upload_file</span>
                Submeter à AGT
              </>
            )}
          </button>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold">Dados Fiscais dos Colaboradores</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nº</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">NIF</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Rend. Bruto (Kz)</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">IRT Retido (Kz)</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeColaboradores.map((colab, index) => (
                    <tr key={colab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-4 text-sm">{index + 1}</td>
                      <td className="p-4 font-medium">{colab.nome}</td>
                      <td className="p-4 text-sm font-mono">{colab.nif}</td>
                      <td className="p-4 text-sm text-right font-medium">{colab.salarioBase.toLocaleString()}</td>
                      <td className="p-4 text-sm text-right font-medium text-amber-600">{calculateIRT(colab.salarioBase).toLocaleString()}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Validado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <tr>
                    <td className="p-4" colSpan={3}>Total</td>
                    <td className="p-4 text-right">{totalBruto.toLocaleString()} Kz</td>
                    <td className="p-4 text-right text-amber-600">{totalIRT.toLocaleString()} Kz</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {submitted && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Declaração Submetida com Sucesso!</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Número de Recibo:</p>
                  <p className="font-mono font-medium">MRT-2026-{Math.floor(Math.random() * 10000)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Data Submissão:</p>
                  <p className="font-medium">10/03/2026 15:30</p>
                </div>
                <div>
                  <p className="text-slate-500">Colaboradores:</p>
                  <p className="font-medium">{activeColaboradores.length}</p>
                </div>
                <div>
                  <p className="text-slate-500">Valor Total:</p>
                  <p className="font-medium">{(totalIRT + totalINSS).toLocaleString()} Kz</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
                  <span className="material-symbols-outlined">download</span>
                  Download XML
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50">
                  <span className="material-symbols-outlined">print</span>
                  Imprimir Comprovativo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MRT;

import React, { useState, useContext } from 'react';
import { AppContext } from '../App';

const fmt = (v: number) =>
  Number(v).toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Rescisoes: React.FC = () => {
  const { colaboradores } = useContext(AppContext);
  const ativos = colaboradores.filter(c => c.status === 'Ativo');

  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [dataSaida, setDataSaida] = useState('');
  const [motivo, setMotivo] = useState('Mútuo Acordo');
  const [diasFerias, setDiasFerias] = useState(22);
  const [retroativos, setRetroativos] = useState<number>(0);
  const [result, setResult] = useState<any | null>(null);

  const selectedColab = ativos.find(c => c.id === Number(selectedId)) || null;

  const handleCalcular = () => {
    if (!selectedColab || !dataSaida) return;

    const salario = Number(selectedColab.salarioBase);
    const dataAdm = selectedColab.dataAdmissao ? new Date(selectedColab.dataAdmissao) : new Date(Date.now() - 365 * 24 * 3600 * 1000);
    const dataOut = new Date(dataSaida);

    // Meses trabalhados
    const meses = Math.max(1, Math.floor((dataOut.getTime() - dataAdm.getTime()) / (1000 * 3600 * 24 * 30)));
    const anos = meses / 12;

    // Proporcional (dias restantes do mês)
    const diasRestantes = dataOut.getDate();
    const proporcional = (salario / 30) * diasRestantes;

    // Subsídio Natal proporcional
    const subsidioNatal = (salario / 12) * (dataOut.getMonth() + 1);

    // Férias
    const subsFerias = (salario / 30) * diasFerias;

    // Indemnização LGT: para Mútuo Acordo e Despedimento = 1 mês por ano de serviço
    const indenizacao = motivo !== 'Término de Contrato' ? salario * anos : 0;

    const totalBruto = proporcional + subsidioNatal + subsFerias + indenizacao + Number(retroativos || 0);

    // INSS Trabalhador (3% sobre salário proporcional + retroativos)
    const baseINSS = proporcional + Number(retroativos || 0);
    const inss = baseINSS * 0.03;

    // IRT Simplificado (Aproximação progressiva Angola sobre matéria coletável)
    const materiaIrt = Math.max(0, baseINSS - inss);
    let irt = 0;
    if (materiaIrt > 100000 && materiaIrt <= 150000) {
      irt = (materiaIrt - 100000) * 0.13;
    } else if (materiaIrt > 150000 && materiaIrt <= 200000) {
      irt = 6500 + (materiaIrt - 150000) * 0.16;
    } else if (materiaIrt > 200000) {
      irt = 14500 + (materiaIrt - 200000) * 0.18;
    }

    const descontos = inss + irt;
    const totalLiquido = Math.max(0, totalBruto - descontos);

    setResult({ proporcional, subsidioNatal, subsFerias, indenizacao, retroativos: Number(retroativos || 0), inss, irt, descontos, totalBruto, totalLiquido, meses });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full overflow-x-hidden font-app">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rescisões de Contrato</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Formulário */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 mb-6">Dados de Fim de Contrato</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Funcionário</label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value as any); setResult(null); }}
                className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold text-xs sm:text-sm"
              >
                <option value="">Selecione...</option>
                {ativos.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.cargo}</option>)}
              </select>
            </div>

            {selectedColab && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
                <p>Admissão: <strong>{selectedColab.dataAdmissao || 'N/D'}</strong></p>
                <p>Salário Base: <strong>{fmt(Number(selectedColab.salarioBase))} Kz</strong></p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Data de Saída</label>
                <input
                  type="date"
                  value={dataSaida}
                  onChange={e => { setDataSaida(e.target.value); setResult(null); }}
                  className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Motivo</label>
                <select
                  value={motivo}
                  onChange={e => { setMotivo(e.target.value); setResult(null); }}
                  className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                >
                  <option>Mútuo Acordo</option>
                  <option>Despedimento por Justa Causa</option>
                  <option>Término de Contrato</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Dias de Férias não Gozadas</label>
                <input
                  type="number"
                  value={diasFerias}
                  onChange={e => { setDiasFerias(Number(e.target.value)); setResult(null); }}
                  min={0}
                  max={44}
                  className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Ajustes Retroativos (Kz)</label>
                <input
                  type="number"
                  value={retroativos}
                  onChange={e => { setRetroativos(Number(e.target.value)); setResult(null); }}
                  placeholder="0.00"
                  className="w-full px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleCalcular}
              disabled={!selectedId || !dataSaida}
              className="w-full bg-slate-800 dark:bg-slate-700 text-white py-3.5 sm:py-4 rounded-xl text-xs font-bold transition-all hover:bg-slate-700 disabled:opacity-40 mt-2"
            >
              Calcular Fecho de Contas
            </button>
          </div>
        </div>

        {/* Resultado */}
        <div className="glass-card p-4 sm:p-6 lg:p-8 flex flex-col justify-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-2 h-full ${result ? 'bg-red-500' : 'bg-slate-200'}`} />

          {!result ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px] text-center">
              <span className="material-symbols-outlined text-5xl sm:text-6xl text-slate-200 mb-4">person_remove</span>
              <p className="text-slate-400 font-bold text-xs">Preencha os dados e calcule o fecho</p>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-bold text-red-500 mb-1">Fecho de Contas — LGT Angola</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-2">{selectedColab?.nome} · {result.meses} meses de serviço</p>
              <div className="mb-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Líquido a Receber</span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight break-all">
                  {fmt(result.totalLiquido)} <span className="text-lg sm:text-xl text-slate-400">Kz</span>
                </h1>
                <p className="text-xs text-slate-400 font-semibold mt-1">Bruto: {fmt(result.totalBruto)} Kz · Impostos: -{fmt(result.descontos)} Kz</p>
              </div>

              <div className="space-y-2 mb-6 sm:mb-8 max-h-[280px] overflow-y-auto pr-1">
                {[
                  { label: 'Salário Proporcional', valor: result.proporcional, isDeduction: false },
                  { label: 'Ajustes Retroativos Salariais', valor: result.retroativos, isDeduction: false },
                  { label: 'Subsídio de Natal Proporcional', valor: result.subsidioNatal, isDeduction: false },
                  { label: `Subsídio de Férias (${diasFerias} dias)`, valor: result.subsFerias, isDeduction: false },
                  { label: 'Indemnização LGT', valor: result.indenizacao, isDeduction: false },
                  { label: 'Dedução INSS (3%)', valor: result.inss, isDeduction: true },
                  { label: 'Dedução IRT', valor: result.irt, isDeduction: true },
                ].map((item, i) => (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl gap-1 sm:gap-4 ${item.isDeduction ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-sm shrink-0 ${item.isDeduction ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {item.isDeduction ? 'remove_circle' : 'check_circle'}
                      </span>
                      <p className={`text-xs sm:text-sm font-bold ${item.isDeduction ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                    </div>
                    <span className={`text-xs sm:text-sm font-black shrink-0 sm:text-right ${item.isDeduction ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                      {item.isDeduction ? '-' : ''}{fmt(item.valor)} Kz
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setResult(null)}
                className="w-full bg-red-50 text-red-600 border border-red-200 py-3.5 sm:py-4 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                Prosseguir com Desligamento
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rescisoes;

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

    // Indenização LGT: para Mútuo Acordo e Despedimento = 1 mês por ano de serviço
    const indenizacao = motivo !== 'Término de Contrato' ? salario * anos : 0;

    const total = proporcional + subsidioNatal + subsFerias + indenizacao;

    setResult({ proporcional, subsidioNatal, subsFerias, indenizacao, total, meses });
  };

  return (
    <div className="p-8 animate-in fade-in slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Rescisões de Contrato</h1>
        <p className="text-sm text-slate-500 mt-1">Cálculo legal de fecho de contas conforme a LGT Angola.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Dados de Fim de Contrato</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Funcionário</label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value as any); setResult(null); }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Saída</label>
                <input
                  type="date"
                  value={dataSaida}
                  onChange={e => { setDataSaida(e.target.value); setResult(null); }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo</label>
                <select
                  value={motivo}
                  onChange={e => { setMotivo(e.target.value); setResult(null); }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Mútuo Acordo</option>
                  <option>Despedimento por Justa Causa</option>
                  <option>Término de Contrato</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dias de Férias não Gozadas</label>
              <input
                type="number"
                value={diasFerias}
                onChange={e => { setDiasFerias(Number(e.target.value)); setResult(null); }}
                min={0}
                max={44}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleCalcular}
              disabled={!selectedId || !dataSaida}
              className="w-full bg-slate-800 dark:bg-slate-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-700 disabled:opacity-40 mt-2"
            >
              Calcular Fecho de Contas
            </button>
          </div>
        </div>

        {/* Resultado */}
        <div className="glass-card p-8 flex flex-col justify-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-2 h-full ${result ? 'bg-red-500' : 'bg-slate-200'}`} />

          {!result ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">person_remove</span>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preencha os dados e calcule o fecho</p>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Fecho de Contas — LGT Angola</h3>
              <p className="text-sm text-slate-500 mb-2">{selectedColab?.nome} · {result.meses} meses de serviço</p>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-8">
                {fmt(result.total)} <span className="text-xl text-slate-400">Kz</span>
              </h1>

              <div className="space-y-3 mb-8">
                {[
                  { label: 'Salário Proporcional', valor: result.proporcional },
                  { label: 'Subsídio de Natal Proporcional', valor: result.subsidioNatal },
                  { label: `Subsídio de Férias (${diasFerias} dias)`, valor: result.subsFerias },
                  { label: 'Indemnização LGT', valor: result.indenizacao },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(item.valor)} Kz</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setResult(null)}
                className="w-full bg-red-50 text-red-600 border border-red-200 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
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

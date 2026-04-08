import React, { useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { AppContext } from '../App';

interface SimResult {
  salarioAtual: number;
  novoSalario: number;
  custoEmpresaAtual: number;
  custoEmpresaNovo: number;
  diferencaCusto: number;
  liquidoAtual: number;
  liquidoNovo: number;
}

const fmt = (v: number) =>
  Number(v).toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Simulacao: React.FC = () => {
  const { colaboradores } = useContext(AppContext);
  const ativos = colaboradores.filter(c => c.status === 'Ativo');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [novoSalario, setNovoSalario] = useState<number>(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedColab = ativos.find(c => c.id === selectedId) || null;

  useEffect(() => {
    if (ativos.length > 0 && !selectedId) {
      setSelectedId(ativos[0].id);
      setNovoSalario(Math.round(Number(ativos[0].salarioBase) * 1.1));
    }
  }, [colaboradores]);

  useEffect(() => {
    if (selectedColab) {
      setNovoSalario(Math.round(Number(selectedColab.salarioBase) * 1.1));
      setResult(null);
    }
  }, [selectedId]);

  const handleCalcular = async () => {
    if (!selectedId || !novoSalario) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/simulacao/calcular', { colaboradorId: selectedId, novoSalario });
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Erro ao calcular simulação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Simulações Salariais</h1>
        <p className="text-sm text-slate-500 mt-1">Crie cenários hipotéticos e veja o impacto financeiro real (INSS + IRT).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Parâmetros */}
        <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Parâmetros</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Funcionário</label>
              <select
                value={selectedId || ''}
                onChange={e => setSelectedId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {ativos.length === 0 && <option>Nenhum colaborador ativo</option>}
                {ativos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} — {c.cargo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salário Base Atual (Kz)</label>
              <input
                readOnly
                value={selectedColab ? fmt(Number(selectedColab.salarioBase)) : '—'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Novo Salário — Cenário (Kz)</label>
              <input
                type="text"
                value={novoSalario ? fmt(novoSalario) : ''}
                onChange={e => setNovoSalario(Number(e.target.value.replace(/\D/g, '')))}
                className="w-full px-4 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 text-primary font-black outline-none focus:border-primary"
                placeholder="0"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold p-3 bg-red-50 rounded-xl">{error}</p>}

            <button
              onClick={handleCalcular}
              disabled={loading || !selectedId || !novoSalario}
              className="w-full bg-primary text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A calcular...
                </span>
              ) : 'Calcular Cenário'}
            </button>
          </div>
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[350px] text-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">calculate</span>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Selecione um colaborador e clique em "Calcular"</p>
            </div>
          ) : (
            <>
              {/* Cards de Custos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 border-b-4 border-b-slate-400">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Custo Atual (Empresa)</p>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">{fmt(result.custoEmpresaAtual)} <span className="text-sm text-slate-400">Kz</span></h2>
                </div>
                <div className="glass-card p-5 border-b-4 border-b-amber-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Novo Custo Estimado</p>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">{fmt(result.custoEmpresaNovo)} <span className="text-sm text-slate-400">Kz</span></h2>
                </div>
                <div className="glass-card p-5 border-b-4 border-b-red-500 bg-red-50 dark:bg-red-900/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Impacto Mensal Extra</p>
                  <h2 className="text-2xl font-black text-red-600">+{fmt(result.diferencaCusto)} <span className="text-sm">Kz</span></h2>
                </div>
              </div>

              {/* Comparação líquido colaborador */}
              <div className="glass-card p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
                  Declaração do Colaborador — {selectedColab?.nome}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 space-y-2">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cenário Atual</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Bruto: <strong>{fmt(result.salarioAtual)} Kz</strong></p>
                    <p className="text-lg font-black text-emerald-600">Líquido: {fmt(result.liquidoAtual)} Kz</p>
                  </div>
                  <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-5 space-y-2">
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">Novo Cenário</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Bruto: <strong>{fmt(result.novoSalario)} Kz</strong></p>
                    <p className="text-lg font-black text-emerald-600">Líquido: {fmt(result.liquidoNovo)} Kz</p>
                  </div>
                </div>
              </div>

              {/* Acções */}
              <div className="glass-card p-5 flex gap-3">
                <button className="flex-1 bg-emerald-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                  Aprovar Aumento
                </button>
                <button
                  onClick={() => { setResult(null); }}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Recalcular
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulacao;

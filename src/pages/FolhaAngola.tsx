import React, { useState, useEffect } from 'react';
import { roundMoney, calcularIRT } from '../utils/taxCalculations';

const API_BASE = (() => {
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.');
  return isLocal ? `http://${h}:8080/api` : 'https://api.salya.ao/api';
})();

const fmt = (v: number) =>
  Number(v).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STORAGE_KEY = 'folha_angola_lead';

interface LeadInfo { nome: string; email: string; }
interface D13Result {
  salarioBase: number;
  subsidioAlimentacao?: number;
  subsidioTransporte?: number;
  outrosSubsidios?: number;
  salarioBrutoNormal?: number;
  inssNormal?: number;
  irtNormal?: number;
  salarioLiquidoNormal?: number;
  mesesTrabalhados: number;
  percentagem: number;
  valorBruto: number;
  inss: number;
  isencaoINSS: boolean;
  irt: number;
  valorLiquido: number;
  totalBrutoReceber?: number;
  totalDescontosReceber?: number;
  totalLiquidoReceber?: number;
  nota: string;
}
interface RescisaoResult {
  salarioBase: number; anosAntiguidade: number; mesesRestantes: number;
  detalhes: {
    salarioDiasTrabalhadosMes: number; propDecimoTerceiro: number;
    feriasVencidas: number; subsidioFeriasVencidas: number;
    propFerias: number; subsidioFeriasProp: number; indemnizacao: number;
  };
  descontos: { inssColaborador: number; irtMes: number; irtDecimoTerceiro: number; };
  totalBruto: number; totalDescontos: number; totalLiquido: number; notaIndemnizacao: string;
}

export function FormularioRegisto({ onSuccess }: { onSuccess: (lead: LeadInfo) => void }) {
  const [modo, setModo] = useState<'novo' | 'regresso'>('novo');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleNovo = async () => {
    setErro('');
    if (!nome.trim()) { setErro('O nome é obrigatório.'); return; }
    if (!email.includes('@')) { setErro('Introduza um email válido.'); return; }
    if (!consentimento) { setErro('Deve autorizar o uso dos seus dados para continuar.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/folha-angola/registar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, consentimento }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro no registo.'); return; }
      const lead = { nome: data.nome, email: data.email };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lead));
      onSuccess(lead);
    } catch { setErro('Sem ligação com o servidor.'); }
    finally { setLoading(false); }
  };

  const handleRegresso = async () => {
    setErro('');
    if (!email.includes('@')) { setErro('Introduza um email válido.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/folha-angola/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Email não encontrado.'); return; }
      const lead = { nome: data.nome, email: data.email };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lead));
      onSuccess(lead);
    } catch { setErro('Sem ligação com o servidor.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold tracking-tight">Acesso aos Simuladores</h3>
        <p className="text-xs text-slate-400 mt-1">Calcule o 13.º mês e a rescisão de contrato conforme a LGT 12/23.</p>
      </div>

      <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
        <button
          onClick={() => { setModo('novo'); setErro(''); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modo === 'novo' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >Primeiro Acesso</button>
        <button
          onClick={() => { setModo('regresso'); setErro(''); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${modo === 'regresso' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >Já me registei</button>
      </div>

      <div className="space-y-4">
        {modo === 'novo' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nome Completo</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: João Manuel dos Santos"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-white outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="o.seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-white outline-none focus:border-primary transition-colors" />
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)} className="mt-1 accent-primary" />
              <span className="text-xs text-slate-400 leading-relaxed">Autorizo o processamento dos meus dados pessoais pela <strong>Salya</strong> para aceder aos simuladores.</span>
            </label>
            {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}
            <button onClick={handleNovo} disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold uppercase tracking-widest block transition-all shadow-lg shadow-primary/20 disabled:opacity-60">
              {loading ? 'A processar...' : 'Desbloquear Simuladores'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">O seu Email de Registo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="o.seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-white outline-none focus:border-primary transition-colors" />
            </div>
            {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}
            <button onClick={handleRegresso} disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold uppercase tracking-widest block transition-all shadow-lg shadow-primary/20 disabled:opacity-60">
              {loading ? 'A verificar...' : 'Aceder aos Simuladores'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SimuladorDecimoTerceiro() {
  const [salario, setSalario] = useState('');
  const [subAlimentacao, setSubAlimentacao] = useState('');
  const [subTransporte, setSubTransporte] = useState('');
  const [outrosSubsidios, setOutrosSubsidios] = useState('');
  const [meses, setMeses] = useState('12');
  const [percentagem, setPercentagem] = useState('50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<D13Result | null>(null);
  const [erro, setErro] = useState('');

  const calcular = async () => {
    setErro(''); setResult(null);
    const s = Number(salario.replace(/\D/g, ''));
    const a = Number(subAlimentacao.replace(/\D/g, ''));
    const t = Number(subTransporte.replace(/\D/g, ''));
    const o = Number(outrosSubsidios.replace(/\D/g, ''));

    if (!s || s <= 0) { setErro('Introduza um salário base válido.'); return; }
    setLoading(true);

    const payload = {
      salarioBase: s,
      subsidioAlimentacao: a,
      subsidioTransporte: t,
      outrosSubsidios: o,
      mesesTrabalhados: Number(meses),
      percentagem: Number(percentagem),
    };

    try {
      const res = await fetch(`${API_BASE}/folha-angola/simular-decimo-terceiro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro no cálculo.'); return; }

      const resData: D13Result = {
        ...data,
        subsidioAlimentacao: data.subsidioAlimentacao ?? a,
        subsidioTransporte: data.subsidioTransporte ?? t,
        outrosSubsidios: data.outrosSubsidios ?? o,
      };

      if (resData.salarioBrutoNormal === undefined) {
        const totalSub = a + t + o;
        const brutoNormal = s + totalSub;
        const inssNorm = roundMoney(s * 0.03);
        const alimTrib = Math.max(0, a - 30000);
        const transpTrib = Math.max(0, t - 30000);
        const mcNorm = Math.max(0, s + alimTrib + transpTrib + o - inssNorm);
        const irtNorm = calcularIRT(mcNorm).valor;
        const liqNorm = roundMoney(brutoNormal - inssNorm - irtNorm);

        resData.salarioBrutoNormal = brutoNormal;
        resData.inssNormal = inssNorm;
        resData.irtNormal = irtNorm;
        resData.salarioLiquidoNormal = liqNorm;
        resData.totalBrutoReceber = roundMoney(brutoNormal + data.valorBruto);
        resData.totalDescontosReceber = roundMoney(inssNorm + irtNorm + data.irt);
        resData.totalLiquidoReceber = roundMoney(liqNorm + data.valorLiquido);
      }

      setResult(resData);
    } catch {
      const totalSub = a + t + o;
      const brutoNormal = s + totalSub;
      const inssNorm = roundMoney(s * 0.03);
      const alimTrib = Math.max(0, a - 30000);
      const transpTrib = Math.max(0, t - 30000);
      const mcNorm = Math.max(0, s + alimTrib + transpTrib + o - inssNorm);
      const irtNorm = calcularIRT(mcNorm).valor;
      const liqNorm = roundMoney(brutoNormal - inssNorm - irtNorm);

      const m = Number(meses);
      const pct = Number(percentagem);
      const valBruto13 = roundMoney((s * (pct / 100) / 12) * m);
      const irt13 = calcularIRT(valBruto13).valor;
      const valLiq13 = roundMoney(valBruto13 - irt13);

      setResult({
        salarioBase: s,
        subsidioAlimentacao: a,
        subsidioTransporte: t,
        outrosSubsidios: o,
        salarioBrutoNormal: brutoNormal,
        inssNormal: inssNorm,
        irtNormal: irtNorm,
        salarioLiquidoNormal: liqNorm,
        mesesTrabalhados: m,
        percentagem: pct,
        valorBruto: valBruto13,
        inss: 0,
        isencaoINSS: true,
        irt: irt13,
        valorLiquido: valLiq13,
        totalBrutoReceber: roundMoney(brutoNormal + valBruto13),
        totalDescontosReceber: roundMoney(inssNorm + irtNorm + irt13),
        totalLiquidoReceber: roundMoney(liqNorm + valLiq13),
        nota: "No mês de pagamento do 13.º Mês, o trabalhador recebe o seu Salário Normal Líquido mais o 13.º Mês Líquido. O 13.º é isento de INSS e tributado autonomamente em IRT.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Formulário de Parâmetros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Salário Base (Kz) *</label>
          <input value={salario} onChange={e => setSalario(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 250.000"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Sub. Alimentação (Kz)</label>
          <input value={subAlimentacao} onChange={e => setSubAlimentacao(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 30.000"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Sub. Transporte (Kz)</label>
          <input value={subTransporte} onChange={e => setSubTransporte(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 25.000"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Outros Subsídios (Kz)</label>
          <input value={outrosSubsidios} onChange={e => setOutrosSubsidios(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 0"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Meses Trabalhados</label>
          <select value={meses} onChange={e => setMeses(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Percentagem do 13.º</label>
          <select value={percentagem} onChange={e => setPercentagem(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary">
            <option value="50">50% — Mínimo Legal</option>
            <option value="75">75% — Contrato Coletivo</option>
            <option value="100">100% — 1 Salário Completo</option>
          </select>
        </div>
      </div>
      {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}
      <button onClick={calcular} disabled={loading}
        className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-primary/20">
        {loading ? 'A calcular...' : 'Calcular Processamento Completo'}
      </button>

      {result && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xl">
          {/* BANNER DE DESTAQUE DO TOTAL QUE LEVARÁ PARA CASA */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-white text-lg">account_balance_wallet</span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Total Global a Receber no Mês (O Que Levará)</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {fmt(result.totalLiquidoReceber || (result.valorLiquido + (result.salarioLiquidoNormal || 0)))} <span className="text-sm sm:text-lg font-bold text-emerald-100">Kz</span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium mt-1">
                Soma do Salário Normal Líquido ({fmt(result.salarioLiquidoNormal || 0)} Kz) + 13.º Mês Líquido ({fmt(result.valorLiquido)} Kz)
              </p>
            </div>
          </div>

          {/* Cabeçalho do Recibo */}
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                Demonstrativo de Processamento de Vencimentos
              </span>
              <h3 className="text-base font-black text-white mt-1">Recibo do Mês do 13.º Salário</h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              Salário Base: <strong>{fmt(result.salarioBase)} Kz</strong> | 13.º: <strong>{result.mesesTrabalhados}/12m ({result.percentagem}%)</strong>
            </span>
          </div>

          {/* Tabelas Lado a Lado: Mês Normal vs 13.º Mês */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VENCIMENTO MENSAL NORMAL */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                  1. Salário Mensal Normal
                </span>
                <span className="text-[10px] font-bold text-slate-400">Mensal</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400 py-0.5">
                  <span>Salário Base</span>
                  <span className="font-mono text-slate-300 font-bold">{fmt(result.salarioBase)} Kz</span>
                </div>
                {(result.subsidioAlimentacao || 0) > 0 && (
                  <div className="flex justify-between text-slate-400 py-0.5">
                    <span>Sub. Alimentação</span>
                    <span className="font-mono text-slate-300">+{fmt(result.subsidioAlimentacao || 0)} Kz</span>
                  </div>
                )}
                {(result.subsidioTransporte || 0) > 0 && (
                  <div className="flex justify-between text-slate-400 py-0.5">
                    <span>Sub. Transporte</span>
                    <span className="font-mono text-slate-300">+{fmt(result.subsidioTransporte || 0)} Kz</span>
                  </div>
                )}
                {(result.outrosSubsidios || 0) > 0 && (
                  <div className="flex justify-between text-slate-400 py-0.5">
                    <span>Outros Subsídios</span>
                    <span className="font-mono text-slate-300">+{fmt(result.outrosSubsidios || 0)} Kz</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-400 font-bold py-1 border-t border-slate-800/60">
                  <span>Total Bruto Normal</span>
                  <span className="font-mono">{fmt(result.salarioBrutoNormal || 0)} Kz</span>
                </div>

                <div className="flex justify-between text-rose-400 py-0.5">
                  <span>INSS (3% Trabalhador)</span>
                  <span className="font-mono">-{fmt(result.inssNormal || 0)} Kz</span>
                </div>
                <div className="flex justify-between text-rose-400 py-0.5">
                  <span>IRT Mês Normal (AGT)</span>
                  <span className="font-mono">-{fmt(result.irtNormal || 0)} Kz</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold text-xs">
                <span className="text-slate-300 uppercase tracking-wider text-[11px]">Líquido Mês Normal</span>
                <span className="font-mono text-sm text-emerald-400">{fmt(result.salarioLiquidoNormal || 0)} Kz</span>
              </div>
            </div>

            {/* PROCESSAMENTO DO 13.º MÊS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                  2. Processamento 13.º Mês
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Natal</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400 py-0.5">
                  <span>Base de Cálculo (Salário Base)</span>
                  <span className="font-mono text-slate-300 font-bold">{fmt(result.salarioBase)} Kz</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold py-1 border-t border-slate-800/60">
                  <span>13.º Mês Bruto ({result.percentagem}%)</span>
                  <span className="font-mono">+{fmt(result.valorBruto)} Kz</span>
                </div>

                <div className="flex justify-between text-slate-400 py-0.5">
                  <span>INSS (3%)</span>
                  <span className="font-mono text-emerald-400 font-semibold">0,00 Kz (Isento)</span>
                </div>
                <div className="flex justify-between text-rose-400 py-0.5">
                  <span>IRT 13.º Mês (AGT)</span>
                  <span className="font-mono">-{fmt(result.irt)} Kz</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold text-xs">
                <span className="text-slate-300 uppercase tracking-wider text-[11px]">Líquido 13.º Mês</span>
                <span className="font-mono text-sm text-emerald-400">{fmt(result.valorLiquido)} Kz</span>
              </div>
            </div>
          </div>

          {/* RESUMO DE RETENÇÕES E IMPOSTOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo de Totais Acumulados no Mês</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Rendimento Bruto Acumulado</p>
                <p className="text-sm font-black text-white">{fmt(result.totalBrutoReceber || (result.valorBruto + (result.salarioBrutoNormal || 0)))} Kz</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-[9px] text-rose-400 font-bold uppercase mb-1">Total de Descontos (INSS + IRT)</p>
                <p className="text-sm font-black text-rose-400">-{fmt(result.totalDescontosReceber || (result.irt + (result.inssNormal || 0) + (result.irtNormal || 0)))} Kz</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-[9px] text-emerald-400 font-bold uppercase mb-1">Total Líquido Creditado na Conta</p>
                <p className="text-sm font-black text-emerald-400">{fmt(result.totalLiquidoReceber || (result.valorLiquido + (result.salarioLiquidoNormal || 0)))} Kz</p>
              </div>
            </div>
          </div>

          {/* Nota Informativa */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">info</span>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {result.nota} Em conformidade com a <strong>Lei Geral do Trabalho n.º 12/23</strong> e o Código do IRT da República de Angola.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SimuladorRescisao() {
  const hoje = new Date().toISOString().split('T')[0];
  const [salario, setSalario] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataSaida, setDataSaida] = useState(hoje);
  const [motivo, setMotivo] = useState('CADUCIDADE');
  const [tipoEmpresa, setTipoEmpresa] = useState('GRANDE');
  const [diasFerias, setDiasFerias] = useState('0');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RescisaoResult | null>(null);
  const [erro, setErro] = useState('');

  const calcular = async () => {
    setErro(''); setResult(null);
    const s = Number(salario.replace(/\D/g, ''));
    if (!s || s <= 0) { setErro('Introduza um salário base válido.'); return; }
    if (!dataEntrada) { setErro('Introduza a data de entrada.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/folha-angola/simular-rescisao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salarioBase: s, dataEntrada, dataSaida,
          motivoRescisao: motivo, tipoEmpresa,
          diasFeriasVencidas: Number(diasFerias),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro no cálculo.'); return; }
      setResult(data);
    } catch { setErro('Sem ligação com o servidor.'); }
    finally { setLoading(false); }
  };

  const Row = ({ label, value, amber = false }: { label: string; value: number; amber?: boolean }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-800/70 last:border-0">
      <span className="text-[11px] sm:text-xs text-slate-400 leading-snug flex-1">{label}</span>
      <span className={`text-[11px] sm:text-xs font-bold shrink-0 tabular-nums ${amber ? 'text-amber-400' : 'text-slate-200'}`}>{fmt(value)} Kz</span>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
      {/* Coluna Formulário */}
      <div className="flex-1 space-y-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados do Colaborador</p>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Salário Base (Kz)</label>
          <input
            value={salario}
            onChange={e => setSalario(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 200.000"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Data de Entrada</label>
            <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Data de Saída</label>
            <input type="date" value={dataSaida} onChange={e => setDataSaida(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Motivo da Rescisão</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary">
            <option value="CADUCIDADE">Caducidade (fim de contrato a termo)</option>
            <option value="DESPEDIMENTO_SEM_JUSTA_CAUSA">Despedimento sem justa causa</option>
            <option value="DEMISSAO_VOLUNTARIA">Demissão voluntária</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Dimensão da Empresa</label>
          <select value={tipoEmpresa} onChange={e => setTipoEmpresa(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary">
            <option value="GRANDE">Grande Empresa — 100% / ano</option>
            <option value="MEDIA">Média Empresa — 50% / ano</option>
            <option value="PEQUENA">Pequena / Micro — 35% / ano</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Dias de Férias Pendentes</label>
          <input type="number" min="0" max="66" value={diasFerias} onChange={e => setDiasFerias(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary" />
        </div>

        {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}

        <button onClick={calcular} disabled={loading}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">calculate</span>
          {loading ? 'A calcular...' : 'Calcular Rescisão'}
        </button>
      </div>

      {/* Coluna Resultado */}
      <div className="flex-1 flex flex-col">
        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[260px] bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-center p-6">
            <span className="material-symbols-outlined text-5xl text-slate-700 mb-3">receipt_long</span>
            <p className="text-xs text-slate-500 font-semibold">Preencha os dados e calcule<br />para ver o mapa de rescisão</p>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            {/* Cabeçalho resultado */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapa de Rescisão</p>
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                {result.anosAntiguidade}a {result.mesesRestantes}m de antiguidade
              </span>
            </div>

            {/* Componentes */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Rendimentos</p>
              <Row label="Salário dos dias trabalhados no mês" value={result.detalhes.salarioDiasTrabalhadosMes} />
              <Row label="Prop. 13.º Mês (Subsídio de Natal)" value={result.detalhes.propDecimoTerceiro} />
              <Row label="Férias vencidas não gozadas" value={result.detalhes.feriasVencidas} />
              <Row label="Subsídio de Férias Vencidas (50%)" value={result.detalhes.subsidioFeriasVencidas} />
              <Row label="Prop. Férias do ano corrente" value={result.detalhes.propFerias} />
              <Row label="Subsídio de Férias Proporcional (50%)" value={result.detalhes.subsidioFeriasProp} />
              {result.detalhes.indemnizacao > 0 && <Row label="Indemnização / Compensação" value={result.detalhes.indemnizacao} />}
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-slate-700">
                <span className="text-xs font-black text-slate-300">Total Bruto</span>
                <span className="text-xs font-black text-white tabular-nums">{fmt(result.totalBruto)} Kz</span>
              </div>
            </div>

            {/* Descontos */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Descontos</p>
              <Row label="INSS (3% sobre salário do mês)" value={result.descontos.inssColaborador} amber />
              <Row label="IRT sobre salário do mês (AGT)" value={result.descontos.irtMes} amber />
              <Row label="IRT sobre 13.º Mês (AGT)" value={result.descontos.irtDecimoTerceiro} amber />
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-slate-700">
                <span className="text-xs font-black text-amber-400">Total Descontos</span>
                <span className="text-xs font-black text-amber-400 tabular-nums">{fmt(result.totalDescontos)} Kz</span>
              </div>
            </div>

            {/* Total líquido */}
            <div className="bg-primary rounded-xl px-4 py-4 flex items-center justify-between text-white shadow-xl shadow-primary/25">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Total Líquido a Receber</p>
                <p className="text-2xl font-black tabular-nums">{fmt(result.totalLiquido)} <span className="text-sm font-semibold opacity-70">Kz</span></p>
              </div>
              <span className="material-symbols-outlined text-4xl opacity-20">payments</span>
            </div>

            {result.notaIndemnizacao && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{result.notaIndemnizacao}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SimuladoresModalContent() {
  const [simuladorAtivo, setSimuladorAtivo] = useState<'d13' | 'rescisao'>('d13');
  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 text-white w-full max-w-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/70 shrink-0 rounded-t-3xl overflow-hidden">
        <button onClick={() => setSimuladorAtivo('d13')}
          className={`flex-1 py-3.5 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all relative ${simuladorAtivo === 'd13' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}>
          {simuladorAtivo === 'd13' && <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-t-full" />}
          13.º Mês
        </button>
        <button onClick={() => setSimuladorAtivo('rescisao')}
          className={`flex-1 py-3.5 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all relative ${simuladorAtivo === 'rescisao' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}>
          {simuladorAtivo === 'rescisao' && <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-t-full" />}
          Rescisão de Contrato
        </button>
      </div>

      {/* Conteúdo com scroll */}
      <div className="p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[65vh] flex-1">
        {simuladorAtivo === 'd13' ? <SimuladorDecimoTerceiro /> : <SimuladorRescisao />}
      </div>

      <div className="px-5 pb-4 border-t border-slate-800/60">
        <p className="text-[10px] text-slate-600 text-center font-medium pt-3">
          Cálculos em conformidade com a Lei Geral do Trabalho n.º 12/23 e tabela de IRT da AGT.
        </p>
      </div>
    </div>
  );
}

const FolhaAngola: React.FC = () => {
  const [lead, setLead] = useState<LeadInfo | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLead(JSON.parse(saved));
    } catch { localStorage.removeItem(STORAGE_KEY); }
  }, []);

  const sair = () => {
    setLead(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <section id="folha-angola" className="py-16 bg-slate-950 border-y border-slate-800/80 text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-slate-900 border border-slate-800 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
            Módulo Folha Angola
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Folha <span className="text-primary italic">Angola</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto font-medium">
            Calculadoras de 13.º Mês e Rescisão de Contrato segundo a <strong>Lei Geral do Trabalho n.º 12/23</strong> e a tabela de IRT da AGT.
          </p>
        </div>

        {!lead ? (
          <FormularioRegisto onSuccess={(l) => setLead(l)} />
        ) : (
          <div>
            <div className="bg-slate-950 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 rounded-t-3xl border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xs">
                  {lead.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Acesso por</p>
                  <p className="text-xs text-white font-bold">{lead.nome}</p>
                </div>
              </div>
              <button onClick={sair} className="text-xs text-slate-400 hover:text-white transition-colors font-bold">Alterar / Sair &rarr;</button>
            </div>
            <SimuladoresModalContent />
          </div>
        )}
      </div>
    </section>
  );
};

export default FolhaAngola;


import React, { useState, useEffect } from 'react';

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
  salarioBase: number; mesesTrabalhados: number; percentagem: number;
  valorBruto: number; inss: number; isencaoINSS: boolean; irt: number; valorLiquido: number; nota: string;
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
  const [meses, setMeses] = useState('12');
  const [percentagem, setPercentagem] = useState('50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<D13Result | null>(null);
  const [erro, setErro] = useState('');

  const calcular = async () => {
    setErro(''); setResult(null);
    const s = Number(salario.replace(/\D/g, ''));
    if (!s || s <= 0) { setErro('Introduza um salário base válido.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/folha-angola/simular-decimo-terceiro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salarioBase: s, mesesTrabalhados: Number(meses), percentagem: Number(percentagem) }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro no cálculo.'); return; }
      setResult(data);
    } catch { setErro('Sem ligação com o servidor.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Salário Base (Kz)</label>
          <input value={salario} onChange={e => setSalario(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 150.000"
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Meses Trabalhados</label>
          <select value={meses} onChange={e => setMeses(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Percentagem do Subsídio</label>
          <select value={percentagem} onChange={e => setPercentagem(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary">
            <option value="50">50% (Mínimo Legal)</option>
            <option value="100">100% (1 Salário Completo)</option>
            <option value="75">75% (Contrato Coletivo)</option>
          </select>
        </div>
      </div>
      {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}
      <button onClick={calcular} disabled={loading}
        className="px-8 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60">
        {loading ? 'A calcular...' : 'Calcular 13.º Mês'}
      </button>

      {result && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-white text-xs uppercase tracking-widest">Resultado do Cálculo</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Subsídio Bruto', value: result.valorBruto, color: 'text-slate-200' },
              { label: 'INSS (Isento)', value: 0, color: 'text-emerald-400', badge: 'Isento' },
              { label: 'IRT Retido', value: result.irt, color: 'text-amber-400' },
              { label: 'Valor Líquido', value: result.valorLiquido, color: 'text-white', highlight: true },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl p-4 text-center ${item.highlight ? 'bg-primary text-white' : 'bg-slate-900 border border-slate-800'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${item.highlight ? 'text-slate-200' : 'text-slate-400'}`}>{item.label}</p>
                {item.badge
                  ? <p className="text-sm font-bold text-emerald-400">{item.badge}</p>
                  : <p className={`text-lg font-black ${item.highlight ? 'text-white' : item.color}`}>{fmt(item.value)} <span className="text-xs">Kz</span></p>
                }
              </div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-300 font-medium">{result.nota}</p>
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

  const linhaDetalhe = (label: string, value: number, destaque = false, isencao = false) => (
    <div className={`flex justify-between items-center py-2.5 border-b border-slate-800/80 last:border-0 ${destaque ? 'font-black text-white' : ''}`}>
      <span className="text-sm text-slate-300">{label}</span>
      {isencao
        ? <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800">Isento</span>
        : <span className={`text-sm font-bold ${destaque ? 'text-primary' : 'text-slate-200'}`}>{fmt(value)} Kz</span>
      }
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Salário Base (Kz)</label>
          <input value={salario} onChange={e => setSalario(Number(e.target.value.replace(/\D/g,'')).toLocaleString('pt-AO'))}
            placeholder="Ex: 200.000"
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data de Entrada</label>
          <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data de Saída</label>
          <input type="date" value={dataSaida} onChange={e => setDataSaida(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Motivo da Rescisão</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary">
            <option value="CADUCIDADE">Caducidade (fim de contrato a termo)</option>
            <option value="DESPEDIMENTO_SEM_JUSTA_CAUSA">Despedimento sem justa causa</option>
            <option value="DEMISSAO_VOLUNTARIA">Demissão voluntária</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Dimensão da Empresa</label>
          <select value={tipoEmpresa} onChange={e => setTipoEmpresa(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary">
            <option value="GRANDE">Grande Empresa (100% por ano)</option>
            <option value="MEDIA">Média Empresa (50% por ano)</option>
            <option value="PEQUENA">Pequena/Micro (35% por ano)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Dias de Férias Pendentes</label>
          <input type="number" min="0" max="66" value={diasFerias} onChange={e => setDiasFerias(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white outline-none focus:border-primary" />
        </div>
      </div>
      {erro && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">{erro}</p>}
      <button onClick={calcular} disabled={loading}
        className="px-8 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-60">
        {loading ? 'A calcular...' : 'Calcular Rescisão'}
      </button>

      {result && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs uppercase tracking-widest">Mapa de Rescisão</h4>
            <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              {result.anosAntiguidade} anos e {result.mesesRestantes} meses de antiguidade
            </span>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Componentes</p>
            {linhaDetalhe('Salário dos dias trabalhados no mês', result.detalhes.salarioDiasTrabalhadosMes)}
            {linhaDetalhe('Prop. 13.º Mês (Subsídio de Natal)', result.detalhes.propDecimoTerceiro)}
            {linhaDetalhe('Férias vencidas não gozadas', result.detalhes.feriasVencidas)}
            {linhaDetalhe('Subsídio de Férias Vencidas (50%)', result.detalhes.subsidioFeriasVencidas)}
            {linhaDetalhe('Prop. Férias do ano corrente', result.detalhes.propFerias)}
            {linhaDetalhe('Subsídio de Férias Proporcional (50%)', result.detalhes.subsidioFeriasProp)}
            {result.detalhes.indemnizacao > 0 && linhaDetalhe('Indemnização / Compensação por Antiguidade', result.detalhes.indemnizacao)}
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between font-black">
              <span className="text-sm text-slate-300">Total Bruto</span>
              <span className="text-sm text-white">{fmt(result.totalBruto)} Kz</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">Descontos e Retenções</p>
            {linhaDetalhe('INSS (3% sobre salário do mês)', result.descontos.inssColaborador)}
            {linhaDetalhe('IRT sobre salário do mês (AGT)', result.descontos.irtMes)}
            {linhaDetalhe('IRT sobre 13.º Mês (AGT)', result.descontos.irtDecimoTerceiro)}
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between font-black">
              <span className="text-sm text-amber-400">Total Descontos</span>
              <span className="text-sm text-amber-400">{fmt(result.totalDescontos)} Kz</span>
            </div>
          </div>

          <div className="bg-primary rounded-xl p-5 flex justify-between items-center text-white shadow-lg shadow-primary/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Líquido a Receber</p>
              <p className="text-2xl font-black">{fmt(result.totalLiquido)} Kz</p>
            </div>
          </div>

          {result.notaIndemnizacao && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-300 font-medium">{result.notaIndemnizacao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SimuladoresModalContent() {
  const [simuladorAtivo, setSimuladorAtivo] = useState<'d13' | 'rescisao'>('d13');
  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white">
      <div className="flex border-b border-slate-800 bg-slate-950/50">
        <button onClick={() => setSimuladorAtivo('d13')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${simuladorAtivo === 'd13' ? 'text-primary border-b-2 border-primary bg-primary/10' : 'text-slate-400 hover:text-slate-200'}`}>
          Simulador de 13.º Mês
        </button>
        <button onClick={() => setSimuladorAtivo('rescisao')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${simuladorAtivo === 'rescisao' ? 'text-primary border-b-2 border-primary bg-primary/10' : 'text-slate-400 hover:text-slate-200'}`}>
          Simulador de Rescisão de Contrato
        </button>
      </div>

      <div className="p-6 md:p-8">
        {simuladorAtivo === 'd13' ? <SimuladorDecimoTerceiro /> : <SimuladorRescisao />}
      </div>

      <div className="px-8 pb-6">
        <p className="text-[10px] text-slate-400 text-center font-medium">
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
            <div className="bg-slate-950 px-8 py-4 flex items-center justify-between border-b border-slate-800 rounded-t-3xl border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xs">
                  {lead.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Acesso por</p>
                  <p className="text-xs text-white font-bold">{lead.nome}</p>
                </div>
              </div>
              <button onClick={sair} className="text-xs text-slate-400 hover:text-white transition-colors font-bold">Alterar Email / Sair &rarr;</button>
            </div>
            <SimuladoresModalContent />
          </div>
        )}
      </div>
    </section>
  );
};

export default FolhaAngola;

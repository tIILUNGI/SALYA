import React, { useState, useContext, useEffect, useCallback } from 'react';

import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import html2pdf from 'html2pdf.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MesPendente {
  mes: number;
  ano: number;
}

interface ColaboradorComPendencias {
  colaborador: Colaborador;
  pendencias: MesPendente[];
}

interface ReciboSnapshot {
  colaborador: Colaborador;
  mes: string;
  ano: string;
  dataProcessamento: string;
  salarioBase: number;
  diasTrabalhados: number;
  ganhoAlimentacao: number;
  ganhoTransporte: number;
  totalBruto: number;
  valorINSS: number;
  valorIRT: number;
  percentualIRT: number;
  totalDescontos: number;
  salarioLiquido: number;
  materiaColetavel: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const numToMonth = (n: number) => MONTHS[n - 1] || `Mês ${n}`;

const formatMoney = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const hasDecimals = !Number.isInteger(amount);
  return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })} Kz`;
};

const mesKey = (mes: number, ano: number) => `${ano}-${mes}`;

// ── Component ─────────────────────────────────────────────────────────────────

const ProcessamentoAtraso: React.FC = () => {
  const { empresaId, empresa, colaboradores } = useContext(AppContext);

  const [grupos, setGrupos] = useState<ColaboradorComPendencias[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Selected months: map from colaboradorId → Set of "ano-mes" keys
  const [selecoes, setSelecoes] = useState<Record<number, Set<string>>>({});

  const [processando, setProcessando] = useState(false);
  const [recibos, setRecibos] = useState<ReciboSnapshot[]>([]);
  const [reciboIndex, setReciboIndex] = useState(0);
  const [showReciboModal, setShowReciboModal] = useState(false);

  // ── Load pending salaries ────────────────────────────────────────────────────
  const carregarPendencias = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const historico: any[] = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
      const processados = new Set(historico.map((h: any) => `${h.colaboradorId}-${h.ano}-${h.mes}`));

      const hoje = new Date();
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

      const resultado: ColaboradorComPendencias[] = [];

      const ativos = colaboradores.filter(c => c.status === 'Ativo' &&
        (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId));

      for (const colab of ativos) {
        const admissao = colab.dataAdmissao ? new Date(colab.dataAdmissao) : new Date(2025, 0, 1);
        let checkDate = new Date(admissao.getFullYear(), admissao.getMonth(), 1);
        const pendencias: MesPendente[] = [];

        while (checkDate <= mesAnterior) {
          const mes = checkDate.getMonth() + 1;
          const ano = checkDate.getFullYear();
          if (!processados.has(`${colab.id}-${ano}-${mes}`)) {
            pendencias.push({ mes, ano });
          }
          checkDate.setMonth(checkDate.getMonth() + 1);
        }

        if (pendencias.length > 0) {
          resultado.push({ colaborador: colab, pendencias });
        }
      }

      setGrupos(resultado);
    } catch (error) {
      console.error('Erro ao carregar pendências:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, colaboradores]);

  useEffect(() => {
    carregarPendencias();
  }, [carregarPendencias]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleMes = (colabId: number, mes: number, ano: number) => {
    const key = mesKey(mes, ano);
    setSelecoes(prev => {
      const current = new Set(prev[colabId] || []);
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }
      return { ...prev, [colabId]: current };
    });
  };

  const toggleTodos = (colabId: number, pendencias: MesPendente[]) => {
    setSelecoes(prev => {
      const current = prev[colabId] || new Set<string>();
      const allSelected = pendencias.every(p => current.has(mesKey(p.mes, p.ano)));
      if (allSelected) {
        return { ...prev, [colabId]: new Set<string>() };
      } else {
        return { ...prev, [colabId]: new Set(pendencias.map(p => mesKey(p.mes, p.ano))) };
      }
    });
  };

  const countSelected = (colabId: number) => (selecoes[colabId]?.size ?? 0);

  // ── Process selected months ──────────────────────────────────────────────────
  const handleProcessar = async (colabId: number, pendencias: MesPendente[]) => {
    const selecionados = [...(selecoes[colabId] || [])];
    if (selecionados.length === 0) return;

    const colab = grupos.find(g => g.colaborador.id === colabId)?.colaborador;
    if (!colab) return;

    const mesesParaProcessar = pendencias.filter(p => selecionados.includes(mesKey(p.mes, p.ano)));

    setProcessando(true);
    const novosRecibos: ReciboSnapshot[] = [];

    try {
      const isFixed = empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS';
      const baseDays = isFixed ? 22 : 22;

      for (const periodo of mesesParaProcessar) {
        const dto = {
          trabalhadorId: colab.id,
          mes: periodo.mes,
          ano: periodo.ano,
          salarioBaseOverride: colab.salarioBase || 0,
          diasTrabalhados: baseDays,
          diasUteis: baseDays,
          diasAlimentacao: 1,
          diasTransporte: 1,
          valorDiaAlimentacao: colab.subsidioAlimentacao || 0,
          valorDiaTransporte: colab.subsidioTransporte || 0,
          subsidioFeriasValor: 0,
          subsidioNatalValor: 0,
          outrosSubsidiosTotal: 0,
          horasExtraTotal: 0,
          bonusTotal: 0,
          faltasTotal: 0,
          outrosGanhos: [],
        };

        const result = await api.post('/processamentos/processar-salario', dto);

        novosRecibos.push({
          colaborador: colab,
          mes: numToMonth(periodo.mes),
          ano: String(periodo.ano),
          dataProcessamento: new Date().toLocaleDateString('pt-AO'),
          salarioBase: colab.salarioBase || 0,
          diasTrabalhados: baseDays,
          ganhoAlimentacao: colab.subsidioAlimentacao || 0,
          ganhoTransporte: colab.subsidioTransporte || 0,
          totalBruto: typeof result.totalBruto === 'number' ? result.totalBruto : 0,
          valorINSS: typeof result.valorINSS === 'number' ? result.valorINSS : 0,
          valorIRT: typeof result.valorIRT === 'number' ? result.valorIRT : 0,
          percentualIRT: result.detalhesIRT?.taxaIRT ? result.detalhesIRT.taxaIRT * 100 : 0,
          totalDescontos: typeof result.descontos === 'number' ? result.descontos : 0,
          salarioLiquido: typeof result.salarioLiquido === 'number' ? result.salarioLiquido : 0,
          materiaColetavel: typeof result.materiaColectavel === 'number' ? result.materiaColectavel : 0,
        });
      }

      // Clear selection for this colaborador
      setSelecoes(prev => ({ ...prev, [colabId]: new Set<string>() }));

      // Reload pending list
      await carregarPendencias();

      // Show receipts
      setRecibos(novosRecibos);
      setReciboIndex(0);
      setShowReciboModal(true);
    } catch (error: any) {
      alert(error?.message || 'Erro ao processar salários.');
    } finally {
      setProcessando(false);
    }
  };

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const handleExportarPDF = () => {
    const element = document.getElementById('recibo-atraso-impressao');
    if (!element) return;
    const snap = recibos[reciboIndex];
    if (!snap) return;
    const opt = {
      margin: 0,
      filename: `Recibo_${snap.colaborador.nome.replace(/ /g, '_')}_${snap.mes}_${snap.ano}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    };
    html2pdf().from(element).set(opt).save();
  };

  // ── Render: Receipt Modal ────────────────────────────────────────────────────
  const renderReciboModal = () => {
    if (!showReciboModal || recibos.length === 0) return null;
    const snap = recibos[reciboIndex];
    if (!snap) return null;

    const valorHora = snap.diasTrabalhados > 0 ? snap.salarioBase / (snap.diasTrabalhados * 8) : 0;

    const linhas = [
      { label: `Salário Base`, valorRemun: snap.salarioBase, valorDesc: 0, qtd: `${snap.diasTrabalhados} Dias` },
      ...(snap.ganhoAlimentacao > 0 ? [{ label: 'Subsídio de Alimentação', valorRemun: snap.ganhoAlimentacao, valorDesc: 0, qtd: '1' }] : []),
      ...(snap.ganhoTransporte > 0 ? [{ label: 'Subsídio de Transporte', valorRemun: snap.ganhoTransporte, valorDesc: 0, qtd: '1' }] : []),
      { label: 'Segurança Social (INSS 3% s/ sal. base)', valorRemun: 0, valorDesc: snap.valorINSS, qtd: snap.valorINSS > 0 ? '3%' : '0%' },
      { label: snap.colaborador.tipoContrato === 'Prestador' ? 'IRT Grupo B/C (Independente)' : 'Imposto sobre Rendimento (IRT)', valorRemun: 0, valorDesc: snap.valorIRT, qtd: snap.percentualIRT ? (snap.percentualIRT % 1 === 0 ? `${snap.percentualIRT}%` : `${snap.percentualIRT.toFixed(1)}%`) : '-' },
      { label: 'Matéria Colectável', valorRemun: 0, valorDesc: 0, qtd: formatMoney(snap.materiaColetavel) },
    ];

    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-[40px] max-w-[220mm] w-full max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col">

          {/* Navigation header when multiple receipts */}
          {recibos.length > 1 && (
            <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between gap-4">
              <button
                onClick={() => setReciboIndex(i => Math.max(0, i - 1))}
                disabled={reciboIndex === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                ← Anterior
              </button>
              <span className="text-xs font-medium text-slate-600">
                Recibo {reciboIndex + 1} de {recibos.length} — <strong>{snap.mes} {snap.ano}</strong>
              </span>
              <button
                onClick={() => setReciboIndex(i => Math.min(recibos.length - 1, i + 1))}
                disabled={reciboIndex === recibos.length - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                Próximo →
              </button>
            </div>
          )}

          {/* Printable area */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-slate-100">
            <div
              id="recibo-atraso-impressao"
              style={{
                width: '210mm',
                minHeight: '297mm',
                backgroundColor: '#fff',
                margin: '0 auto',
                padding: '15mm',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
                color: '#000',
                maxWidth: '100%',
              }}
            >
              {/* Company header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10mm', borderBottom: '2px solid #000', paddingBottom: '5mm' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '900', margin: '0 0 4px 0' }}>{empresa?.nome}</h2>
                  <p style={{ fontSize: '10px', margin: '2px 0', color: '#333' }}>NIF: {empresa?.nif}</p>
                  <p style={{ fontSize: '10px', margin: '2px 0', color: '#333' }}>{empresa?.endereco}, {empresa?.municipio}</p>
                  <p style={{ fontSize: '10px', margin: '2px 0', color: '#333' }}>{empresa?.email} | {empresa?.telefone}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <h1 style={{ fontSize: '16px', fontWeight: '900', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>RECIBO DE VENCIMENTO</h1>
                  <div style={{ display: 'inline-block', textAlign: 'left', fontSize: '10px', background: '#f1f5f9', padding: '2mm 4mm', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 2px 0' }}><span style={{ fontWeight: 'bold' }}>Período:</span> {snap.mes} / {snap.ano}</p>
                    <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Data:</span> {snap.dataProcessamento}</p>
                  </div>
                </div>
              </div>

              {/* Employee info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginBottom: '8mm', padding: '4mm', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', lineHeight: '1.8' }}>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Nome:</span> <span>{snap.colaborador.nome}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Nº Mec.:</span> <span>{(snap.colaborador as any).numeroColaborador || '---'}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Categoria:</span> <span>{snap.colaborador.cargo}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Contribuinte:</span> <span>{snap.colaborador.nif}</span></div>
                </div>
                <div style={{ fontSize: '10px', lineHeight: '1.8' }}>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Vencimento:</span> <span>{formatMoney(snap.salarioBase)}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Venc./Hora:</span> <span>{formatMoney(valorHora)}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Dias Úteis:</span> <span>{snap.diasTrabalhados}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Departamento:</span> <span>{(snap.colaborador as any).departamento || '---'}</span></div>
                </div>
              </div>

              {/* Main table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10mm' }}>
                <thead>
                  <tr style={{ borderTop: '2px solid #000', borderBottom: '1.5px solid #000', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '3mm 2mm' }}>Descrição</th>
                    <th style={{ padding: '3mm 2mm', width: '20mm', textAlign: 'center' }}>Qtd.</th>
                    <th style={{ padding: '3mm 2mm', width: '40mm', textAlign: 'right' }}>Remunerações</th>
                    <th style={{ padding: '3mm 2mm', width: '40mm', textAlign: 'right' }}>Descontos</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '3mm 2mm', fontWeight: '500' }}>{linha.label}</td>
                      <td style={{ padding: '3mm 2mm', textAlign: 'center', color: '#64748b' }}>{linha.qtd}</td>
                      <td style={{ padding: '3mm 2mm', textAlign: 'right' }}>{linha.valorRemun > 0 ? formatMoney(linha.valorRemun) : ''}</td>
                      <td style={{ padding: '3mm 2mm', textAlign: 'right', color: linha.valorDesc > 0 ? '#e11d48' : '#000' }}>{linha.valorDesc > 0 ? formatMoney(linha.valorDesc) : ''}</td>
                    </tr>
                  ))}
                  <tr style={{ height: '20mm' }}><td colSpan={4}></td></tr>
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ marginTop: 'auto', borderTop: '2px solid #000', paddingTop: '4mm' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15mm', marginBottom: '4mm' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Total Remunerações</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{formatMoney(snap.totalBruto)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Total Descontos</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#e11d48' }}>{formatMoney(snap.totalDescontos)}</p>
                  </div>
                </div>
                <div style={{ background: '#000', color: '#fff', padding: '5mm 8mm', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.1em' }}>VALOR LÍQUIDO A RECEBER (KZ)</span>
                  <span style={{ fontSize: '24px', fontWeight: '900' }}>{formatMoney(snap.salarioLiquido)}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '15mm', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15mm' }}>
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', color: '#333' }}>NOTAS / COORDENADAS BANCÁRIAS:</p>
                  <p style={{ margin: '2px 0', color: '#64748b' }}>Banco: {(snap.colaborador as any).banco || '---'}</p>
                  <p style={{ margin: '2px 0', color: '#64748b' }}>IBAN: {(snap.colaborador as any).iban || '---'}</p>
                  <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#94a3b8' }}>Este documento serve como comprovativo de pagamento de vencimento.</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '15mm', marginBottom: '2mm' }}></div>
                  <p style={{ fontSize: '10px', fontWeight: 'bold', margin: 0 }}>Assinatura e Carimbo</p>
                </div>
              </div>

              <div style={{ marginTop: '10mm', textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '4mm', fontWeight: 'bold' }}>
                Processado por SALYA, Sistema de Recibo Salarial
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t flex gap-4 bg-white">
            <button
              onClick={handleExportarPDF}
              className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold px-8 shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>
              Exportar Recibo (PDF)
            </button>
            <button
              onClick={() => setShowReciboModal(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 w-full max-w-full font-app">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Processamento em Atraso</h1>
        <p className="text-sm text-slate-500 mt-1">Regularize salários de meses anteriores que ainda não foram liquidados.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-emerald-500 block mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-slate-800">Tudo em dia!</h2>
          <p className="text-slate-500 mt-1">Não existem processamentos pendentes de meses anteriores.</p>
        </div>
      ) : (
        <div className="space-y-4">
           {grupos.map(({ colaborador, pendencias }) => {
             const isExpanded = expandedId === colaborador.id;
             const numSelected = countSelected(colaborador.id);
             const allSelected = numSelected === pendencias.length;
             const valorEmAtrasoTopo = (colaborador.salarioBase ?? 0) + (colaborador.subsidioAlimentacao ?? 0) + (colaborador.subsidioTransporte ?? 0);


             return (
               <div
                 key={colaborador.id}
                 className="glass-card overflow-hidden border border-slate-100 transition-all"
               >
                 {/* Collaborator header — clickable */}
                 <button
                   onClick={() => setExpandedId(isExpanded ? null : colaborador.id)}
                   className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/60 transition-all"
                 >
                   {/* Avatar */}
                   <div className="size-11 shrink-0 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                     {colaborador.nome.substring(0, 2).toUpperCase()}
                   </div>

                   {/* Info */}
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-semibold text-slate-800 truncate">{colaborador.nome}</p>
                     <p className="text-xs text-slate-400 truncate">{colaborador.cargo}</p>
                   </div>

                   {/* Badge: pending months */}
                   <div className="flex items-center gap-3 shrink-0">
                     <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold border border-amber-100">
                     {formatMoney(valorEmAtrasoTopo * pendencias.length)} Valor em atraso
                     </span>
                     <span className="text-sm text-slate-400 font-medium hidden sm:block whitespace-nowrap">
                       {formatMoney(colaborador.salarioBase)}
                     </span>
                     <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                       expand_more
                     </span>
                   </div>
                 </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-4">

                    {/* Select all + counter */}
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleTodos(colaborador.id, pendencias)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-slate-600">Seleccionar todos os meses</span>
                      </label>
                      {numSelected > 0 && (
                        <span className="text-xs text-primary font-semibold">
                          {numSelected} {numSelected === 1 ? 'mês seleccionado' : 'meses seleccionados'}
                        </span>
                      )}
                    </div>

                    {/* Month checkboxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {pendencias.map(p => {
                        const key = mesKey(p.mes, p.ano);
                        const checked = selecoes[colaborador.id]?.has(key) ?? false;
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all ${checked ? 'bg-primary/5 border-primary/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMes(colaborador.id, p.mes, p.ano)}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{numToMonth(p.mes)}</p>
                              <p className="text-[10px] text-slate-400">{p.ano}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Process button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleProcessar(colaborador.id, pendencias)}
                        disabled={numSelected === 0 || processando}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                          numSelected === 0 || processando
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                        }`}
                      >
                        {processando ? (
                          <>
                            <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                            A processar...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">payments</span>
                            Processar {numSelected > 0 ? `${numSelected} ${numSelected === 1 ? 'mês' : 'meses'}` : 'Selecionados'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Modal */}
      {renderReciboModal()}
    </div>
  );
};

export default ProcessamentoAtraso;

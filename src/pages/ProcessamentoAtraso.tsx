import React, { useState, useContext, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api, getLogoUrl } from '../services/api';
import html2pdf from 'html2pdf.js';
import { countries } from '../data/countries';

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
  historicoId?: number;
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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
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
  const [holidaysByMonth, setHolidaysByMonth] = useState<Record<string, any[]>>({});

  // ── Calculate work days (Seg-Sex) excluding holidays ───────────────────────────
  const calcularDiasUteis = useCallback((mes: number, ano: number): number => {
    const daysInMonth = new Date(ano, mes, 0).getDate();
    let workDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(ano, mes - 1, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Dom ou Sáb
      
      if (!isWeekend) {
        const dateStr = date.toISOString().split('T')[0];
        const holidays = holidaysByMonth[`${ano}-${mes}`] || [];
        const isHoliday = holidays.some((h: any) => h.date === dateStr);
        if (!isHoliday) {
          workDays++;
        }
      }
    }
    return workDays || 22; // Fallback to 22
  }, [holidaysByMonth]);

  // ── Fetch holidays for a specific month ─────────────────────────────────────────
  const fetchHolidaysForMonth = useCallback(async (mes: number, ano: number) => {
    const key = `${ano}-${mes}`;
    if (holidaysByMonth[key]) return; // Already cached
    
    const pais = empresa?.pais || 'Angola';
    const country = countries.find(c => c.name === pais);
    if (!country) return;
    
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/${country.code}`);
      if (response.ok) {
        const data = await response.json();
        setHolidaysByMonth(prev => ({ ...prev, [key]: data }));
      }
    } catch (e) {
      console.error('Erro ao carregar feriados:', e);
    }
  }, [empresa?.pais, holidaysByMonth]);

  // ── Load pending salaries ────────────────────────────────────────────────────
  const carregarPendencias = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // 1. Carregar histórico de processamentos
      const historico: any[] = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
      const processados = new Set(historico.map((h: any) => `${h.colaboradorId}-${h.ano}-${h.mes}`));

      // 2. Carregar anulamentos para excluir da lista de pendências (apenas desta empresa)
      let anuladosSet = new Set<string>();
      try {
        const resAnulamentos = await api.get(`/salarios/annulments?empresaId=${empresaId}`);
        if (resAnulamentos.success && Array.isArray(resAnulamentos.data)) {
          resAnulamentos.data.forEach((ann: any) => {
            if (ann.colaboradorId && ann.mes && ann.ano && ann.status === 'ANULADO') {
              anuladosSet.add(`${ann.colaboradorId}-${ann.ano}-${ann.mes}`);
            }
          });
        }
      } catch (e) {
        console.error('Erro ao carregar anulamentos:', e);
      }

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
          const key = `${colab.id}-${ano}-${mes}`;
          
          if (!processados.has(key) && !anuladosSet.has(key)) {
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
      setGrupos([]);
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

    const colabData = grupos.find(g => g.colaborador.id === colabId);
    if (!colabData) return;
    const colab = colabData.colaborador;

    const mesesParaProcessar = pendencias.filter(p => selecionados.includes(mesKey(p.mes, p.ano)));

    setProcessando(true);
    const novosRecibos: ReciboSnapshot[] = [];

    try {
      const isFixed = empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS';

      // Fetch holidays for each month before processing
      for (const periodo of mesesParaProcessar) {
        await fetchHolidaysForMonth(periodo.mes, periodo.ano);
      }

      for (const periodo of mesesParaProcessar) {
        const baseDays = isFixed ? 22 : calcularDiasUteis(periodo.mes, periodo.ano);

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

        const historicoId = result.historicoId;
        novosRecibos.push({
          historicoId,
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
      setRecibos(prev => [...prev, ...novosRecibos]);
      setReciboIndex(0);
      setShowReciboModal(true);
    } catch (error: any) {
      console.error('Erro no processamento de atraso:', error);
      Swal.fire({
        title: 'Erro no Processamento',
        text: 'Não foi possível completar o processamento destes meses. Tente novamente ou contacte o suporte.',
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setProcessando(false);
    }
  };

  const handleAnular = async (colabId: number) => {
    const selecionadosKeys = [...(selecoes[colabId] || [])];
    if (selecionadosKeys.length === 0) {
      Swal.fire('Aviso', 'Seleccione pelo menos um mês para anular.', 'warning');
      return;
    }

    const colab = grupos.find(g => g.colaborador.id === colabId);
    if (!colab) return;

    // Pedir justificação
    const { value: justificacao } = await Swal.fire({
      title: 'Justificar Anulação',
      input: 'textarea',
      inputLabel: 'Descreva o motivo da anulação deste atraso (mín. 20 caracteres)',
      inputPlaceholder: 'Ex: Este salário já foi processado e pago manualmente via sistema legiado...',
      inputAttributes: {
        'aria-label': 'Motivo da anulação'
      },
      showCancelButton: true,
      confirmButtonText: 'Anular Atraso',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      preConfirm: (value) => {
        if (!value || value.trim().length < 20) {
          Swal.showValidationMessage('A justificação deve ter pelo menos 20 caracteres para fins de auditoria.');
          return false;
        }
        return value;
      }
    });

    if (!justificacao) return;

    setProcessando(true);
    try {
      // Processar cada mês selecionado
      for (const key of selecionadosKeys) {
        const [ano, mes] = key.split('-').map(Number);
        
        await api.post(`/salarios/annul-arrear?colaboradorId=${colabId}&mes=${mes}&ano=${ano}&empresaId=${empresaId}&justificacao=${encodeURIComponent(justificacao)}`, {});
      }

      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: `${selecionadosKeys.length} meses em atraso foram anulados e registados para auditoria.`,
        timer: 3000
      });

      // Clear selection
      setSelecoes(prev => ({ ...prev, [colabId]: new Set<string>() }));
      
      // Reload list
      await carregarPendencias();
    } catch (error: any) {
      Swal.fire('Erro', error?.message || 'Erro ao anular salários.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  // ── PDF Export + Armazenamento de Recibo ─────────────────────────────────────
  const handleExportarPDF = async () => {
    const element = document.getElementById('recibo-atraso-para-impressao');
    if (!element) return;
    const snap = recibos[reciboIndex];
    if (!snap) return;

    const options = {
      margin: 0,
      filename: 'Recibo_Atraso_' + snap.colaborador.nome.replace(/ /g, '_') + '_' + snap.ano + snap.mes + '.pdf',
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: { 
        scale: 3.5, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    // @ts-ignore
    html2pdf().from(element).set(options).save();
  };

  // ── Save receipt HTML to backend ────────────────────────────────────────────
  const saveReceiptHtml = useCallback(async (snap: ReciboSnapshot) => {
    if (!snap.historicoId) return;
    
    // Aguarda um pouco para garantir que o DOM foi atualizado
    setTimeout(() => {
      const element = document.getElementById('recibo-atraso-para-impressao');
      if (element && snap.historicoId) {
        api.post(`/processamentos/${snap.historicoId}/recibo`, { html: element.innerHTML })
          .catch(e => console.error('Erro ao salvar HTML do recibo:', e));
      }
    }, 500);
  }, []);

  // ── Render: Receipt Modal ────────────────────────────────────────────────────
  const renderReciboModal = () => {
    if (!showReciboModal || recibos.length === 0) return null;
    const snap = recibos[reciboIndex];
    if (!snap) return null;

    const valorHora = snap.diasTrabalhados > 0 ? snap.salarioBase / (snap.diasTrabalhados * 8) : 0;

    const monthName = snap.mes;
    const periodText = `${monthName} / ${snap.ano}`;

    const linhas = [
      { label: `Salário Base`, valorRemun: snap.salarioBase, valorDesc: 0, qtd: `${snap.diasTrabalhados} Dias` },
      ...(snap.ganhoAlimentacao > 0 ? [{ label: 'Subsídio de Alimentação', valorRemun: snap.ganhoAlimentacao, valorDesc: 0, qtd: '1' }] : []),
      ...(snap.ganhoTransporte > 0 ? [{ label: 'Subsídio de Transporte', valorRemun: snap.ganhoTransporte, valorDesc: 0, qtd: '1' }] : []),
      { label: 'Segurança Social (INSS 3% s/ sal. base)', valorRemun: 0, valorDesc: snap.valorINSS, qtd: snap.valorINSS > 0 ? '3%' : '0%' },
      { label: snap.colaborador.tipoContrato === 'Prestador' ? 'IRT Grupo B/C (Independente)' : 'Imposto sobre Rendimento (IRT)', valorRemun: 0, valorDesc: snap.valorIRT, qtd: snap.percentualIRT ? (snap.percentualIRT % 1 === 0 ? `${snap.percentualIRT}%` : `${snap.percentualIRT.toFixed(1)}%`) : '-' },
      ...(empresa?.categoria === 'Particular' ? [{ label: 'Segurança Social Patronal (8% pago por empregador)', valorRemun: 0, valorDesc: 0, qtd: '8%' }] : []),
    ];

    // Salvar o HTML do recibo quando o modal é aberto
    if (snap.historicoId && !showReciboModal) {
      saveReceiptHtml(snap);
    }

    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-[40px] max-w-[220mm] w-full max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col">
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

          <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-slate-100">
            <div id="recibo-atraso-para-impressao"
               className="bg-white mx-auto p-[8mm] shadow-none flex flex-col font-sans text-black leading-relaxed"
               style={{
                 width: '190mm',
                 minHeight: '260mm',
                 maxHeight: '277mm',
                 boxSizing: 'border-box',
                 fontSize: '11px',
                 overflow: 'hidden'
               }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', borderBottom: '1px solid #000', paddingBottom: '2mm' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '3mm' }}>
                  {empresa?.logoUrl && <img 
                    src={getLogoUrl(empresa.logoUrl)} 
                    alt="Logotipo" 
                    style={{ 
                      height: '16mm', 
                      maxWidth: '38mm', 
                      objectFit: 'contain', 
                      objectPosition: 'left center',
                      marginBottom: '2mm',
                      borderRadius: '4px',
                      border: '1px solid #f1f5f9',
                      padding: '2px',
                      backgroundColor: '#ffffff'
                    }} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = '/logo.png';
                    }}
                  />}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '900', margin: '0 0 2px 0', color: '#000', textTransform: 'uppercase' }}>{empresa?.nome}</h2>
                    <p style={{ fontSize: '9px', margin: '1px 0', color: '#475569', fontWeight: '700' }}>NIF: {empresa?.nif}</p>
                    <p style={{ fontSize: '8px', margin: '1px 0', color: '#64748b' }}>{empresa?.endereco}, {empresa?.municipio}</p>
                    <p style={{ fontSize: '8px', margin: '1px 0', color: '#64748b' }}>{empresa?.email} | {empresa?.telefone}</p>
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <h1 style={{ fontSize: '14px', fontWeight: '900', margin: '0 0 6px 0', letterSpacing: '0.05em', color: '#000' }}>RECIBO DE VENCIMENTO</h1>
                   <div style={{ display: 'inline-block', textAlign: 'left', fontSize: '9px', background: '#f8fafc', padding: '1mm 3mm', borderRadius: '6px', border: '1.5px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 2px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px', display: 'flex', gap: '1.5mm', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '8px' }}>PERÍODO:</span> 
                        <strong style={{ color: '#0f172a' }}>{periodText}</strong>
                      </p>
                     <p style={{ margin: 0, display: 'flex', gap: '1.5mm', justifyContent: 'space-between' }}>
                       <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '8px' }}>DATA:</span> 
                       <strong style={{ color: '#0f172a' }}>{snap.dataProcessamento}</strong>
                     </p>
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5mm', marginBottom: '5mm', padding: '5mm', border: '1.5px solid #000', borderRadius: '6px', background: '#fcfcfc' }}>
                <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>NOME:</span> <span style={{ fontWeight: 'bold' }}>{snap.colaborador.nome}</span></div>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>Nº MEC.:</span> <span>{(snap.colaborador as any).numeroColaborador || '---'}</span></div>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>CATEGORIA:</span> <span>{snap.colaborador.cargo}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>CONTRIBUINTE:</span> <span>{snap.colaborador.nif}</span></div>
                </div>
                <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>VENCIMENTO:</span> <span>{formatMoney(snap.salarioBase)}</span></div>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>VENC./HORA:</span> <span>{formatMoney(valorHora)}</span></div>
                  <div style={{ display: 'flex', marginBottom: '1mm' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>DIAS ÚTEIS:</span> <span>{snap.diasTrabalhados}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm', flexShrink: 0 }}>Nº INSS:</span> <span>{(snap.colaborador as any).inss || '---'}</span></div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '6mm' }}>
                <thead>
                  <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '3mm 2mm', fontWeight: 'bold', color: '#94a3b8', fontSize: '10px' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '3mm 2mm', width: '20mm', textAlign: 'center', fontWeight: 'bold', color: '#94a3b8', fontSize: '10px' }}>QTD.</th>
                    <th style={{ padding: '3mm 2mm', width: '35mm', textAlign: 'right', fontWeight: 'bold', color: '#94a3b8', fontSize: '10px' }}>REMUN.</th>
                    <th style={{ padding: '3mm 2mm', width: '35mm', textAlign: 'right', fontWeight: 'bold', color: '#94a3b8', fontSize: '10px' }}>DESC.</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '2.5mm 2mm', fontWeight: '800', color: '#475569' }}>{linha.label.toUpperCase()}</td>
                      <td style={{ padding: '2.5mm 2mm', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>{linha.qtd}</td>
                      <td style={{ padding: '2.5mm 2mm', textAlign: 'right', color: '#64748b', fontWeight: '500' }}>{linha.valorRemun > 0 ? formatMoney(linha.valorRemun) : ''}</td>
                      <td style={{ padding: '2.5mm 2mm', textAlign: 'right', fontWeight: '700', color: linha.valorDesc > 0 ? '#b91c1c' : '#000' }}>{linha.valorDesc > 0 ? formatMoney(linha.valorDesc) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ flex: '1 1 auto', minHeight: '3mm' }}></div>

              <div style={{ borderTop: '1px solid #000', paddingTop: '2mm' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8mm', marginBottom: '4mm' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Total Remun.</p>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#000' }}>{formatMoney(snap.totalBruto)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Total Desc.</p>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#e11d48' }}>{formatMoney(snap.totalDescontos)}</p>
                  </div>
                </div>
                <div style={{ background: '#000', color: '#fff', padding: '2mm 4mm', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.05em' }}>VALOR LÍQUIDO (KZ)</span>
                  <span style={{ fontSize: '16px', fontWeight: '900' }}>{formatMoney(snap.salarioLiquido)}</span>
                </div>
              </div>

              {/* Footer / Dados Bancários — compacto */}
              <div style={{ marginTop: '12mm', display: 'flex', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', width: '60%' }}>
                  <div style={{ borderBottom: '1.5px solid #000', height: '10mm', marginBottom: '2mm' }}></div>
                  <p style={{ fontSize: '10px', fontWeight: 'bold', margin: 0, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assinatura do Colaborador</p>
                </div>
              </div>

              <div style={{ marginTop: '2mm', textAlign: 'center', fontSize: '7px', color: '#94a3b8', fontWeight: 'bold' }}>
                Processado por SALYA
              </div>
            </div>
          </div>

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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Processamento em Atraso</h1>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">Regularize salários de meses anteriores que ainda não foram liquidados.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-900 block mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-slate-900">Tudo em dia!</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Não existem processamentos pendentes de meses anteriores.</p>
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
                 className="bg-white border border-slate-200 rounded-2xl transition-all"
               >
                 {/* Collaborator header — clickable */}
                 <button
                   onClick={() => setExpandedId(isExpanded ? null : colaborador.id)}
                   className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                 >
                   {/* Avatar */}
                   <div className="size-11 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                     {colaborador.nome.substring(0, 2).toUpperCase()}
                   </div>

                   {/* Info */}
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-semibold text-slate-900 truncate">{colaborador.nome}</p>
                     <p className="text-xs text-slate-400 truncate font-medium">{colaborador.cargo}</p>
                   </div>

                   {/* Badge: pending months */}
                   <div className="flex items-center gap-3 shrink-0">
                     <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                     {formatMoney(valorEmAtrasoTopo * pendencias.length)} Valor em atraso
                     </span>
                     <span className="text-sm text-slate-500 font-medium hidden sm:block whitespace-nowrap">
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

                    {/* Action buttons (Now at Top) */}
                    <div className="flex justify-end pt-2 gap-3 mb-4">
                      <button
                        onClick={() => handleAnular(colaborador.id)}
                        disabled={numSelected === 0 || processando}
                        title="Anular meses seleccionados que já foram processados fora do sistema"
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                          numSelected === 0 || processando
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                        Anular {numSelected > 0 ? `${numSelected} ${numSelected === 1 ? 'mês' : 'meses'}` : ''}
                      </button>

                      <button
                        onClick={() => handleProcessar(colaborador.id, pendencias)}
                        disabled={numSelected === 0 || processando}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                          numSelected === 0 || processando
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
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

                    {/* Select all + counter */}
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleTodos(colaborador.id, pendencias)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-xs font-medium text-slate-600">Seleccionar todos os meses</span>
                      </label>
                      {numSelected > 0 && (
                        <span className="text-xs text-slate-900 font-semibold">
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
                            className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all ${checked ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMes(colaborador.id, p.mes, p.ano)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <div>
                              <p className={`text-xs font-semibold ${checked ? 'text-white' : 'text-slate-700'}`}>{numToMonth(p.mes)}</p>
                              <p className={`text-[10px] ${checked ? 'text-slate-200' : 'text-slate-400'}`}>{p.ano}</p>
                            </div>
                          </label>
                        );
                      })}
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
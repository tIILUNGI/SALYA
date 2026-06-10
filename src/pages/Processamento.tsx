import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import { taxasIRT } from '../data/mockData';
import { countries } from '../data/countries';
import { API_BASE_URL } from '../services/api';



interface OutroGanhoInput {
  id: string;
  descricao: string;
  valor: number;
}

interface HistóricoProcessamento {
  id: number;
  colaboradorId?: number;
  nomeColaborador: string;
  nifColaborador?: string;
  cargo?: string;
  iban?: string;
  banco?: string;
  mes: number;
  ano: number;
  diasTrabalhados?: number;
  diasUteis?: number;
  salarioBaseProporcional?: number;
  subsidioAlimentacao?: number;
  subsidioTransporte?: number;
  subsidioFerias?: number;
  subsidioNatal?: number;
  horasExtra?: number;
  bonus?: number;
  totalBruto: number;
  descontos: number;
  valorINSS?: number;
  valorIRT?: number;
  percentualIRT?: number;
  valorFaltas?: number;
  salarioLiquido: number;
  reciboUrl?: string;
  createdAt?: string;
}

interface ReceiptSnapshot {
   colaborador: Colaborador;
   mes: string;
   ano: string;
   dataProcessamento: string;
   salarioBase: number;
   diasTrabalhados: number;
   ganhoAlimentacao: number;
   ganhoTransporte: number;
   ganhoFerias: number;
   ganhoNatal: number;
   horasExtra: number;
   bonus: number;
   faltas: number;
   faltasDias?: number;
   outrosGanhos: OutroGanhoInput[];
   totalBruto: number;
   valorINSS: number;
   valorIRT: number;
   percentualIRT?: number;
   totalDescontos: number;
   salarioLiquido: number;
   materiaColetavel: number;
 }

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const monthToNum = (month: string) => MONTHS.indexOf(month) + 1;
const numToMonth = (month: number) => MONTHS[month - 1] || `Mes ${month}`;
const parseMoneyInput = (value: string) => Number(value.replace(/[^\d]/g, '')) || 0;
const formatMoney = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const hasDecimals = !Number.isInteger(amount);
  return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })} Kz`;
};
const formatMoneyInput = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString('pt-AO');
};
const createOtherGain = (): OutroGanhoInput => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, descricao: '', valor: 0 });

const roundMoney = (value: number): number => Number(value.toFixed(2));

// INSS: 3% sobre o salário base proporcional (não sobre subsídios) - Lei n.º 14/25
const calcularINSS = (salarioBase: number, isPrestador = false): number => isPrestador ? 0 : roundMoney(salarioBase * 0.03);

/**
 * IRT — Lei n.º 14/25 (Angola)
 * Fórmula correta: IRT = parcelaFixa + (MC - excesso) × taxa
 */
const calcularIRT = (mc: number, isPrestador = false): { valor: number; faixa: string } => {
  if (mc <= 0) return { valor: 0, faixa: '1º Escalão' };
  
  if (isPrestador) {
    return { valor: roundMoney(mc * 0.065), faixa: 'Prestador (Taxa Fixa 6,5%)' };
  }

  const f = [...taxasIRT].reverse().find(b => mc > b.excesso) ?? taxasIRT[0];
  const irt = Math.max(0, roundMoney(f.parcelaFixa + (mc - f.excesso) * f.taxa / 100));
  return { valor: irt, faixa: f.faixa };
};

// ── Data actual ─────────────────────────────────────────────────────────────
const TODAY = new Date();
const CURRENT_MONTH_NUM = TODAY.getMonth() + 1;
const CURRENT_YEAR = TODAY.getFullYear();

const Processamento: React.FC = () => {
  const { empresa, colaboradores, empresaId, setMessage } = useContext(AppContext);
  const ativos = colaboradores.filter((colaborador) => colaborador.status === 'Ativo' && (!empresaId || colaborador.empresaId === empresaId || (colaborador as any).empresa?.id === empresaId));

  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[CURRENT_MONTH_NUM - 1]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistóricoModal, setShowHistóricoModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null);
  const [historico, setHistórico] = useState<HistóricoProcessamento[]>([]);
  const [historicoLoading, setHistóricoLoading] = useState(false);
  const [historicoError, setHistóricoError] = useState('');
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState('');
  const [holidays, setHolidays] = useState<any[]>([]);

  const [formSalario, setFormSalario] = useState(0);
  const [formDiasTrabalhados, setFormDiasTrabalhados] = useState(22);
  const [formGanhoAlimentacao, setFormGanhoAlimentacao] = useState(0);
  const [formGanhoTransporte, setFormGanhoTransporte] = useState(0);
  const [formGanhoFerias, setFormGanhoFerias] = useState(0);
  const [formGanhoNatal, setFormGanhoNatal] = useState(0);
  const [formHorasExtra, setFormHorasExtra] = useState(0);
  const [formBonus, setFormBonus] = useState(0);
  const [formFaltas, setFormFaltas] = useState(0);
  const [formOutrosGanhos, setFormOutrosGanhos] = useState<OutroGanhoInput[]>([]);
  const [incluirFerias, setIncluirFerias] = useState(false);
  const [incluirNatal, setIncluirNatal] = useState(false);
  const [localTipoProcessamento, setLocalTipoProcessamento] = useState<'Dias Variáveis' | 'Dias Fixos'>('Dias Variáveis');

  const selectedMonthNum = monthToNum(selectedMonth);
  const selectedYearNum  = parseInt(selectedYear, 10);
  const isPeriodoFuturo  = selectedYearNum > CURRENT_YEAR ||
    (selectedYearNum === CURRENT_YEAR && selectedMonthNum > CURRENT_MONTH_NUM);

  const periodoLocked = isPeriodoFuturo;
  const periodoLockedMessage = 'Mês futuro bloqueado para processamento.';
  const isMonthOptionDisabled = (month: string, year: string) => {
    const monthNum = monthToNum(month);
    const yearNum = parseInt(year, 10);
    return yearNum > CURRENT_YEAR || (yearNum === CURRENT_YEAR && monthNum > CURRENT_MONTH_NUM);
  };

  const totalOutrosGanhos = formOutrosGanhos.reduce((total, ganho) => total + (ganho.valor || 0), 0);
  const ferias = incluirFerias ? formGanhoFerias : 0;
  const natal = incluirNatal ? formGanhoNatal : 0;

  const diasUteisReal = useMemo(() => {
    const month = monthToNum(selectedMonth);
    const year = parseInt(selectedYear, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    let workDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (!isWeekend) {
        const dateStr = date.toISOString().split('T')[0];
        const isHoliday = holidays.some(h => h.date === dateStr);
        if (!isHoliday) workDays++;
      }
    }
    return workDays || 22;
  }, [selectedMonth, selectedYear, holidays]);

  const isFixed = localTipoProcessamento === 'Dias Fixos';
  const baseDays = useMemo(() => isFixed ? 22 : diasUteisReal, [isFixed, diasUteisReal]);

  useEffect(() => {
    setFormDiasTrabalhados(isFixed ? 22 : diasUteisReal);
  }, [isFixed, diasUteisReal]);

  const diasDoMes = useMemo(() => {
    const month = monthToNum(selectedMonth);
    const year = parseInt(selectedYear, 10);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!empresa?.pais) return;
      const country = countries.find(c => c.name === empresa.pais);
      if (!country) return;
      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/${country.code}`);
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            setHolidays(data);
          } else setHolidays([]);
        } else setHolidays([]);
      } catch (error) { setHolidays([]); }
    };
    fetchHolidays();
  }, [empresa?.pais, selectedYear]);

  const salarioProporcional = useMemo(
    () => Math.round(formSalario / baseDays * formDiasTrabalhados),
    [formSalario, formDiasTrabalhados, baseDays]
  );

  const descontoFaltasPorDia = useMemo(() => formSalario / baseDays, [formSalario, baseDays]);

  const descontoFaltas = useMemo(() => {
    const faltasDias = Number.isFinite(formFaltas) ? formFaltas : 0;
    return Math.round(Math.max(0, faltasDias) * descontoFaltasPorDia);
  }, [formFaltas, descontoFaltasPorDia]);

  const alimentacao = formGanhoAlimentacao;
  const transporte = formGanhoTransporte;

  const alimentacaoTributavel = useMemo(() => Math.max(0, alimentacao - 30000), [alimentacao]);
  const transporteTributavel = useMemo(() => Math.max(0, transporte - 30000), [transporte]);

  const totalBruto = useMemo(
    () => roundMoney(salarioProporcional + alimentacao + transporte + ferias + natal + formHorasExtra + formBonus + totalOutrosGanhos),
    [salarioProporcional, alimentacao, transporte, ferias, natal, formHorasExtra, formBonus, totalOutrosGanhos]
  );

  const inssEstimado = useMemo(() => {
    if (selectedColab?.tipoContrato === 'Prestador') return 0;
    return calcularINSS(salarioProporcional);
  }, [salarioProporcional, selectedColab]);

  const materiaColectavel = useMemo(() => {
    const isPrestador = selectedColab?.tipoContrato === 'Prestador';
    if (isPrestador) return roundMoney(totalBruto);
    return roundMoney(Math.max(0, salarioProporcional + alimentacaoTributavel + transporteTributavel + formHorasExtra + formBonus + totalOutrosGanhos - inssEstimado - descontoFaltas));
  }, [selectedColab?.tipoContrato, totalBruto, salarioProporcional, alimentacaoTributavel, transporteTributavel, formHorasExtra, formBonus, totalOutrosGanhos, inssEstimado, descontoFaltas]);

  const irtEstimado = useMemo(() => {
    const isPrestador = selectedColab?.tipoContrato === 'Prestador';
    if (isPrestador) return { valor: roundMoney(totalBruto * 0.065), faixa: 'Prestador (Taxa Fixa 6,5%)' };
    return calcularIRT(materiaColectavel, false);
  }, [materiaColectavel, selectedColab, totalBruto]);

  const retencaoFerias = useMemo(() => {
    if (selectedColab?.tipoContrato === 'Prestador') return 0;
    return roundMoney(ferias * 0.15);
  }, [ferias, selectedColab]);
  
  const retencaoNatal = useMemo(() => {
    if (selectedColab?.tipoContrato === 'Prestador') return 0;
    return roundMoney(natal * 0.15);
  }, [natal, selectedColab]);

  const totalDescontos = useMemo(() => {
    const inss = isNaN(inssEstimado) ? 0 : inssEstimado;
    const irt = isNaN(irtEstimado.valor) ? 0 : irtEstimado.valor;
    const rf = isNaN(retencaoFerias) ? 0 : retencaoFerias;
    const rn = isNaN(retencaoNatal) ? 0 : retencaoNatal;
    return roundMoney(inss + irt + rf + rn + descontoFaltas);
  }, [inssEstimado, irtEstimado, retencaoFerias, retencaoNatal, descontoFaltas]);
  
  const salarioLiquidoEstimado = useMemo(() => roundMoney(totalBruto - totalDescontos), [totalBruto, totalDescontos]);

  const historicoDoPeriodo = useMemo(() => {
    return historico.filter((item) => item.mes === monthToNum(selectedMonth) && String(item.ano) === selectedYear);
  }, [historico, selectedMonth, selectedYear]);

  const colaboradoresProcessadosNoPeriodo = useMemo(() => {
    return new Set<number>(historicoDoPeriodo.map((item) => item.colaboradorId).filter((id): id is number => typeof id === 'number'));
  }, [historicoDoPeriodo]);

  const totaisPeriodo = useMemo(() => {
    return historicoDoPeriodo.reduce((acc, curr) => ({
      bruto: acc.bruto + (typeof curr.totalBruto === 'number' && Number.isFinite(curr.totalBruto) ? curr.totalBruto : 0),
      descontos: acc.descontos + (typeof curr.descontos === 'number' && Number.isFinite(curr.descontos) ? curr.descontos : 0),
      liquido: acc.liquido + (typeof curr.salarioLiquido === 'number' && Number.isFinite(curr.salarioLiquido) ? curr.salarioLiquido : 0),
    }), { bruto: 0, descontos: 0, liquido: 0 });
  }, [historicoDoPeriodo]);

  const historyPeriods = useMemo(() => {
    const keys = historico.map((item) => `${item.ano}-${String(item.mes).padStart(2, '0')}`);
    return Array.from(new Set(keys)).sort((a, b) => b.localeCompare(a));
  }, [historico]);

  useEffect(() => {
    if (historyPeriods.length && !historyPeriods.includes(selectedHistoryPeriod)) {
      setSelectedHistoryPeriod(historyPeriods[0]);
    }
  }, [historyPeriods, selectedHistoryPeriod]);

  const historicoPorPeriodo = useMemo(() => {
    if (!selectedHistoryPeriod) return [];
    return historico.filter((item) => `${item.ano}-${String(item.mes).padStart(2, '0')}` === selectedHistoryPeriod);
  }, [historico, selectedHistoryPeriod]);

  const loadHistórico = useCallback(async () => {
    if (!empresaId) return;
    setHistóricoLoading(true);
    setHistóricoError('');
    try {
      const data = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
      setHistórico(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setHistórico([]);
      setHistóricoError(error?.message || 'Nao foi possivel carregar o historico.');
    } finally {
      setHistóricoLoading(false);
    }
  }, [empresaId]);

  const handleStartProcessar = useCallback((colab: Colaborador) => {
    if (periodoLocked) return;
    if (colaboradoresProcessadosNoPeriodo.has(colab.id)) {
      setMessage({ title: 'Aviso', text: 'Este colaborador já foi processado para o mês selecionado.', type: 'warning' });
      return;
    }
    setSelectedColab(colab);
    setFormSalario(colab.salarioBase || 0);
    setFormGanhoAlimentacao(colab.subsidioAlimentacao || 0);
    setFormGanhoTransporte(colab.subsidioTransporte || 0);
    setFormGanhoFerias(0);
    setFormGanhoNatal(0);
    setIncluirFerias(false);
    setIncluirNatal(false);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormFaltas(0);
    setFormOutrosGanhos([]);
    const regimeEmpresa = (empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS') ? 'Dias Fixos' : 'Dias Variáveis';
    setLocalTipoProcessamento(regimeEmpresa);
    setShowFormModal(true);
  }, [periodoLocked, colaboradoresProcessadosNoPeriodo, empresa, setMessage]);

  const resetProcessingForm = () => {
    setFormSalario(0);
    setFormGanhoAlimentacao(0);
    setFormGanhoTransporte(0);
    setFormGanhoFerias(0);
    setFormGanhoNatal(0);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormFaltas(0);
    setFormOutrosGanhos([]);
    setIncluirFerias(false);
    setIncluirNatal(false);
  };

  const buildOtherGainsPayload = () =>
    formOutrosGanhos.filter((ganho) => ganho.valor > 0).map((ganho, index) => ({
      descricao: ganho.descricao.trim() || `Outro ganho ${index + 1}`,
      valor: ganho.valor,
    }));

  const handleBulkProcess = async () => {
    if (isProcessingBulk || periodoLocked) return;
    const ativosParaProcessar = ativos.filter((colab) => !colaboradoresProcessadosNoPeriodo.has(colab.id));
    if (ativosParaProcessar.length === 0) {
      Swal.fire('Aviso', 'Todos os colaboradores já foram processados para este mês.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: 'Processamento em Lote',
      text: `Deseja processar o salario de todos os ${ativosParaProcessar.length} colaboradores ativos não processados para ${selectedMonth}/${selectedYear}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, Processar Todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#9333ea'
    });
    if (!result.isConfirmed) return;
    setIsProcessingBulk(true);
    Swal.fire({ title: 'A Processar...', text: 'A gerar recibos padrao. Por favor, aguarde.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    try {
      const isFixedCompany = (empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS');
      const bulkBaseDays = isFixedCompany ? 22 : diasUteisReal;
      for (const colab of ativosParaProcessar) {
        const dto = {
          trabalhadorId: colab.id,
          mes: monthToNum(selectedMonth),
          ano: parseInt(selectedYear, 10),
          salarioBaseOverride: colab.salarioBase || 0,
          diasTrabalhados: bulkBaseDays,
          diasUteis: bulkBaseDays,
          diasAlimentacao: 1,
          diasTransporte: 1,
          valorDiaAlimentacao: colab.subsidioAlimentacao || 0,
          valorDiaTransporte: colab.subsidioTransporte || 0,
          subsidioFeriasValor: colab.subsidioFerias || 0,
          subsidioNatalValor: colab.subsidioNatal || 0,
          outrosSubsidiosTotal: 0,
          horasExtraTotal: 0,
          bonusTotal: 0,
          faltasTotal: 0,
          outrosGanhos: [],
        };
        await api.post('/processamentos/processar-salario', dto);
      }
      await loadHistórico();
      Swal.fire('Sucesso', 'Processamento concluido!', 'success');
    } catch {
      Swal.fire('Erro', 'Ocorreu um erro no processamento.', 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleConfirmForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColab) return;
    const outrosGanhosPayload = buildOtherGainsPayload();
    try {
      const dto = {
        trabalhadorId: selectedColab.id,
        mes: monthToNum(selectedMonth),
        ano: parseInt(selectedYear, 10),
        salarioBaseOverride: formSalario,
        diasTrabalhados: formDiasTrabalhados,
        diasUteis: baseDays,
        diasAlimentacao: 1,
        diasTransporte: 1,
        valorDiaAlimentacao: formGanhoAlimentacao,
        valorDiaTransporte: formGanhoTransporte,
        subsidioFeriasValor: incluirFerias ? formGanhoFerias : 0,
        subsidioNatalValor: incluirNatal ? formGanhoNatal : 0,
        outrosSubsidiosTotal: 0,
        horasExtraTotal: formHorasExtra,
        bonusTotal: formBonus,
        faltasTotal: descontoFaltas,
        outrosGanhos: outrosGanhosPayload,
      };
      const result = await api.post('/processamentos/processar-salario', dto);
      setReceiptSnapshot({
        colaborador: selectedColab,
        mes: selectedMonth,
        ano: selectedYear,
        dataProcessamento: new Date().toLocaleDateString('pt-AO'),
        salarioBase: formSalario,
        diasTrabalhados: formDiasTrabalhados,
        ganhoAlimentacao: formGanhoAlimentacao,
        ganhoTransporte: formGanhoTransporte,
        ganhoFerias: incluirFerias ? formGanhoFerias : 0,
        ganhoNatal: incluirNatal ? formGanhoNatal : 0,
        horasExtra: formHorasExtra,
        bonus: formBonus,
        faltas: descontoFaltas,
        faltasDias: formFaltas,
        outrosGanhos: outrosGanhosPayload.map((ganho, index) => ({ id: `${index}`, descricao: ganho.descricao, valor: ganho.valor })),
        totalBruto: typeof result.totalBruto === 'number' && Number.isFinite(result.totalBruto) ? result.totalBruto : 0,
        valorINSS: typeof result.valorINSS === 'number' && Number.isFinite(result.valorINSS) ? result.valorINSS : 0,
        valorIRT: typeof result.valorIRT === 'number' && Number.isFinite(result.valorIRT) ? result.valorIRT : 0,
        percentualIRT: result.detalhesIRT?.taxaIRT ? result.detalhesIRT.taxaIRT * 100 : 0,
        totalDescontos: typeof result.descontos === 'number' && Number.isFinite(result.descontos) ? result.descontos : 0,
        salarioLiquido: typeof result.salarioLiquido === 'number' && Number.isFinite(result.salarioLiquido) ? result.salarioLiquido : 0,
        materiaColetavel: materiaColectavel,
      });
      await loadHistórico();
      setShowFormModal(false);
      setShowReceiptModal(true);
      const historicoId = result.historicoId;
      if (historicoId) {
        setTimeout(() => {
          const el = document.getElementById('recibo-para-impressao');
          if (el) api.post(`/processamentos/${historicoId}/recibo`, { html: el.innerHTML }).catch(() => {});
        }, 100);
      }
    } catch (error: any) {
      const text = error?.status === 409 ? 'Este colaborador já foi processado para este mês/ano.' : error?.message || 'Erro ao processar.';
      setMessage({ title: 'Erro', text, type: 'error' });
    }
  };

  const handleGuardarPDF = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element || !receiptSnapshot) return;
    const cloned = element.cloneNode(true) as HTMLElement;
    
    // Remove matéria coletável do recibo para PDF - procura por div que contém "Matéria Colectável"
    const allDivs = cloned.querySelectorAll('div');
    allDivs.forEach(div => {
      if (div.textContent && div.textContent.includes('Matéria Colectável')) {
        const parentDiv = div.parentElement;
        if (parentDiv) {
          parentDiv.removeChild(div);
        }
      }
    });
    
    cloned.style.position = 'absolute';
    cloned.style.left = '-9999px';
    cloned.style.top = '0';
    cloned.style.width = '190mm';
    cloned.style.minHeight = '270mm';
    cloned.style.padding = '4mm';
    cloned.style.overflow = 'hidden';
    cloned.style.maxWidth = '190mm';
    document.body.appendChild(cloned);
    
    html2pdf().from(cloned).set({
      margin: 0,
      filename: `Recibo_${receiptSnapshot.colaborador.nome.replace(/ /g, '_')}_${receiptSnapshot.ano}${String(parseInt(receiptSnapshot.mes)).padStart(2, '0')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.4,
        useCORS: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save().then(() => { document.body.removeChild(cloned); });
  };

  const handleUpdateOtherGain = (id: string, field: 'descricao' | 'valor', value: string) => {
    setFormOutrosGanhos((previous) => previous.map((ganho) => ganho.id === id ? { ...ganho, [field]: field === 'valor' ? parseMoneyInput(value) : value } : ganho));
  };

  const handleAddOtherGain = () => setFormOutrosGanhos((previous) => [...previous, createOtherGain()]);
  const handleRemoveOtherGain = (id: string) => setFormOutrosGanhos((previous) => previous.filter((ganho) => ganho.id !== id));

  const handleDownloadHistoricalReceipt = async (item: HistóricoProcessamento) => {
    try {
      const htmlOrData = await api.get(`/processamentos/${item.id}/recibo`);
      const html = typeof htmlOrData === 'string' ? htmlOrData : (htmlOrData?.html ?? '');
      if (html && html.includes('<html')) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) URL.revokeObjectURL(url);
        return;
      }
    } catch { /* fallback */ }
    setReceiptSnapshot({
      colaborador: { id: item.colaboradorId || 0, nome: item.nomeColaborador, nif: item.nifColaborador || '', cargo: item.cargo || '', salarioBase: item.salarioBaseProporcional || 0, status: 'Ativo', email: '', banco: item.banco, iban: item.iban } as any,
      mes: numToMonth(item.mes),
      ano: String(item.ano),
      dataProcessamento: item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-AO') : new Date().toLocaleDateString('pt-AO'),
      salarioBase: item.salarioBaseProporcional || 0,
      diasTrabalhados: item.diasTrabalhados || 22,
      ganhoAlimentacao: item.subsidioAlimentacao || 0,
      ganhoTransporte: item.subsidioTransporte || 0,
      ganhoFerias: item.subsidioFerias || 0,
      ganhoNatal: item.subsidioNatal || 0,
      horasExtra: item.horasExtra || 0,
      bonus: item.bonus || 0,
      faltas: item.valorFaltas || 0,
      outrosGanhos: [],
      totalBruto: item.totalBruto,
      valorINSS: item.valorINSS || 0,
      valorIRT: item.valorIRT || 0,
      percentualIRT: item.percentualIRT ? item.percentualIRT * 100 : 0,
      totalDescontos: item.descontos,
      salarioLiquido: item.salarioLiquido,
      materiaColetavel: item.totalBruto,
    });
    setShowReceiptModal(true);
  };

  const renderReceiptModal = () => {
    if (!showReceiptModal || !receiptSnapshot) return null;

    const valorHora = receiptSnapshot.diasTrabalhados > 0 ? receiptSnapshot.salarioBase / (receiptSnapshot.diasTrabalhados * 8) : 0;
    const materiaColetavelExibida = receiptSnapshot.materiaColetavel;
    const totalBrutoExibido = receiptSnapshot.totalBruto;
    const totalDescontosExibido = receiptSnapshot.totalDescontos;
    const salarioLiquidoExibido = receiptSnapshot.salarioLiquido;

    const receiptLines = [
      { label: `Salário Base`, valorRemun: receiptSnapshot.salarioBase, valorDesc: 0, qtd: `${receiptSnapshot.diasTrabalhados} Dias` },
      ...(receiptSnapshot.ganhoAlimentacao > 0 ? [{ label: 'Subsídio de Alimentação', valorRemun: receiptSnapshot.ganhoAlimentacao, valorDesc: 0, qtd: '1' }] : []),
      ...(receiptSnapshot.ganhoTransporte > 0 ? [{ label: 'Subsídio de Transporte', valorRemun: receiptSnapshot.ganhoTransporte, valorDesc: 0, qtd: '1' }] : []),
      ...(receiptSnapshot.ganhoFerias > 0 ? [{ label: 'Subsídio de Férias', valorRemun: receiptSnapshot.ganhoFerias, valorDesc: 0, qtd: '1' }] : []),
      ...(receiptSnapshot.ganhoNatal > 0 ? [{ label: 'Subsídio de Natal', valorRemun: receiptSnapshot.ganhoNatal, valorDesc: 0, qtd: '1' }] : []),
      ...(receiptSnapshot.horasExtra > 0 ? [{ label: 'Horas Extras', valorRemun: receiptSnapshot.horasExtra, valorDesc: 0, qtd: '1' }] : []),
      ...(receiptSnapshot.bonus > 0 ? [{ label: 'Bónus / Prémio', valorRemun: receiptSnapshot.bonus, valorDesc: 0, qtd: '1' }] : []),
      ...receiptSnapshot.outrosGanhos.map((ganho) => ({ label: ganho.descricao, valorRemun: ganho.valor, valorDesc: 0, qtd: '1' })),
      { label: 'Segurança Social (INSS 3% s/ sal. base)', valorRemun: 0, valorDesc: receiptSnapshot.valorINSS, qtd: receiptSnapshot.valorINSS > 0 ? '3%' : '0%' },
      { label: receiptSnapshot.colaborador.tipoContrato === 'Prestador' ? 'IRT Grupo B/C (Independente)' : 'Imposto sobre Rendimento (IRT)', valorRemun: 0, valorDesc: receiptSnapshot.valorIRT, qtd: receiptSnapshot.percentualIRT ? (receiptSnapshot.percentualIRT % 1 === 0 ? `${receiptSnapshot.percentualIRT}%` : `${receiptSnapshot.percentualIRT.toFixed(1)}%`) : '-' },
      ...(receiptSnapshot.faltas > 0 ? [{ label: 'Faltas', valorRemun: 0, valorDesc: receiptSnapshot.faltas, qtd: receiptSnapshot.faltasDias ? `${receiptSnapshot.faltasDias} dias` : '-' }] : []),
    ];

    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-[40px] max-w-[220mm] w-full max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-slate-100">
<div id="recibo-para-impressao"
   className="bg-white mx-auto p-[8mm] shadow-none flex flex-col font-sans text-black leading-relaxed"
   style={{
     width: '190mm',
     minHeight: '275mm',
     maxHeight: '280mm',
     boxSizing: 'border-box',
     fontSize: '11px'
   }}
>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', borderBottom: '1px solid #000', paddingBottom: '2mm' }}>
                 <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '3mm' }}>
                   {empresa?.logoUrl && <img src={`${API_BASE_URL}${empresa.logoUrl}`} alt="Logotipo" style={{ width: '12mm', height: '12mm', objectFit: 'contain', borderRadius: '2px', backgroundColor: '#f8fafc', padding: '1px' }} />}
                   <div>
                     <h2 style={{ fontSize: '12px', fontWeight: '900', margin: '0 0 2px 0' }}>{empresa?.nome}</h2>
                     <p style={{ fontSize: '8px', margin: '1px 0', color: '#333' }}>NIF: {empresa?.nif}</p>
                     <p style={{ fontSize: '8px', margin: '1px 0', color: '#333' }}>{empresa?.endereco}, {empresa?.municipio}</p>
                     <p style={{ fontSize: '8px', margin: '1px 0', color: '#333' }}>{empresa?.email} | {empresa?.telefone}</p>
                   </div>
                 </div>
                 <div style={{ flex: 1, textAlign: 'right' }}>
                   <h1 style={{ fontSize: '12px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>RECIBO DE VENCIMENTO</h1>
                   <div style={{ display: 'inline-block', textAlign: 'left', fontSize: '8px', background: '#f1f5f9', padding: '1mm 2mm', borderRadius: '2px' }}>
                     <p style={{ margin: '0 0 1px 0' }}><span style={{ fontWeight: 'bold' }}>Período:</span> {String(parseInt(receiptSnapshot.mes)).padStart(2, '0')} / {receiptSnapshot.ano}</p>
                     <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Data:</span> {receiptSnapshot.dataProcessamento}</p>
                   </div>
                 </div>
               </div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', marginBottom: '5mm', padding: '5mm', border: '1.5px solid #000', borderRadius: '6px', background: '#fcfcfc' }}>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>NOME:</span> <span style={{ fontWeight: 'bold' }}>{receiptSnapshot.colaborador.nome}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>Nº MEC.:</span> <span>{(receiptSnapshot.colaborador as any).numeroColaborador || '---'}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>CATEGORIA:</span> <span>{receiptSnapshot.colaborador.cargo}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>CONTRIBUINTE:</span> <span>{receiptSnapshot.colaborador.nif}</span></div>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>VENCIMENTO:</span> <span>{formatMoney(receiptSnapshot.salarioBase)}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>VENC./HORA:</span> <span>{formatMoney(valorHora)}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>DIAS ÚTEIS:</span> <span>{receiptSnapshot.diasTrabalhados}</span></div>
                    <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', width: '30mm' }}>IBAN:</span> <span style={{ fontSize: '9px' }}>{(receiptSnapshot.colaborador as any).iban || '---'}</span></div>
                  </div>
                </div>

<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '6mm' }}>
                  <thead>
                    <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', textAlign: 'left', backgroundColor: '#fdfdfd' }}>
                      <th style={{ padding: '3mm 2mm', fontWeight: 'bold' }}>DESCRIÇÃO</th>
                      <th style={{ padding: '3mm 2mm', width: '20mm', textAlign: 'center', fontWeight: 'bold' }}>QTD.</th>
                      <th style={{ padding: '3mm 2mm', width: '35mm', textAlign: 'right', fontWeight: 'bold' }}>REMUN.</th>
                      <th style={{ padding: '3mm 2mm', width: '35mm', textAlign: 'right', fontWeight: 'bold' }}>DESC.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '2.5mm 2mm', fontWeight: '600' }}>{line.label.toUpperCase()}</td>
                        <td style={{ padding: '2.5mm 2mm', textAlign: 'center', color: '#333' }}>{line.qtd}</td>
                        <td style={{ padding: '2.5mm 2mm', textAlign: 'right' }}>{line.valorRemun > 0 ? formatMoney(line.valorRemun) : ''}</td>
                        <td style={{ padding: '2.5mm 2mm', textAlign: 'right', fontWeight: line.valorDesc > 0 ? '700' : '400', color: line.valorDesc > 0 ? '#b91c1c' : '#000' }}>{line.valorDesc > 0 ? formatMoney(line.valorDesc) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

<div style={{ flex: '1 1 auto', minHeight: '3mm' }}></div>

                <div style={{ borderTop: '1px solid #000', paddingTop: '2mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6mm', marginBottom: '2mm' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', margin: '0 0 1px 0', textTransform: 'uppercase' }}>Total Remun.</p>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0 }}>{formatMoney(totalBrutoExibido)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', margin: '0 0 1px 0', textTransform: 'uppercase' }}>Total Desc.</p>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0, color: '#e11d48' }}>{formatMoney(totalDescontosExibido)}</p>
                    </div>
                  </div>
                  <div style={{ background: '#000', color: '#fff', padding: '2mm 4mm', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.05em' }}>VALOR LÍQUIDO (KZ)</span>
                    <span style={{ fontSize: '16px', fontWeight: '900' }}>{formatMoney(salarioLiquidoExibido)}</span>
                  </div>
                </div>

                {/* Footer / Dados Bancários — compacto */}
                <div style={{ marginTop: '2mm', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4mm' }}>
                  <div style={{ fontSize: '8px', background: '#f8fafc', padding: '1mm', borderRadius: '4px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Banco: {(receiptSnapshot.colaborador as any).banco || '---'} | IBAN: {(receiptSnapshot.colaborador as any).iban || '---'}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #000', height: '8mm', marginBottom: '1mm' }}></div>
                    <p style={{ fontSize: '8px', fontWeight: 'bold', margin: 0 }}>Assinatura</p>
                  </div>
                </div>

                <div style={{ marginTop: '2mm', textAlign: 'center', fontSize: '7px', color: '#94a3b8', fontWeight: 'bold' }}>
                  Processado por SALYA
                </div>
              </div>
            </div>
          <div className="p-6 border-t flex gap-4 no-print bg-white">
            <button onClick={handleGuardarPDF} className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold px-8 shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">download</span> Exportar Recibo (PDF)
            </button>
            <button onClick={() => setShowReceiptModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all">Fechar</button>
          </div>
        </div>
      </div>
    );
  };

  const renderMainContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 border border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Bruto</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatMoney(totaisPeriodo.bruto)}</p>
          <div className="flex items-center gap-1 mt-1 text-emerald-500"><span className="material-symbols-outlined text-sm">trending_up</span><span className="text-[10px] font-medium">{historicoDoPeriodo.length} recibos</span></div>
        </div>
        <div className="glass-card p-6 border border-slate-100">
          <p className="text-xs text-rose-500 uppercase tracking-wider font-semibold">Total Descontos</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatMoney(totaisPeriodo.descontos)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Inclui INSS e IRT</p>
        </div>
        <div className="glass-card p-6 border border-primary/10 bg-primary/5">
          <p className="text-xs text-primary uppercase tracking-wider font-semibold">Total Líquido</p>
          <p className="text-2xl font-bold text-primary mt-2">{formatMoney(totaisPeriodo.liquido)}</p>
          <p className="text-[10px] text-primary/60 mt-1">Valor a transferir</p>
        </div>
        <div className="glass-card p-6 border border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Período</p>
          <p className="text-xl font-bold text-slate-700 mt-2">{selectedMonth} {selectedYear}</p>
          <p className="text-[10px] text-slate-400 mt-1">{ativos.length} colaboradores ativos</p>
        </div>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="min-w-full text-left">
          <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Colaborador</th><th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 uppercase text-right whitespace-nowrap">Salário Base</th><th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 uppercase text-center whitespace-nowrap">Ação</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {ativos.map((colaborador) => (
              <tr key={colaborador.id} className="hover:bg-slate-50 transition-all">
                <td className="px-4 sm:px-6 py-4"><div className="flex items-center gap-3"><div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">{colaborador.nome.substring(0, 2).toUpperCase()}</div><div><p className="text-sm font-medium text-slate-700">{colaborador.nome}</p><p className="text-xs text-slate-400">{colaborador.cargo}</p></div></div></td>
                <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium text-slate-600 whitespace-nowrap">{formatMoney(colaborador.salarioBase || 0)}</td>
                <td className="px-4 sm:px-6 py-4 text-center"><button onClick={() => handleStartProcessar(colaborador)} disabled={periodoLocked || colaboradoresProcessadosNoPeriodo.has(colaborador.id)} className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${periodoLocked || colaboradoresProcessadosNoPeriodo.has(colaborador.id) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'}`}>{colaboradoresProcessadosNoPeriodo.has(colaborador.id) ? 'Processado' : 'Processar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFormModal = () => {
    if (!showFormModal || !selectedColab) return null;
    const isPrestador = selectedColab?.tipoContrato === 'Prestador';
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div><h3 className="text-lg font-medium text-slate-700">Processar Salário</h3><p className="text-sm text-slate-400">{selectedColab?.nome} · {selectedColab?.cargo}</p></div>
            <button onClick={() => { setShowFormModal(false); resetProcessingForm(); }} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
          </div>
          <form onSubmit={handleConfirmForm} className="p-6 space-y-6 bg-white">
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 flex items-center justify-between gap-4"><div><p className="text-xs text-slate-500">Total Outros Ganhos</p><p className="text-base font-medium text-slate-700">{formatMoney(totalOutrosGanhos)}</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="block text-xs font-medium text-slate-500">Salário Base</label><input type="text" value={formatMoneyInput(formSalario)} onChange={(e) => setFormSalario(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-primary text-lg outline-none focus:ring-2 focus:ring-primary" /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><label className="block text-xs font-medium text-slate-500">Regime de Cálculo</label><div className="flex p-0.5 bg-slate-100 rounded-lg"><button type="button" onClick={() => setLocalTipoProcessamento('Dias Fixos')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isFixed ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>FIXO (22)</button><button type="button" onClick={() => setLocalTipoProcessamento('Dias Variáveis')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isFixed ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VARIÁVEL</button></div></div>
                <div className="space-y-2 mt-4"><label className="block text-xs font-medium text-slate-500">Dias Trabalhados</label><div className="relative group"><input type="number" value={formDiasTrabalhados} onChange={(e) => setFormDiasTrabalhados(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-black text-primary text-lg outline-none focus:ring-2 focus:ring-primary transition-all" /><div className="absolute inset-y-0 right-4 flex items-center"><span className="material-symbols-outlined text-slate-400 text-base">edit</span></div></div></div>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
              <h4 className="text-sm font-medium text-slate-600">Ganhos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><div className="flex items-center justify-between"><label className="block text-xs text-slate-500">Alimentação</label>{formGanhoAlimentacao > 30000 && <button type="button" onClick={() => setFormGanhoAlimentacao(30000)} className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-all flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">warning</span>Excede limite</button>}</div><input type="text" value={formatMoneyInput(formGanhoAlimentacao)} onChange={(e) => setFormGanhoAlimentacao(parseMoneyInput(e.target.value))} className={`w-full rounded-lg p-3 font-medium border ${formGanhoAlimentacao > 30000 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100'}`} /></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><label className="block text-xs text-slate-500">Transporte</label>{formGanhoTransporte > 30000 && <button type="button" onClick={() => setFormGanhoTransporte(30000)} className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-all flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">warning</span>Excede limite</button>}</div><input type="text" value={formatMoneyInput(formGanhoTransporte)} onChange={(e) => setFormGanhoTransporte(parseMoneyInput(e.target.value))} className={`w-full rounded-lg p-3 font-medium border ${formGanhoTransporte > 30000 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100'}`} /></div>
                <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label className="block text-xs text-slate-500">Férias</label><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><input type="checkbox" checked={incluirFerias} onChange={(e) => setIncluirFerias(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />Opcional</label></div><input type="text" value={formatMoneyInput(formGanhoFerias)} onChange={(e) => setFormGanhoFerias(parseMoneyInput(e.target.value))} disabled={!incluirFerias} className={`w-full rounded-lg p-3 font-medium border ${incluirFerias ? 'bg-white border-slate-100' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} /></div>
                <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label className="block text-xs text-slate-500">Natal</label><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><input type="checkbox" checked={incluirNatal} onChange={(e) => setIncluirNatal(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />Opcional</label></div><input type="text" value={formatMoneyInput(formGanhoNatal)} onChange={(e) => setFormGanhoNatal(parseMoneyInput(e.target.value))} disabled={!incluirNatal} className={`w-full rounded-lg p-3 font-medium border ${incluirNatal ? 'bg-white border-slate-100' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} /></div>
                <div className="space-y-2"><label className="block text-xs text-slate-500">Horas Extra</label><input type="text" value={formatMoneyInput(formHorasExtra)} onChange={(e) => setFormHorasExtra(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" /></div>
                <div className="space-y-2"><label className="block text-xs text-slate-500">Bónus</label><input type="text" value={formatMoneyInput(formBonus)} onChange={(e) => setFormBonus(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" /></div>
              </div>
            </div>
            <div className="p-5 bg-rose-50/30 rounded-2xl space-y-4 border border-rose-100"><h4 className="text-sm font-medium text-rose-600">Descontos / Faltas</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="block text-xs text-slate-500 uppercase font-bold tracking-tight">Número de Faltas (Dias)</label><input type="number" min="0" max={baseDays} value={formFaltas} onChange={(e) => setFormFaltas(Number(e.target.value) || 0)} className="w-full rounded-lg p-3 font-medium border border-rose-100 bg-white outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" /></div><div className="space-y-2"><label className="block text-xs text-slate-500 uppercase font-bold tracking-tight opacity-50">Outros Descontos</label><input disabled type="text" placeholder="0 Kz" className="w-full rounded-lg p-3 font-medium border border-slate-100 bg-slate-50/50 cursor-not-allowed" /></div></div></div>
            <div className="p-5 bg-slate-50 rounded-2xl space-y-4"><div className="flex items-center justify-between gap-4"><h4 className="text-sm font-medium text-slate-600">Outros Ganhos</h4><button type="button" onClick={handleAddOtherGain} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Adicionar</button></div>{formOutrosGanhos.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center"><p className="text-xs text-slate-400">Sem outros ganhos</p></div> : <div className="space-y-3">{formOutrosGanhos.map((ganho) => (<div key={ganho.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_40px] gap-3 items-end bg-white border border-slate-100 rounded-xl p-3"><div className="space-y-1"><label className="block text-xs text-slate-500">Descrição</label><input type="text" value={ganho.descricao} onChange={(e) => handleUpdateOtherGain(ganho.id, 'descricao', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" /></div><div className="space-y-1"><label className="block text-xs text-slate-500">Valor</label><input type="text" value={formatMoneyInput(ganho.valor)} onChange={(e) => handleUpdateOtherGain(ganho.id, 'valor', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" /></div><button type="button" onClick={() => handleRemoveOtherGain(ganho.id)} className="size-9 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button></div>))}</div>}</div>
            <div className="rounded-[24px] border-2 border-primary/10 bg-slate-50/50 p-6 space-y-5"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">analytics</span>Resumo</h4><span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase">{formDiasTrabalhados}/{diasUteisReal} Dias ({empresa?.tipoProcessamento || 'Dias Variáveis'})</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Rendimentos</p><div className="flex justify-between text-sm"><span className="text-slate-500">Salário ({formDiasTrabalhados} dias)</span><span className="font-medium text-slate-700">{formatMoney(salarioProporcional)}</span></div>{alimentacao > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Alimentação</span>{!isPrestador && alimentacaoTributavel === 0 ? <span className="ml-1 text-[9px] text-emerald-500">isento</span> : !isPrestador && alimentacaoTributavel > 0 ? <span className="ml-1 text-[9px] text-amber-500">+{formatMoney(alimentacaoTributavel)} trib.</span> : isPrestador ? <span className="ml-1 text-[9px] text-primary font-bold">{formatMoney(alimentacao)}</span> : null}</div><span className="font-medium text-slate-700">{formatMoney(alimentacao)}</span></div>}{transporte > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Transporte</span>{!isPrestador && transporteTributavel === 0 ? <span className="ml-1 text-[9px] text-emerald-500">isento</span> : !isPrestador && transporteTributavel > 0 ? <span className="ml-1 text-[9px] text-amber-500">+{formatMoney(transporteTributavel)} trib.</span> : isPrestador ? <span className="ml-1 text-[9px] text-primary font-bold">{formatMoney(transporte)}</span> : null}</div><span className="font-medium text-slate-700">{formatMoney(transporte)}</span></div>}{formGanhoFerias > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Férias</span><span className="ml-1 text-[9px] text-amber-500">ret. 15%</span></div><span className="font-medium text-slate-700">{formatMoney(formGanhoFerias)}</span></div>}{formGanhoNatal > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Natal</span><span className="ml-1 text-[9px] text-amber-500">ret. 15%</span></div><span className="font-medium text-slate-700">{formatMoney(formGanhoNatal)}</span></div>}{(formHorasExtra + formBonus + totalOutrosGanhos) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Outros Abonos</span><span className="font-medium text-slate-700">{formatMoney(formHorasExtra + formBonus + totalOutrosGanhos)}</span></div>}<div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold"><span className="text-slate-800">Total Bruto</span><span className="text-slate-900">{formatMoney(totalBruto)}</span></div></div><div className="space-y-2"><p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Descontos</p><div className="flex justify-between text-sm"><div><span className="text-slate-500">INSS 3% s/ sal. base</span></div><span className="font-medium text-rose-500">-{formatMoney(inssEstimado)}</span></div><div className="flex flex-col gap-1 text-sm"><div className="flex justify-between"><div><span className="text-slate-500">{isPrestador ? 'IRT Grupo B/C (Independente)' : 'IRT'}</span>{!isPrestador && <span className="ml-1 text-[9px] text-slate-400">{irtEstimado.faixa}</span>}</div><span className="font-medium text-rose-500">-{formatMoney(irtEstimado.valor)}</span></div></div><div className="flex justify-between text-[10px] text-slate-400"><span>Matéria Colectável</span><span>{formatMoney(materiaColectavel)}</span></div>{retencaoFerias > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Ret. Férias</span><span className="ml-1 text-[9px] text-slate-400">15% autónomo</span></div><span className="font-medium text-rose-500">-{formatMoney(retencaoFerias)}</span></div>}{retencaoNatal > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Ret. Natal</span><span className="ml-1 text-[9px] text-slate-400">15% autónomo</span></div><span className="font-medium text-rose-500">-{formatMoney(retencaoNatal)}</span></div>}{formFaltas > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Faltas ({formFaltas} dias)</span><span className="font-medium text-rose-500">-{formatMoney(descontoFaltas)}</span></div>}<div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold"><span className="text-slate-800">Total Descontos</span><span className="text-rose-600">-{formatMoney(totalDescontos)}</span></div></div></div><div className="bg-white border-2 border-primary rounded-2xl p-5 shadow-sm overflow-hidden relative"><div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" /><div className="relative z-10 flex items-center justify-between"><div><p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Salário Líquido Estimado</p><p className="text-3xl font-black text-slate-900 tracking-tighter">{formatMoney(salarioLiquidoEstimado)}</p></div><span className="material-symbols-outlined text-4xl text-primary/20">payments</span></div></div></div>
            <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all">Confirmar e Gerar Recibo</button>
          </form>
        </div>
      </div>
    );
  };

  const renderHistóricoModal = () => {
    if (!showHistóricoModal) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[105] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between gap-4"><div><h3 className="text-base font-medium text-slate-700">Histórico de Processamentos</h3><p className="text-sm text-slate-400">{empresa?.nome || '-'}</p></div><button onClick={() => setShowHistóricoModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button></div>
          <div className="flex-1 overflow-y-auto p-5">
            {historicoLoading ? <div className="py-12 text-center text-sm text-slate-400">A carregar...</div> : historicoError ? <div className="py-12 text-center text-sm text-rose-500">{historicoError}</div> : historico.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">Sem processamentos registados</div> : <>
              <div className="mb-4 flex flex-wrap gap-2">{historyPeriods.map((period) => (<button key={period} type="button" onClick={() => setSelectedHistoryPeriod(period)} className={`px-3 py-2 text-xs font-semibold rounded-full transition-all ${selectedHistoryPeriod === period ? 'bg-primary text-white border border-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{`${numToMonth(Number(period.split('-')[1]))} ${period.split('-')[0]}`}</button>))}</div>
              {historicoPorPeriodo.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">Nenhum processamento registado para o periodo selecionado.</div> : <div className="rounded-xl border border-slate-100 overflow-x-auto"><table className="min-w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Colaborador</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Período</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right whitespace-nowrap">Bruto</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right whitespace-nowrap">Desc.</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right whitespace-nowrap">Líquido</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Data</th><th className="px-2 sm:px-4 py-3 text-xs font-medium text-slate-400 uppercase text-center whitespace-nowrap">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{historicoPorPeriodo.map((item) => (<tr key={item.id} className="hover:bg-slate-50 transition-all"><td className="px-2 sm:px-4 py-3"><p className="text-sm font-medium text-slate-700">{item.nomeColaborador}</p><p className="text-xs text-slate-400">{item.cargo || '-'}</p></td><td className="px-2 sm:px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-500 whitespace-nowrap">{numToMonth(item.mes)}/{item.ano}</span></td><td className="px-2 sm:px-4 py-3 text-right text-sm font-medium text-slate-600 whitespace-nowrap">{formatMoney(item.totalBruto)}</td><td className="px-2 sm:px-4 py-3 text-right text-sm font-medium text-slate-500 whitespace-nowrap"><div>{formatMoney(item.descontos)}</div><div className="text-[10px] text-slate-400 mt-1 space-y-0.5 hidden sm:block"><div>INSS: {formatMoney(item.valorINSS)}</div><div>IRT: {formatMoney(item.valorIRT)}</div><div>Faltas: {formatMoney(item.valorFaltas)}</div></div></td><td className="px-2 sm:px-4 py-3 text-right text-sm font-medium text-primary whitespace-nowrap">{formatMoney(item.salarioLiquido)}</td><td className="px-2 sm:px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{item.createdAt ? new Date(item.createdAt).toLocaleString('pt-AO') : '-'}</td><td className="px-2 sm:px-4 py-3 text-center"><button onClick={() => handleDownloadHistoricalReceipt(item)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center" title="Baixar Recibo"><span className="material-symbols-outlined">download</span></button></td></tr>))}</tbody></table></div>}
            </>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-full font-app">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3"><h2 className="text-xl font-medium text-slate-700">Processamento Salarial</h2></div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border-none rounded-lg py-2 px-3 text-sm font-medium outline-none">{MONTHS.map((month) => (<option key={month} value={month} disabled={isMonthOptionDisabled(month, selectedYear)}>{month}</option>))}</select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border-none rounded-lg py-2 px-3 text-sm font-medium outline-none">{['2025', '2026', '2027'].map((year) => (<option key={year} value={year} disabled={parseInt(year, 10) > CURRENT_YEAR}>{year}</option>))}</select>
          <span className="px-3 py-1.5 rounded-lg bg-primary/5 text-xs text-primary">{historicoDoPeriodo.length} processamento(s)</span>
        </div>
        <div className="flex flex-wrap gap-3"><button onClick={() => setShowHistóricoModal(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all">Histórico</button><button onClick={handleBulkProcess} disabled={isProcessingBulk || periodoLocked} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${periodoLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/80'}`}>{isProcessingBulk ? 'A Processar...' : 'Liquidação Mensal'}</button></div>
      </div>
      {periodoLocked && (<div className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-3"><span className="material-symbols-outlined text-slate-900 text-sm">lock</span><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{periodoLockedMessage}</span></div>)}
      {renderMainContent()}
      {renderFormModal()}
      {renderReceiptModal()}
      {renderHistóricoModal()}
    </div>
  );
};

export default Processamento;
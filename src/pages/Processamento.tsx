import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api, getLogoUrl } from '../services/api';
import { calcularINSS, calcularIRT, roundMoney } from '../utils/taxCalculations';
import { countries } from '../data/countries';
import { SimuladoresModalContent } from './FolhaAngola';



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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const monthToNum = (month: string | number): number => {
  if (typeof month === 'number') return month;
  const str = String(month).trim();
  const asNum = parseInt(str, 10);
  if (!Number.isNaN(asNum)) return asNum;
  const idx = MONTHS.indexOf(str);
  return idx >= 0 ? idx + 1 : 0;
};
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

// ── Data actual ─────────────────────────────────────────────────────────────
const TODAY = new Date();
const CURRENT_MONTH_NUM = TODAY.getMonth() + 1;
const CURRENT_YEAR = TODAY.getFullYear();

const Processamento: React.FC = () => {
  const navigate = useNavigate();
  const { empresa, colaboradores, empresaId, setMessage, user, effectivePlan } = useContext(AppContext);
  const isCorporativo = (effectivePlan?.type === 'CORPORATIVO' || user?.planType === 'CORPORATIVO');
  const ativos = colaboradores.filter((colaborador) => colaborador.status === 'Ativo' && (!empresaId || colaborador.empresaId === empresaId || (colaborador as any).empresa?.id === empresaId));

  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [selectedColabIds, setSelectedColabIds] = useState<Set<number>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[CURRENT_MONTH_NUM - 1]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistóricoModal, setShowHistóricoModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showFolhaAngolaModal, setShowFolhaAngolaModal] = useState(false);
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
  const [formFeriasPercent, setFormFeriasPercent] = useState(0);
  const [formNatalPercent, setFormNatalPercent] = useState(0);
  const [formHorasExtra, setFormHorasExtra] = useState(0);
  const [formBonus, setFormBonus] = useState(0);
  const [formFaltas, setFormFaltas] = useState(0);
  const [faltaJustificada, setFaltaJustificada] = useState(false);
  const [descontarBaseJ, setDescontarBaseJ] = useState(false);
  const [descontarAlimentacaoJ, setDescontarAlimentacaoJ] = useState(false);
  const [descontarTransporteJ, setDescontarTransporteJ] = useState(false);
  const [formOutrosGanhos, setFormOutrosGanhos] = useState<OutroGanhoInput[]>([]);
  const [incluirFerias, setIncluirFerias] = useState(false);
  const [incluirNatal, setIncluirNatal] = useState(false);
  const [localTipoProcessamento, setLocalTipoProcessamento] = useState<'Dias Variáveis' | 'Dias Fixos'>('Dias Variáveis');

  const selectedMonthNum = monthToNum(selectedMonth);
  const selectedYearNum  = parseInt(selectedYear, 10);
  const isPeriodoFuturo  = selectedYearNum > CURRENT_YEAR ||
    (selectedYearNum === CURRENT_YEAR && selectedMonthNum > CURRENT_MONTH_NUM);

  const isPeriodoAtivo = selectedYearNum === CURRENT_YEAR && selectedMonthNum === CURRENT_MONTH_NUM;
  const periodoLocked = isPeriodoFuturo;
  const periodoLockedMessage = 'Mês futuro bloqueado para processamento.';
  const [historicoLoadedOnce, setHistoricoLoadedOnce] = useState(false);
  const isMonthOptionDisabled = (month: string, year: string) => {
    const monthNum = monthToNum(month);
    const yearNum = parseInt(year, 10);
    return yearNum > CURRENT_YEAR || (yearNum === CURRENT_YEAR && monthNum > CURRENT_MONTH_NUM);
  };

  const totalOutrosGanhos = formOutrosGanhos.reduce((total, ganho) => total + (ganho.valor || 0), 0);
  const ferias = incluirFerias ? roundMoney((formFeriasPercent / 100) * formSalario) : 0;
  const natal = incluirNatal ? roundMoney((formNatalPercent / 100) * formSalario) : 0;

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
      } catch (error) { 
        console.error('Erro ao buscar feriados:', error);
        setHolidays([]); 
      }
    };
    fetchHolidays();
  }, [empresa?.pais, selectedYear]);

  const salarioProporcional = useMemo(() => {
    // Regra: Se for justificada, só desconta se o utilizador marcar a opção correspondente.
    // Se for injustificada, desconta sempre proporcionalmente.
    if (formFaltas > 0) {
      if (faltaJustificada) {
        return descontarBaseJ 
          ? Math.round(formSalario / baseDays * (baseDays - formFaltas))
          : formSalario;
      } else {
        return Math.round(formSalario / baseDays * formDiasTrabalhados);
      }
    }
    return formSalario;
  }, [formSalario, formDiasTrabalhados, baseDays, formFaltas, faltaJustificada, descontarBaseJ]);


  const descontoFaltas = useMemo(() => {
    let total = 0;
    const faltasDias = Number.isFinite(formFaltas) ? formFaltas : 0;
    if (faltasDias <= 0) return 0;

    if (!faltaJustificada) {
      // Injustificada: desconto padrão sobre o base
      total += faltasDias * (formSalario / baseDays);
    } else {
      // Justificada: soma apenas o que foi selecionado
      if (descontarBaseJ) total += faltasDias * (formSalario / baseDays);
      if (descontarAlimentacaoJ) total += faltasDias * (formGanhoAlimentacao / baseDays);
      if (descontarTransporteJ) total += faltasDias * (formGanhoTransporte / baseDays);
    }

    return Math.round(total);
  }, [formFaltas, formSalario, formGanhoAlimentacao, formGanhoTransporte, baseDays, faltaJustificada, descontarBaseJ, descontarAlimentacaoJ, descontarTransporteJ]);

  const alimentacao = useMemo(() => {
    if (formFaltas > 0) {
      if (faltaJustificada) {
        return descontarAlimentacaoJ
          ? Math.round(formGanhoAlimentacao / baseDays * (baseDays - formFaltas))
          : formGanhoAlimentacao;
      } else {
        return Math.round(formGanhoAlimentacao / baseDays * formDiasTrabalhados);
      }
    }
    return formGanhoAlimentacao;
  }, [formGanhoAlimentacao, baseDays, formDiasTrabalhados, formFaltas, faltaJustificada, descontarAlimentacaoJ]);

  const transporte = useMemo(() => {
    if (formFaltas > 0) {
      if (faltaJustificada) {
        return descontarTransporteJ
          ? Math.round(formGanhoTransporte / baseDays * (baseDays - formFaltas))
          : formGanhoTransporte;
      } else {
        return Math.round(formGanhoTransporte / baseDays * formDiasTrabalhados);
      }
    }
    return formGanhoTransporte;
  }, [formGanhoTransporte, baseDays, formDiasTrabalhados, formFaltas, faltaJustificada, descontarTransporteJ]);

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
    const isParticular = empresa?.categoria === 'Particular';
    if (isPrestador) return { valor: roundMoney(totalBruto * 0.065), faixa: 'Prestador (Taxa Fixa 6,5%)' };
    return calcularIRT(materiaColectavel, false, isParticular);
  }, [materiaColectavel, selectedColab, totalBruto, empresa?.categoria]);

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
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setHistóricoLoading(false);
      setHistoricoLoadedOnce(true);
    }
  }, [empresaId]);

  useEffect(() => {
    loadHistórico();
  }, [loadHistórico]);

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

    // ── Ligação Férias → Subsídio de Férias ──────────────────────────────────
    // Se o colaborador tiver férias Aprovadas ou Gozadas no mês/ano selecionado,
    // ativa automaticamente o subsídio de férias com a % configurada na sua ficha.
    const mesNum = monthToNum(selectedMonth);
    const anoNum = parseInt(selectedYear, 10);
    const feriasList: any[] = JSON.parse(localStorage.getItem(`salya_ferias_${empresaId}`) || '[]');
    const temFerias = feriasList.some((f: any) => {
      if (f.colaboradorId !== colab.id) return false;
      if (f.status !== 'Aprovado' && f.status !== 'Gozado') return false;
      const inicioDate = new Date(f.inicio);
      const fimDate = new Date(f.fim);
      // Verifica se o período de férias intersecta o mês selecionado
      const inicioMes = new Date(anoNum, mesNum - 1, 1);
      const fimMes = new Date(anoNum, mesNum, 0);
      return inicioDate <= fimMes && fimDate >= inicioMes;
    });

    const pctFerias = colab.subsidioFerias || 0;
    if (temFerias && pctFerias > 0) {
      setFormFeriasPercent(pctFerias);
      setIncluirFerias(true);
    } else {
      setFormFeriasPercent(0);
      setIncluirFerias(false);
    }
    // ─────────────────────────────────────────────────────────────────────────

    setFormNatalPercent(0);
    setIncluirNatal(false);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormFaltas(0);
    setFormOutrosGanhos([]);
    const regimeEmpresa = (empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS') ? 'Dias Fixos' : 'Dias Variáveis';
    setLocalTipoProcessamento(regimeEmpresa);
    setShowFormModal(true);
  }, [periodoLocked, colaboradoresProcessadosNoPeriodo, empresa, empresaId, selectedMonth, selectedYear, setMessage]);

  const resetProcessingForm = () => {
    setFormSalario(0);
    setFormGanhoAlimentacao(0);
    setFormGanhoTransporte(0);
    setFormFeriasPercent(0);
    setFormNatalPercent(0);
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
    const baseList = selectedColabIds.size > 0
      ? ativos.filter((c) => selectedColabIds.has(c.id))
      : ativos;
    const ativosParaProcessar = baseList.filter((colab) => !colaboradoresProcessadosNoPeriodo.has(colab.id));
    if (ativosParaProcessar.length === 0) {
      Swal.fire('Aviso', selectedColabIds.size > 0
        ? 'Nenhum colaborador seleccionado disponível para processar neste mês.'
        : 'Todos os colaboradores já foram processados para este mês.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: 'Processamento em Lote',
      text: `Deseja processar o salario de ${ativosParaProcessar.length} colaborador(es) para ${selectedMonth}/${selectedYear}?`,
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
    } catch (error: any) {
      console.error('Erro no processamento em lote:', error);
      Swal.fire({
        title: 'Erro no Processamento',
        text: 'Ocorreu uma falha ao processar os salários em lote. Por favor, tente novamente.',
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
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
        subsidioFeriasValor: incluirFerias ? ferias : 0,
        subsidioNatalValor: incluirNatal ? natal : 0,
        outrosSubsidiosTotal: 0,
        horasExtraTotal: formHorasExtra,
        bonusTotal: formBonus,
        faltasTotal: descontoFaltas,
        faltasNaoJustificadas: !faltaJustificada ? formFaltas : 0,
        faltasJustificadasPorComponente: faltaJustificada ? {
          "BASE": descontarBaseJ ? formFaltas : 0,
          "ALIMENTACAO": descontarAlimentacaoJ ? formFaltas : 0,
          "TRANSPORTE": descontarTransporteJ ? formFaltas : 0
        } : {},
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
        ganhoFerias: incluirFerias ? ferias : 0,
        ganhoNatal: incluirNatal ? natal : 0,
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
        // Aumentado para 500ms para garantir que o React renderizou o snapshot no DOM antes de capturar o HTML
        setTimeout(() => {
          const el = document.getElementById('recibo-para-impressao');
          if (el) {
            console.log('Capturando HTML para histórico...', historicoId);
            api.post(`/processamentos/${historicoId}/recibo`, { html: el.innerHTML }).catch((e) => console.error('Erro ao salvar HTML do recibo:', e));
          }
        }, 500);
      }
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || '';
      const bodyMsg = error?.body?.message?.toLowerCase() || '';
      const isAtraso = errorMsg.includes('atraso') || bodyMsg.includes('atraso') || errorMsg.includes('pague os meses anteriores') || bodyMsg.includes('pague os meses anteriores');
      
      const text = error?.status === 409 
        ? 'Este colaborador já foi processado para este mês.' 
        : isAtraso 
        ? 'Existem meses em atraso para este colaborador. Regule os pagamentos pendentes ou anule-os no menu de "Atrasos" antes de processar o mês atual.'
        : 'Não foi possível concluir o processamento. Verifique os dados e tente novamente.';
      setMessage({ title: 'Erro de Processamento', text, type: 'error' });
    }
  };

  const handleGuardarPDF = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element || !receiptSnapshot) return;
    
    // Configurações para o html2pdf
    const options = {
      margin: 0,
      filename: 'Recibo_' + receiptSnapshot.colaborador.nome.replace(/ /g, '_') + '_' + receiptSnapshot.ano + String(monthToNum(receiptSnapshot.mes)).padStart(2, '0') + '.pdf',
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: { 
        scale: 4, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
      pagebreak: { mode: ['avoid-all'] }
    };

    html2pdf().from(element).set(options).save();
  };

    const handleUpdateOtherGain = (id: string, field: 'descricao' | 'valor', value: string) => {
    setFormOutrosGanhos((previous) => previous.map((ganho) => ganho.id === id ? { ...ganho, [field]: field === 'valor' ? parseMoneyInput(value) : value } : ganho));
  };

  const handleAddOtherGain = () => setFormOutrosGanhos((previous) => [...previous, createOtherGain()]);
  const handleRemoveOtherGain = (id: string) => setFormOutrosGanhos((previous) => previous.filter((ganho) => ganho.id !== id));

  const handleDownloadHistoricalReceipt = async (item: HistóricoProcessamento) => {
    try {
      const htmlOrData = await api.get(`/processamentos/${item.id}/recibo`, true);
      const html = typeof htmlOrData === 'string' ? htmlOrData : (htmlOrData?.html ?? '');
      if (html && html.includes('<html')) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) URL.revokeObjectURL(url);
        return;
      }
    } catch (error) {
      console.error('Erro ao carregar recibo histórico:', error);
    }
    setReceiptSnapshot({
      colaborador: { id: item.colaboradorId || 0, nome: item.nomeColaborador, nif: item.nifColaborador || '', cargo: item.cargo || '', salarioBase: item.salarioBaseProporcional || 0, status: 'Ativo', email: '', banco: item.banco, iban: item.iban, inss: ativos.find(c => c.id === item.colaboradorId)?.inss || '', numeroColaborador: (item as any).numeroColaborador || ativos.find(c => c.id === item.colaboradorId)?.numeroColaborador || '' } as any,
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
    const totalBrutoExibido = receiptSnapshot.totalBruto;
    const workerDescontosSum = (receiptSnapshot.valorINSS || 0) + (receiptSnapshot.valorIRT || 0) + (receiptSnapshot.faltas || 0);
    const totalDescontosExibido = (typeof receiptSnapshot.totalDescontos === 'number' && receiptSnapshot.totalDescontos > 0)
      ? receiptSnapshot.totalDescontos
      : workerDescontosSum;
    const salarioLiquidoExibido = receiptSnapshot.salarioLiquido || (totalBrutoExibido - totalDescontosExibido);

    const getMonthName = () => {
      const m = receiptSnapshot.mes;
      if (!m) return '---';
      const n = parseInt(String(m), 10);
      if (!isNaN(n) && n >= 1 && n <= 12) {
        return MONTHS[n - 1];
      }
      return String(m);
    };

    const monthName = getMonthName();
    const periodText = `${monthName} / ${receiptSnapshot.ano}`;

    // Quota patronal INSS: 8% do salário base
    const inssPatronal = receiptSnapshot.colaborador.tipoContrato !== 'Prestador'
      ? Math.round(receiptSnapshot.salarioBase * 0.08)
      : 0;

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
      ...(inssPatronal > 0 ? [{ label: 'Seg. Social Patronal (INSS 8% s/ sal. base)', valorRemun: 0, valorDesc: inssPatronal, qtd: '8%' }] : []),
      { label: receiptSnapshot.colaborador.tipoContrato === 'Prestador' ? 'IRT Grupo B/C (Independente)' : 'Imposto sobre Rendimento (IRT)', valorRemun: 0, valorDesc: receiptSnapshot.valorIRT, qtd: receiptSnapshot.percentualIRT ? (receiptSnapshot.percentualIRT % 1 === 0 ? `${receiptSnapshot.percentualIRT}%` : `${receiptSnapshot.percentualIRT.toFixed(1)}%`) : '-' },
      ...(receiptSnapshot.faltas > 0 ? [{ label: 'Faltas', valorRemun: 0, valorDesc: receiptSnapshot.faltas, qtd: receiptSnapshot.faltasDias ? `${receiptSnapshot.faltasDias} dias` : '-' }] : []),
    ];

    const renderA5 = (incluirPatronal = true) => {
      const linesToDisplay = incluirPatronal
        ? receiptLines
        : receiptLines.filter((l) => !l.label.includes('Patronal'));

      return (
        <div style={{
          width: '148mm',
          minHeight: '210mm',
          height: '210mm',
          padding: '5mm 7mm 4mm 7mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          overflow: 'hidden'
        }}>
        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #1a1a1a', paddingBottom: '2.5mm', marginBottom: '2.5mm', gap: '3mm' }}>
          {/* Lado esquerdo: Logo + Info empresa */}
          <div style={{ display: 'flex', gap: '2.5mm', alignItems: 'flex-start', flex: '1 1 auto', minWidth: 0 }}>
            {empresa?.logoUrl && (
              <img
                src={getLogoUrl(empresa.logoUrl)}
                alt="Logotipo"
                style={{
                  height: '11mm',
                  maxWidth: '28mm',
                  objectFit: 'contain',
                  borderRadius: '3px',
                  flexShrink: 0
                }}
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/logo.png'; }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6mm', minWidth: 0 }}>
              <span style={{ fontSize: '9.5pt', fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: '1.1' }}>
                {empresa?.nome}
              </span>
              <span style={{ fontSize: '7pt', color: '#4b5563', fontWeight: '400', lineHeight: '1.3' }}>
                {empresa?.categoria === 'Particular' ? 'Nº BI/Passaporte' : 'NIF'}: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{empresa?.nif}</strong>
              </span>
              {empresa?.endereco && (
                <span style={{ fontSize: '6.5pt', color: '#6b7280', lineHeight: '1.3', wordBreak: 'break-word' }}>
                  {empresa.endereco}{empresa.municipio ? `, ${empresa.municipio}` : ''}
                </span>
              )}
              {(empresa?.email || empresa?.telefone) && (
                <span style={{ fontSize: '6pt', color: '#9ca3af', lineHeight: '1.3' }}>
                  {[empresa.email, empresa.telefone].filter(Boolean).join('  |  ')}
                </span>
              )}
            </div>
          </div>

          {/* Lado direito: Título + Período + Emissão em coluna */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1mm', flexShrink: 0 }}>
            <span style={{ fontSize: '10.5pt', fontWeight: '800', color: '#111827', letterSpacing: '0.03em', lineHeight: '1.1', textTransform: 'uppercase' }}>
              Recibo de Vencimento
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5mm', marginTop: '0.5mm' }}>
              <span style={{ fontSize: '7.5pt', color: '#374151' }}>
                Período: <strong style={{ color: '#111827', fontWeight: '600' }}>{periodText}</strong>
              </span>
              <span style={{ fontSize: '7.5pt', color: '#374151' }}>
                Emissão: <strong style={{ color: '#111827', fontWeight: '600' }}>{receiptSnapshot.dataProcessamento}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── Dados do Colaborador ───────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          marginBottom: '3mm',
          overflow: 'hidden'
        }}>
          {/* Coluna esquerda */}
          <div style={{ padding: '2mm 3mm', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1mm' }}>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Nome: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{receiptSnapshot.colaborador.nome}</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Nº Colaborador: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {(receiptSnapshot.colaborador as any).numeroColaborador || (receiptSnapshot.colaborador?.id ? String(receiptSnapshot.colaborador.id).padStart(3, '0') : '---')}
              </span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Cargo/Função: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{receiptSnapshot.colaborador.cargo}</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Contribuinte: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{receiptSnapshot.colaborador.nif}</span>
            </div>
          </div>
          {/* Coluna direita */}
          <div style={{ padding: '2mm 3mm', display: 'flex', flexDirection: 'column', gap: '1mm' }}>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Vencimento Base: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{formatMoney(receiptSnapshot.salarioBase)}</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Vencimento/Hora: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{formatMoney(valorHora)}</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Dias do Período: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{receiptSnapshot.diasTrabalhados}</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: '#374151', lineHeight: '1.3' }}>
              <span style={{ fontWeight: '400', color: '#6b7280' }}>Registo INSS: </span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{(receiptSnapshot.colaborador as any).inss || '---'}</span>
            </div>
          </div>
        </div>

        {/* ── Tabela de Rubricas ─────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
              <th style={{ padding: '1.5mm 2mm', fontWeight: '600', fontSize: '7.5pt', textAlign: 'left', letterSpacing: '0.03em' }}>Descrição</th>
              <th style={{ padding: '1.5mm 1.5mm', width: '14mm', textAlign: 'center', fontWeight: '600', fontSize: '7.5pt', letterSpacing: '0.03em' }}>Qtd.</th>
              <th style={{ padding: '1.5mm 2mm', width: '26mm', textAlign: 'right', fontWeight: '600', fontSize: '7.5pt', letterSpacing: '0.03em' }}>Vencimento</th>
              <th style={{ padding: '1.5mm 2mm', width: '26mm', textAlign: 'right', fontWeight: '600', fontSize: '7.5pt', letterSpacing: '0.03em' }}>Desconto</th>
            </tr>
          </thead>
          <tbody>
            {linesToDisplay.map((line, idx) => (
              <tr key={idx} style={{ borderBottom: '0.5px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ padding: '2.8mm 2.5mm', fontWeight: '400', color: '#1f2937', fontSize: '8pt' }}>{line.label}</td>
                <td style={{ padding: '2.8mm 1.5mm', textAlign: 'center', color: '#374151', fontWeight: '500', fontSize: '8pt' }}>{line.qtd}</td>
                <td style={{ padding: '2.8mm 2.5mm', textAlign: 'right', color: '#1f2937', fontWeight: '500', fontSize: '8pt' }}>{line.valorRemun > 0 ? formatMoney(line.valorRemun) : ''}</td>
                <td style={{ padding: '2.8mm 2.5mm', textAlign: 'right', fontWeight: '600', color: line.valorDesc > 0 ? '#b91c1c' : '#1f2937', fontSize: '8pt' }}>{line.valorDesc > 0 ? formatMoney(line.valorDesc) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Espaçador flexível para empurrar os totais para o fundo sem esticar as linhas da tabela */}
        <div style={{ flexGrow: 1, minHeight: '4mm' }} />

        {/* ── Rodapé de Totais ───────────────────────────────────────────── */}
        <div style={{ marginTop: '3mm', borderTop: '1px solid #d1d5db', paddingTop: '2mm' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8mm', marginBottom: '2mm' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5mm' }}>Total Rendimentos</div>
              <div style={{ fontSize: '10pt', fontWeight: '700', color: '#111827' }}>{formatMoney(totalBrutoExibido)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5mm' }}>Total Descontos</div>
              <div style={{ fontSize: '10pt', fontWeight: '700', color: '#b91c1c' }}>{formatMoney(totalDescontosExibido)}</div>
            </div>
          </div>

          <div style={{
            background: '#111827',
            color: '#ffffff',
            padding: '2mm 3mm',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '8pt', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Valor Líquido</span>
            <span style={{ fontSize: '12pt', fontWeight: '700', letterSpacing: '0.01em' }}>{formatMoney(salarioLiquidoExibido)}</span>
          </div>
        </div>

        {/* ── Rodapé discreto ───────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '2mm', fontSize: '6pt', color: '#d1d5db', letterSpacing: '0.05em' }}>
          Processado por Salya
        </div>
      </div>
    );
  };

    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-2 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-[320mm] w-full max-h-[98vh] overflow-hidden shadow-2xl relative flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-200" style={{ padding: '8px' }}>
            <div
              id="recibo-para-impressao"
              style={{
                width: '297mm',
                height: '210mm',
                boxSizing: 'border-box',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
                fontSize: '10px',
                color: '#000000',
                pageBreakInside: 'avoid'
              }}
            >
              {renderA5(true)}
              <div style={{ width: '1px', borderLeft: '1.2px dashed #94a3b8', height: '196mm', alignSelf: 'center', flexShrink: 0, margin: '0 1px' }} />
              {renderA5(false)}
            </div>
          </div>
          <div className="p-4 border-t flex gap-3 no-print bg-white">
            <button onClick={handleGuardarPDF} className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold px-8 shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">download</span> Exportar Recibo (PDF)
            </button>
            <button onClick={() => setShowReceiptModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Fechar</button>
          </div>
        </div>
      </div>
    );
  };

  const handleOpenFolhaAngola = () => {
    if (!isCorporativo) {
      Swal.fire({
        title: 'Plano Corporativo Necessário',
        html: '<p class="text-sm text-slate-600 dark:text-slate-300">Os <strong>Simuladores de 13.º Mês e Rescisão de Contrato</strong> são uma funcionalidade exclusiva do <strong>Plano Corporativo</strong>.</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ver Planos & Upgrade',
        cancelButtonText: 'Fechar',
        confirmButtonColor: '#9333ea',
        cancelButtonColor: '#64748b'
      }).then((res) => {
        if (res.isConfirmed) {
          navigate('/configuracoes');
        }
      });
      return;
    }
    setShowFolhaAngolaModal(true);
  };

  const renderFolhaAngolaModal = () => {
    if (!showFolhaAngolaModal) return null;
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 relative shadow-2xl my-8 text-white">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">calculate</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Simuladores Folha Angola</h3>
                <p className="text-xs text-slate-400">13.º Mês e Rescisão de Contrato (LGT 12/23 & IRT AGT)</p>
              </div>
            </div>
            <button
              onClick={() => setShowFolhaAngolaModal(false)}
              className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <SimuladoresModalContent />
        </div>
      </div>
    );
  };

  const renderMainContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Simulador Salarial Geral (Livre para todos) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">science</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Simulador Salarial</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Livre
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSimulationModal(true)}
            className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">calculate</span>
            Abrir Simulador Salarial
          </button>
        </div>

        {/* Simuladores de 13.º Mês & Rescisão (Exclusivo Corporativo) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">13.º Mês & Rescisão</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Plano Corporativo
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenFolhaAngola}
            className="w-full px-5 py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-base">
              {isCorporativo ? 'calculate' : 'lock'}
            </span>
            Abrir 13.º & Rescisão
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">Total Bruto</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatMoney(totaisPeriodo.bruto)}</p>
          <div className="flex items-center gap-1 mt-1 text-emerald-500"><span className="material-symbols-outlined text-sm">trending_up</span><span className="text-[10px] font-medium">{historicoDoPeriodo.length} recibos</span></div>
        </div>
        <div className="glass-card p-6 border border-slate-100">
          <p className="text-xs text-rose-500 font-semibold">Total Descontos</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatMoney(totaisPeriodo.descontos)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Inclui INSS e IRT</p>
        </div>
        <div className="glass-card p-6 border border-primary/10 bg-primary/5">
          <p className="text-xs text-primary font-semibold">Total Líquido</p>
          <p className="text-2xl font-bold text-primary mt-2">{formatMoney(totaisPeriodo.liquido)}</p>
          <p className="text-[10px] text-primary/60 mt-1">Valor a transferir</p>
        </div>
        <div className={`glass-card p-6 border transition-all ${isPeriodoAtivo ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg shadow-primary/10' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-semibold ${isPeriodoAtivo ? 'text-primary' : 'text-slate-500'}`}>Período</p>
            {isPeriodoAtivo && (
              <span className="text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">Mês actual</span>
            )}
          </div>
          <p className={`text-xl font-bold mt-2 ${isPeriodoAtivo ? 'text-primary' : 'text-slate-700'}`}>{selectedMonth} {selectedYear}</p>
          <p className="text-[10px] text-slate-400 mt-1">{ativos.length} colaboradores ativos</p>
        </div>
      </div>
      <div className="glass-card overflow-visible">
        <table className="min-w-full table-fixed text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 sm:px-4 py-4 text-xs font-medium text-slate-400 whitespace-nowrap w-10">
                <input
                  type="checkbox"
                  checked={ativos.length > 0 && ativos.every((c) => selectedColabIds.has(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColabIds(new Set(ativos.map((c) => c.id)));
                    } else {
                      setSelectedColabIds(new Set());
                    }
                  }}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                  title="Seleccionar todos"
                />
              </th>
              <th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap w-[28%]">Colaborador</th>
              <th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap w-[22%]">Cargo</th>
              <th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap text-right w-[25%]">Salário Base</th>
              <th className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap text-center w-[20%]">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ativos.map((colaborador) => (
              <tr key={colaborador.id} className={`hover:bg-slate-50 transition-all align-middle ${(colaborador.salarioBase || 0) === 0 ? 'bg-slate-50/60' : ''}`}>
                <td className="px-3 sm:px-4 py-4 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedColabIds.has(colaborador.id)}
                    onChange={(e) => {
                      setSelectedColabIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(colaborador.id);
                        else next.delete(colaborador.id);
                        return next;
                      });
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-4 sm:px-6 py-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {colaborador.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{colaborador.nome}</p>
                      {(colaborador.salarioBase || 0) === 0 && (
                         <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase mt-0.5">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          Salário zero
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 align-middle">
                  <span className="text-xs text-slate-500">{colaborador.cargo || '—'}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">{formatMoney(colaborador.salarioBase || 0)}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-center align-middle">
                  <div className="flex justify-center">
                  {!historicoLoadedOnce ? (
                    <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg"></div>
                  ) : (
                    <button
                      onClick={() => handleStartProcessar(colaborador)}
                      disabled={periodoLocked || colaboradoresProcessadosNoPeriodo.has(colaborador.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        periodoLocked || colaboradoresProcessadosNoPeriodo.has(colaborador.id)
                          ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed border border-emerald-200'
                          : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                      }`}
                    >
                      {colaboradoresProcessadosNoPeriodo.has(colaborador.id) ? '✓ Processado' : 'Processar'}
                    </button>
                  )}
                  </div>
                </td>
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
            {formSalario === 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-rose-500 text-xl shrink-0">warning</span>
                <div>
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-300">Alerta: Salário Base é zero</p>
                  <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">Verifique o valor antes de confirmar o processamento para evitar recibos incorrectos.</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 flex items-center justify-between gap-4"><div><p className="text-xs text-slate-500">Total Outros Ganhos</p><p className="text-base font-medium text-slate-700">{formatMoney(totalOutrosGanhos)}</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Salário Base</label>
                <input type="text" value={formatMoneyInput(formSalario)} onChange={(e) => setFormSalario(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-primary text-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-500">Regime de Cálculo</label>
                  <div className="flex p-0.5 bg-slate-100 rounded-lg">
                    <button type="button" onClick={() => setLocalTipoProcessamento('Dias Fixos')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isFixed ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>FIXO (22)</button>
                    <button type="button" onClick={() => setLocalTipoProcessamento('Dias Variáveis')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isFixed ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VARIÁVEL</button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="block text-xs font-medium text-slate-500">Dias Trabalhados</label>
                  <div className="relative group">
                    <input type="number" value={formDiasTrabalhados} onChange={(e) => setFormDiasTrabalhados(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-black text-primary text-lg outline-none focus:ring-2 focus:ring-primary transition-all" />
                    <div className="absolute inset-y-0 right-4 flex items-center"><span className="material-symbols-outlined text-slate-400 text-base">edit</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
              <h4 className="text-sm font-medium text-slate-600">Ganhos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><div className="flex items-center justify-between"><label className="block text-xs text-slate-500">Alimentação</label>{formGanhoAlimentacao > 30000 && <button type="button" onClick={() => setFormGanhoAlimentacao(30000)} className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full hover:bg-rose-100 transition-all flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">warning</span>Excede limite</button>}</div><input type="text" value={formatMoneyInput(formGanhoAlimentacao)} onChange={(e) => setFormGanhoAlimentacao(parseMoneyInput(e.target.value))} className={`w-full rounded-lg p-3 font-medium border ${formGanhoAlimentacao > 30000 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100'}`} /></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><label className="block text-xs text-slate-500">Transporte</label>{formGanhoTransporte > 30000 && <button type="button" onClick={() => setFormGanhoTransporte(30000)} className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full hover:bg-rose-100 transition-all flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">warning</span>Excede limite</button>}</div><input type="text" value={formatMoneyInput(formGanhoTransporte)} onChange={(e) => setFormGanhoTransporte(parseMoneyInput(e.target.value))} className={`w-full rounded-lg p-3 font-medium border ${formGanhoTransporte > 30000 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100'}`} /></div>
                <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label className="block text-xs text-slate-500">Férias (%)</label><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><input type="checkbox" checked={incluirFerias} onChange={(e) => setIncluirFerias(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />Opcional</label></div><div className="relative"><input type="number" step="0.01" value={formFeriasPercent} onChange={(e) => setFormFeriasPercent(Number(e.target.value) || 0)} disabled={!incluirFerias} className={`w-full rounded-lg p-3 pr-10 font-medium border ${incluirFerias ? 'bg-white border-slate-100' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span></div><p className="text-[10px] text-slate-400 mt-1">{incluirFerias ? `Equivale a ${formatMoney(ferias)}` : ''}</p></div>
                <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label className="block text-xs text-slate-500">Natal (%)</label><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><input type="checkbox" checked={incluirNatal} onChange={(e) => setIncluirNatal(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />Opcional</label></div><div className="relative"><input type="number" step="0.01" value={formNatalPercent} onChange={(e) => setFormNatalPercent(Number(e.target.value) || 0)} disabled={!incluirNatal} className={`w-full rounded-lg p-3 pr-10 font-medium border ${incluirNatal ? 'bg-white border-slate-100' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span></div><p className="text-[10px] text-slate-400 mt-1">{incluirNatal ? `Equivale a ${formatMoney(natal)}` : ''}</p></div>
                <div className="space-y-2"><label className="block text-xs text-slate-500">Horas Extra</label><input type="text" value={formatMoneyInput(formHorasExtra)} onChange={(e) => setFormHorasExtra(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" /></div>
                <div className="space-y-2"><label className="block text-xs text-slate-500">Bónus</label><input type="text" value={formatMoneyInput(formBonus)} onChange={(e) => setFormBonus(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" /></div>
              </div>
            </div>
            <div className="p-5 bg-rose-50/30 rounded-2xl space-y-4 border border-rose-100 italic">
              <h4 className="text-sm font-medium text-rose-600 flex items-center justify-between">
                Descontos / Faltas
                {formFaltas > 0 && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all not-italic">
                    <input type="checkbox" checked={faltaJustificada} onChange={(e) => setFaltaJustificada(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    Falta Justificada?
                  </label>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500 font-bold">Número de Faltas (Dias)</label>
                  <input type="number" min="0" max={baseDays} value={formFaltas} onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setFormFaltas(val);
                    if (!faltaJustificada) {
                      setFormDiasTrabalhados(baseDays - val);
                    }
                  }} className="w-full rounded-lg p-3 font-medium border border-rose-100 bg-white outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                </div>
                {formFaltas > 0 && faltaJustificada && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 not-italic">
                    <p className="text-xs font-bold text-slate-400">O que descontar?</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={descontarBaseJ} onChange={(e) => setDescontarBaseJ(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                        Salário Base
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={descontarAlimentacaoJ} onChange={(e) => setDescontarAlimentacaoJ(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                        Alimentação
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={descontarTransporteJ} onChange={(e) => setDescontarTransporteJ(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                        Transporte
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl space-y-4"><div className="flex items-center justify-between gap-4"><h4 className="text-sm font-medium text-slate-600">Outros Ganhos</h4><button type="button" onClick={handleAddOtherGain} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span>Adicionar</button></div>{formOutrosGanhos.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center"><p className="text-xs text-slate-400">Sem outros ganhos</p></div> : <div className="space-y-3">{formOutrosGanhos.map((ganho) => (<div key={ganho.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_40px] gap-3 items-end bg-white border border-slate-100 rounded-xl p-3"><div className="space-y-1"><label className="block text-xs text-slate-500">Descrição</label><input type="text" value={ganho.descricao} onChange={(e) => handleUpdateOtherGain(ganho.id, 'descricao', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" /></div><div className="space-y-1"><label className="block text-xs text-slate-500">Valor</label><input type="text" value={formatMoneyInput(ganho.valor)} onChange={(e) => handleUpdateOtherGain(ganho.id, 'valor', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" /></div><button type="button" onClick={() => handleRemoveOtherGain(ganho.id)} className="size-9 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button></div>))}</div>}</div>
            <div className="rounded-[24px] border-2 border-primary/10 bg-slate-50/50 p-6 space-y-5"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">analytics</span>Resumo</h4><span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase">{formDiasTrabalhados}/{diasUteisReal} Dias ({empresa?.tipoProcessamento || 'Dias Variáveis'})</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Rendimentos</p><div className="flex justify-between text-sm"><span className="text-slate-500">Salário ({formDiasTrabalhados} dias)</span><span className="font-medium text-slate-700">{formatMoney(salarioProporcional)}</span></div>{alimentacao > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Alimentação</span>{!isPrestador && alimentacaoTributavel === 0 ? <span className="ml-1 text-[9px] text-emerald-500">isento</span> : !isPrestador && alimentacaoTributavel > 0 ? <span className="ml-1 text-[9px] text-slate-400">+{formatMoney(alimentacaoTributavel)} trib.</span> : isPrestador ? <span className="ml-1 text-[9px] text-primary font-bold">{formatMoney(alimentacao)}</span> : null}</div><span className="font-medium text-slate-700">{formatMoney(alimentacao)}</span></div>}{transporte > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Transporte</span>{!isPrestador && transporteTributavel === 0 ? <span className="ml-1 text-[9px] text-emerald-500">isento</span> : !isPrestador && transporteTributavel > 0 ? <span className="ml-1 text-[9px] text-slate-400">+{formatMoney(transporteTributavel)} trib.</span> : isPrestador ? <span className="ml-1 text-[9px] text-primary font-bold">{formatMoney(transporte)}</span> : null}</div><span className="font-medium text-slate-700">{formatMoney(transporte)}</span></div>}{ferias > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Férias ({formFeriasPercent}%)</span><span className="ml-1 text-[9px] text-slate-400">ret. 15%</span></div><span className="font-medium text-slate-700">{formatMoney(ferias)}</span></div>}{natal > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Natal ({formNatalPercent}%)</span><span className="ml-1 text-[9px] text-slate-400">ret. 15%</span></div><span className="font-medium text-slate-700">{formatMoney(natal)}</span></div>}{(formHorasExtra + formBonus + totalOutrosGanhos) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Outros Abonos</span><span className="font-medium text-slate-700">{formatMoney(formHorasExtra + formBonus + totalOutrosGanhos)}</span></div>}<div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold"><span className="text-slate-800">Total Bruto</span><span className="text-slate-900">{formatMoney(totalBruto)}</span></div></div><div className="space-y-2"><p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Descontos</p><div className="flex justify-between text-sm"><div><span className="text-slate-500">INSS 3% s/ sal. base</span></div><span className="font-medium text-rose-500">-{formatMoney(inssEstimado)}</span></div><div className="flex flex-col gap-1 text-sm"><div className="flex justify-between"><div><span className="text-slate-500">{isPrestador ? 'IRT Grupo B/C (Independente)' : 'IRT'}</span>{!isPrestador && <span className="ml-1 text-[9px] text-slate-400">{irtEstimado.faixa}</span>}</div><span className="font-medium text-rose-500">-{formatMoney(irtEstimado.valor)}</span></div></div><div className="flex justify-between text-[10px] text-slate-400"><span>Matéria Colectável</span><span>{formatMoney(materiaColectavel)}</span></div>{retencaoFerias > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Ret. Férias</span><span className="ml-1 text-[9px] text-slate-400">15% autónomo</span></div><span className="font-medium text-rose-500">-{formatMoney(retencaoFerias)}</span></div>}{retencaoNatal > 0 && <div className="flex justify-between text-sm"><div><span className="text-slate-500">Ret. Natal</span><span className="ml-1 text-[9px] text-slate-400">15% autónomo</span></div><span className="font-medium text-rose-500">-{formatMoney(retencaoNatal)}</span></div>}{formFaltas > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Faltas ({formFaltas} dias)</span><span className="font-medium text-rose-500">-{formatMoney(descontoFaltas)}</span></div>}<div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold"><span className="text-slate-800">Total Descontos</span><span className="text-rose-600">-{formatMoney(totalDescontos)}</span></div></div></div><div className="bg-white border-2 border-primary rounded-2xl p-5 shadow-sm overflow-hidden relative"><div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" /><div className="relative z-10 flex items-center justify-between"><div><p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Salário Líquido Estimado</p><p className="text-3xl font-black text-slate-900 tracking-tighter">{formatMoney(salarioLiquidoEstimado)}</p></div><span className="material-symbols-outlined text-4xl text-primary/20">payments</span></div></div></div>
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

  const renderSimulationModal = () => {
    return (
      <SimulationModal 
        show={showSimulationModal} 
        onClose={() => setShowSimulationModal(false)}
        isFixedCompany={(empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS')}
        baseDays={baseDays}
        formatMoney={formatMoney}
        formatMoneyInput={formatMoneyInput}
        parseMoneyInput={parseMoneyInput}
        calcularINSS={calcularINSS}
        calcularIRT={calcularIRT}
        roundMoney={roundMoney}
        empresaProp={empresa}
      />
    );
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-full font-app">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Processamento Salarial</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-medium outline-none text-slate-700 dark:text-slate-300">{MONTHS.map((month) => (<option key={month} value={month} disabled={isMonthOptionDisabled(month, selectedYear)}>{month}</option>))}</select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-medium outline-none text-slate-700 dark:text-slate-300">{['2025', '2026', '2027'].map((year) => (<option key={year} value={year} disabled={parseInt(year, 10) > CURRENT_YEAR}>{year}</option>))}</select>
          <span className="px-3 py-1.5 rounded-lg bg-primary/5 text-xs text-primary font-semibold">{historicoDoPeriodo.length} processamento(s)</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowHistóricoModal(true)} className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Histórico</button>
          <button onClick={handleBulkProcess} disabled={isProcessingBulk || periodoLocked} className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${periodoLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/80'}`}>
            {isProcessingBulk ? 'A Processar...' : selectedColabIds.size > 0 ? `Processar Selecionados (${selectedColabIds.size})` : 'Liquidação Mensal'}
          </button>
        </div>
      </div>
      {periodoLocked && (<div className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-3"><span className="material-symbols-outlined text-slate-900 text-sm">lock</span><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{periodoLockedMessage}</span></div>)}
      {renderMainContent()}
      {renderFormModal()}
      {renderReceiptModal()}
      {renderHistóricoModal()}
      {renderSimulationModal()}
      {renderFolhaAngolaModal()}
    </div>
  );
};

const SimulationModal: React.FC<{ show: boolean; onClose: () => void; isFixedCompany: boolean; baseDays: number; formatMoney: any; formatMoneyInput: any; parseMoneyInput: any; calcularINSS: any; calcularIRT: any; roundMoney: any; empresaProp: any }> = ({ show, onClose, isFixedCompany, baseDays, formatMoney, formatMoneyInput, parseMoneyInput, calcularINSS, calcularIRT, roundMoney, empresaProp }) => {
  const [salario, setSalario] = useState(0);
  const [alimentacao, setAlimentacao] = useState(0);
  const [transporte, setTransporte] = useState(0);
  const [horasExtra, setHorasExtra] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [feriasPercent, setFeriasPercent] = useState(0);
  const [natalPercent, setNatalPercent] = useState(0);
  const [incluirFerias, setIncluirFerias] = useState(false);
  const [incluirNatal, setIncluirNatal] = useState(false);
  const [tipoContrato, setTipoContrato] = useState('Contrato por Tempo Indeterminado');
  
  const isPrestador = tipoContrato === 'Prestador';
  const isEstagiario = tipoContrato === 'Estagiário';
  
  const vFerias = incluirFerias ? roundMoney((feriasPercent / 100) * salario) : 0;
  const vNatal = incluirNatal ? roundMoney((natalPercent / 100) * salario) : 0;
  const bruto = roundMoney(salario + alimentacao + transporte + horasExtra + bonus + vFerias + vNatal);
  
  const inss = (isPrestador || isEstagiario) ? 0 : calcularINSS(salario);
  const alimentacaoTrib = Math.max(0, alimentacao - 30000);
  const transporteTrib = Math.max(0, transporte - 30000);
  const mc = roundMoney(Math.max(0, salario + alimentacaoTrib + transporteTrib + horasExtra + bonus - inss));
  const irt = calcularIRT(mc, isPrestador, empresaProp?.categoria === 'Particular');
  
  const retFerias = (incluirFerias && !isPrestador) ? roundMoney(vFerias * 0.15) : 0;
  const retNatal = (incluirNatal && !isPrestador) ? roundMoney(vNatal * 0.15) : 0;
  
  const totalDescontos = roundMoney(inss + irt.valor + retFerias + retNatal);
  const liquido = roundMoney(bruto - totalDescontos);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b bg-emerald-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-emerald-800">Simulador de Processamento</h3>
            <p className="text-xs text-emerald-600">Simule salários, abonos e descontos sem afetar o sistema</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-full bg-white text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all shadow-sm">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuração</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Contrato</label>
                    <select 
                      value={tipoContrato} 
                      onChange={e => setTipoContrato(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Contrato por Tempo Indeterminado">Tempo Indeterminado</option>
                      <option value="Contrato a Termo Certo">Termo Certo</option>
                      <option value="Contrato a Termo Incerto">Termo Incerto</option>
                      <option value="Estagiário">Estagiário</option>
                      <option value="Prestador">Prestador (Independente)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salário Base</label>
                    <input type="text" value={formatMoneyInput(salario)} onChange={e => setSalario(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alimentação</label>
                    <input type="text" value={formatMoneyInput(alimentacao)} onChange={e => setAlimentacao(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transporte</label>
                    <input type="text" value={formatMoneyInput(transporte)} onChange={e => setTransporte(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horas Extra</label>
                    <input type="text" value={formatMoneyInput(horasExtra)} onChange={e => setHorasExtra(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bónus</label>
                    <input type="text" value={formatMoneyInput(bonus)} onChange={e => setBonus(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 rounded-xl border border-slate-100 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={incluirFerias} onChange={e => setIncluirFerias(e.target.checked)} className="rounded text-emerald-500" />
                        Subs. Férias
                      </label>
                      <div className="relative">
                        <input type="number" value={feriasPercent} onChange={e => setFeriasPercent(Number(e.target.value))} disabled={!incluirFerias} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                   </div>
                   <div className="p-3 rounded-xl border border-slate-100 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={incluirNatal} onChange={e => setIncluirNatal(e.target.checked)} className="rounded text-emerald-500" />
                        Subs. Natal
                      </label>
                      <div className="relative">
                        <input type="number" value={natalPercent} onChange={e => setNatalPercent(Number(e.target.value))} disabled={!incluirNatal} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl">receipt_long</span></div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Resumo da Simulação</h4>
               
               <div className="space-y-3 relative z-10">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Total Bruto</span>
                   <span className="font-bold">{formatMoney(bruto)}</span>
                 </div>
                 {inss > 0 && (
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-400">Desconto INSS (3%)</span>
                     <span className="text-rose-400">-{formatMoney(inss)}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center text-sm">
                   <div>
                     <span className="text-slate-400">{isPrestador ? 'IRT Grupo B/C' : 'IRT'}</span>
                     <span className="ml-2 text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{irt.faixa}</span>
                   </div>
                   <span className="text-rose-400">-{formatMoney(irt.valor)}</span>
                 </div>
                 {(retFerias > 0 || retNatal > 0) && (
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-400">Retenções (15%)</span>
                     <span className="text-rose-400">-{formatMoney(retFerias + retNatal)}</span>
                   </div>
                 )}
                 <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Salário Líquido</p>
                     <p className="text-3xl font-black">{formatMoney(liquido)}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Descontos</p>
                     <p className="text-sm font-bold text-rose-500">{formatMoney(totalDescontos)}</p>
                   </div>
                 </div>
               </div>
            </div>
            
            <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex gap-3 italic">
              <span className="material-symbols-outlined text-slate-400">info</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Os cálculos simulam taxas e regras padrão (Angola IRT/INSS). Esta simulação não gera registros financeiros nem altera o histórico dos colaboradores.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">Fechar Simulador</button>
        </div>
      </div>
    </div>
  );
};


export default Processamento;
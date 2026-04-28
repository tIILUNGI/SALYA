import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import { taxasIRT } from '../data/mockData';
import html2pdf from 'html2pdf.js';
import Swal from 'sweetalert2';

interface OutroGanhoInput {
  id: string;
  descricao: string;
  valor: number;
}

interface HistoricoProcessamento {
  id: number;
  colaboradorId?: number;
  colaboradorNome: string;
  cargo?: string;
  mes: number;
  ano: number;
  totalBruto: number;
  descontos: number;
  salarioLiquido: number;
  createdAt?: string;
}

interface ReceiptSnapshot {
  colaborador: Colaborador;
  mes: string;
  ano: string;
  salarioBase: number;
  diasTrabalhados: number;
  ganhoAlimentacao: number;
  ganhoTransporte: number;
  ganhoFerias: number;
  ganhoNatal: number;
  horasExtra: number;
  bonus: number;
  faltas: number;
  outrosGanhos: OutroGanhoInput[];
  totalBruto: number;
  valorINSS: number;
  valorIRT: number;
  totalDescontos: number;
  salarioLiquido: number;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const monthToNum = (month: string) => MONTHS.indexOf(month) + 1;
const numToMonth = (month: number) => MONTHS[month - 1] || `Mes ${month}`;
const parseMoneyInput = (value: string) => Number(value.replace(/[^\d]/g, '')) || 0;
const formatMoney = (value?: number | null) => `${(value ?? 0).toLocaleString('pt-AO')} Kz`;
const formatMoneyInput = (value?: number | null) => (value ?? 0).toLocaleString('pt-AO');
const createOtherGain = (): OutroGanhoInput => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, descricao: '', valor: 0 });

const calcularINSS = (bruto: number): number => Math.round(bruto * 0.03);

const calcularIRT = (bruto: number): { valor: number; faixa: string } => {
  const faixa = taxasIRT.find(f => bruto >= f.minimo && bruto < f.maximo);
  if (!faixa) {
    const ultima = taxasIRT[taxasIRT.length - 1];
    return { valor: Math.max(0, Math.round(bruto * ultima.taxa / 100 - ultima.parcelaAbt)), faixa: ultima.faixa };
  }
  return { valor: Math.max(0, Math.round(bruto * faixa.taxa / 100 - faixa.parcelaAbt)), faixa: faixa.faixa };
};

const Processamento: React.FC = () => {
  const { empresa, colaboradores, empresaId, setMessage } = useContext(AppContext);
  const ativos = colaboradores.filter((colaborador) => colaborador.status === 'Ativo' && (!empresaId || colaborador.empresaId === empresaId || (colaborador as any).empresa?.id === empresaId));

  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null);
  const [historico, setHistorico] = useState<HistoricoProcessamento[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoError, setHistoricoError] = useState('');

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

  const totalOutrosGanhos = formOutrosGanhos.reduce((total, ganho) => total + (ganho.valor || 0), 0);

  const salarioProporcional = useMemo(() => Math.round(formSalario / 22 * formDiasTrabalhados), [formSalario, formDiasTrabalhados]);
  const totalBruto = useMemo(() => salarioProporcional + formGanhoAlimentacao + formGanhoTransporte + formGanhoFerias + formGanhoNatal + formHorasExtra + formBonus + totalOutrosGanhos, [salarioProporcional, formGanhoAlimentacao, formGanhoTransporte, formGanhoFerias, formGanhoNatal, formHorasExtra, formBonus, totalOutrosGanhos]);
  const inssEstimado = useMemo(() => calcularINSS(totalBruto), [totalBruto]);
  const irtEstimado = useMemo(() => calcularIRT(totalBruto), [totalBruto]);
  const salarioLiquidoEstimado = useMemo(() => totalBruto - inssEstimado - irtEstimado.valor - formFaltas, [totalBruto, inssEstimado, irtEstimado, formFaltas]);

  const loadHistorico = useCallback(async () => {
    if (!empresaId) return;

    setHistoricoLoading(true);
    setHistoricoError('');
    try {
      const data = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
      setHistorico(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setHistorico([]);
      setHistoricoError(error?.message || 'Nao foi possivel carregar o historico.');
    } finally {
      setHistoricoLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  useEffect(() => {
    if (showHistoricoModal) {
      loadHistorico();
    }
  }, [loadHistorico, showHistoricoModal]);

  const resetProcessingForm = () => {
    setFormSalario(0);
    setFormDiasTrabalhados(22);
    setFormGanhoAlimentacao(0);
    setFormGanhoTransporte(0);
    setFormGanhoFerias(0);
    setFormGanhoNatal(0);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormFaltas(0);
    setFormOutrosGanhos([]);
  };

  const handleStartProcessar = (colab: Colaborador) => {
    setSelectedColab(colab);
    setFormSalario(colab.salarioBase || 0);
    setFormDiasTrabalhados(22);
    setFormGanhoAlimentacao(colab.subsidioAlimentacao || 0);
    setFormGanhoTransporte(colab.subsidioTransporte || 0);
    setFormGanhoFerias(colab.subsidioFerias || 0);
    setFormGanhoNatal(colab.subsidioNatal || 0);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormFaltas(0);
    setFormOutrosGanhos([]);
    setShowFormModal(true);
  };

  const buildOtherGainsPayload = () =>
    formOutrosGanhos
      .filter((ganho) => ganho.valor > 0)
      .map((ganho, index) => ({
        descricao: ganho.descricao.trim() || `Outro ganho ${index + 1}`,
        valor: ganho.valor,
      }));

  const handleBulkProcess = async () => {
    if (isProcessingBulk) return;

    const result = await Swal.fire({
      title: 'Processamento em Lote',
      text: `Deseja processar o salario de todos os ${ativos.length} funcionarios ativos para ${selectedMonth}/${selectedYear}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, Processar Todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });

    if (!result.isConfirmed) return;

    setIsProcessingBulk(true);
    Swal.fire({ title: 'A Processar...', text: 'A gerar recibos padrao. Por favor, aguarde.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
      for (const colab of ativos) {
        const dto = {
          trabalhadorId: colab.id,
          mes: monthToNum(selectedMonth),
          ano: parseInt(selectedYear, 10),
          salarioBaseOverride: colab.salarioBase || 0,
          diasTrabalhados: 22,
          diasUteis: 22,
          diasAlimentacao: 1,
          diasTransporte: 1,
          valorDiaAlimentacao: colab.subsidioAlimentacao || 0,
          valorDiaTransporte: colab.subsidioTransporte || 0,
          ganhoFeriasTotal: colab.subsidioFerias || 0,
          ganhoNatalTotal: colab.subsidioNatal || 0,
          outrosSubsidiosTotal: 0,
          horasExtraTotal: 0,
          bonusTotal: 0,
          faltasTotal: 0,
          outrosGanhos: [],
        };
        await api.post('/processamentos/processar-salario', dto);
      }

      await loadHistorico();
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
        diasUteis: 22,
        diasAlimentacao: 1,
        diasTransporte: 1,
        valorDiaAlimentacao: formGanhoAlimentacao,
        valorDiaTransporte: formGanhoTransporte,
        ganhoFeriasTotal: formGanhoFerias,
        ganhoNatalTotal: formGanhoNatal,
        outrosSubsidiosTotal: 0,
        horasExtraTotal: formHorasExtra,
        bonusTotal: formBonus,
        faltasTotal: formFaltas,
        outrosGanhos: outrosGanhosPayload,
      };

      const result = await api.post('/processamentos/processar-salario', dto);

      setReceiptSnapshot({
        colaborador: selectedColab,
        mes: selectedMonth,
        ano: selectedYear,
        salarioBase: formSalario,
        diasTrabalhados: formDiasTrabalhados,
        ganhoAlimentacao: formGanhoAlimentacao,
        ganhoTransporte: formGanhoTransporte,
        ganhoFerias: formGanhoFerias,
        ganhoNatal: formGanhoNatal,
        horasExtra: formHorasExtra,
        bonus: formBonus,
        faltas: formFaltas,
        outrosGanhos: outrosGanhosPayload.map((ganho, index) => ({ id: `${index}`, descricao: ganho.descricao, valor: ganho.valor })),
        totalBruto: result.totalBruto || 0,
        valorINSS: result.valorINSS || 0,
        valorIRT: result.valorIRT || 0,
        totalDescontos: result.descontos || 0,
        salarioLiquido: result.salarioLiquido || 0,
      });

      await loadHistorico();
      setShowFormModal(false);
      setShowReceiptModal(true);
    } catch (error: any) {
      setMessage({ title: 'Erro', text: error?.message || 'Erro ao processar.', type: 'error' });
    }
  };

  const handleGuardarPDF = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element || !receiptSnapshot) return;

    const opt = {
      margin: 0,
      filename: `Recibo_${receiptSnapshot.colaborador.nome.replace(/ /g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
  };

  const handleUpdateOtherGain = (id: string, field: 'descricao' | 'valor', value: string) => {
    setFormOutrosGanhos((previous) => previous.map((ganho) => ganho.id === id ? { ...ganho, [field]: field === 'valor' ? parseMoneyInput(value) : value } : ganho));
  };

  const handleAddOtherGain = () => {
    setFormOutrosGanhos((previous) => [...previous, createOtherGain()]);
  };

  const handleRemoveOtherGain = (id: string) => {
    setFormOutrosGanhos((previous) => previous.filter((ganho) => ganho.id !== id));
  };

  const historicoDoPeriodo = historico.filter((item) => item.mes === monthToNum(selectedMonth) && String(item.ano) === selectedYear);

  const renderMainContent = () => (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h3 className="text-lg font-medium text-slate-800">Processamento Salarial</h3>
            <p className="text-sm text-slate-500 mt-1">{selectedMonth} {selectedYear} · {ativos.length} colaborador(es) ativo(s)</p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-lg bg-slate-50 px-4 py-2">
              <p className="text-xs text-slate-400">Ativos</p>
              <p className="text-lg font-medium text-slate-700">{ativos.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase">Colaborador</th>
              <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase text-right">Salário Base</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ativos.map((colaborador) => (
              <tr key={colaborador.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">{colaborador.nome.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{colaborador.nome}</p>
                      <p className="text-xs text-slate-400">{colaborador.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">{formatMoney(colaborador.salarioBase || 0)}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleStartProcessar(colaborador)} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all">
                    Processar
                  </button>
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

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-slate-700">Processar Salário</h3>
              <p className="text-sm text-slate-400">{selectedColab?.nome} · {selectedColab?.cargo}</p>
            </div>
            <button onClick={() => { setShowFormModal(false); resetProcessingForm(); }} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

<form onSubmit={handleConfirmForm} className="p-6 space-y-6 bg-white">
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Outros Ganhos</p>
                <p className="text-base font-medium text-slate-700">{formatMoney(totalOutrosGanhos)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Salário Base</label>
                <input type="text" value={formatMoneyInput(formSalario)} onChange={(e) => setFormSalario(parseMoneyInput(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-primary text-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Dias Trabalhados</label>
                <input type="number" min="0" max="31" value={formDiasTrabalhados} onChange={(e) => setFormDiasTrabalhados(Number(e.target.value) || 0)} className="w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-slate-700 text-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
              <h4 className="text-sm font-medium text-slate-600">Ganhos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Alimentação</label>
                  <input type="text" value={formatMoneyInput(formGanhoAlimentacao)} onChange={(e) => setFormGanhoAlimentacao(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Transporte</label>
                  <input type="text" value={formatMoneyInput(formGanhoTransporte)} onChange={(e) => setFormGanhoTransporte(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Férias</label>
                  <input type="text" value={formatMoneyInput(formGanhoFerias)} onChange={(e) => setFormGanhoFerias(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Natal</label>
                  <input type="text" value={formatMoneyInput(formGanhoNatal)} onChange={(e) => setFormGanhoNatal(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Horas Extra</label>
                  <input type="text" value={formatMoneyInput(formHorasExtra)} onChange={(e) => setFormHorasExtra(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500">Bónus</label>
                  <input type="text" value={formatMoneyInput(formBonus)} onChange={(e) => setFormBonus(parseMoneyInput(e.target.value))} className="w-full bg-white rounded-lg p-3 font-medium border border-slate-100" />
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-medium text-slate-600">Outros Ganhos</h4>
                <button type="button" onClick={handleAddOtherGain} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Adicionar
                </button>
              </div>
              {formOutrosGanhos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                  <p className="text-xs text-slate-400">Sem outros ganhos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formOutrosGanhos.map((ganho) => (
                    <div key={ganho.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_40px] gap-3 items-end bg-white border border-slate-100 rounded-xl p-3">
                      <div className="space-y-1">
                        <label className="block text-xs text-slate-500">Descrição</label>
                        <input type="text" value={ganho.descricao} onChange={(e) => handleUpdateOtherGain(ganho.id, 'descricao', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs text-slate-500">Valor</label>
                        <input type="text" value={formatMoneyInput(ganho.valor)} onChange={(e) => handleUpdateOtherGain(ganho.id, 'valor', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <button type="button" onClick={() => handleRemoveOtherGain(ganho.id)} className="size-9 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-rose-50 rounded-[32px] space-y-4">
              <label className="block text-xs font-medium text-rose-500">Descontos / Faltas (KZ)</label>
              <input type="text" value={formatMoneyInput(formFaltas)} onChange={(e) => setFormFaltas(parseMoneyInput(e.target.value))} className="w-full bg-white border-2 border-rose-100 rounded-2xl p-5 font-medium text-rose-600 text-xl outline-none focus:border-rose-300" placeholder="0" />
            </div>

            {/* Real-time Payroll Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h4 className="text-sm font-semibold text-slate-700">Pré-visualização do Cálculo</h4>

              {/* Proventos condicionais */}
              {[
                { label: 'Salário Proporcional', valor: salarioProporcional },
                { label: 'Alimentação', valor: formGanhoAlimentacao },
                { label: 'Transporte', valor: formGanhoTransporte },
                { label: 'Férias', valor: formGanhoFerias },
                { label: 'Natal', valor: formGanhoNatal },
                { label: 'Horas Extra', valor: formHorasExtra },
                { label: 'Bónus', valor: formBonus },
                { label: 'Outros Ganhos', valor: totalOutrosGanhos },
              ].filter(p => p.valor > 0).length > 0 && (
                <div className="space-y-2">
                  {[
                    { label: 'Salário Proporcional', valor: salarioProporcional },
                    { label: 'Alimentação', valor: formGanhoAlimentacao },
                    { label: 'Transporte', valor: formGanhoTransporte },
                    { label: 'Férias', valor: formGanhoFerias },
                    { label: 'Natal', valor: formGanhoNatal },
                    { label: 'Horas Extra', valor: formHorasExtra },
                    { label: 'Bónus', valor: formBonus },
                    { label: 'Outros Ganhos', valor: totalOutrosGanhos },
                  ].filter(p => p.valor > 0).map(p => (
                    <div key={p.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{p.label}</span>
                      <span className="font-medium text-slate-700">{formatMoney(p.valor)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-600">Total Bruto</span>
                    <span className="font-semibold text-slate-800">{formatMoney(totalBruto)}</span>
                  </div>
                </div>
              )}

              {/* Descontos obrigatórios */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">INSS (3%)</span>
                  <span className="font-medium text-slate-700">{formatMoney(inssEstimado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IRT — {irtEstimado.faixa}</span>
                  <span className="font-medium text-slate-700">{formatMoney(irtEstimado.valor)}</span>
                </div>
                {formFaltas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-500">Faltas / Penalizações</span>
                    <span className="font-medium text-rose-600">{formatMoney(formFaltas)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                  <span className="font-medium text-slate-600">Total Descontos</span>
                  <span className="font-semibold text-slate-800">{formatMoney(inssEstimado + irtEstimado.valor + formFaltas)}</span>
                </div>
              </div>

              {/* Salário Líquido como KPI principal */}
              <div className="mt-2 bg-corporate-50 border border-corporate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-corporate-500 uppercase tracking-wide mb-1">Salário Líquido Estimado</p>
                <p className="text-2xl font-semibold text-corporate-900">{formatMoney(salarioLiquidoEstimado)}</p>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all">
              Confirmar e Gerar Recibo
            </button>
          </form>
        </div>
      </div>
    );
  };
  const renderReceiptModal = () => {
    if (!showReceiptModal || !receiptSnapshot) return null;

    const receiptLines = [
      { label: `Salario Base (${receiptSnapshot.diasTrabalhados} dias)`, valor: receiptSnapshot.salarioBase },
      { label: 'Ganho Alimentacao', valor: receiptSnapshot.ganhoAlimentacao },
      { label: 'Ganho Transporte', valor: receiptSnapshot.ganhoTransporte },
      { label: 'Ganho de Ferias', valor: receiptSnapshot.ganhoFerias },
      { label: 'Ganho de Natal', valor: receiptSnapshot.ganhoNatal },
      { label: 'Horas Extra', valor: receiptSnapshot.horasExtra },
      { label: 'Bonus / Premios', valor: receiptSnapshot.bonus },
      ...receiptSnapshot.outrosGanhos.map((ganho) => ({ label: ganho.descricao, valor: ganho.valor })),
    ].filter((item) => item.valor > 0);

    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-[40px] max-w-[210mm] w-full max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col">
          <div className="p-12 bg-white" id="recibo-para-impressao" style={{ minHeight: '297mm', width: '210mm', boxSizing: 'border-box' }}>
            <div className="flex justify-between items-start mb-12 border-b-2 border-primary pb-8">
              <div>
                <h1 className="text-2xl font-black text-primary uppercase italic">{empresa?.nome || 'ENTIDADE EMPREGADORA'}</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">NIF: {empresa?.nif || '-'}</p>
              </div>
              <div className="text-right">
                <p className="bg-slate-950 text-white px-6 py-2 text-sm font-black uppercase tracking-widest inline-block">Recibo de Salario</p>
                <p className="text-xs font-black text-primary uppercase mt-4">{receiptSnapshot.mes} / {receiptSnapshot.ano}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="border border-slate-100 p-6 rounded-2xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Colaborador</p>
                <p className="text-lg font-black text-slate-900 uppercase leading-none">{receiptSnapshot.colaborador.nome}</p>
                <p className="text-[10px] font-bold text-primary uppercase mt-2">{receiptSnapshot.colaborador.cargo}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pagamento via IBAN</p>
                <p className="text-[11px] font-black font-mono text-slate-800 italic">{receiptSnapshot.colaborador.iban || 'NAO DEFINIDO'}</p>
              </div>
            </div>

            <table className="w-full text-[12px] mb-12">
              <thead>
                <tr className="bg-primary text-white font-black uppercase">
                  <th className="p-4 text-left">Verbas Salariais</th>
                  <th className="p-4 text-right">Rendimentos</th>
                  <th className="p-4 text-right">Descontos</th>
                </tr>
              </thead>
              <tbody className="divide-y border-x border-b">
                {receiptLines.map((line) => (
                  <tr key={line.label} className="font-bold italic">
                    <td className="p-4 uppercase">{line.label}</td>
                    <td className="p-4 text-right">{formatMoney(line.valor)}</td>
                    <td className="p-4 text-right">-</td>
                  </tr>
                ))}
                <tr><td className="p-4 text-slate-400 italic">INSSTrabalhador (3%)</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{formatMoney(receiptSnapshot.valorINSS)}</td></tr>
                <tr><td className="p-4 text-slate-400 italic">Retencao de I.R.T</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{formatMoney(receiptSnapshot.valorIRT)}</td></tr>
                {receiptSnapshot.faltas > 0 && <tr className="text-rose-500 font-bold"><td className="p-4">Faltas e Penalizacoes</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{formatMoney(receiptSnapshot.faltas)}</td></tr>}
                <tr className="bg-primary text-white font-black">
                  <td className="p-4">TOTAIS</td>
                  <td className="p-4 text-right">{formatMoney(receiptSnapshot.totalBruto)}</td>
                  <td className="p-4 text-right">{formatMoney(receiptSnapshot.totalDescontos)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-8 border-t border-dashed">
              <div className="text-[9px] font-bold text-slate-400 uppercase max-w-[300px] leading-relaxed italic">
                Declaramos que o montante liquido abaixo foi processado conforme a legislacao laboral e fiscal em vigor na Republica de Angola.
              </div>
              <div className="bg-primary text-white p-8 rounded-[24px] shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Montante Liquido</p>
                <p className="text-4xl font-black italic tracking-tighter">{formatMoney(receiptSnapshot.salarioLiquido)}</p>
              </div>
            </div>
          </div>

          <div className="p-8 border-t flex gap-4 no-print bg-slate-50 rounded-b-[40px]">
            <button onClick={handleGuardarPDF} className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Exportar PDF</button>
            <button onClick={() => window.print()} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Imprimir Recibo</button>
            <button onClick={() => setShowReceiptModal(false)} className="px-10 py-4 text-[10px] font-black uppercase text-slate-400">Fechar</button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoricoModal = () => {
    if (!showHistoricoModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[105] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-slate-700">Histórico de Processamentos</h3>
              <p className="text-sm text-slate-400">{empresa?.nome || '-'}</p>
            </div>
            <button onClick={() => setShowHistoricoModal(false)} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {historicoLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">A carregar...</div>
            ) : historicoError ? (
              <div className="py-12 text-center text-sm text-rose-500">{historicoError}</div>
            ) : historico.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">Sem processamentos registados</div>
            ) : (
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Colaborador</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Período</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right">Bruto</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right">Desc.</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right">Líquido</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historico.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-700">{item.colaboradorNome}</p>
                          <p className="text-xs text-slate-400">{item.cargo || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${item.mes === monthToNum(selectedMonth) && String(item.ano) === selectedYear ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                            {numToMonth(item.mes)}/{item.ano}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{formatMoney(item.totalBruto)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-500">{formatMoney(item.descontos)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-primary">{formatMoney(item.salarioLiquido)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString('pt-AO') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 font-app">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-slate-700">Processamento Salarial</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border-none rounded-lg py-2 px-3 text-sm font-medium outline-none">
            {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border-none rounded-lg py-2 px-3 text-sm font-medium outline-none">
            {['2025', '2026', '2027'].map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <span className="px-3 py-1.5 rounded-lg bg-primary/5 text-xs text-primary">
            {historicoDoPeriodo.length} processamento(s)
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowHistoricoModal(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all">
            Histórico
          </button>
          <button onClick={handleBulkProcess} disabled={isProcessingBulk} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/80 transition-all">
            {isProcessingBulk ? 'A Processar...' : 'Liquidação Mensal'}
          </button>
        </div>
      </div>

      {renderMainContent()}
      {renderFormModal()}
      {renderReceiptModal()}
      {renderHistoricoModal()}
    </div>
  );
};

export default Processamento;

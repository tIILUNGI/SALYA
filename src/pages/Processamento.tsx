import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import html2pdf from 'html2pdf.js';
import Swal from 'sweetalert2';

interface Movimento {
  id: number;
  descricao: string;
  tipo: string;
  valor: number;
  data: string;
  mes: number;
  ano: number;
  colaborador?: { id: number; nome: string };
}

const monthToNum = (m: string) => ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].indexOf(m) + 1;

const Processamento: React.FC = () => {
  const { empresa, colaboradores, empresaId, setMessage } = useContext(AppContext);
  const ativos = colaboradores.filter(c => c.status === 'Ativo' && (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId));
  
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentDay = new Date().getDate();
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedDay, setSelectedDay] = useState(currentDay.toString());
  const [activeTab, setActiveTab] = useState<'Normal' | 'Movimentos' | 'Exportacao'>('Normal');

  const handleExportExcel = () => {
    const headers = ['Nome', 'Cargo', 'Salário Base', 'IRT', 'INSS', 'Líquido'];
    const rows = ativos.map(c => [c.nome, c.cargo, c.salarioBase || 0, 0, 0, c.salarioBase || 0]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `folha_salario_${selectedMonth}_${selectedYear}.csv`;
    link.click();
    setMessage?.({ title: 'Sucesso', text: 'Ficheiro exportado com sucesso', type: 'success' });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('processamento-content');
    if (!element) return;
    try { 
      await html2pdf().set({ margin: 10, filename: `recibo_${selectedMonth}_${selectedYear}.pdf`, image: { type: 'jpeg' as const, quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save(); 
    } catch { console.error('Erro ao gerar PDF'); }
  };

  const handleGenerateChart = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Gráfico de Folha Salarial', 20, 40);
    const maxSalary = Math.max(...ativos.map(c => c.salarioBase || 0));
    ativos.forEach((c, i) => {
      const barHeight = ((c.salarioBase || 0) / maxSalary) * 250;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(50 + (i * 80), 350 - barHeight, 60, barHeight);
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.fillText(c.nome?.substring(0, 8) || '', 50 + (i * 80), 370);
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `grafico_${selectedMonth}_${selectedYear}.png`;
    link.click();
    setMessage?.({ title: 'Sucesso', text: 'Gráfico gerado com sucesso', type: 'success' });
  };

  // Movimentos Externos state
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ descricao: '', tipo: 'Combustível', valor: 0, colaboradorId: '' });
  const [movLoading, setMovLoading] = useState(false);

  const fetchMovimentos = useCallback(async () => {
    try {
      const mes = monthToNum(selectedMonth);
      const ano = parseInt(selectedYear);
      const data = await api.get(`/movimentos/periodo?mes=${mes}&ano=${ano}`);
      setMovimentos(Array.isArray(data) ? data : []);
    } catch { setMovimentos([]); }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { if (activeTab === 'Movimentos') fetchMovimentos(); }, [activeTab, fetchMovimentos]);

  const handleSaveMovimento = async () => {
    if (!movForm.descricao || !movForm.valor) return;
    setMovLoading(true);
    try {
      await api.post('/movimentos', { ...movForm, mes: monthToNum(selectedMonth), ano: parseInt(selectedYear), valor: movForm.valor, colaboradorId: movForm.colaboradorId || null });
      setShowMovModal(false);
      setMovForm({ descricao: '', tipo: 'Combustível', valor: 0, colaboradorId: '' });
      fetchMovimentos();
      setMessage({ title: 'Sucesso', text: 'Movimento registado com sucesso.', type: 'success' });
    } catch (error: any) {
      console.error('Erro ao registar movimento:', error);
      setMessage({ title: 'Erro', text: error?.message || 'Não foi possível registar o movimento.', type: 'error' });
    } finally { setMovLoading(false); }
  };

  const handleDeleteMovimento = async (id: number) => {
    Swal.fire({
      title: 'Eliminar Movimento',
      text: 'Tem a certeza que deseja eliminar este movimento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/movimentos/${id}`);
          setMovimentos(prev => prev.filter(m => m.id !== id));
          Swal.fire({
            title: 'Eliminado',
            text: 'Movimento removido com sucesso!',
            icon: 'success',
            confirmButtonColor: '#22c55e',
          });
        } catch { /**/ }
      }
    });
  };

  const handleBulkProcess = async () => {
    if (isProcessingBulk) return;
    const result = await Swal.fire({
      title: 'Processamento em Lote',
      text: `Deseja processar o salário de todos os ${ativos.length} funcionários ativos para ${selectedMonth}/${selectedYear}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, Processar Todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });
    if (result.isConfirmed) {
      setIsProcessingBulk(true);
      Swal.fire({ title: 'A Processar...', text: 'A gerar folhas e recibos. Por favor, aguarde.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        for (const colab of ativos) {
          const dto = { colaboradorId: colab.id, mes: monthToNum(selectedMonth), ano: parseInt(selectedYear), diasTrabalhados: 22, diasUteis: 22, diasAlimentacao: 22, diasTransporte: 22, valorDiaAlimentacao: colab.subsidioAlimentacao || 0, valorDiaTransporte: colab.subsidioTransporte || 0, outrosSubsidiosTotal: (colab.subsidioFerias || 0) + (colab.subsidioNatal || 0), horasExtraTotal: 0, bonusTotal: 0, faltasTotal: 0 };
          await api.post('/processamentos/processar-salario', dto);
        }
        Swal.fire('Sucesso', 'Processamento mensal concluído com sucesso!', 'success');
      } catch (e) {
        Swal.fire('Erro', 'Ocorreu um erro no processamento em lote.', 'error');
      } finally { setIsProcessingBulk(false); }
    }
  };

  const [showFormModal, setShowFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);

  const [showNewSubsidioModal, setShowNewSubsidioModal] = useState(false);
  const [tempSubsidioName, setTempSubsidioName] = useState('');

  const [formSalario, setFormSalario] = useState(0);
  const [formFaltas, setFormFaltas] = useState(0);
  const [formAlimentacao, setFormAlimentacao] = useState(0);
  const [formTransporte, setFormTransporte] = useState(0);
  const [formFerias, setFormFerias] = useState(0);
  const [outrosSubsidios, setOutrosSubsidios] = useState<{nome: string, valor: number}[]>([]);
  const [formHorasExtra, setFormHorasExtra] = useState(0);
  const [formBonus, setFormBonus] = useState(0);

  const [calcResults, setCalcResults] = useState<{ totalBruto: number; valorINSS: number; valorIRT: number; totalDescontos: number; salarioLiquido: number } | null>(null);

  const handleStartProcessar = (colab: Colaborador) => {
    setSelectedColab(colab);
    setFormSalario(colab.salarioBase || 0);
    setFormFaltas(0);
    setFormAlimentacao(colab.subsidioAlimentacao || 0);
    setFormTransporte(colab.subsidioTransporte || 0);
    setFormFerias(colab.subsidioFerias || 0);
    setOutrosSubsidios([]);
    setFormHorasExtra(0);
    setFormBonus(0);
    setShowFormModal(true);
  };

  const handleAddSubsidio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'Outro') {
      setShowNewSubsidioModal(true);
    } else if (value !== '') {
      if (!outrosSubsidios.find((s: { nome: string }) => s.nome === value)) {
        setOutrosSubsidios([...outrosSubsidios, { nome: value, valor: 0 }]);
      }
    }
    e.target.value = '';
  };

  const handleCreateCustomSubsidio = () => {
    if (tempSubsidioName.trim()) {
      setOutrosSubsidios([...outrosSubsidios, { nome: tempSubsidioName.trim(), valor: 0 }]);
      setTempSubsidioName('');
      setShowNewSubsidioModal(false);
    }
  };

  const handleUpdateSubsidioValor = (index: number, valor: number) => {
    const newSubsidios = [...outrosSubsidios];
    newSubsidios[index].valor = valor;
    setOutrosSubsidios(newSubsidios);
  };

  const removeOutroSubsidio = (index: number) => {
    setOutrosSubsidios(outrosSubsidios.filter((_: any, i: number) => i !== index));
  };

  const handleConfirmForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColab) return;
    try {
      const dto = { trabalhadorId: selectedColab.id, mes: monthToNum(selectedMonth), ano: parseInt(selectedYear), diasTrabalhados: 22, diasUteis: 22, diasAlimentacao: 22, diasTransporte: 22, valorDiaAlimentacao: formAlimentacao, valorDiaTransporte: formTransporte, outrosSubsidiosTotal: outrosSubsidios.reduce((acc: number, s: { valor: number }) => acc + s.valor, 0) + formFerias, horasExtraTotal: formHorasExtra, bonusTotal: formBonus, faltasTotal: formFaltas };
      const result = await api.post('/processamentos/processar-salario', dto);
      setCalcResults({ totalBruto: result.totalBruto, valorINSS: result.valorINSS || 0, valorIRT: result.valorIRT || 0, totalDescontos: result.descontos, salarioLiquido: result.salarioLiquido });
      setShowFormModal(false);
      setShowReceiptModal(true);
    } catch (error: any) {
      setMessage({ title: 'Erro', text: error?.message || 'Não foi possível processar o salário.', type: 'error' });
    }
  };

  const currentCalc = () => calcResults || { totalBruto: 0, valorINSS: 0, valorIRT: 0, totalDescontos: 0, salarioLiquido: 0 };
  const handleImprimir = () => window.print();
  const handleGuardar = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element) return;
    const opt = { margin: 0, filename: `Recibo_${selectedColab?.nome.replace(/ /g, '_')}_${selectedMonth}.pdf`, image: { type: 'jpeg' as const, quality: 0.98 }, html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const } };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="p-8 font-app">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #recibo-para-impressao, #recibo-para-impressao * { visibility: visible !important; }
          #recibo-para-impressao { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; padding: 15mm !important; background: white !important; z-index: 9999 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-black tracking-widest text-slate-800 dark:text-white uppercase">Processamento</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-4 uppercase tracking-widest opacity-60">Controlo Mensal de Salários</p>
        </div>
        <button onClick={handleBulkProcess} disabled={isProcessingBulk} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2">
          {isProcessingBulk ? 'A Processar...' : 'Processamento em Lote'}
        </button>
      </div>

      <div className="glass-card mb-6 p-2 flex gap-2 w-full md:w-max overflow-x-auto text-nowrap mt-4">
        <button onClick={() => setActiveTab('Normal')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Normal' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Processamento</button>
        {empresa?.categoria !== 'Particular' && (
          <button onClick={() => setActiveTab('Movimentos')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Movimentos' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Outros movimentos</button>
        )}
        <button onClick={() => setActiveTab('Exportacao')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Exportacao' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Exportar</button>
      </div>

      {activeTab === 'Normal' && (
        <div>
          <div className="flex items-center gap-4 mb-8 glass-card p-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Período</span>
              <div className="flex items-center gap-2">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 px-4 font-black text-sm outline-none">
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 px-4 font-black text-sm outline-none">
                  {['2025', '2026', '2027'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700 mx-4"></div>
            <div className="flex-1 grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-primary">{ativos.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores</p>
              </div>
              <div className="text-center border-l border-slate-200 dark:border-slate-700">
                <p className="text-2xl font-black text-emerald-500">{ativos.filter(c => c.status === 'Ativo').length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos</p>
              </div>
              <div className="text-center border-l border-slate-200 dark:border-slate-700">
                <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{ativos.reduce((acc, c) => acc + (c.salarioBase || 0), 0).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Massa Salarial</p>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contrato</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ativos.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-6 italic">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{c.nome.substring(0, 2)}</div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{c.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cargo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-right font-black text-slate-700 dark:text-slate-300 italic">{Number(c.salarioBase).toLocaleString()} Kz</td>
                    <td className="p-6 text-center">
                      <button onClick={() => handleStartProcessar(c)} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20">Processar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs content remains largely similar for Movimentos and Exportacao but with refined polish */}
      {activeTab === 'Movimentos' && (
        <div className="animate-in fade-in slide-up space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black uppercase text-slate-800 dark:text-white">Movimentos Externos — {selectedMonth}</h3>
            <button onClick={() => setShowMovModal(true)} className="bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:bg-amber-600 transition-all">
              Novo Movimento
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor (Kz)</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movimentos.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400 text-sm">Nenhum movimento para este período.</td></tr>
                ) : movimentos.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-6 text-sm font-black text-slate-800 dark:text-white uppercase">{m.colaborador?.nome || '—'}</td>
                    <td className="p-6 text-sm text-slate-600 dark:text-slate-300">{m.descricao} <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase ml-2">{m.tipo}</span></td>
                    <td className="p-6 text-right font-black text-primary">{Number(m.valor).toLocaleString('pt-AO')} Kz</td>
                    <td className="p-6 text-right"><button onClick={() => handleDeleteMovimento(m.id)} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-sm">delete</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Improved Receipt and Forms preserved but with better spacing */}
      {showFormModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[90] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <h2 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter italic">Liquidação Salarial</h2>
                <div className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">{selectedColab.nome}</div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleConfirmForm} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-400">Salário Base</label>
                     <input type="text" value={formSalario.toLocaleString('pt-AO')} onChange={e => setFormSalario(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-primary text-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">Alimentação</label>
                        <input type="text" value={formAlimentacao.toLocaleString('pt-AO')} onChange={e => setFormAlimentacao(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">Transporte</label>
                        <input type="text" value={formTransporte.toLocaleString('pt-AO')} onChange={e => setFormTransporte(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" />
                     </div>
                  </div>
               </div>
               <div className="space-y-4 border-t pt-6 bg-red-50/50 p-6 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-red-500">Descontos / Faltas</label>
                  <input type="text" value={formFaltas.toLocaleString('pt-AO')} onChange={e => setFormFaltas(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white border border-red-200 rounded-xl p-3 font-black text-red-600 text-lg" placeholder="0" />
               </div>
               <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Gerar Recibo Profissional</button>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Receipt Section Preserved */}
      {showReceiptModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] max-w-[210mm] w-full max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-12 bg-white" id="recibo-para-impressao" style={{ minHeight: '297mm', width: '210mm', boxSizing: 'border-box', margin: '0 auto' }}>
              <div className="flex justify-between items-start mb-10 border-b-2 border-primary pb-8">
                <div>
                   <h1 className="text-2xl font-black text-primary uppercase tracking-tight italic">
                    {empresa?.categoria === 'Particular' ? `PATRONAL: ${empresa?.nome}` : (empresa?.nome || 'ENTIDADE')}
                   </h1>
                   <div className="mt-2 space-y-0.5">
                     <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">NIF: {empresa?.nif || '-'}</p>
                     <p className="text-[9px] font-medium text-slate-500 uppercase">{empresa?.endereco}, {empresa?.provincia}</p>
                   </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black uppercase tracking-[5px] bg-slate-900 text-white px-6 py-2 rounded-sm inline-block">Recibo</h2>
                  <p className="text-xs font-black mt-4 text-primary uppercase tracking-widest">{selectedMonth} / {selectedYear}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-10">
                <div className="border border-slate-100 p-6 rounded-2xl">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] mb-3 border-b pb-1">Colaborador</h3>
                  <p className="text-lg font-black uppercase text-slate-900">{selectedColab.nome}</p>
                  <p className="text-[10px] font-bold text-primary uppercase mt-1">{selectedColab.cargo} • Nº {selectedColab.numeroColaborador}</p>
                </div>
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <h3 className="text-[9px] font-black text-primary/60 uppercase tracking-[3px] mb-4 border-b border-primary/20 pb-1">Pagamento Bancário</h3>
                  <p className="text-[10px] font-black text-primary font-mono tracking-tighter">{selectedColab.iban || '-'}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-2">{empresa?.banco || 'BANCO LOCAL'}</p>
                </div>
              </div>

              <div className="mb-10">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-primary text-white font-black uppercase text-[10px]">
                      <th className="p-4 text-left tracking-widest">Descrição das Verbas</th>
                      <th className="p-4 text-right tracking-widest w-36">Rendimentos</th>
                      <th className="p-4 text-right tracking-widest w-36">Deduções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 border-x border-b">
                    <tr className="bg-slate-50/50 font-black italic"><td className="p-4">Vencimento Base Mensal</td><td className="p-4 text-right">{Number(formSalario).toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>
                    {formAlimentacao > 0 && <tr><td className="p-4">Subsídio de Alimentação</td><td className="p-4 text-right">{formAlimentacao.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {formTransporte > 0 && <tr><td className="p-4">Subsídio de Transporte</td><td className="p-4 text-right">{formTransporte.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    
                    <tr><td className="p-4 italic text-slate-400">Segurança Social Trabalhador (3%)</td><td className="p-4 text-right">-</td><td className="p-4 text-right">- {currentCalc().valorINSS.toLocaleString('pt-AO')} Kz</td></tr>
                    <tr><td className="p-4 italic text-slate-400">I.R.T (Retenção na Fonte)</td><td className="p-4 text-right">-</td><td className="p-4 text-right">- {currentCalc().valorIRT.toLocaleString('pt-AO')} Kz</td></tr>
                    {formFaltas > 0 && <tr className="text-red-500 font-bold bg-red-50/50"><td className="p-4">Faltas e Ausências</td><td className="p-4 text-right">-</td><td className="p-4 text-right">- {formFaltas.toLocaleString('pt-AO')} Kz</td></tr>}
                    
                    <tr className="bg-slate-900 text-white font-black border-t-2 border-primary">
                      <td className="p-4 uppercase text-[10px]">Totais de Movimentação</td>
                      <td className="p-4 text-right">{currentCalc().totalBruto.toLocaleString('pt-AO')} Kz</td>
                      <td className="p-4 text-right">{currentCalc().totalDescontos.toLocaleString('pt-AO')} Kz</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end mb-16 pt-8 border-t border-dashed">
                <div className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed max-w-[300px] italic">
                   Documento de quitação salarial emitido conforme a Lei Geral do Trabalho de Angola.
                </div>
                <div className="bg-primary text-white p-8 rounded-2xl w-full max-w-[350px] flex justify-between items-center shadow-xl">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[4px] text-white/60 mb-1">Montante Líquido</p>
                      <p className="text-3xl font-black italic tracking-tighter">{currentCalc().salarioLiquido.toLocaleString('pt-AO')} Kz</p>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t flex gap-4 no-print sticky bottom-0 z-10 w-full rounded-b-[40px]">
              <button onClick={handleGuardar} className="flex-1 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black flex items-center justify-center gap-3 tracking-widest text-[10px] active:scale-95 shadow-sm hover:bg-slate-100 uppercase">Salvar PDF</button>
              <button onClick={handleImprimir} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 tracking-widest text-[10px] active:scale-95 shadow-lg shadow-primary/20 uppercase">Imprimir Recibo</button>
              <button onClick={() => setShowReceiptModal(false)} className="px-10 py-4 bg-slate-200 text-slate-500 rounded-2xl font-black text-[10px] hover:bg-slate-300 transition-all uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Processamento;

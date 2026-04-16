import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import html2pdf from 'html2pdf.js';
import Swal from 'sweetalert2';

const monthToNum = (m: string) => ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].indexOf(m) + 1;

const Processamento: React.FC = () => {
  const { empresa, colaboradores, empresaId, setMessage } = useContext(AppContext);
  const ativos = colaboradores.filter(c => c.status === 'Ativo' && (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId));
  
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [showFormModal, setShowFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);

  // Form Fields - "Formato Antigo" (Ask everything in one go)
  const [formSalario, setFormSalario] = useState(0);
  const [formDiasTrabalhados, setFormDiasTrabalhados] = useState(22);
  const [formAlimentacao, setFormAlimentacao] = useState(0);
  const [formTransporte, setFormTransporte] = useState(0);
  const [formHorasExtra, setFormHorasExtra] = useState(0);
  const [formBonus, setFormBonus] = useState(0);
  const [formSubsidiosVarios, setFormSubsidiosVarios] = useState(0);
  const [formFaltas, setFormFaltas] = useState(0);

  const [calcResults, setCalcResults] = useState<{ totalBruto: number; valorINSS: number; valorIRT: number; totalDescontos: number; salarioLiquido: number } | null>(null);

  const handleStartProcessar = (colab: Colaborador) => {
    setSelectedColab(colab);
    setFormSalario(colab.salarioBase || 0);
    setFormDiasTrabalhados(22);
    setFormAlimentacao(colab.subsidioAlimentacao || 0);
    setFormTransporte(colab.subsidioTransporte || 0);
    setFormHorasExtra(0);
    setFormBonus(0);
    setFormSubsidiosVarios((colab.subsidioFerias || 0) + (colab.subsidioNatal || 0));
    setFormFaltas(0);
    setShowFormModal(true);
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
      Swal.fire({ title: 'A Processar...', text: 'A gerar recibos padrão. Por favor, aguarde.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        for (const colab of ativos) {
          const dto = { 
            trabalhadorId: colab.id, mes: monthToNum(selectedMonth), ano: parseInt(selectedYear), 
            diasTrabalhados: 22, outrosSubsidiosTotal: (colab.subsidioFerias || 0) + (colab.subsidioNatal || 0),
            valorDiaAlimentacao: colab.subsidioAlimentacao || 0, valorDiaTransporte: colab.subsidioTransporte || 0
          };
          await api.post('/processamentos/processar-salario', dto);
        }
        Swal.fire('Sucesso', 'Processamento concluído!', 'success');
      } catch {
        Swal.fire('Erro', 'Ocorreu um erro no processamento.', 'error');
      } finally { setIsProcessingBulk(false); }
    }
  };

  const handleConfirmForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColab) return;
    try {
      const dto = { 
        trabalhadorId: selectedColab.id, 
        mes: monthToNum(selectedMonth), 
        ano: parseInt(selectedYear), 
        diasTrabalhados: formDiasTrabalhados,
        valorDiaAlimentacao: formAlimentacao, 
        valorDiaTransporte: formTransporte, 
        outrosSubsidiosTotal: formSubsidiosVarios,
        horasExtraTotal: formHorasExtra, 
        bonusTotal: formBonus, 
        faltasTotal: formFaltas 
      };
      const result = await api.post('/processamentos/processar-salario', dto);
      setCalcResults({ totalBruto: result.totalBruto, valorINSS: result.valorINSS || 0, valorIRT: result.valorIRT || 0, totalDescontos: result.descontos, salarioLiquido: result.salarioLiquido });
      setShowFormModal(false);
      setShowReceiptModal(true);
    } catch (error: any) {
      setMessage({ title: 'Erro', text: error?.message || 'Erro ao processar.', type: 'error' });
    }
  };

  const currentCalc = () => calcResults || { totalBruto: 0, valorINSS: 0, valorIRT: 0, totalDescontos: 0, salarioLiquido: 0 };
  
  const handleGuardarPDF = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element) return;
    const opt = { margin: 0, filename: `Recibo_${selectedColab?.nome.replace(/ /g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 3 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="p-8 font-app">
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Processamento Salarial</h2>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-100 border-none rounded-xl py-2 px-4 font-black text-xs uppercase tracking-widest outline-none">
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-slate-100 border-none rounded-xl py-2 px-4 font-black text-xs outline-none">
              {['2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleBulkProcess} disabled={isProcessingBulk} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[2px] shadow-xl shadow-slate-900/10 hover:bg-primary transition-all">
          {isProcessingBulk ? 'A Processar...' : 'Liquidação Mensal (Lote)'}
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contrato</th>
              <th className="px-8 py-5 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ativos.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-all font-app">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{c.nome.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">{c.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-right font-black text-slate-700 tracking-tighter italic">{(c.salarioBase || 0).toLocaleString()} Kz</td>
                <td className="px-8 py-6 text-center">
                  <button onClick={() => handleStartProcessar(c)} className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95">Processar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Processamento - Formato Antigo (Solicita tudo) */}
      {showFormModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-10 border-b bg-slate-50 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Processar Salário</h3>
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">{selectedColab.nome}</p>
               </div>
               <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleConfirmForm} className="p-10 space-y-8 bg-white">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Base (Kz)</label>
                     <input type="text" value={formSalario.toLocaleString('pt-AO')} onChange={e => setFormSalario(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-primary text-2xl outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias Trabalhados</label>
                     <input type="number" value={formDiasTrabalhados} onChange={e => setFormDiasTrabalhados(Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 text-2xl outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-[32px] space-y-6 md:col-span-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Subsídios e Vantagens</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Alimentação (KZ)</label>
                           <input type="text" value={formAlimentacao.toLocaleString('pt-AO')} onChange={e => setFormAlimentacao(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white rounded-xl p-4 font-bold border border-slate-100" />
                        </div>
                        <div className="space-y-3">
                           <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Transporte (KZ)</label>
                           <input type="text" value={formTransporte.toLocaleString('pt-AO')} onChange={e => setFormTransporte(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white rounded-xl p-4 font-bold border border-slate-100" />
                        </div>
                        <div className="space-y-3">
                           <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Horas Extras</label>
                           <input type="text" value={formHorasExtra.toLocaleString('pt-AO')} onChange={e => setFormHorasExtra(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white rounded-xl p-4 font-bold border border-slate-100" />
                        </div>
                        <div className="space-y-3">
                           <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Bónus / Prêmios</label>
                           <input type="text" value={formBonus.toLocaleString('pt-AO')} onChange={e => setFormBonus(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white rounded-xl p-4 font-bold border border-slate-100" />
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-rose-50 rounded-[32px] space-y-4 md:col-span-2">
                     <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest">Descontos / Faltas (Total em KZ)</label>
                     <input type="text" value={formFaltas.toLocaleString('pt-AO')} onChange={e => setFormFaltas(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white border-2 border-rose-100 rounded-2xl p-5 font-black text-rose-600 text-2xl outline-none focus:border-rose-300" placeholder="0" />
                  </div>
               </div>
               
               <button type="submit" className="w-full py-5 bg-primary text-white rounded-[24px] font-black uppercase tracking-[3px] text-xs shadow-2xl shadow-primary/30 active:scale-95 transition-all">Confirmar e Gerar Recibo</button>
            </form>
          </div>
        </div>
      )}

      {/* Recibo Modal - Preservado do formato anterior profissional */}
      {showReceiptModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] max-w-[210mm] w-full max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-12 bg-white" id="recibo-para-impressao" style={{ minHeight: '297mm', width: '210mm', boxSizing: 'border-box' }}>
              <div className="flex justify-between items-start mb-12 border-b-2 border-primary pb-8">
                <div>
                  <h1 className="text-2xl font-black text-primary uppercase italic">{empresa?.nome || 'ENTIDADE EMPREGADORA'}</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">NIF: {empresa?.nif || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="bg-slate-950 text-white px-6 py-2 text-sm font-black uppercase tracking-widest inline-block">Recibo de Salário</p>
                  <p className="text-xs font-black text-primary uppercase mt-4">{selectedMonth} / {selectedYear}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                 <div className="border border-slate-100 p-6 rounded-2xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Colaborador</p>
                    <p className="text-lg font-black text-slate-900 uppercase leading-none">{selectedColab.nome}</p>
                    <p className="text-[10px] font-bold text-primary uppercase mt-2">{selectedColab.cargo}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pagamento via IBAN</p>
                    <p className="text-[11px] font-black font-mono text-slate-800 italic">{selectedColab.iban || 'NÃO DEFINIDO'}</p>
                 </div>
              </div>

              <table className="w-full text-[12px] mb-12">
                 <thead>
                    <tr className="bg-primary text-white font-black uppercase"><th className="p-4 text-left">Verbas Salariais</th><th className="p-4 text-right">Rendimentos</th><th className="p-4 text-right">Descontos</th></tr>
                 </thead>
                 <tbody className="divide-y border-x border-b">
                    <tr className="font-bold italic">
                       <td className="p-4 uppercase">Salário Base ({formDiasTrabalhados} dias)</td>
                       <td className="p-4 text-right">{formSalario.toLocaleString('pt-AO')} Kz</td>
                       <td className="p-4 text-right">-</td>
                    </tr>
                    {formAlimentacao > 0 && <tr><td className="p-4">Subsídio de Alimentação</td><td className="p-4 text-right">{formAlimentacao.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {formTransporte > 0 && <tr><td className="p-4">Subsídio de Transporte</td><td className="p-4 text-right">{formTransporte.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {formHorasExtra > 0 && <tr><td className="p-4">Horas Extra / Vantagens</td><td className="p-4 text-right">{formHorasExtra.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    
                    <tr><td className="p-4 text-slate-400 italic">INSSTrabalhador (3%)</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{currentCalc().valorINSS.toLocaleString('pt-AO')} Kz</td></tr>
                    <tr><td className="p-4 text-slate-400 italic">Retenção de I.R.T</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{currentCalc().valorIRT.toLocaleString('pt-AO')} Kz</td></tr>
                    {formFaltas > 0 && <tr className="text-rose-500 font-bold"><td className="p-4">Faltas e Penalizações</td><td className="p-4 text-right">-</td><td className="p-4 text-right">{formFaltas.toLocaleString('pt-AO')} Kz</td></tr>}
                    
                    <tr className="bg-slate-900 text-white font-black">
                       <td className="p-4">TOTAIS</td>
                       <td className="p-4 text-right">{currentCalc().totalBruto.toLocaleString('pt-AO')} Kz</td>
                       <td className="p-4 text-right">{currentCalc().totalDescontos.toLocaleString('pt-AO')} Kz</td>
                    </tr>
                 </tbody>
              </table>

              <div className="flex justify-between items-end pt-8 border-t border-dashed">
                 <div className="text-[9px] font-bold text-slate-400 uppercase max-w-[300px] leading-relaxed italic">
                    Declaramos que o montante líquido abaixo foi processado conforme a legislação laboral e fiscal em vigor na República de Angola.
                 </div>
                 <div className="bg-primary text-white p-8 rounded-[24px] shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Montante Líquido</p>
                    <p className="text-4xl font-black italic tracking-tighter">{currentCalc().salarioLiquido.toLocaleString('pt-AO')} Kz</p>
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
      )}
    </div>
  );
};

export default Processamento;

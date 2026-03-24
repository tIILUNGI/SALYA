import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';

const Processamento: React.FC = () => {
  const { empresa, colaboradores, empresaId, setMessage } = useContext(AppContext);
  const ativos = colaboradores.filter(c => c.status === 'Ativo' && (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId));
  
  const currentYear = new Date().getFullYear();
  const currentDay = new Date().getDate();
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedDay, setSelectedDay] = useState(currentDay.toString());

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
    setFormAlimentacao(30000);
    setFormTransporte(20000);
    setFormFerias(0);
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

  const monthToNum = (m: string) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].indexOf(m) + 1;

  const handleConfirmForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColab) return;

    try {
      const dto = {
        trabalhadorId: selectedColab.id,
        mes: monthToNum(selectedMonth),
        ano: parseInt(selectedYear),
        diasTrabalhados: 22,
        diasUteis: 22,
        diasAlimentacao: 1,
        diasTransporte: 1,
        valorDiaAlimentacao: formAlimentacao,
        valorDiaTransporte: formTransporte,
        outrosSubsidiosTotal: outrosSubsidios.reduce((acc: number, s: { valor: number }) => acc + s.valor, 0) + formFerias,
        horasExtraTotal: formHorasExtra,
        bonusTotal: formBonus,
        faltasTotal: formFaltas
      };

      const result = await api.post('/processamentos/processar-salario', dto);
      
      setCalcResults({
        totalBruto: result.totalBruto,
        valorINSS: result.descontos - (result.totalBruto - result.salarioLiquido - result.descontos), // Rough extraction if not returned explicitly
        valorIRT: 0, // Will be calculated below for display if backend doesn't split it
        totalDescontos: result.descontos,
        salarioLiquido: result.salarioLiquido
      });

      // Update results if backend provides more details
      if (result.valorINSS !== undefined) {
         setCalcResults({
           totalBruto: result.totalBruto,
           valorINSS: result.valorINSS,
           valorIRT: result.valorIRT,
           totalDescontos: result.descontos,
           salarioLiquido: result.salarioLiquido
         });
      }

      setShowFormModal(false);
      setShowReceiptModal(true);
    } catch (error) {
      setMessage({ title: 'Erro', text: 'Não foi possível processar o salário.', type: 'error' });
    }
  };

  const currentCalc = () => calcResults || { totalBruto: 0, valorINSS: 0, valorIRT: 0, totalDescontos: 0, salarioLiquido: 0 };

  const handleImprimir = () => {
    window.print();
  };

  const handleGuardar = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element) return;
    // @ts-ignore
    const opt = {
      margin: 0,
      filename: `Recibo_${selectedColab?.nome.replace(/ /g, '_')}_${selectedMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="p-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #recibo-para-impressao, #recibo-para-impressao * { visibility: visible !important; }
          #recibo-para-impressao {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 15mm !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-widest text-slate-800 dark:text-white uppercase">Processamento</h2>
          <p className="text-slate-500 text-sm font-medium">Controlo Mensal de Salários</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
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
            <input type="number" min="1" max="31" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 px-4 font-black text-sm outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
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
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{c.nome.substring(0, 2)}</div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{c.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-right font-black text-slate-700 dark:text-slate-300">{Number(c.salarioBase).toLocaleString()} Kz</td>
                <td className="p-6 text-center">
                  <button onClick={() => handleStartProcessar(c)} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20">Processar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showFormModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[90] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <h2 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">Entrada de Dados</h2>
                <div className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">{selectedColab.nome}</div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleConfirmForm} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Base (Kz)</label>
                <input required type="text" value={formSalario ? formSalario.toLocaleString('pt-AO') : ''} onChange={e => setFormSalario(Number(e.target.value.replace(/\D/g, '')))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-primary text-3xl focus:border-primary outline-none transition-all" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alimentação</label><input type="number" value={formAlimentacao === 0 ? '' : formAlimentacao} onChange={e => setFormAlimentacao(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transporte</label><input type="number" value={formTransporte === 0 ? '' : formTransporte} onChange={e => setFormTransporte(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold" /></div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outros Subsídios</h4>
                   <select onChange={handleAddSubsidio} className="text-[10px] bg-slate-900 text-white rounded-lg py-1.5 px-3 font-black uppercase tracking-widest cursor-pointer outline-none">
                     <option value="">+ Adicionar</option>
                     <option value="Subsídio de Chefia">Chefia</option>
                     <option value="Subsídio de Disponibilidade">Disponibilidade</option>
                     <option value="Gratificação">Gratificação</option>
                     <option value="Outro">Outro...</option>
                   </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {outrosSubsidios.map((s: { nome: string; valor: number }, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{s.nome}</label>
                          <button type="button" onClick={() => removeOutroSubsidio(idx)} className="text-red-400"><span className="material-symbols-outlined text-sm">close</span></button>
                       </div>
                       <input type="number" value={s.valor === 0 ? '' : s.valor} onChange={e => handleUpdateSubsidioValor(idx, Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl py-2 px-3 font-bold text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Horas Extra</label><input type="number" value={formHorasExtra === 0 ? '' : formHorasExtra} onChange={e => setFormHorasExtra(Number(e.target.value))} className="w-full px-5 py-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl font-bold" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Bónus</label><input type="number" value={formBonus === 0 ? '' : formBonus} onChange={e => setFormBonus(Number(e.target.value))} className="w-full px-5 py-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl font-bold" /></div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">Descontos / Faltas</label>
                <input type="number" value={formFaltas === 0 ? '' : formFaltas} onChange={e => setFormFaltas(Number(e.target.value))} className="w-full px-6 py-4 bg-red-50/30 border-2 border-red-50 rounded-3xl font-black text-red-600 text-xl" />
              </div>
              
              <button type="submit" className="w-full py-5 bg-primary text-white rounded-[24px] font-black flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 transition-all uppercase tracking-[4px] text-xs">
                Gerar Recibo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Subsídio Name Modal */}
      {showNewSubsidioModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4">Nome do Subsídio</h3>
            <input 
              autoFocus
              value={tempSubsidioName}
              onChange={e => setTempSubsidioName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold mb-6 outline-none focus:border-primary"
              onKeyDown={e => e.key === 'Enter' && handleCreateCustomSubsidio()}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewSubsidioModal(false); setTempSubsidioName(''); }} className="flex-1 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={handleCreateCustomSubsidio} className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Blue Style Receipt Modal with Full Info */}
      {showReceiptModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] max-w-[210mm] w-full max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-12 bg-white" id="recibo-para-impressao" style={{ minHeight: '297mm', width: '210mm', boxSizing: 'border-box', margin: '0 auto' }}>
              <div className="flex justify-between items-start mb-10 border-b-2 border-primary pb-8">
                <div>
                  <h1 className="text-2xl font-black text-primary uppercase tracking-tight">
                    {empresa?.categoria === 'Particular' ? `PATRONAL: ${empresa?.nome}` : (empresa?.nome || 'ENTIDADE')}
                  </h1>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">NIF: {empresa?.nif || '-'}</p>
                    <p className="text-[9px] font-medium text-slate-500 uppercase">{empresa?.endereco}, {empresa?.municipio}</p>
                    <p className="text-[9px] font-medium text-slate-500 uppercase">{empresa?.provincia} - Angola</p>
                    <div className="flex items-center gap-4 mt-2">
                       <p className="text-[9px] font-bold text-slate-600">TEL: {empresa?.telefone || '-'}</p>
                       <p className="text-[9px] font-bold text-slate-600">EMAIL: {empresa?.email || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black uppercase tracking-[5px] bg-primary text-white px-6 py-2 rounded-sm inline-block">Recibo</h2>
                  <p className="text-xs font-black mt-4 text-primary uppercase tracking-widest">{selectedMonth} / {selectedYear}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Emitido em: {selectedDay}/{new Date().getMonth()+1}/{selectedYear}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-10">
                <div className="border border-slate-100 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] mb-3">Beneficiário / Colaboração</h3>
                  <p className="text-base font-black uppercase text-slate-900">{selectedColab.nome}</p>
                  <p className="text-[10px] font-bold text-primary uppercase mt-1">{selectedColab.cargo}</p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-2">
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">BI / NIF</p><p className="text-[10px] font-black text-slate-700">{selectedColab.nif}</p></div>
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Nº Segurança Social</p><p className="text-[10px] font-black text-slate-700">{selectedColab.inss || '-'}</p></div>
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Nº Registo</p><p className="text-[10px] font-black text-slate-700">{selectedColab.numeroColaborador}</p></div>
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">E-mail</p><p className="text-[10px] font-black text-slate-700 lowercase">{selectedColab.email}</p></div>
                  </div>
                </div>
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col justify-center">
                  <h3 className="text-[9px] font-black text-primary/60 uppercase tracking-[3px] mb-4">Pagamento Bancário</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Instituição Bancária</p>
                      <p className="text-[11px] font-black text-slate-800 uppercase">{empresa?.banco || 'BANCO LOCAL'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">IBAN de Destino (Colaborador)</p>
                      <p className="text-[11px] font-black text-primary font-mono tracking-tighter">{selectedColab.iban || '-'}</p>
                    </div>
                    <div className="pt-2">
                       <span className="text-[8px] font-black text-primary/40 uppercase tracking-[2px]">Transferência Electrónica</span>
                    </div>
                  </div>
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
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/50 font-black"><td className="p-4">Vencimento Base Mensal</td><td className="p-4 text-right">{Number(formSalario).toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>
                    {formAlimentacao > 0 && <tr><td className="p-4">Subsídio de Alimentação</td><td className="p-4 text-right">{formAlimentacao.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {formTransporte > 0 && <tr><td className="p-4">Subsídio de Transporte</td><td className="p-4 text-right">{formTransporte.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {outrosSubsidios.map((s: { nome: string; valor: number }, idx: number) => (
                      <tr key={idx}><td className="p-4">{s.nome}</td><td className="p-4 text-right">{s.valor.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>
                    ))}
                    {formHorasExtra > 0 && <tr><td className="p-4">Remuneração Extra (H.E)</td><td className="p-4 text-right">{formHorasExtra.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    {formBonus > 0 && <tr><td className="p-4">Bónus e Variáveis</td><td className="p-4 text-right">{formBonus.toLocaleString('pt-AO')} Kz</td><td className="p-4 text-right">-</td></tr>}
                    
                    <tr><td className="p-4 italic text-slate-400">Segurança Social Trabalhador ({empresa?.taxaINSS || 3}%)</td><td className="p-4 text-right">-</td><td className="p-4 text-right text-slate-600">- {currentCalc().valorINSS.toLocaleString('pt-AO')} Kz</td></tr>
                    <tr><td className="p-4 italic text-slate-400">I.R.T (Retenção na Fonte)</td><td className="p-4 text-right">-</td><td className="p-4 text-right text-slate-600">- {currentCalc().valorIRT.toLocaleString('pt-AO')} Kz</td></tr>
                    {formFaltas > 0 && <tr className="text-red-500 font-bold"><td className="p-4">Total Descontos / Faltas</td><td className="p-4 text-right">-</td><td className="p-4 text-right">- {formFaltas.toLocaleString('pt-AO')} Kz</td></tr>}
                    
                    <tr className="bg-primary/5 font-black border-t-2 border-primary">
                      <td className="p-4 uppercase text-[10px] text-primary">Saldo do Documento</td>
                      <td className="p-4 text-right text-primary">{currentCalc().totalBruto.toLocaleString('pt-AO')} Kz</td>
                      <td className="p-4 text-right text-primary">{currentCalc().totalDescontos.toLocaleString('pt-AO')} Kz</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end mb-16">
                <div className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed max-w-[300px]">
                   A importância líquida foi creditada na conta bancária acima mencionada, conforme regulamento interno e legislação vigente.
                </div>
                <div className="bg-primary text-white p-8 rounded-2xl w-full max-w-[400px] flex justify-between items-center shadow-xl">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[4px] text-white/60 mb-1">Montante Líquido</p>
                    <p className="text-3xl font-black">{currentCalc().salarioLiquido.toLocaleString('pt-AO')} Kz</p>
                  </div>
                  <span className="material-symbols-outlined text-4xl opacity-30">account_balance_wallet</span>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-100 pt-8 flex justify-between items-center">
                 <p className="text-[8px] font-bold text-slate-300 italic">Documento processado por computador - Software SALYA ERP</p>
                 <div className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[10px]">workspace_premium</span>
                    Garantia de Processamento
                 </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t flex gap-4 no-print sticky bottom-0 z-10 w-full rounded-b-[32px]">
              <button onClick={handleGuardar} className="flex-1 py-4 bg-white text-primary border-2 border-primary/20 rounded-2xl font-black flex items-center justify-center gap-3 tracking-widest text-[10px] active:scale-95 transition-all shadow-sm"><span className="material-symbols-outlined">description</span> GUARDAR PDF</button>
              <button onClick={handleImprimir} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 tracking-widest text-[10px] active:scale-95 transition-all shadow-lg shadow-primary/20"><span className="material-symbols-outlined">print</span> IMPRIMIR RECIBO</button>
              <button onClick={() => setShowReceiptModal(false)} className="px-10 py-4 bg-slate-200 text-slate-500 rounded-2xl font-black text-[10px] hover:bg-slate-300 transition-all uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Processamento;

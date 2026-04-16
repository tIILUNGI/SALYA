import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api, API_BASE_URL } from '../services/api';
import Swal from 'sweetalert2';

interface Documento {
  id: number;
  titulo: string;
  tipoDocumento: string;
  dataValidade?: string;
  arquivoUrl?: string;
}

const TABS = [
  { id: 'Identificacao', label: 'Identificação' },
  { id: 'Documentos', label: 'Documentos' },
  { id: 'Dados Fiscais', label: 'Dados Fiscais' },
  { id: 'SubsidiosFerias', label: 'Subsídios e Férias' },
  { id: 'RegimeProtecao', label: 'Regime de Proteção' },
  { id: 'InformacaoProfissional', label: 'Informação Profissional' },
  { id: 'Contrato', label: 'Contrato' }
] as const;

type TabId = typeof TABS[number]['id'];

const Colaboradores: React.FC = () => {
  const { colaboradores, setColaboradores, empresaId, setMessage } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ativo' | 'Inativo'>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<TabId>('Identificacao');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Documentos state
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docForm, setDocForm] = useState({ titulo: '', tipoDocumento: 'Contrato', dataValidade: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  const fetchDocumentos = useCallback(async (colabId: number) => {
    try {
      const data = await api.get(`/documentos/colaborador/${colabId}`);
      setDocumentos(Array.isArray(data) ? data : []);
    } catch { setDocumentos([]); }
  }, []);

  const handleAddDocumento = async () => {
    if (!editingId || !docForm.titulo) return;
    setDocLoading(true);
    const colabId = editingId;
    try {
      if (docFile) {
        const formData = new FormData();
        formData.append('titulo', docForm.titulo);
        formData.append('tipoDocumento', docForm.tipoDocumento);
        if (docForm.dataValidade) {
          formData.append('dataValidade', docForm.dataValidade);
        }
        formData.append('colaboradorId', String(colabId));
        formData.append('file', docFile);
        await api.postForm('/documentos', formData);
      } else {
        await api.post('/documentos', { ...docForm, colaboradorId: colabId });
      }
      await fetchDocumentos(colabId);
      setDocForm({ titulo: '', tipoDocumento: 'Contrato', dataValidade: '' });
      setDocFile(null);
      setShowDocForm(false);
      setMessage({ title: 'Sucesso', text: 'Documento adicionado.', type: 'success' });
    } catch (error: any) {
      console.error('Erro ao adicionar documento:', error);
    } finally { setDocLoading(false); }
  };

  const handleDeleteDocumento = async (docId: number) => {
    const result = await Swal.fire({
      title: 'Eliminar Documento',
      text: 'Tem a certeza que deseja eliminar este documento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/documentos/${docId}`);
        setDocumentos(prev => prev.filter(d => d.id !== docId));
        Swal.fire({ title: 'Eliminado', text: 'Documento removido com sucesso!', icon: 'success', confirmButtonColor: '#22c55e' });
      } catch { /**/ }
    }
  };
  
  const [formData, setFormData] = useState<Partial<Colaborador>>({
    nome: '', numeroColaborador: '', nif: '', inss: '', cargo: '', tipoContrato: 'Contrato por Tempo Indeterminado',
    salarioBase: 0, status: 'Ativo', email: '', iban: '', dataAdmissao: new Date().toISOString().split('T')[0],
    subsidioAlimentacao: 0, subsidioTransporte: 0, regimeFiscal: 'Geral', estadoCivil: 'Solteiro(a)', genero: 'Masculino'
  });

  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const refreshColaboradores = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`);
      setColaboradores(normalizeList(data, 'colaboradores'));
    } catch (error) { console.error('Error refreshing colaboradores:', error); }
  }, [empresaId, setColaboradores]);

  useEffect(() => { refreshColaboradores(); }, [empresaId, refreshColaboradores]);

  const filteredColaboradores = colaboradores.filter(c => {
    const isFromCompany = !empresaId || !c.empresaId || c.empresaId === empresaId;
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (c.nif && c.nif.includes(searchTerm)) || (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : c.status === filter;
    return isFromCompany && matchesSearch && matchesFilter;
  });

  const handleOpenModal = (colab?: Colaborador) => {
    if (colab) {
      setEditingId(colab.id);
      setFormData(colab);
    } else {
      setEditingId(null);
      setFormData({
        nome: '', numeroColaborador: '', nif: '', inss: '', cargo: '', tipoContrato: 'Contrato por Tempo Indeterminado',
        salarioBase: 0, status: 'Ativo', email: '', dataAdmissao: new Date().toISOString().split('T')[0],
        subsidioAlimentacao: 0, subsidioTransporte: 0, regimeFiscal: 'Geral', estadoCivil: 'Solteiro(a)', genero: 'Masculino',
        empresaId: empresaId || undefined
      });
    }
    setModalTab('Identificacao');
    setIsModalOpen(true);
  };

  const currentTabIndex = TABS.findIndex(t => t.id === modalTab);
  const isLastTab = currentTabIndex === TABS.length - 1;

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLastTab) {
      const nextTab = TABS[currentTabIndex + 1].id;
      setModalTab(nextTab);
      if (nextTab === 'Documentos' && editingId) fetchDocumentos(editingId);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentTabIndex > 0) {
      setModalTab(TABS[currentTabIndex - 1].id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitizedData = { ...formData };
      ['email', 'nif', 'telefone', 'iban', 'inss', 'numeroColaborador'].forEach(key => {
        if (sanitizedData[key as keyof Colaborador] === '') (sanitizedData as any)[key] = null;
      });
      const dataToSave = { ...sanitizedData, empresaId: empresaId || undefined };
      if (!editingId) {
        await api.post('/trabalhadores', dataToSave);
        setMessage({ title: 'Sucesso', text: 'Colaborador cadastrado com sucesso!', type: 'success' });
      } else {
        await api.put(`/trabalhadores/${editingId}`, dataToSave);
        setMessage({ title: 'Sucesso', text: 'Dados atualizados com sucesso!', type: 'success' });
      }
      refreshColaboradores();
      setIsModalOpen(false);
    } catch (error: any) { console.error('Erro ao salvar colaborador:', error); }
  };

  const handleDelete = (id: number) => {
    const colab = colaboradores.find(c => c.id === id);
    if (!colab) return;
    Swal.fire({
      title: 'Remover Colaborador',
      text: `Tem a certeza que deseja eliminar o colaborador "${colab.nome}"? Esta acção removerá todos os registros associados.`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sim, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#e11d48', cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/trabalhadores/${id}`);
          Swal.fire({ title: 'Removido', text: 'Colaborador removido com sucesso!', icon: 'success', confirmButtonColor: '#22c55e' });
          refreshColaboradores();
        } catch { /**/ }
      }
    });
  };

  return (
    <div className="p-8 font-app">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 uppercase tracking-widest">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white">Recursos Humanos</h1>
          </div>
          <p className="text-slate-500 text-xs font-bold opacity-60 ml-4">Gestão de Colaboradores e Fichas Individuais</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 h-12 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px]">person_add</span> NOVO FUNCIONÁRIO
        </button>
      </div>

      <div className="glass-card p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input 
            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all" 
            placeholder="PESQUISAR FUNCIONÁRIO..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           {['All', 'Ativo', 'Inativo'].map(f => (
             <button key={f} onClick={() => setFilter(f as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
               {f === 'All' ? 'TODOS' : f}
             </button>
           ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 font-app">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">FUNCIONÁRIO</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTRATO / NIF</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">STATUS</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredColaboradores.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg">{c.nome.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{c.nome}</p>
                      <p className="text-[10px] font-bold text-primary uppercase">{c.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{c.tipoContrato}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.nif || 'NIF NÃO REGISTADO'}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                   <div className="flex justify-end gap-3 no-print">
                      <button onClick={() => handleOpenModal(c)} className="size-9 bg-slate-100 text-slate-400 rounded-lg hover:text-primary transition-all flex items-center justify-center"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => handleDelete(c.id)} className="size-9 bg-rose-50 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 rounded-[40px] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white/20">
            {/* Modal Header com Tabs Polidas */}
            <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar no-print">
               {TABS.map((tab) => (
                 <button 
                   key={tab.id} type="button" 
                   onClick={() => { 
                     setModalTab(tab.id);
                     if (tab.id === 'Documentos' && editingId) fetchDocumentos(editingId);
                   }} 
                   className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex-shrink-0 ${modalTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   {tab.label}
                 </button>
               ))}
               <button onClick={() => setIsModalOpen(false)} className="ml-auto size-10 rounded-full bg-white/5 text-slate-500 hover:text-white flex items-center justify-center transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-12 bg-white dark:bg-slate-950 custom-scrollbar relative">
              {modalTab === 'Identificacao' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-up duration-500">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nome Completo</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white outline-none font-black text-slate-800 transition-all text-lg" placeholder="NOME DO FUNCIONÁRIO" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Gênero</label>
                    <select value={formData.genero || 'Masculino'} onChange={e => setFormData({...formData, genero: e.target.value as any})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800">
                        <option value="Masculino">MASCULINO</option>
                        <option value="Feminino">FEMININO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data de Nascimento</label>
                    <input type="date" value={formData.dataNascimento || ''} onChange={e => setFormData({...formData, dataNascimento: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado Civil</label>
                    <select value={formData.estadoCivil || 'Solteiro(a)'} onChange={e => setFormData({...formData, estadoCivil: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800">
                        <option value="Solteiro(a)">SOLTEIRO(A)</option>
                        <option value="Casado(a)">CASADO(A)</option>
                        <option value="Divorciado(a)">DIVORCIADO(A)</option>
                        <option value="Viúvo(a)">VIÚVO(A)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Número de Bilhete (BI)</label>
                    <input required type="text" value={formData.bi || ''} onChange={e => setFormData({...formData, bi: e.target.value.toUpperCase()})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800" placeholder="000000000LA000" />
                  </div>
                </div>
              )}

              {/* Demais Abas seguem o mesmo padrão polido */}
              {modalTab === 'Documentos' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center border-b pb-6">
                      <h3 className="text-xl font-black uppercase text-slate-800">Arquivo Digital</h3>
                      <button type="button" onClick={() => setShowDocForm(!showDocForm)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span> {showDocForm ? 'Fechar' : 'Novo Documento'}
                      </button>
                   </div>
                   {showDocForm && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                        <div className="space-y-4">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Ficheiro</label>
                           <input type="text" value={docForm.titulo} onChange={e => setDocForm({...docForm, titulo: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-transparent focus:border-primary outline-none font-black" placeholder="EX: CÓPIA BI" />
                        </div>
                        <div className="space-y-4">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficheiro (PDF/IMG)</label>
                           <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className="w-full px-5 py-3 rounded-2xl bg-white border-none font-bold text-xs" />
                        </div>
                        <button type="button" onClick={handleAddDocumento} disabled={docLoading} className="md:col-span-2 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs">Carregar Agora</button>
                     </div>
                   )}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {documentos.map(doc => (
                       <div key={doc.id} className="p-5 border border-slate-100 rounded-[24px] bg-slate-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-3xl">description</span>
                            <div>
                               <p className="text-sm font-black text-slate-800 uppercase leading-none">{doc.titulo}</p>
                               <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{doc.tipoDocumento}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => handleDeleteDocumento(doc.id)} className="text-rose-400 hover:text-rose-600"><span className="material-symbols-outlined">delete</span></button>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {modalTab === 'Dados Fiscais' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">NIF (Número de Contribuinte)</label>
                      <input type="text" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black text-lg outline-none focus:ring-2 focus:ring-primary" placeholder="000000000" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Regime Fiscal</label>
                      <select value={formData.regimeFiscal || 'Geral'} onChange={e => setFormData({...formData, regimeFiscal: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none">
                          <option value="Geral">REGIME GERAL</option>
                          <option value="Simplificado">REGIME SIMPLIFICADO</option>
                          <option value="Isento">ISENTO</option>
                      </select>
                    </div>
                 </div>
              )}

              {modalTab === 'SubsidiosFerias' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                   <div className="md:col-span-2 p-8 bg-primary/5 rounded-[32px] border-2 border-primary/10">
                      <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Salário Base Mensal (KZ)</label>
                      <input type="text" value={formData.salarioBase?.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, salarioBase: Number(e.target.value.replace(/\D/g, ''))})} className="w-full bg-transparent border-none outline-none font-black text-primary text-5xl tracking-tighter" placeholder="0,00" />
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Subsídio Alimentação</label>
                      <input type="text" value={formData.subsidioAlimentacao?.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioAlimentacao: Number(e.target.value.replace(/\D/g, ''))})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" />
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Subsídio Transporte</label>
                      <input type="text" value={formData.subsidioTransporte?.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioTransporte: Number(e.target.value.replace(/\D/g, ''))})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" />
                   </div>
                </div>
              )}

              {modalTab === 'RegimeProtecao' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Número INSS</label>
                      <input type="text" value={formData.inss || ''} onChange={e => setFormData({...formData, inss: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" placeholder="00000000" />
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">IBAN Pagamento</label>
                      <input type="text" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black font-mono outline-none" placeholder="AO06..." />
                   </div>
                </div>
              )}

              {modalTab === 'InformacaoProfissional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Função</label>
                      <input required type="text" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" placeholder="EX: ANALISTA" />
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Departamento</label>
                      <input type="text" value={formData.departamento || ''} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" placeholder="EX: FINANCEIRO" />
                   </div>
                </div>
              )}

              {modalTab === 'Contrato' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Admissão</label>
                      <input required type="date" value={formData.dataAdmissao || ''} onChange={e => setFormData({...formData, dataAdmissao: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none" />
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Contrato</label>
                      <select value={formData.tipoContrato || 'Indeterminado'} onChange={e => setFormData({...formData, tipoContrato: e.target.value as any})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none">
                         <option value="Indeterminado">INDETERMINADO</option>
                         <option value="Termo Certo">TERMO CERTO</option>
                         <option value="Estagiário">ESTAGIÁRIO</option>
                      </select>
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                      <select value={formData.status || 'Ativo'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-black outline-none">
                         <option value="Ativo">ATIVO</option>
                         <option value="Inativo">INATIVO</option>
                      </select>
                   </div>
                </div>
              )}

              {/* Modal Footer dinâmico */}
              <div className="mt-16 flex items-center justify-between gap-6 border-t pt-10">
                 <button type="button" onClick={handlePrev} disabled={currentTabIndex === 0} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTabIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Anterior</button>
                 <div className="flex gap-4 w-full md:w-auto">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                    {!isLastTab ? (
                      <button type="button" onClick={handleNext} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Seguinte</button>
                    ) : (
                      <button type="submit" className="px-12 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">Finalizar Cadastro</button>
                    )}
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colaboradores;

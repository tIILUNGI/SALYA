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

const Colaboradores: React.FC = () => {
  const { colaboradores, setColaboradores, empresaId, setMessage } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ativo' | 'Inativo'>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'Identificacao' | 'Documentos' | 'Dados Fiscais' | 'SubsidiosFerias' | 'RegimeProtecao' | 'InformacaoProfissional' | 'Contrato'>('Identificacao');
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
    Swal.fire({
      title: 'Eliminar Documento',
      text: 'Tem a certeza que deseja eliminar este documento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/documentos/${docId}`);
          setDocumentos(prev => prev.filter(d => d.id !== docId));
          Swal.fire({
            title: 'Eliminado',
            text: 'Documento removido com sucesso!',
            icon: 'success',
            confirmButtonColor: '#22c55e',
          });
        } catch { /**/ }
      }
    });
  };
  
  const [formData, setFormData] = useState<Partial<Colaborador>>({
    nome: '',
    numeroColaborador: '',
    nif: '',
    inss: '',
    cargo: '',
    tipoContrato: 'Contrato por Tempo Indeterminado',
    salarioBase: 0,
    status: 'Ativo',
    email: '',
    iban: '',
    dataAdmissao: new Date().toISOString().split('T')[0],
    subsidioAlimentacao: 0,
    subsidioTransporte: 0,
    regimeFiscal: 'Geral',
    estadoCivil: 'Solteiro(a)',
    genero: 'Masculino'
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
    } catch (error) {
      console.error('Error refreshing colaboradores:', error);
    }
  }, [empresaId, setColaboradores]);

  useEffect(() => {
    refreshColaboradores();
  }, [empresaId, refreshColaboradores]);

  const filteredColaboradores = colaboradores.filter(c => {
    const isFromCompany = !empresaId || !c.empresaId || c.empresaId === empresaId;
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.nif && c.nif.includes(searchTerm)) || 
                         (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
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
        nome: '', 
        numeroColaborador: '', 
        nif: '', 
        inss: '', 
        cargo: '', 
        tipoContrato: 'Contrato por Tempo Indeterminado', 
        salarioBase: 0, 
        status: 'Ativo', 
        email: '', 
        dataAdmissao: new Date().toISOString().split('T')[0],
        subsidioAlimentacao: 0,
        subsidioTransporte: 0,
        regimeFiscal: 'Geral',
        empresaId: empresaId || undefined
      });
    }
    setModalTab('Identificacao');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitizedData = { ...formData };
      ['email', 'nif', 'telefone', 'iban', 'inss', 'numeroColaborador'].forEach(key => {
        if (sanitizedData[key as keyof Colaborador] === '') {
          (sanitizedData as any)[key] = null;
        }
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
    } catch (error: any) {
      console.error('Erro ao salvar colaborador:', error);
    }
  };

  const handleDelete = (id: number) => {
    const colab = colaboradores.find(c => c.id === id);
    if (!colab) return;
    Swal.fire({
      title: 'Remover Colaborador',
      text: `Tem a certeza que deseja eliminar o colaborador "${colab.nome}"? Esta acção removerá todos os registros associados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/trabalhadores/${id}`);
          Swal.fire({ title: 'Removido', text: 'Colaborador removido com sucesso!', icon: 'success', confirmButtonColor: '#22c55e' });
          refreshColaboradores();
        } catch (error: any) {
          console.error('Erro ao remover colaborador:', error);
          setMessage({ title: 'Erro', text: error?.message || 'Não foi possível remover o colaborador.', type: 'error' });
        }
      }
    });
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white uppercase">Recursos Humanos</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-4">Gestão de Funcionários e Informações Contratuais (Padrão Primavera ERP).</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Novo Funcionário
        </button>
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 w-full max-w-md items-center gap-3">
            <div className="relative w-full group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all" 
                placeholder="Pesquisar por nome, NIF ou cargo..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFilter('All')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'All' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Todos
            </button>
            <button onClick={() => setFilter('Ativo')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'Ativo' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Ativos
            </button>
            <button onClick={() => setFilter('Inativo')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'Inativo' ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Inativos
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato / NIF</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Base</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredColaboradores.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{c.nome.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.nome}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cargo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.tipoContrato}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.nif}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-primary">{(c.salarioBase || 0).toLocaleString()} Kz</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleOpenModal(c)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-900 dark:bg-black text-white p-2 gap-1 overflow-x-auto whitespace-nowrap">
               {[
                 { id: 'Identificacao', label: 'Identificação' },
                 { id: 'Documentos', label: 'Documentos' },
                 { id: 'Dados Fiscais', label: 'Dados Fiscais' },
                 { id: 'SubsidiosFerias', label: 'Subsidios e Ferias' },
                 { id: 'RegimeProtecao', label: 'Regime de proteção' },
                 { id: 'InformacaoProfissional', label: 'Informação Profissional' },
                 { id: 'Contrato', label: 'Contrato' }
               ].map((tab) => (
                 <button 
                   key={tab.id}
                   type="button" 
                   onClick={() => { 
                     setModalTab(tab.id as any);
                     if (tab.id === 'Documentos' && editingId) fetchDocumentos(editingId);
                   }} 
                   className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${modalTab === tab.id ? 'bg-primary text-white' : 'text-slate-400 hover:bg-white/5'}`}
                 >
                   {tab.label}
                 </button>
               ))}
               <button 
                onClick={() => { setIsModalOpen(false); setDocumentos([]); setShowDocForm(false); setDocFile(null); }}
                className="ml-auto size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-slate-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {modalTab === 'Identificacao' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value.replace(/[0-9]/g, '')})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Nome Completo do Funcionário" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gênero</label>
                    <select value={formData.genero || 'Masculino'} onChange={e => setFormData({...formData, genero: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                    <input type="date" value={formData.dataNascimento || ''} onChange={e => setFormData({...formData, dataNascimento: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado Civil</label>
                    <select value={formData.estadoCivil || 'Solteiro(a)'} onChange={e => setFormData({...formData, estadoCivil: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Número de BI</label>
                    <input required type="text" value={formData.bi || ''} onChange={e => setFormData({...formData, bi: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="123456789LA041" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                    <input type="text" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="+244 ..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="email@exemplo.com" />
                  </div>
                   <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Morada / Endereço</label>
                    <input type="text" value={formData.endereco || ''} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Rua, Bairro..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Município</label>
                    <input type="text" value={formData.municipio || ''} onChange={e => setFormData({...formData, municipio: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Luanda, Belas..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Província</label>
                    <input type="text" value={formData.provincia || ''} onChange={e => setFormData({...formData, provincia: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Luanda" />
                  </div>
                </div>
              )}

              {modalTab === 'Documentos' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo Digital do Funcionário</p>
                    <button type="button" onClick={() => setShowDocForm(s => !s)} className="text-xs font-black bg-primary/10 text-primary px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-1 hover:bg-primary hover:text-white transition-all">
                      <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span>
                      {showDocForm ? 'Cancelar' : 'Anexar Documento'}
                    </button>
                  </div>
                  {showDocForm && (
                     <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Documento</label>
                            <select value={docForm.tipoDocumento} onChange={e => setDocForm({...docForm, tipoDocumento: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none">
                              {['BI','Certificado','Contrato','Seguro','Certificado Médico','Outro'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Validade</label>
                            <input type="date" value={docForm.dataValidade} onChange={e => setDocForm({...docForm, dataValidade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título / Descrição</label>
                          <input type="text" value={docForm.titulo} onChange={e => setDocForm({...docForm, titulo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none" placeholder="Ex: Cópia do BI de Identidade" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecionar Ficheiro</label>
                          <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold" />
                        </div>
                        <button type="button" onClick={handleAddDocumento} disabled={docLoading || !docForm.titulo} className="w-full py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all">
                          {docLoading ? 'A processar...' : 'Carregar Documento'}
                        </button>
                     </div>
                  )}
                  {documentos.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center">
                       <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">folder_managed</span>
                       <p className="font-black text-slate-500 text-sm uppercase">Nenhum documento digitalizado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documentos.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                           <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary">description</span>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{doc.titulo}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black">{doc.tipoDocumento} {doc.dataValidade && `· Expira: ${new Date(doc.dataValidade).toLocaleDateString()}`}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                             {doc.arquivoUrl && <a href={`${API_BASE_URL}${doc.arquivoUrl}`} target="_blank" rel="noreferrer" className="p-2 bg-white dark:bg-slate-700 rounded-lg text-primary shadow-sm"><span className="material-symbols-outlined text-sm">visibility</span></a>}
                             <button type="button" onClick={() => handleDeleteDocumento(doc.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'Dados Fiscais' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIF (Número de Contribuinte)</label>
                    <input required type="text" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '').slice(0, 9)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black" placeholder="000.000.000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regime Fiscal</label>
                    <select value={formData.regimeFiscal || 'Geral'} onChange={e => setFormData({...formData, regimeFiscal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Geral">Regime Geral</option>
                        <option value="Simplificado">Regime Simplificado</option>
                        <option value="Isento">Isento</option>
                    </select>
                  </div>
                </div>
              )}

              {modalTab === 'SubsidiosFerias' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                   <div>
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Salário Base Mensal (Kz)</label>
                    <input required type="text" value={formData.salarioBase === 0 || !formData.salarioBase ? '' : formData.salarioBase.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, salarioBase: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 bg-primary/5 outline-none focus:border-primary font-black text-primary text-lg" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Alimentação (Kz)</label>
                    <input type="text" value={formData.subsidioAlimentacao === 0 || !formData.subsidioAlimentacao ? '' : formData.subsidioAlimentacao.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioAlimentacao: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Transporte (Kz)</label>
                    <input type="text" value={formData.subsidioTransporte === 0 || !formData.subsidioTransporte ? '' : formData.subsidioTransporte.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioTransporte: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Férias Acumulado (Kz)</label>
                    <input type="text" value={formData.subsidioFerias === 0 || !formData.subsidioFerias ? '' : formData.subsidioFerias.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioFerias: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="0" />
                  </div>
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Natal Acumulado (Kz)</label>
                    <input type="text" value={formData.subsidioNatal === 0 || !formData.subsidioNatal ? '' : formData.subsidioNatal.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsidioNatal: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="0" />
                  </div>
                </div>
              )}

              {modalTab === 'RegimeProtecao' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Número Segurança Social (INSS)</label>
                    <input type="text" value={formData.inss || ''} onChange={e => setFormData({...formData, inss: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black" placeholder="0000000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regime de Segurança Social</label>
                    <select value={formData.regimeSegurancaSocial || 'Trabalhador por Conta de Outrem'} onChange={e => setFormData({...formData, regimeSegurancaSocial: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Trabalhador por Conta de Outrem">Trabalhador por Conta de Outrem</option>
                        <option value="Trabalhador Independente">Trabalhador Independente</option>
                        <option value="Membro de Órgão Estatutário">Membro de Órgão Estatutário</option>
                    </select>
                  </div>
                   <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dados Bancários (IBAN Pagamento)</label>
                    <input type="text" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-mono font-bold" placeholder="AO06 0000 0000 0000 0000 0000 0" />
                  </div>
                </div>
              )}

              {modalTab === 'InformacaoProfissional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo / Função</label>
                    <input required type="text" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: Analista de Sistemas" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Departamento</label>
                    <input type="text" value={formData.departamento || ''} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: Tecnologias de Informação" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Centro de Custo</label>
                    <input type="text" value={formData.centroCusto || ''} onChange={e => setFormData({...formData, centroCusto: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: SEDE-MT" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Modalidade de Trabalho</label>
                    <select value={formData.modalidade || 'Tempo Inteiro'} onChange={e => setFormData({...formData, modalidade: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Tempo Inteiro">Tempo Inteiro</option>
                        <option value="Tempo Parcial">Tempo Parcial</option>
                        <option value="Teletrabalho">Teletrabalho</option>
                    </select>
                  </div>
                </div>
              )}

              {modalTab === 'Contrato' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nº Cadastro Interno</label>
                    <input type="text" value={formData.numeroColaborador || ''} onChange={e => setFormData({...formData, numeroColaborador: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black" placeholder="CAD-001" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Contrato</label>
                    <select value={formData.tipoContrato || 'Efectivo'} onChange={e => setFormData({...formData, tipoContrato: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Contrato a Termo Certo">Contrato a Termo Certo</option>
                        <option value="Contrato a Termo Incerto">Contrato a Termo Incerto</option>
                        <option value="Estagiário">Estagiário</option>
                        <option value="Prestador de Serviço">Prestador de Serviço</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Admissão</label>
                    <input required type="date" value={formData.dataAdmissao || ''} onChange={e => setFormData({...formData, dataAdmissao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Data de Exoneração / Fim (Opcional)</label>
                    <input type="date" value={formData.fimContrato || ''} onChange={e => setFormData({...formData, fimContrato: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-amber-100 bg-amber-50/50 outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                  </div>
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status da Colaboração</label>
                    <select value={formData.status || 'Ativo'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                        <option value="Ativo">Ativo</option>
                        <option value="Afastado">Afastado</option>
                        <option value="Desligado">Desligado</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="mt-12 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                 <p className="text-[9px] font-bold text-slate-400 uppercase hidden md:block">Preencha todos os campos obrigatórios em cada aba para garantir a conformidade legal do cadastro.</p>
                 <div className="flex gap-3 w-full md:w-auto">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-xl border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                    <button type="submit" className="flex-1 md:flex-none px-12 py-4 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">Finalizar Cadastro</button>
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

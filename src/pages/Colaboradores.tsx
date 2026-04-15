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
  const [modalTab, setModalTab] = useState<'Pessoais' | 'Contratuais' | 'Documentos'>('Pessoais');
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
      // O erro já foi notificado pelo api.ts ou pode ser tratado aqui se necessário
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
    dataAdmissao: new Date().toISOString().split('T')[0]
  });

  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const refreshColaboradores = async () => {
    if (!empresaId) return;
    try {
      const data = await api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`);
      setColaboradores(normalizeList(data, 'colaboradores'));
    } catch (error) {
      console.error('Error refreshing colaboradores:', error);
    }
  };

  // Carregar colaboradores quando o componente montar ou empresaId mudar
  useEffect(() => {
    refreshColaboradores();
  }, [empresaId]);

  const filteredColaboradores = colaboradores.filter(c => {
    // Se não há empresa selecionada, mostrar todos os colaboradores
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
        empresaId: empresaId || undefined
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Limpar campos de string vazia para null para evitar conflitos de restrição única no backend
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
          Swal.fire({
            title: 'Removido',
            text: 'Colaborador removido com sucesso!',
            icon: 'success',
            confirmButtonColor: '#22c55e',
          });
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
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Colaboradores</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-4">Gerencie informações, contratos e status da sua equipe.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Novo Cadastro
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
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
          {filteredColaboradores.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">person_off</span>
              <p className="text-slate-400 text-sm font-medium">Nenhum colaborador encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-black text-white">
              <h3 className="text-lg font-black uppercase tracking-widest">{editingId ? 'Editar Cadastro' : 'Novo Colaborador'}</h3>
              <div className="flex gap-4">
                <button type="button" onClick={() => setModalTab('Pessoais')} className={`text-xs font-black uppercase tracking-widest ${modalTab === 'Pessoais' ? 'text-primary' : 'text-slate-500'}`}>Pessoais</button>
                <button type="button" onClick={() => setModalTab('Contratuais')} className={`text-xs font-black uppercase tracking-widest ${modalTab === 'Contratuais' ? 'text-primary' : 'text-slate-500'}`}>Contratuais</button>
                <button type="button" onClick={() => { setModalTab('Documentos'); if (editingId) fetchDocumentos(editingId); }} className={`text-xs font-black uppercase tracking-widest ${modalTab === 'Documentos' ? 'text-primary' : 'text-slate-500'}`}>Documentos</button>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setDocumentos([]); setShowDocForm(false); setModalTab('Pessoais'); setDocFile(null); }}
                className="size-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8">
              {modalTab === 'Pessoais' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value.replace(/[0-9]/g, '')})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: João Paulo" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Número de BI</label>
                  <input required type="text" value={formData.bi || ''} onChange={e => setFormData({...formData, bi: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: 123456789AB" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIF</label>
                  <input required type="text" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '').slice(0, 9)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: 123456789" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                  <input type="text" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="+244 ..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                  <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="exemplo@email.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Morada</label>
                  <input type="text" value={formData.morada || ''} onChange={e => setFormData({...formData, morada: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Rua..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Departamento</label>
                  <input type="text" value={formData.departamento || ''} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: TI" />
                </div>
              </div>
              ) : modalTab === 'Contratuais' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo / Função</label>
                  <input required type="text" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value.replace(/[0-9]/g, '')})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" placeholder="Ex: Técnico de TI" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Contrato</label>
                  <select value={formData.tipoContrato || 'Efectivo'} onChange={e => setFormData({...formData, tipoContrato: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Prestador">Prestador</option>
                    <option value="Estagiário">Estagiário</option>
                    <option value="Contrato a Termo Certo">Contrato a Termo Certo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salário Base (Kz)</label>
                  <input required type="text" value={formData.salarioBase === 0 || !formData.salarioBase ? '' : formData.salarioBase.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, salarioBase: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black text-primary" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Admissão</label>
                  <input required type="date" value={formData.dataAdmissao || ''} onChange={e => setFormData({...formData, dataAdmissao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Fim de Contrato (opcional)</label>
                  <input type="date" value={formData.fimContrato || ''} onChange={e => setFormData({...formData, fimContrato: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Modalidade</label>
                  <select value={formData.modalidade || 'Tempo Inteiro'} onChange={e => setFormData({...formData, modalidade: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                    <option value="Tempo Inteiro">Tempo Inteiro</option>
                    <option value="Tempo Parcial">Tempo Parcial</option>
                    <option value="Prestação de Serviços">Prestação de Serviços</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Férias (Kz)</label>
                  <input type="text" value={formData.subsudioFerias === 0 || !formData.subsudioFerias ? '' : formData.subsudioFerias.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsudioFerias: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black text-primary" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subsídio de Natal (Kz)</label>
                  <input type="text" value={formData.subsudioNatal === 0 || !formData.subsudioNatal ? '' : formData.subsudioNatal.toLocaleString('pt-AO')} onChange={e => setFormData({...formData, subsudioNatal: Number(e.target.value.replace(/\D/g, '')) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black text-primary" placeholder="0" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IBAN</label>
                  <input required type="text" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 25)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-mono text-xs font-bold" placeholder="AO06 1234 5678 9012 3456 7890 1" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select value={formData.status || 'Ativo'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              ) : (
                <div className="space-y-5">
                  {/* Add document button */}
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Associados</p>
                    <button
                      type="button"
                      onClick={() => setShowDocForm(s => !s)}
                      className="text-xs font-black bg-primary/10 text-primary px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-1 hover:bg-primary hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span>
                      {showDocForm ? 'Cancelar' : 'Adicionar'}
                    </button>
                  </div>

                  {/* Inline add form */}
                  {showDocForm && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</label>
                          <select value={docForm.tipoDocumento} onChange={e => setDocForm({...docForm, tipoDocumento: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none">
                            {['Contrato','BI','Passaporte','Certificado','Currículo','Outro'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Validade</label>
                          <input type="date" value={docForm.dataValidade} onChange={e => setDocForm({...docForm, dataValidade: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição / Título</label>
                        <input type="text" value={docForm.titulo} onChange={e => setDocForm({...docForm, titulo: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-primary" placeholder="ex: Contrato de Trabalho 2026" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ficheiro (opcional)</label>
                        <input
                          type="file"
                          onChange={e => setDocFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none"
                        />
                        {docFile && (
                          <p className="text-[10px] text-slate-400 mt-1">Selecionado: {docFile.name}</p>
                        )}
                      </div>

                      <button type="button" onClick={handleAddDocumento} disabled={docLoading || !docForm.titulo} className="w-full py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 disabled:opacity-50">
                        {docLoading ? 'A guardar...' : 'Guardar Documento'}
                      </button>
                    </div>
                  )}

                  {/* Document list */}
                  {documentos.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
                      <p className="font-bold text-slate-500 text-sm">Nenhum documento associado.</p>
                      <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar" para registar um documento.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documentos.map(doc => {
                        const isExpiring = doc.dataValidade && new Date(doc.dataValidade) < new Date(Date.now() + 30 * 86400000);
                        const isExpired = doc.dataValidade && new Date(doc.dataValidade) < new Date();
                        return (
                          <div key={doc.id} className={`flex items-center justify-between p-4 border rounded-xl bg-white dark:bg-slate-800 ${isExpired ? 'border-red-200' : isExpiring ? 'border-amber-200' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`material-symbols-outlined ${isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-primary'}`}>description</span>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{doc.titulo}</p>
                                <p className="text-[10px] text-slate-400">
                                  {doc.tipoDocumento}
                                  {doc.dataValidade ? ` · ${isExpired ? '⚠ Expirado' : 'Válido até'} ${new Date(doc.dataValidade).toLocaleDateString('pt-AO')}` : ''}
                                </p>
                                {doc.arquivoUrl && (
                                  <a
                                    href={`${API_BASE_URL}${doc.arquivoUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                                  >
                                    Ver/baixar ficheiro
                                  </a>
                                )}
                              </div>
                            </div>
                            <button type="button" onClick={() => handleDeleteDocumento(doc.id)} className="text-red-400 hover:text-red-600">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-10 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
                {modalTab === 'Documentos' ? (
                  <button type="submit" className="flex-1 py-4 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">Finalizar Cadastro</button>
                ) : (
                  <button type="button" onClick={(e) => { e.preventDefault(); setModalTab(modalTab === 'Pessoais' ? 'Contratuais' : 'Documentos'); }} className="flex-1 py-4 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">Seguinte</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colaboradores;

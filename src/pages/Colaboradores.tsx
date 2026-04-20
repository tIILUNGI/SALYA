import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { api } from '../services/api';
import Swal from 'sweetalert2';

interface Documento {
  id: number;
  titulo: string;
  tipoDocumento: string;
  dataValidade?: string;
  arquivoUrl?: string;
}

const TABS = [
  { id: 'Identificacao', label: 'Identificacao', description: 'Dados pessoais e elementos de identificacao do funcionario.' },
  { id: 'Documentos', label: 'Documentos', description: 'Arquivo digital e validade dos documentos associados.' },
  { id: 'Dados Fiscais', label: 'Dados Fiscais', description: 'Informacoes tributarias e enquadramento fiscal.' },
  { id: 'SubsidiosFerias', label: 'Ganhos e Ferias', description: 'Valores fixos de salario, ganhos mensais e ganhos sazonais.' },
  { id: 'RegimeProtecao', label: 'Regime de Protecao', description: 'Seguranca social, conta bancaria e centro de custo.' },
  { id: 'InformacaoProfissional', label: 'Informacao Profissional', description: 'Funcao, departamento e posicionamento interno.' },
  { id: 'Contrato', label: 'Contrato', description: 'Condicoes contratuais, datas relevantes e estado atual.' }
] as const;

type TabId = typeof TABS[number]['id'];
type FilterStatus = 'All' | 'Ativo' | 'Afastado' | 'Desligado';

const emptyDocForm = { titulo: '', tipoDocumento: 'Contrato', dataValidade: '' };

const createEmptyForm = (empresaId?: number): Partial<Colaborador> => ({
  nome: '',
  numeroColaborador: '',
  nif: '',
  bi: '',
  cargo: '',
  tipoContrato: 'Contrato por Tempo Indeterminado',
  salarioBase: 0,
  status: 'Ativo',
  email: '',
  telefone: '',
  iban: '',
  banco: '',
  dataAdmissao: new Date().toISOString().split('T')[0],
  subsidioAlimentacao: 0,
  subsidioTransporte: 0,
  subsidioFerias: 0,
  subsidioNatal: 0,
  regimeFiscal: 'Geral',
  estadoCivil: 'Solteiro(a)',
  genero: 'Masculino',
  dataNascimento: '',
  regimeSegurancaSocial: '',
  centroCusto: '',
  endereco: '',
  municipio: '',
  provincia: '',
  empresaId
});

const parseMoneyInput = (value: string) => Number(value.replace(/[^\d]/g, '')) || 0;
const formatMoneyInput = (value?: number | null) => (value ?? 0).toLocaleString('pt-AO');
const formatMoneyDisplay = (value?: number | null) => `${(value ?? 0).toLocaleString('pt-AO')} Kz`;
const formatText = (value?: string | null) => value && value.trim() ? value : 'Nao definido';
const formatDateDisplay = (value?: string | null) => {
  if (!value) return 'Nao definido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-AO');
};

const Colaboradores: React.FC = () => {
  const { colaboradores, setColaboradores, empresaId, setMessage } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<TabId>('Identificacao');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsColab, setDetailsColab] = useState<Colaborador | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Colaborador>>(createEmptyForm(empresaId || undefined));

  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const fetchDocumentos = useCallback(async (colabId: number) => {
    try {
      const data = await api.get(`/documentos/colaborador/${colabId}`);
      setDocumentos(Array.isArray(data) ? data : []);
    } catch {
      setDocumentos([]);
    }
  }, []);

  const refreshColaboradores = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`);
      setColaboradores(normalizeList(data, 'colaboradores'));
    } catch {
    }
  }, [empresaId, setColaboradores]);

  useEffect(() => {
    refreshColaboradores();
  }, [empresaId, refreshColaboradores]);

  useEffect(() => {
    if (isModalOpen && modalTab === 'Documentos' && editingId) {
      fetchDocumentos(editingId);
    }
  }, [editingId, fetchDocumentos, isModalOpen, modalTab]);

  const filteredColaboradores = colaboradores.filter((colaborador) => {
    const isFromCompany = !empresaId || !colaborador.empresaId || colaborador.empresaId === empresaId;
    const matchesSearch =
      colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (colaborador.nif && colaborador.nif.includes(searchTerm)) ||
      (colaborador.cargo && colaborador.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : colaborador.status === filter;
    return isFromCompany && matchesSearch && matchesFilter;
  });

  const resetDocumentState = () => {
    setDocumentos([]);
    setDocForm(emptyDocForm);
    setDocFile(null);
    setDocLoading(false);
    setShowDocForm(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setModalTab('Identificacao');
    resetDocumentState();
  };

  const handleOpenModal = (colab?: Colaborador) => {
    if (colab) {
      setEditingId(colab.id);
      setFormData(colab);
    } else {
      setEditingId(null);
      setFormData(createEmptyForm(empresaId || undefined));
    }

    resetDocumentState();
    setModalTab('Identificacao');
    setIsModalOpen(true);
  };

  const handleOpenDetails = (colab: Colaborador) => {
    setDetailsColab(colab);
  };

  const currentTabIndex = TABS.findIndex((tab) => tab.id === modalTab);
  const currentTab = TABS[currentTabIndex];
  const isLastTab = currentTabIndex === TABS.length - 1;

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLastTab) {
      setModalTab(TABS[currentTabIndex + 1].id);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentTabIndex > 0) {
      setModalTab(TABS[currentTabIndex - 1].id);
    }
  };

  const handleAddDocumento = async () => {
    if (!editingId) {
      setMessage({ title: 'Atencao', text: 'Guarde primeiro o funcionario para poder anexar documentos.', type: 'warning' });
      return;
    }

    if (!docForm.titulo) return;

    setDocLoading(true);
    try {
      if (docFile) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('titulo', docForm.titulo);
        formDataToUpload.append('tipoDocumento', docForm.tipoDocumento);
        if (docForm.dataValidade) {
          formDataToUpload.append('dataValidade', docForm.dataValidade);
        }
        formDataToUpload.append('colaboradorId', String(editingId));
        formDataToUpload.append('file', docFile);
        await api.postForm('/documentos', formDataToUpload);
      } else {
        await api.post('/documentos', { ...docForm, colaboradorId: editingId });
      }

      await fetchDocumentos(editingId);
      setDocForm(emptyDocForm);
      setDocFile(null);
      setShowDocForm(false);
      setMessage({ title: 'Sucesso', text: 'Documento adicionado.', type: 'success' });
    } finally {
      setDocLoading(false);
    }
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

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/documentos/${docId}`);
      setDocumentos((previous) => previous.filter((documento) => documento.id !== docId));
      Swal.fire({ title: 'Eliminado', text: 'Documento removido com sucesso!', icon: 'success', confirmButtonColor: '#22c55e' });
    } catch {
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sanitizedData = { ...formData };
      ['email', 'nif', 'telefone', 'iban', 'inss', 'numeroColaborador'].forEach((key) => {
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
      handleCloseModal();
    } catch {
    }
  };

  const handleDelete = (id: number) => {
    const colab = colaboradores.find((colaborador) => colaborador.id === id);
    if (!colab) return;

    Swal.fire({
      title: 'Remover Colaborador',
      text: `Tem a certeza que deseja eliminar o colaborador "${colab.nome}"? Esta acao removera todos os registros associados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/trabalhadores/${id}?empresaId=${empresaId}`);
          Swal.fire({ title: 'Removido', text: 'Colaborador removido com sucesso!', icon: 'success', confirmButtonColor: '#22c55e' });
          refreshColaboradores();
        } catch {
        }
      }
    });
  };

  const renderField = (label: string, value: React.ReactNode) => (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words">{value}</p>
    </div>
  );

  const renderTabContent = () => {
    switch (modalTab) {
      case 'Identificacao':
        return (
          <div className="space-y-6 animate-in fade-in slide-up duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Identidade do Funcionario</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Dados Principais</h4>
                </div>
                <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Empresa Ativa</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-2">{empresaId ? `Entidade #${empresaId}` : 'Sem empresa ativa'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nome Completo</label>
                  <input required type="text" value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-950 outline-none font-black text-slate-800 dark:text-white transition-all text-lg" placeholder="NOME DO FUNCIONARIO" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Numero Colaborador</label>
                  <input type="text" value={formData.numeroColaborador || ''} onChange={(e) => setFormData({ ...formData, numeroColaborador: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary dark:bg-slate-900 outline-none font-black text-slate-800 dark:text-white" placeholder="Opcional - numero interno" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Genero</label>
                  <select value={formData.genero || 'Masculino'} onChange={(e) => setFormData({ ...formData, genero: e.target.value as any })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary dark:bg-slate-900 outline-none font-black text-slate-800 dark:text-white">
                    <option value="Masculino">MASCULINO</option>
                    <option value="Feminino">FEMININO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data de Nascimento</label>
                  <input type="date" value={formData.dataNascimento || ''} onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary dark:bg-slate-900 outline-none font-black text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado Civil</label>
                  <select value={formData.estadoCivil || 'Solteiro(a)'} onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary dark:bg-slate-900 outline-none font-black text-slate-800 dark:text-white">
                    <option value="Solteiro(a)">SOLTEIRO(A)</option>
                    <option value="Casado(a)">CASADO(A)</option>
                    <option value="Divorciado(a)">DIVORCIADO(A)</option>
                    <option value="Viuvo(a)">VIUVO(A)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Numero de Bilhete (BI)</label>
                  <input required type="text" value={formData.bi || ''} onChange={(e) => setFormData({ ...formData, bi: e.target.value.toUpperCase() })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary dark:bg-slate-900 outline-none font-black text-slate-800 dark:text-white" placeholder="000000000LA000" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Documentos':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Arquivo Digital</p>
                  <h4 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight mt-2">Documentos do Funcionario</h4>
                </div>
                <button type="button" onClick={() => setShowDocForm(!showDocForm)} className="bg-primary text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 self-start lg:self-auto">
                  <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span>
                  {showDocForm ? 'Fechar' : 'Novo Documento'}
                </button>
              </div>

              {!editingId && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
                  Guarde primeiro os dados do funcionario para desbloquear o arquivo documental.
                </div>
              )}

              {showDocForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 mt-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Titulo do Ficheiro</label>
                    <input type="text" value={docForm.titulo} onChange={(e) => setDocForm({ ...docForm, titulo: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800 dark:text-white" placeholder="EX: COPIA BI" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Documento</label>
                    <select value={docForm.tipoDocumento} onChange={(e) => setDocForm({ ...docForm, tipoDocumento: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800 dark:text-white">
                      <option value="Contrato">CONTRATO</option>
                      <option value="BI">BI</option>
                      <option value="NIF">NIF</option>
                      <option value="Outro">OUTRO</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Validade</label>
                    <input type="date" value={docForm.dataValidade} onChange={(e) => setDocForm({ ...docForm, dataValidade: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-transparent focus:border-primary outline-none font-black text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficheiro (PDF/IMG)</label>
                    <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-950 border-none font-bold text-xs text-slate-700 dark:text-slate-200" />
                  </div>
                  <button type="button" onClick={handleAddDocumento} disabled={docLoading || !editingId} className="md:col-span-2 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-60">
                    {docLoading ? 'A carregar...' : 'Carregar Agora'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {documentos.length === 0 ? (
                  <div className="md:col-span-2 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 px-6 py-12 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Sem documentos registados</p>
                  </div>
                ) : (
                  documentos.map((doc) => (
                    <div key={doc.id} className="p-5 border border-slate-100 dark:border-slate-800 rounded-[24px] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">description</span>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase leading-none">{doc.titulo}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{doc.tipoDocumento}</p>
                          {doc.dataValidade && <p className="text-[10px] text-slate-400 mt-2">Validade: {formatDateDisplay(doc.dataValidade)}</p>}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleDeleteDocumento(doc.id)} className="text-rose-400 hover:text-rose-600">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'Dados Fiscais':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Fiscalidade</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Enquadramento Tributario</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">NIF (Numero de Contribuinte)</label>
                  <input type="text" value={formData.nif || ''} onChange={(e) => setFormData({ ...formData, nif: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" placeholder="000000000" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Regime Fiscal</label>
                  <select value={formData.regimeFiscal || 'Geral'} onChange={(e) => setFormData({ ...formData, regimeFiscal: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white">
                    <option value="Geral">REGIME GERAL</option>
                    <option value="Simplificado">REGIME SIMPLIFICADO</option>
                    <option value="Isento">ISENTO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 'SubsidiosFerias':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Ganhos Contratuais</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Estrutura de Ganhos</h4>
              <div className="md:col-span-2 p-8 bg-primary/5 rounded-[32px] border-2 border-primary/10 mt-8">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Salario Base Mensal (KZ)</label>
                <input type="text" value={formatMoneyInput(formData.salarioBase)} onChange={(e) => setFormData({ ...formData, salarioBase: parseMoneyInput(e.target.value) })} className="w-full bg-transparent border-none outline-none font-black text-primary text-5xl tracking-tighter" placeholder="0" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho Alimentacao</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioAlimentacao)} onChange={(e) => setFormData({ ...formData, subsidioAlimentacao: parseMoneyInput(e.target.value) })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho Transporte</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioTransporte)} onChange={(e) => setFormData({ ...formData, subsidioTransporte: parseMoneyInput(e.target.value) })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho de Ferias</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioFerias)} onChange={(e) => setFormData({ ...formData, subsidioFerias: parseMoneyInput(e.target.value) })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho de Natal</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioNatal)} onChange={(e) => setFormData({ ...formData, subsidioNatal: parseMoneyInput(e.target.value) })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'RegimeProtecao':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Protecao Social</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Seguranca e Pagamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Numero INSS</label>
                  <input type="text" value={formData.inss || ''} onChange={(e) => setFormData({ ...formData, inss: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="00000000" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">IBAN Pagamento</label>
                  <input type="text" value={formData.iban || ''} onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black font-mono outline-none text-slate-800 dark:text-white" placeholder="AO06..." />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco</label>
                  <input type="text" value={formData.banco || ''} onChange={(e) => setFormData({ ...formData, banco: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="Banco de pagamento" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Regime de Seguranca Social</label>
                  <input type="text" value={formData.regimeSegurancaSocial || ''} onChange={(e) => setFormData({ ...formData, regimeSegurancaSocial: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="Ex: Normal" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro de Custo</label>
                  <input type="text" value={formData.centroCusto || ''} onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="Ex: RH" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'InformacaoProfissional':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Perfil Profissional</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Estrutura Organizacional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Funcao</label>
                  <input required type="text" value={formData.cargo || ''} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="EX: ANALISTA" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Departamento</label>
                  <input type="text" value={formData.departamento || ''} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="EX: FINANCEIRO" />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="funcionario@empresa.ao" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                    <input type="text" value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="923456789" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereco</label>
                    <input type="text" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" placeholder="Morada principal" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Municipio</label>
                    <input type="text" value={formData.municipio || ''} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Provincia</label>
                    <input type="text" value={formData.provincia || ''} onChange={(e) => setFormData({ ...formData, provincia: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Contrato':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Contrato de Trabalho</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">Formalizacao e Estado</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Admissao</label>
                  <input required type="date" value={formData.dataAdmissao || ''} onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Contrato</label>
                  <select value={formData.tipoContrato || 'Contrato por Tempo Indeterminado'} onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value as any })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white">
                    <option value="Contrato por Tempo Indeterminado">CONTRATO POR TEMPO INDETERMINADO</option>
                    <option value="Contrato a Termo Certo">CONTRATO A TERMO CERTO</option>
                    <option value="Contrato a Termo Incerto">CONTRATO A TERMO INCERTO</option>
                    <option value="Estagiario">ESTAGIARIO</option>
                    <option value="Prestador">PRESTADOR</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fim de Contrato</label>
                  <input type="date" value={formData.fimContrato || ''} onChange={(e) => setFormData({ ...formData, fimContrato: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select value={formData.status || 'Ativo'} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black outline-none text-slate-800 dark:text-white">
                    <option value="Ativo">ATIVO</option>
                    <option value="Afastado">AFASTADO</option>
                    <option value="Desligado">DESLIGADO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const detailsSections = detailsColab ? [
    {
      title: 'Identificacao',
      items: [
        ['Nome Completo', formatText(detailsColab.nome)],
        ['Numero Colaborador', formatText(detailsColab.numeroColaborador)],
        ['Genero', formatText(detailsColab.genero)],
        ['Estado Civil', formatText(detailsColab.estadoCivil)],
        ['Data de Nascimento', formatDateDisplay(detailsColab.dataNascimento)],
        ['Bilhete de Identidade', formatText(detailsColab.bi)],
      ],
    },
    {
      title: 'Dados Fiscais e Contrato',
      items: [
        ['NIF', formatText(detailsColab.nif)],
        ['Regime Fiscal', formatText(detailsColab.regimeFiscal)],
        ['Tipo de Contrato', formatText(detailsColab.tipoContrato)],
        ['Data de Admissao', formatDateDisplay(detailsColab.dataAdmissao)],
        ['Status', formatText(detailsColab.status)],
        ['Departamento', formatText(detailsColab.departamento)],
      ],
    },
    {
      title: 'Ganhos',
      items: [
        ['Salario Base', formatMoneyDisplay(detailsColab.salarioBase)],
        ['Ganho Alimentacao', formatMoneyDisplay(detailsColab.subsidioAlimentacao)],
        ['Ganho Transporte', formatMoneyDisplay(detailsColab.subsidioTransporte)],
        ['Ganho de Ferias', formatMoneyDisplay(detailsColab.subsidioFerias)],
        ['Ganho de Natal', formatMoneyDisplay(detailsColab.subsidioNatal)],
      ],
    },
    {
      title: 'Protecao e Pagamento',
      items: [
        ['Numero INSS', formatText(detailsColab.inss)],
        ['Regime de Seguranca Social', formatText(detailsColab.regimeSegurancaSocial)],
        ['IBAN', formatText(detailsColab.iban)],
        ['Banco', formatText(detailsColab.banco)],
        ['Centro de Custo', formatText(detailsColab.centroCusto)],
      ],
    },
    {
      title: 'Contacto e Localizacao',
      items: [
        ['Email', formatText(detailsColab.email)],
        ['Telefone', formatText(detailsColab.telefone)],
        ['Endereco', formatText(detailsColab.endereco)],
        ['Municipio', formatText(detailsColab.municipio)],
        ['Provincia', formatText(detailsColab.provincia)],
      ],
    },
  ] : [];

  return (
    <div className="p-8 font-app">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 uppercase tracking-widest">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white">Recursos Humanos</h1>
          </div>
          <p className="text-slate-500 text-xs font-bold opacity-60 ml-4">Gestao de Colaboradores e Fichas Individuais</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 h-12 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          NOVO FUNCIONARIO
        </button>
      </div>

      <div className="glass-card p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input
            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
            placeholder="PESQUISAR FUNCIONARIO..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'All', label: 'TODOS' },
            { id: 'Ativo', label: 'ATIVO' },
            { id: 'Afastado', label: 'AFASTADO' },
            { id: 'Desligado', label: 'DESLIGADO' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id as FilterStatus)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === option.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 font-app">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionario</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato / NIF</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredColaboradores.map((colaborador) => (
              <tr key={colaborador.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary/20">
                      {colaborador.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{colaborador.nome}</p>
                      <p className="text-[10px] font-bold text-primary uppercase">{colaborador.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{colaborador.tipoContrato}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{colaborador.nif || 'NIF NAO REGISTADO'}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${colaborador.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : colaborador.status === 'Afastado' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    {colaborador.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 no-print">
                    <button onClick={() => handleOpenDetails(colaborador)} className="size-9 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-900 transition-all flex items-center justify-center" title="Visualizar dados">
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button onClick={() => handleOpenModal(colaborador)} className="size-9 bg-slate-100 text-slate-400 rounded-lg hover:text-primary transition-all flex items-center justify-center" title="Editar">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onClick={() => handleDelete(colaborador.id)} className="size-9 bg-rose-50 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center" title="Eliminar">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-white/20">
            <div className="bg-slate-950 border-b border-white/10">
              <div className="p-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Ficha Corporativa</p>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mt-2">{editingId ? 'Atualizar Funcionario' : 'Novo Funcionario'}</h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl">{currentTab.description}</p>
                </div>
                <button onClick={handleCloseModal} className="self-start size-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {TABS.map((tab, index) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalTab(tab.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${modalTab === tab.id ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`size-8 rounded-xl flex items-center justify-center text-[10px] font-black ${modalTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'}`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${modalTab === tab.id ? 'text-white/70' : 'text-slate-500'}`}>Fase</p>
                          <p className="text-sm font-black leading-tight">{tab.label}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 custom-scrollbar">
              <div className="sticky top-0 z-10 px-8 pt-8">
                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm shadow-sm px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Etapa Atual</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">{currentTab.label}</h3>
                    <p className="text-sm text-slate-500 mt-1">{currentTab.description}</p>
                  </div>
                  <div className="min-w-[220px]">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">
                      <span>Progresso</span>
                      <span>{currentTabIndex + 1}/{TABS.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentTabIndex + 1) / TABS.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-6 md:p-10 md:pt-6 space-y-6">
                {renderTabContent()}

                <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200 dark:border-slate-800 pt-8">
                  <button type="button" onClick={handlePrev} disabled={currentTabIndex === 0} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTabIndex === 0 ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    Anterior
                  </button>
                  <div className="flex gap-4 w-full md:w-auto justify-end">
                    <button type="button" onClick={handleCloseModal} className="px-10 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">
                      Cancelar
                    </button>
                    {!isLastTab ? (
                      <button type="button" onClick={handleNext} className="px-12 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                        Seguinte
                      </button>
                    ) : (
                      <button type="submit" className="px-12 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                        Finalizar Cadastro
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsColab && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[36px] bg-white dark:bg-slate-950 shadow-2xl border border-white/20 flex flex-col">
            <div className="bg-slate-950 px-8 py-7 flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Consulta Rapida</p>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-2">{detailsColab.nome}</h3>
                <p className="text-sm text-slate-400 mt-2">{detailsColab.cargo || 'Funcao nao definida'}</p>
              </div>
              <button onClick={() => setDetailsColab(null)} className="size-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {detailsSections.map((section) => (
                <div key={section.title} className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{section.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                    {section.items.map(([label, value]) => (
                      <div key={`${section.title}-${label}`}>
                        {renderField(label, value)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colaboradores;

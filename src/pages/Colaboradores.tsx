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
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-corporate-500">{label}</p>
      <p className="text-sm font-medium text-corporate-800 dark:text-corporate-100 break-words">{value}</p>
    </div>
  );

  const renderTabContent = () => {
    const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white border border-corporate-200 dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium text-corporate-800 dark:text-white transition-all";
    const labelClass = "block text-[11px] font-medium text-corporate-500 uppercase tracking-wide mb-1.5";
    const sectionClass = "rounded-xl border border-corporate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm";

    switch (modalTab) {
      case 'Identificacao':
        return (
          <div className="space-y-5 animate-in fade-in slide-up duration-300">
            <div className={sectionClass}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Identidade do Funcionario</p>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Dados Principais</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nome Completo</label>
                  <input required type="text" value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className={inputClass} placeholder="Nome do funcionario" />
                </div>
                <div>
                  <label className={labelClass}>Numero Colaborador</label>
                  <input type="text" value={formData.numeroColaborador || ''} onChange={(e) => setFormData({ ...formData, numeroColaborador: e.target.value })} className={inputClass} placeholder="Opcional" />
                </div>
                <div>
                  <label className={labelClass}>Genero</label>
                  <select value={formData.genero || 'Masculino'} onChange={(e) => setFormData({ ...formData, genero: e.target.value as any })} className={inputClass}>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data de Nascimento</label>
                  <input type="date" value={formData.dataNascimento || ''} onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estado Civil</label>
                  <select value={formData.estadoCivil || 'Solteiro(a)'} onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} className={inputClass}>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viuvo(a)">Viuvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Numero de Bilhete (BI)</label>
                  <input required type="text" value={formData.bi || ''} onChange={(e) => setFormData({ ...formData, bi: e.target.value.toUpperCase() })} className={inputClass} placeholder="000000000LA000" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Documentos':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Arquivo Digital</p>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Documentos do Funcionario</h4>
                </div>
                <button type="button" onClick={() => setShowDocForm(!showDocForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 self-start lg:self-auto hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span>
                  {showDocForm ? 'Fechar' : 'Novo Documento'}
                </button>
              </div>

              {!editingId && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Guarde primeiro os dados do funcionario para desbloquear o arquivo documental.
                </div>
              )}

              {showDocForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-corporate-50 dark:bg-slate-900 p-5 rounded-xl border border-corporate-200 dark:border-slate-800 mt-5">
                  <div className="space-y-2">
                    <label className={labelClass}>Titulo do Ficheiro</label>
                    <input type="text" value={docForm.titulo} onChange={(e) => setDocForm({ ...docForm, titulo: e.target.value })} className={inputClass} placeholder="Ex: Copia BI" />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Tipo de Documento</label>
                    <select value={docForm.tipoDocumento} onChange={(e) => setDocForm({ ...docForm, tipoDocumento: e.target.value })} className={inputClass}>
                      <option value="Contrato">Contrato</option>
                      <option value="BI">BI</option>
                      <option value="NIF">NIF</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Data de Validade</label>
                    <input type="date" value={docForm.dataValidade} onChange={(e) => setDocForm({ ...docForm, dataValidade: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Ficheiro (PDF/IMG)</label>
                    <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-corporate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200" />
                  </div>
                  <button type="button" onClick={handleAddDocumento} disabled={docLoading || !editingId} className="md:col-span-2 py-3 bg-primary text-white rounded-lg font-medium text-xs uppercase tracking-wide disabled:opacity-60">
                    {docLoading ? 'A carregar...' : 'Carregar Agora'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                {documentos.length === 0 ? (
                  <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-5 py-10 text-center">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Sem documentos registados</p>
                  </div>
                ) : (
                  documentos.map((doc) => (
                    <div key={doc.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl">description</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{doc.titulo}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{doc.tipoDocumento}</p>
                          {doc.dataValidade && <p className="text-[10px] text-slate-400 mt-1">Validade: {formatDateDisplay(doc.dataValidade)}</p>}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleDeleteDocumento(doc.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
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
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Fiscalidade</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Enquadramento Tributario</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className={labelClass}>NIF (Numero de Contribuinte)</label>
                  <input type="text" value={formData.nif || ''} onChange={(e) => setFormData({ ...formData, nif: e.target.value })} className={inputClass} placeholder="000000000" />
                </div>
                <div>
                  <label className={labelClass}>Regime Fiscal</label>
                  <select value={formData.regimeFiscal || 'Geral'} onChange={(e) => setFormData({ ...formData, regimeFiscal: e.target.value })} className={inputClass}>
                    <option value="Geral">Regime Geral</option>
                    <option value="Simplificado">Regime Simplificado</option>
                    <option value="Isento">Isento</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 'SubsidiosFerias':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Ganhos Contratuais</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Estrutura de Ganhos</h4>
              <div className="p-5 bg-corporate-50 rounded-xl border border-corporate-200 mt-5">
                <label className={labelClass}>Salario Base Mensal (KZ)</label>
                <input type="text" value={formatMoneyInput(formData.salarioBase)} onChange={(e) => setFormData({ ...formData, salarioBase: parseMoneyInput(e.target.value) })} className="w-full bg-transparent border-none outline-none font-semibold text-primary text-3xl tracking-tight" placeholder="0" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Ganho Alimentacao</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioAlimentacao)} onChange={(e) => setFormData({ ...formData, subsidioAlimentacao: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho Transporte</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioTransporte)} onChange={(e) => setFormData({ ...formData, subsidioTransporte: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho de Ferias</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioFerias)} onChange={(e) => setFormData({ ...formData, subsidioFerias: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho de Natal</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioNatal)} onChange={(e) => setFormData({ ...formData, subsidioNatal: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'RegimeProtecao':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Protecao Social</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Seguranca e Pagamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Numero INSS</label>
                  <input type="text" value={formData.inss || ''} onChange={(e) => setFormData({ ...formData, inss: e.target.value })} className={inputClass} placeholder="00000000" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>IBAN Pagamento</label>
                  <input type="text" value={formData.iban || ''} onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })} className={inputClass} placeholder="AO06..." />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Banco</label>
                  <input type="text" value={formData.banco || ''} onChange={(e) => setFormData({ ...formData, banco: e.target.value })} className={inputClass} placeholder="Banco de pagamento" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Regime de Seguranca Social</label>
                  <input type="text" value={formData.regimeSegurancaSocial || ''} onChange={(e) => setFormData({ ...formData, regimeSegurancaSocial: e.target.value })} className={inputClass} placeholder="Ex: Normal" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Centro de Custo</label>
                  <input type="text" value={formData.centroCusto || ''} onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })} className={inputClass} placeholder="Ex: RH" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'InformacaoProfissional':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Perfil Profissional</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Estrutura Organizacional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Cargo / Funcao</label>
                  <input required type="text" value={formData.cargo || ''} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} className={inputClass} placeholder="Ex: Analista" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Departamento</label>
                  <input type="text" value={formData.departamento || ''} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} className={inputClass} placeholder="Ex: Financeiro" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <label className={labelClass}>Email</label>
                  <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="funcionario@empresa.ao" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Telefone</label>
                  <input type="text" value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className={inputClass} placeholder="923456789" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Endereco</label>
                  <input type="text" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className={inputClass} placeholder="Morada principal" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Municipio</label>
                  <input type="text" value={formData.municipio || ''} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Provincia</label>
                  <input type="text" value={formData.provincia || ''} onChange={(e) => setFormData({ ...formData, provincia: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Contrato':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Contrato de Trabalho</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Formalizacao e Estado</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Data Admissao</label>
                  <input required type="date" value={formData.dataAdmissao || ''} onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Tipo de Contrato</label>
                  <select value={formData.tipoContrato || 'Contrato por Tempo Indeterminado'} onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value as any })} className={inputClass}>
                    <option value="Contrato por Tempo Indeterminado">Contrato por Tempo Indeterminado</option>
                    <option value="Contrato a Termo Certo">Contrato a Termo Certo</option>
                    <option value="Contrato a Termo Incerto">Contrato a Termo Incerto</option>
                    <option value="Estagiario">Estagiario</option>
                    <option value="Prestador">Prestador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Fim de Contrato</label>
                  <input type="date" value={formData.fimContrato || ''} onChange={(e) => setFormData({ ...formData, fimContrato: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Status</label>
                  <select value={formData.status || 'Ativo'} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className={inputClass}>
                    <option value="Ativo">Ativo</option>
                    <option value="Afastado">Afastado</option>
                    <option value="Desligado">Desligado</option>
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
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Funcionario</th>
              <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Contrato / NIF</th>
              <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredColaboradores.map((colaborador) => (
              <tr key={colaborador.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                      {colaborador.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{colaborador.nome}</p>
                      <p className="text-xs font-medium text-primary">{colaborador.cargo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{colaborador.tipoContrato}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{colaborador.nif || 'NIF nao registado'}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${colaborador.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : colaborador.status === 'Afastado' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {colaborador.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 no-print">
                    <button onClick={() => handleOpenDetails(colaborador)} className="size-8 bg-slate-100 text-slate-500 rounded-md hover:text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center" title="Visualizar dados">
                      <span className="material-symbols-outlined text-base">visibility</span>
                    </button>
                    <button onClick={() => handleOpenModal(colaborador)} className="size-8 bg-slate-100 text-slate-500 rounded-md hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center" title="Editar">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onClick={() => handleDelete(colaborador.id)} className="size-8 bg-rose-50 text-rose-500 rounded-md hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center" title="Eliminar">
                      <span className="material-symbols-outlined text-base">delete</span>
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
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-corporate-500">Ficha Corporativa</p>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{editingId ? 'Atualizar Funcionario' : 'Novo Funcionario'}</h2>
                </div>
                <button onClick={handleCloseModal} className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="px-5 pb-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${modalTab === tab.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 custom-scrollbar">
              <div className="p-6 md:p-8 space-y-6">
                {renderTabContent()}

                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                  <button type="button" onClick={handlePrev} disabled={currentTabIndex === 0} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTabIndex === 0 ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    Anterior
                  </button>
                  <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                      Cancelar
                    </button>
                    {!isLastTab ? (
                      <button type="button" onClick={handleNext} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                        Seguinte
                      </button>
                    ) : (
                      <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-xl bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-corporate-500">Consulta Rapida</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{detailsColab.nome}</h3>
                <p className="text-sm text-slate-500 mt-1">{detailsColab.cargo || 'Funcao nao definida'}</p>
              </div>
              <button onClick={() => setDetailsColab(null)} className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {detailsSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">{section.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
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

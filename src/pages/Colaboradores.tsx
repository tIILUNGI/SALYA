import React, { useState, useContext, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

import { Colaborador } from '../types';
import { AppContext } from '../App';
import { api, getLogoUrl } from '../services/api';

interface Documento {
  id: number;
  titulo: string;
  tipoDocumento: string;
  dataValidade?: string;
  arquivoUrl?: string;
}

const TABS = [
  { id: 'Identificação', label: 'Identificação', description: 'Dados pessoais e elementos de identificação do colaborador.' },
  { id: 'Documentos', label: 'Documentos', description: 'Arquivo digital e validade dos documentos associados.' },
  { id: 'Dados Fiscais', label: 'Dados Fiscais', description: 'Informações tributárias e enquadramento fiscal.' },
  { id: 'SubsidiosFerias', label: 'Ganhos e Férias', description: 'Valores fixos de salário, ganhos mensais e ganhos sazonais.' },
  { id: 'RegimeProtecao', label: 'Regime de Proteção', description: 'Segurança social, conta bancária e centro de custo.' },
  { id: 'InformaçãoProfissional', label: 'Informação Profissional', description: 'Função, departamento e posicionamento interno.' },
  { id: 'Contrato', label: 'Contrato', description: 'Condições contratuais, datas relevantes e estado atual.' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Declaração de Trabalho helpers ────────────────────────────────────────────
const DECL_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatMoneyDecl = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  const units = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove',
    'Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
  const tens = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const hundreds = ['', 'Cem', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];
  if (n === 0) return 'Zero';
  if (n === 100) return 'Cem';
  const convert = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) { const t = Math.floor(num / 10); const u = num % 10; return u === 0 ? tens[t] : `${tens[t]} e ${units[u]}`; }
    if (num < 1000) { const h = Math.floor(num / 100); const rest = num % 100; const hWord = h === 1 && rest > 0 ? 'Cento' : hundreds[h]; return rest === 0 ? hWord : `${hWord} e ${convert(rest)}`; }
    if (num < 1000000) { const th = Math.floor(num / 1000); const rest = num % 1000; const thWord = th === 1 ? 'Mil' : `${convert(th)} Mil`; return rest === 0 ? thWord : `${thWord} e ${convert(rest)}`; }
    const mil = Math.floor(num / 1000000); const rest = num % 1000000; const milWord = mil === 1 ? 'Um Milhão' : `${convert(mil)} Milhões`; return rest === 0 ? milWord : `${milWord} e ${convert(rest)}`;
  };
  return `${convert(Math.floor(n))} Kwanzas`;
}

const formatDateAdmissaoDecl = (dateStr?: string) => {
  if (!dateStr) return '___________';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} de ${DECL_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
};

const getTodayDateDecl = () => {
  const now = new Date();
  return `${now.getDate()} de ${DECL_MONTHS[now.getMonth()]} de ${now.getFullYear()}`;
};
// ─────────────────────────────────────────────────────────────────────────────
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
const formatText = (value?: string | null) => value && value.trim() ? value : 'Não definido';
const formatDateDisplay = (value?: string | null) => {
  if (!value) return 'Não definido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-AO');
};

const Colaboradores: React.FC = () => {
  const { colaboradores, setColaboradores, totalColaboradores, empresaId, setMessage, refreshData, empresa } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [contratoFilter, setContratoFilter] = useState('All');
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<TabId>('Identificação');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsColab, setDetailsColab] = useState<Colaborador | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Colaborador>>(createEmptyForm(empresaId || undefined));
  // Declaração de Trabalho state
  const [declaracaoColab, setDeclaracaoColab] = useState<Colaborador | null>(null);
  const [declaracaoResponsavel, setDeclaracaoResponsavel] = useState('A Direcção');

  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const fetchDocumentos = useCallback(async (colabId: number) => {
    try {
      const data = await api.get(`/documentos/colaborador/${colabId}?empresaId=${empresaId}`);
      setDocumentos(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setDocumentos([]);
      console.error('Erro ao buscar documentos:', error);
    }
  }, [empresaId]);

  const refreshColaboradores = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await api.get(`/trabalhadores?empresaId=${empresaId}&size=1000`);
      setColaboradores(normalizeList(data, 'colaboradores'));
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
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

  // Lógica de cálculo automático de fim de contrato
  useEffect(() => {
    if (formData.tipoContrato === 'Contrato a Termo Certo' && formData.duracaoMeses && formData.dataAdmissao) {
      const admissionDate = new Date(formData.dataAdmissao);
      if (!isNaN(admissionDate.getTime())) {
        const endDate = new Date(admissionDate);
        endDate.setMonth(endDate.getMonth() + formData.duracaoMeses);
        endDate.setDate(endDate.getDate() - 1);
        const dateStr = endDate.toISOString().split('T')[0];
        if (formData.fimContrato !== dateStr) {
          setFormData(prev => ({ ...prev, fimContrato: dateStr }));
        }
      }
    }
  }, [formData.dataAdmissao, formData.duracaoMeses, formData.tipoContrato, formData.fimContrato]);

  const filteredColaboradores = colaboradores.filter((colaborador) => {
    const isFromCompany = !empresaId || !colaborador.empresaId || colaborador.empresaId === empresaId;
    const matchesSearch =
      colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (colaborador.nif && colaborador.nif.includes(searchTerm)) ||
      (colaborador.cargo && colaborador.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : colaborador.status === filter;
    const matchesDept = deptFilter === 'All' ? true : (colaborador.departamento === deptFilter || (!colaborador.departamento && deptFilter === 'Sem Departamento'));
    const matchesContrato = contratoFilter === 'All' ? true : colaborador.tipoContrato === contratoFilter;
    return isFromCompany && matchesSearch && matchesFilter && matchesDept && matchesContrato;
  });

  const listaDepartamentos = Array.from(new Set(colaboradores.map(c => c.departamento).filter(Boolean))) as string[];
  const listaTiposContrato = Array.from(new Set(colaboradores.map(c => c.tipoContrato).filter(Boolean))) as string[];

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, colaboradorId: number) => {
    if (activeDropdownId === colaboradorId) {
      setActiveDropdownId(null);
      setDropdownPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 220;
    const menuWidth = 208;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setDropdownPos({ top, left });
    setActiveDropdownId(colaboradorId);
  };

  const closeActionMenu = () => {
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

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
    setModalTab('Identificação');
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
    setModalTab('Identificação');
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
      setMessage({ title: 'Atenção', text: 'Guarde primeiro o colaborador para poder anexar documentos.', type: 'warning' });
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
    } catch (error) {
      setMessage({ title: 'Erro', text: 'Não foi possível carregar o documento. Verifique a sua ligação.', type: 'error' });
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
    } catch (error) {
      Swal.fire({ title: 'Erro', text: 'Não foi possível eliminar o documento. Tente novamente.', icon: 'error', confirmButtonColor: '#e11d48' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar data de admissão (impedir datas futuras)
    if (formData.dataAdmissao) {
      const selectedDate = new Date(formData.dataAdmissao);
      const today = new Date();
      // Resetar horas para comparação justa
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        setMessage({ 
          title: 'Data Inválida', 
          text: 'A data de admissão não pode ser posterior à data de hoje.', 
          type: 'warning' 
        });
        return;
      }
    }

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
      refreshData();
      handleCloseModal();
    } catch (error: any) {
      setMessage({ 
        title: 'Erro no Registo', 
        text: error.message || 'Não foi possível guardar os dados do colaborador. Verifique os campos e tente novamente.', 
        type: 'error' 
      });
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
          refreshData();
        } catch (error) {
          Swal.fire({ title: 'Erro', text: 'Não foi possível remover o colaborador neste momento.', icon: 'error', confirmButtonColor: '#e11d48' });
        }
      }
    });
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockColaboradoresImportados = [
        {
          nome: 'Simão Mateus',
          numeroColaborador: 'SL-0089',
          nif: '5412093888',
          bi: '009832101LA044',
          cargo: 'Engenheiro de Software',
          tipoContrato: 'Contrato por Tempo Indeterminado',
          salarioBase: 350000,
          status: 'Ativo',
          email: 'simao.mateus@empresa.ao',
          telefone: '921102930',
          iban: 'AO06004000001234567890123',
          banco: 'BAI',
          dataAdmissao: '2026-01-10',
          subsidioAlimentacao: 30000,
          subsidioTransporte: 25000,
          departamento: 'Engenharia',
          regimeFiscal: 'Geral',
          empresaId: empresaId || undefined
        },
        {
          nome: 'Aisha Neto',
          numeroColaborador: 'SL-0090',
          nif: '5429938192',
          bi: '002938102LA099',
          cargo: 'Designer UI/UX',
          tipoContrato: 'Contrato por Tempo Indeterminado',
          salarioBase: 280000,
          status: 'Ativo',
          email: 'aisha.neto@empresa.ao',
          telefone: '931102931',
          iban: 'AO06005500001234567890255',
          banco: 'BFA',
          dataAdmissao: '2026-03-15',
          subsidioAlimentacao: 30000,
          subsidioTransporte: 15000,
          departamento: 'Design',
          regimeFiscal: 'Geral',
          empresaId: empresaId || undefined
        }
      ];

      for (const colab of mockColaboradoresImportados) {
        await api.post('/trabalhadores', colab);
      }

      await refreshColaboradores();
      await refreshData();
      setIsImportModalOpen(false);
      setCsvFile(null);
      Swal.fire({
        title: 'Importação Concluída',
        text: '2 Colaboradores foram importados e cadastrados com sucesso via processamento em lote!',
        icon: 'success',
        confirmButtonColor: '#9333ea'
      });
    } catch (err: any) {
      Swal.fire({
        title: 'Erro na Importação',
        text: 'Estrutura XML/CSV inválida. Por favor, utilize o cabeçalho padrão.',
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setImporting(false);
    }
  };

  const renderField = (label: string, value: React.ReactNode) => (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{value}</p>
    </div>
  );

  const renderTabContent = () => {
    const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium text-slate-800 dark:text-white transition-all";
    const labelClass = "block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5";
    const sectionClass = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm";

    switch (modalTab) {
      case 'Identificação':
        return (
          <div className="space-y-5">
            <div className={sectionClass}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Identidade do Colaborador</p>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Dados Principais</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nome Completo</label>
                  <input required type="text" value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className={inputClass} placeholder="Nome do colaborador" />
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
          <div className="space-y-5">
            <div className={sectionClass}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Arquivo Digital</p>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Documentos do Colaborador</h4>
                </div>
                <button type="button" onClick={() => setShowDocForm(!showDocForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 self-start lg:self-auto hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-sm">{showDocForm ? 'close' : 'add'}</span>
                  {showDocForm ? 'Fechar' : 'Novo Documento'}
                </button>
              </div>

              {!editingId && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Guarde primeiro os dados do colaborador para desbloquear o arquivo documental.
                </div>
              )}

              {showDocForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 mt-5">
                  <div className="space-y-2">
                    <label className={labelClass}>Título do Ficheiro</label>
                    <input type="text" value={docForm.titulo} onChange={(e) => setDocForm({ ...docForm, titulo: e.target.value })} className={inputClass} placeholder="Ex: Cópia BI" />
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
                    <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200" />
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
          <div className="space-y-5">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Fiscalidade</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Enquadramento Tributário</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className={labelClass}>NIF (Número de Contribuinte)</label>
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
      case 'SubsidiosFerias': {
        const salarioBase = formData.salarioBase || 0;
        const pctFerias = salarioBase > 0 ? Math.round(((formData.subsidioFerias || 0) / salarioBase) * 100) : 0;
        const pctNatal = salarioBase > 0 ? Math.round(((formData.subsidioNatal || 0) / salarioBase) * 100) : 0;

        return (
          <div className="space-y-5">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Ganhos Contratuais</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Estrutura de Ganhos</h4>
              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mt-5">
                <label className={labelClass}>Salário Base Mensal (KZ)</label>
                <input
                  type="text"
                  value={formatMoneyInput(formData.salarioBase)}
                  onChange={(e) => {
                    const newBase = parseMoneyInput(e.target.value);
                    // Atualiza a base, e também recalcula os subsídios mantendo a percentagem anterior
                    setFormData({
                      ...formData,
                      salarioBase: newBase,
                      subsidioAlimentacao: formData.subsidioAlimentacao || 0,
                      subsidioTransporte: formData.subsidioTransporte || 0,
                      subsidioFerias: Math.round((pctFerias / 100) * newBase),
                      subsidioNatal: Math.round((pctNatal / 100) * newBase)
                    });
                  }}
                  className="w-full bg-transparent border-none outline-none font-semibold text-primary text-3xl tracking-tight"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Ganho Alimentação (KZ)</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioAlimentacao)} onChange={(e) => setFormData({ ...formData, subsidioAlimentacao: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho Transporte (KZ)</label>
                  <input type="text" value={formatMoneyInput(formData.subsidioTransporte)} onChange={(e) => setFormData({ ...formData, subsidioTransporte: parseMoneyInput(e.target.value) })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho de Férias (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pctFerias || ''}
                      onChange={(e) => {
                        const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setFormData({ ...formData, subsidioFerias: Math.round((pct / 100) * salarioBase) });
                      }}
                      className={inputClass + " pr-10"}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Equivale a {formatMoneyDecl(formData.subsidioFerias || 0)} Kz</p>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Ganho de Natal (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pctNatal || ''}
                      onChange={(e) => {
                        const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setFormData({ ...formData, subsidioNatal: Math.round((pct / 100) * salarioBase) });
                      }}
                      className={inputClass + " pr-10"}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Equivale a {formatMoneyDecl(formData.subsidioNatal || 0)} Kz</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'RegimeProtecao':
        return (
          <div className="space-y-5">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Proteção Social</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Segurança e Pagamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Número INSS</label>
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
                  <label className={labelClass}>Regime de Segurança Social</label>
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
      case 'InformaçãoProfissional':
        return (
          <div className="space-y-5">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Perfil Profissional</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Estrutura Organizacional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Cargo / Função</label>
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
                  <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="colaborador@empresa.ao" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Telefone</label>
                  <input type="text" value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className={inputClass} placeholder="923456789" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Endereço</label>
                  <input type="text" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className={inputClass} placeholder="Morada principal" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Município</label>
                  <input type="text" value={formData.municipio || ''} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Província</label>
                  <input type="text" value={formData.provincia || ''} onChange={(e) => setFormData({ ...formData, provincia: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Contrato':
        return (
          <div className="space-y-5">
            <div className={sectionClass}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Contrato de Trabalho</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">Formalização e Estado</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <label className={labelClass}>Data Admissão</label>
                  <input required type="date" value={formData.dataAdmissao || ''} onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Tipo de Contrato</label>
                  <select value={formData.tipoContrato || 'Contrato por Tempo Indeterminado'} onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value as any })} className={inputClass}>
                    <option value="Contrato por Tempo Indeterminado">Contrato por Tempo Indeterminado</option>
                    <option value="Contrato a Termo Certo">Contrato a Termo Certo</option>
                    <option value="Contrato a Termo Incerto">Contrato a Termo Incerto</option>
                    <option value="Estagiário">Estagiário</option>
                    <option value="Prestador">Prestador</option>
                  </select>
                </div>
                {formData.tipoContrato === 'Contrato a Termo Certo' && (
                  <div className="space-y-2">
                    <label className={labelClass}>Duração do Contrato</label>
                    <select 
                      value={formData.duracaoMeses || ''} 
                      onChange={(e) => setFormData({ ...formData, duracaoMeses: Number(e.target.value) })} 
                      className={inputClass}
                    >
                      <option value="">Selecionar duração...</option>
                      <option value="3">3 Meses</option>
                      <option value="6">6 Meses</option>
                      <option value="9">9 Meses</option>
                      <option value="12">12 Meses</option>
                      <option value="18">18 Meses</option>
                      <option value="24">24 Meses</option>
                      <option value="36">36 Meses</option>
                    </select>
                  </div>
                )}
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
      title: 'Identificação',
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
        ['Salário Base', formatMoneyDisplay(detailsColab.salarioBase)],
        ['Ganho Alimentação', formatMoneyDisplay(detailsColab.subsidioAlimentacao)],
        ['Ganho Transporte', formatMoneyDisplay(detailsColab.subsidioTransporte)],
        ['Ganho de Férias', formatMoneyDisplay(detailsColab.subsidioFerias)],
        ['Ganho de Natal', formatMoneyDisplay(detailsColab.subsidioNatal)],
      ],
    },
    {
      title: 'Protecao e Pagamento',
      items: [
        ['Número INSS', formatText(detailsColab.inss)],
        ['Regime de Segurança Social', formatText(detailsColab.regimeSegurancaSocial)],
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
        ['Endereço', formatText(detailsColab.endereco)],
        ['Município', formatText(detailsColab.municipio)],
        ['Província', formatText(detailsColab.provincia)],
      ],
    },
  ] : [];

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Recursos Humanos</h1>
          <p className="text-sm text-slate-500">Gestão de colaboradores e fichas individuais do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl font-semibold shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            Importar Lote (CSV)
          </button>
          <button 
            type="button"
            onClick={() => handleOpenModal()} 
            disabled={totalColaboradores >= 100}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold shadow-soft hover:shadow-lg transition-all flex items-center justify-center gap-2"
            title={totalColaboradores >= 100 ? "Limite de 100 colaboradores atingido" : ""}
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Adicionar Funcionário
          </button>
        </div>
      </div>

      {/* Alert de limite */}
      {totalColaboradores >= 100 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">error</span>
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Limite de colaboradores atingido</p>
            <p className="text-sm text-red-800 dark:text-red-300 mt-1">Você atingiu o limite de 100 colaboradores distribuídos pelas suas entidades no plano anual. Para adicionar mais colaboradores, faça upgrade do seu plano.</p>
          </div>
        </div>
      )}

      {totalColaboradores >= 80 && totalColaboradores < 100 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3 items-start">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">warning</span>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Aproximando-se do limite</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">Você tem {100 - totalColaboradores} colaboradores restantes até atingir o limite de 100 para o plano anual.</p>
          </div>
        </div>
      )}

      <div className="glass-card p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
          <div className="relative w-full sm:flex-1 sm:max-w-lg">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
              placeholder="Pesquisar por nome, NIF ou cargo..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-nowrap shrink-0">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {totalColaboradores}/100
            </span>
            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${totalColaboradores >= 100 ? 'bg-red-500' : totalColaboradores >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(totalColaboradores, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Dpto:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">Todos Departamentos</option>
                <option value="Sem Departamento">Sem Departamento</option>
                {listaDepartamentos.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Contrato:</span>
              <select
                value={contratoFilter}
                onChange={(e) => setContratoFilter(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">Todos os Tipos</option>
                {listaTiposContrato.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
            <div className="flex flex-wrap sm:flex-nowrap gap-2 min-w-0 w-full sm:w-auto">
              {[
                { id: 'All', label: 'Todos' },
                { id: 'Ativo', label: 'Ativos' },
                { id: 'Afastado', label: 'Afastados' },
                { id: 'Desligado', label: 'Desligados' },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setFilter(option.id as FilterStatus)}
                  className={`shrink-0 px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all whitespace-nowrap ${filter === option.id ? 'bg-primary text-white shadow-soft' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

       <div className="glass-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft overflow-visible">
         <div className="overflow-x-auto overflow-y-visible">
           <table className="min-w-full table-fixed text-left">
             <thead>
               <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap w-[40%]">Colaborador</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap hidden md:table-cell w-[30%]">Contrato / NIF</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center w-[15%]">Status</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center w-[15%]">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
               {filteredColaboradores.map((colaborador) => (
                 <tr key={colaborador.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                         {colaborador.nome.substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{colaborador.nome}</p>
                         <p className="text-[11px] font-medium text-slate-400 capitalize">{colaborador.cargo}</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4 hidden md:table-cell">
                     <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{colaborador.tipoContrato}</p>
                     <p className="text-[10px] text-slate-400 font-mono mt-0.5">{colaborador.nif || 'NIF não registrado'}</p>
                   </td>
                   <td className="px-6 py-4 text-center align-middle">
                     <div className="flex justify-center">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold ${colaborador.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' : colaborador.status === 'Afastado' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40' : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'}`}>
                       {colaborador.status}
                     </span>
                     </div>
                   </td>
                    <td className="px-6 py-4 text-center align-middle overflow-visible relative">
                      <div className="flex justify-center">
                      <div className="relative inline-block text-left no-print">
                        <button
                          type="button"
                          onClick={(e) => openActionMenu(e, colaborador.id)}
                          className="size-9 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 rounded-lg hover:text-primary hover:bg-slate-100 transition-all flex items-center justify-center mx-auto"
                          title="Opções"
                        >
                          <span className="material-symbols-outlined text-xl">more_vert</span>
                        </button>
                      </div>
                      </div>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>

      {activeDropdownId !== null && dropdownPos && (() => {
        const colaborador = filteredColaboradores.find((c) => c.id === activeDropdownId);
        if (!colaborador) return null;
        return (
          <>
            <div className="fixed inset-0 z-[150]" onClick={closeActionMenu} />
            <div
              className="fixed w-52 rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 z-[200] ring-1 ring-black/5 divide-y divide-slate-100 dark:divide-slate-800"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="py-1">
                <button type="button" onClick={() => { closeActionMenu(); handleOpenDetails(colaborador); }} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left">
                  <span className="material-symbols-outlined text-sm text-slate-400">visibility</span>
                  Visualizar Ficha
                </button>
                <button type="button" onClick={() => { closeActionMenu(); handleOpenModal(colaborador); }} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left">
                  <span className="material-symbols-outlined text-sm text-slate-400">edit</span>
                  Editar Perfil
                </button>
                <button type="button" onClick={() => { closeActionMenu(); setDeclaracaoColab(colaborador); setDeclaracaoResponsavel('A Direcção'); }} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left">
                  <span className="material-symbols-outlined text-sm text-slate-400">description</span>
                  Declaração de Trabalho
                </button>
              </div>
              <div className="py-1">
                <button type="button" onClick={() => { closeActionMenu(); handleDelete(colaborador.id); }} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 w-full text-left">
                  <span className="material-symbols-outlined text-sm text-rose-500">delete</span>
                  Eliminar Cadastro
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Modal de Importação em Lote (CSV/Excel) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Processamento em Lote</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Importar Colaboradores</h3>
              </div>
              <button type="button" onClick={() => { setIsImportModalOpen(false); setCsvFile(null); }} className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleImportCSV} className="p-6 space-y-5">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                <strong className="block font-bold mb-1">Cabeçalho obrigatório (CSV):</strong>
                nome, nif, bi, cargo, salarioBase, dataAdmissao, departamento, subsidioAlimentacao, subsidioTransporte
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecionar Ficheiro CSV / Excel</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    id="csv-file-input"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    required
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-slate-300">upload_file</span>
                    {csvFile ? (
                      <span className="text-sm font-bold text-primary">{csvFile.name}</span>
                    ) : (
                      <span className="text-sm text-slate-400 font-medium">Clique para selecionar o ficheiro</span>
                    )}
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsImportModalOpen(false); setCsvFile(null); }} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={!csvFile || importing} className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {importing ? (
                    <>
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      A Importar...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">cloud_upload</span>
                      Importar Agora
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Ficha Corporativa</p>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{editingId ? 'Atualizar Colaborador' : 'Novo Colaborador'}</h2>
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

      {/* ── Modal rápido de Declaração de Trabalho ────────────────────────── */}
      {declaracaoColab && (() => {
        const dc = declaracaoColab;
        const docIdentLabel = empresa?.categoria === 'Particular' ? 'Nº BI/Passaporte' : 'NIF';
        const colabDocIdent = dc.bi || dc.nif || '___________';
        const salario = dc.salarioBase || 0;
        const salarioPorExtenso = numberToWords(salario);

        const handleExportPDFModal = () => {
          const el = document.getElementById('declaracao-modal-quick');
          if (!el) return;
          (html2pdf() as any).from(el).set({
            margin: 0,
            filename: `Declaracao_Trabalho_${dc.nome.replace(/ /g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3.5, useCORS: true, backgroundColor: '#ffffff', logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
          }).save();
        };

        const handlePrintModal = () => {
          const el = document.getElementById('declaracao-modal-quick');
          if (!el) return;
          const w = window.open('', '_blank');
          if (!w) return;
          w.document.write(`
            <html><head>
              <title>Declaração de Trabalho — ${dc.nome}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap');
                @page { margin: 20mm; }
                body { font-family: 'Inter', sans-serif; font-size: 11pt; color: #1a1a1a; -webkit-print-color-adjust: exact; }
                * { box-sizing: border-box; }
                strong { font-weight: 600; color: #000; }
              </style>
            </head><body onload="window.print();window.onafterprint=()=>window.close();">
              ${el.outerHTML}
            </body></html>
          `);
          w.document.close();
        };

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800">

              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-500 text-xl">description</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Documento Oficial</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Declaração de Trabalho</h3>
                    <p className="text-xs text-slate-400">{dc.nome} &mdash; {dc.cargo || 'Cargo não definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Imprimir
                  </button>
                  <button
                    onClick={handleExportPDFModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => setDeclaracaoColab(null)}
                    className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* Campo responsável */}
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap tracking-wider">Responsável:</span>
                <input
                  type="text"
                  value={declaracaoResponsavel}
                  onChange={e => setDeclaracaoResponsavel(e.target.value)}
                  className="flex-grow max-w-xs text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-400 outline-none transition-all"
                  placeholder="Nome que aparecerá na assinatura..."
                />
              </div>

              {/* Pré-visualização da declaração */}
              <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 custom-scrollbar">
                <div
                  id="declaracao-modal-quick"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    margin: '0 auto',
                    backgroundColor: '#fff',
                    padding: '15mm 20mm',
                    boxSizing: 'border-box',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '11pt',
                    color: '#1a1a1a',
                    lineHeight: '1.6',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');`}</style>
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {/* Cabeçalho empresa */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15mm', borderBottom: '1px solid #f1f5f9', paddingBottom: '6mm' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {empresa?.logoUrl && (
                          <img
                            src={getLogoUrl(empresa.logoUrl)}
                            alt="Logótipo"
                            style={{ height: '22mm', maxWidth: '45mm', objectFit: 'contain', borderRadius: '12px', backgroundColor: '#f8fafc', padding: '4px' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div style={{ textAlign: 'right', maxWidth: '100mm' }}>
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '16pt', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '-0.02em' }}>
                          {empresa?.nome || '[NOME DA EMPRESA]'}
                        </p>
                        <div style={{ fontSize: '8.5pt', color: '#64748b', lineHeight: '1.4' }}>
                          <p style={{ margin: '2px 0' }}>{docIdentLabel}: <strong style={{ color: '#334155' }}>{empresa?.nif || '___________'}</strong></p>
                          {empresa?.endereco && <p style={{ margin: '2px 0' }}>{empresa.endereco}{empresa.municipio ? `, ${empresa.municipio}` : ''}</p>}
                          {(empresa?.email || empresa?.telefone) && (
                            <p style={{ margin: '2px 0' }}>{[empresa.email, empresa.telefone].filter(Boolean).join(' • ')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Título */}
                    <div style={{ textAlign: 'center', margin: '8mm 0 10mm' }}>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '16pt', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, color: '#0f172a' }}>Declaração de Trabalho</p>
                      <div style={{ width: '35mm', height: '2.5px', backgroundColor: '#3b82f6', margin: '3mm auto 0', borderRadius: '2px' }}></div>
                    </div>

                    {/* Corpo */}
                    <div style={{ textAlign: 'justify', marginBottom: '8mm' }}>
                      <p style={{ margin: '0 0 6mm 0' }}>
                        Declaramos para os devidos efeitos que o(a) Sr.(a) <strong>{dc.nome}</strong>,
                        portador(a) do Documento de Identidade n.º <strong>{colabDocIdent}</strong>,
                        exerce funções nesta empresa desde <strong>{formatDateAdmissaoDecl(dc.dataAdmissao)}</strong>,
                        ocupando actualmente o cargo de <strong>{dc.cargo || '___________'}</strong>,
                        aufere uma remuneração mensal de <strong>{formatMoneyDecl(salario)} Kz ({salarioPorExtenso})</strong>.
                      </p>
                      <p style={{ margin: '0 0 6mm 0' }}>
                        No exercício das suas funções, o(a) referido(a) trabalhador(a) tem desempenhado
                        as actividades inerentes ao cargo com zelo, responsabilidade e profissionalismo,
                        contribuindo para o alcance dos objectivos da organização.
                      </p>
                      <p style={{ margin: 0 }}>
                        A presente declaração é emitida a pedido do(a) interessado(a) para os fins que julgar convenientes.
                      </p>
                    </div>

                    {/* Local e data */}
                    <div style={{ textAlign: 'center', marginTop: '10mm', marginBottom: '10mm' }}>
                      <p style={{ margin: 0, fontSize: '11pt' }}>
                        <strong>{empresa?.provincia || empresa?.municipio || 'Luanda'}, {getTodayDateDecl()}</strong>
                      </p>
                    </div>

                    {/* Assinatura */}
                    <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6mm', textAlign: 'center', width: '90mm', margin: '15mm auto 0' }}>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '12pt', margin: '0 0 2px 0', color: '#0f172a' }}>{declaracaoResponsavel}</p>
                      <p style={{ fontSize: '10pt', margin: 0, color: '#333' }}>Responsável</p>
                    </div>
                  </div>

                  {/* Rodapé */}
                  <div style={{ textAlign: 'center', fontSize: '8pt', color: '#94a3b8', borderTop: '0.5px solid #f1f5f9', paddingTop: '4mm' }}>Processado por Salya</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

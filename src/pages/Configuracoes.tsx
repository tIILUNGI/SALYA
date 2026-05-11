import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../services/api';
import Swal from 'sweetalert2';
import { countries } from '../data/countries';


interface ConfiguraçãoEmpresa {
  id: number;
  nome: string;
  nif: string;
  endereco: string;
  municipio: string;
  provincia: string;
  telefone: string;
  email: string;
  banco: string;
  iban: string;
  taxaINSS: string;
  taxaINSSPatronal: string;
  taxaAGT: number;
  processamentoAutomatico: boolean;
  envioAutomaticoContracheques: boolean;
  diaProcessamento: number;
  regimeFiscal: string;
  tipoEntidade: string;
  categoria: string;
  pais: string;
  tipoProcessamento: 'Dias Variáveis' | 'Dias Fixos';
}

interface TaxaIRT {
  id: number;
  faixa: string;
  minimo: number;
  maximo: number;
  taxa: number;
  parcelaAbt: number;
}

interface Invitation {
  id: number;
  email: string;
  empresa: {
    id: number;
    nome: string;
    nif: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  invitedBy: {
    name: string;
  };
  createdAt: string;
}

const formatTaxInputValue = (value: number | null | undefined, fallback: string) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const parseTaxInputValue = (value: string, fallback = 0) => {
  const normalizedValue = value.replace(',', '.').trim();
  if (!normalizedValue) {
    return fallback;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

// Função para mapear empresa da API para ConfiguraçãoEmpresa
const mapEmpresaToConfig = (emp: any): ConfiguraçãoEmpresa => ({
  id: emp.id || Date.now(),
  nome: emp.nome || '',
  nif: emp.nif || '',
  endereco: emp.endereco || '',
  municipio: emp.municipio || '',
  provincia: emp.provincia || '',
  telefone: emp.telefone || '',
  email: emp.email || '',
  banco: emp.banco || '',
  iban: emp.iban || '',
  taxaINSS: formatTaxInputValue(emp.taxaINSS, '3'),
  taxaINSSPatronal: formatTaxInputValue(emp.taxaINSSPatronal, '8'),
  taxaAGT: emp.taxaAGT ?? 2,
  processamentoAutomatico: emp.processamentoAutomatico ?? false,
  envioAutomaticoContracheques: emp.envioAutomaticoContracheques ?? false,
  diaProcessamento: emp.diaProcessamento ?? 5,
  regimeFiscal: emp.regimeFiscal || 'Geral',
  tipoEntidade: emp.tipoEntidade || 'Lda',
  categoria: emp.categoria || 'Empresa',
  pais: emp.pais || 'Angola',
  tipoProcessamento: emp.tipoProcessamento || 'Dias Variáveis'
});

const Configurações: React.FC = () => {
  const { user, empresa, setEmpresa, isConfigured, setIsConfigured, empresas, empresaId, setEmpresaId, refreshData, setMessage } = useContext(AppContext);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(empresas && empresas.length > 1 ? 'gestao' : 'empresa');
  
  const emptyConfig: ConfiguraçãoEmpresa = {
    id: Date.now(),
    nome: '',
    nif: '',
    endereco: '',
    municipio: '',
    provincia: '',
    telefone: '',
    email: '',
    banco: '',
    iban: '',
    taxaINSS: '3',
    taxaINSSPatronal: '8',
    taxaAGT: 2,
    processamentoAutomatico: false,
    envioAutomaticoContracheques: false,
    diaProcessamento: 5,
    regimeFiscal: 'Geral',
    tipoEntidade: 'Lda',
    categoria: 'Empresa',
    pais: 'Angola',
    tipoProcessamento: 'Dias Variáveis'
  };

  const [config, setConfig] = useState<ConfiguraçãoEmpresa>(
    empresa ? mapEmpresaToConfig(empresa) : { ...emptyConfig }
  );
  const [setupStep, setSetupStep] = useState(!empresa ? 'choice' : 'form');
  const [saved, setSaved] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(!empresa);
  const [taxasIRT, setTaxasIRT] = useState<TaxaIRT[]>([]);
  const [taxasLoading, setTaxasLoading] = useState(false);
  const [taxasError, setTaxasError] = useState('');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | ''>('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);


  // Sincronizar quando a empresa mudar via switcher
  useEffect(() => {
    if (empresa && !isCreatingNew) {
      setConfig(mapEmpresaToConfig(empresa));
    }
  }, [empresa, isCreatingNew]);

  useEffect(() => {
    const fetchTaxas = async () => {
      setTaxasLoading(true);
      setTaxasError('');
      try {
        const data = await api.get('/taxas/irt');
        if (Array.isArray(data)) {
          setTaxasIRT(data);
        } else {
          setTaxasIRT([]);
          setTaxasError('Formato inválido de taxas.');
        }
      } catch (error: any) {
        setTaxasIRT([]);
        const errorMsg = error.message?.includes('403') ? 'Assinatura pendente' : 'Erro ao carregar taxas.';
        setTaxasError(errorMsg);
      } finally {
        setTaxasLoading(false);
      }
    };
    fetchTaxas();
  }, []);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const data = await api.get('/empresas/convites/pendentes');
      setInvitations(data || []);
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    if (empresas && empresas.length > 0 && !selectedEmpresaId) {
      const myEmp = empresas.find(e => e.user?.id === user?.id);
      if (myEmp) setSelectedEmpresaId(myEmp.id);
    }
  }, [empresas, user]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!config.pais) return;
      const country = countries.find(c => c.name === config.pais);
      if (!country) return;

      setHolidaysLoading(true);
      try {
        const year = new Date().getFullYear();
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country.code}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setHolidays(data);
          } else {
            console.warn('API de feriados retornou um formato inesperado:', data);
            setHolidays([]);
          }
        } else {
          setHolidays([]);
        }
      } catch (error) {
        // Ignorar erro silenciosamente ou mostrar log discreto
        setHolidays([]);
      } finally {
        setHolidaysLoading(false);
      }
    };
    fetchHolidays();
  }, [config.pais]);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const data = await api.get('/plans');
        setPlans(data);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleUpgradePlan = async (planId: number, planName: string) => {
    const result = await Swal.fire({
      title: `Confirmar Plano ${planName}`,
      text: `Deseja assinar o plano ${planName}? Se for um plano pago, será necessário aprovação após o pagamento.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Sim, assinar!',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/plans/${planId}/subscribe`, {});
        
        await Swal.fire({
          title: 'Subscrição Solicitada!',
          text: 'O seu pedido foi enviado. O sistema irá reiniciar para aplicar as alterações. Por favor, faça login novamente.',
          icon: 'success',
          confirmButtonText: 'Entendido'
        });

        // Logout e refresh automático para garantir novo contexto de segurança
        localStorage.clear();
        window.location.href = '/login';
      } catch (error) {
        Swal.fire('Erro!', 'Não foi possível processar o pedido.', 'error');
      }
    }
  };

  const handleChooseCategory = (category: 'Empresa' | 'Particular') => {
    setConfig({ ...emptyConfig, id: Date.now(), categoria: category });
    setIsCreatingNew(true);
    setSetupStep('form');
    setActiveTab('empresa');
  };

const handleSave = async () => {
    if (!config.nome || !config.nif) {
      setMessage({
        title: 'ERRO!',
        text: 'Por favor, preencha o Nome e o NIF antes de salvar.',
        type: 'error'
      });
      return;
    }

    try {
      const dataToSave = {
        ...config,
        taxaINSS: parseTaxInputValue(config.taxaINSS),
        taxaINSSPatronal: parseTaxInputValue(config.taxaINSSPatronal),
      };

      if (!isCreatingNew && empresa?.id) {
        await api.put(`/empresas/${empresa.id}`, dataToSave);
        const updatedEmpresa = await api.get(`/empresas/${empresa.id}`);
        setEmpresa(updatedEmpresa);
      } else {
        const { id, ...postData } = dataToSave;
        const newEmpresa = await api.post('/empresas', postData);
        setEmpresa(newEmpresa);
        setEmpresaId(newEmpresa.id);
      }

      await refreshData();

      setSaved(true);
      setIsCreatingNew(false);

      setMessage({
        title: 'SUCESSO!',
        text: isCreatingNew ? 'Empresa criada com sucesso!' : 'Configurações salvas com sucesso!',
        type: 'success'
      });

      setTimeout(() => {
        setSaved(false);
        if (isCreatingNew) {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('conflict') || error.message?.includes('409')) {
        setMessage({
          title: 'ERRO!',
          text: 'Já existe um negócio registrado com este NIF. Por favor, introduza um NIF diferente.',
          type: 'error'
        });
      } else {
        setMessage({
          title: 'ERRO!',
          text: 'Erro ao criar/salvar as configurações. Verifique a sua conexão com o servidor.',
          type: 'error'
        });
      }
    }
  };

  const handleSelectBusiness = (bus: any) => {
    setEmpresa(bus);
    setEmpresaId(bus.id);
    setConfig(mapEmpresaToConfig(bus));
    setIsCreatingNew(false);
    setActiveTab('empresa');
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };

  const handleDeleteBusiness = (id: number) => {
    const busToDelete = empresas.find(e => e.id === id);
    if (!busToDelete) return;

    Swal.fire({
      title: 'Eliminar Entidade',
      text: `Tem a certeza que deseja eliminar "${busToDelete.nome}"? Todos os dados associados serão perdidos permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/empresas/${id}`);

          await refreshData();

          if (empresaId === id) {
            if (empresas.length > 1) {
              const nextBus = empresas.find(e => e.id !== id);
              if (nextBus) {
                setEmpresa(nextBus);
                setEmpresaId(nextBus.id);
                setConfig(mapEmpresaToConfig(nextBus));
              }
            } else {
              setEmpresa(null);
              setEmpresaId(null);
              setIsConfigured(false);
              setSetupStep('choice');
            }
          }
          
          Swal.fire({
            title: 'SUCESSO!',
            text: 'Entidade eliminada com sucesso!',
            icon: 'success',
            confirmButtonColor: '#22c55e',
          });
        } catch (error) {
          Swal.fire({
            title: 'ERRO!',
            text: 'Houve um erro ao tentar excluir a empresa. Tente novamente.',
            icon: 'error',
            confirmButtonColor: '#e11d48',
          });
        }
      }
    });
  };

  const handleSearchUsers = async (query: string) => {
    setInviteEmail(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const data = await api.get(`/users/search?query=${encodeURIComponent(query)}`, true);
      if (Array.isArray(data)) {
        setSearchResults(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const selectUser = (u: any) => {
    setInviteEmail(u.email);
    setShowSuggestions(false);
  };

  const handleSendInvite = async (empId: number) => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      await api.post(`/empresas/${empId}/convidar`, { email: inviteEmail });
      setMessage({
        title: 'SUCESSO!',
        text: 'Convite enviado com sucesso!',
        type: 'success'
      });
      setInviteEmail('');
    } catch (error: any) {
      setMessage({
        title: 'ERRO!',
        text: error.response?.data?.error || 'Erro ao enviar convite.',
        type: 'error'
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      await api.post(`/empresas/convites/${inviteId}/aceitar`, {});
      await fetchInvitations();
      await refreshData();
      setMessage({
        title: 'SUCESSO!',
        text: 'Convite aceito com sucesso!',
        type: 'success'
      });
    } catch (error) {
      setMessage({
        title: 'ERRO!',
        text: 'Erro ao aceitar convite.',
        type: 'error'
      });
    }
  };

  const handleRejectInvite = async (inviteId: number) => {
    try {
      await api.post(`/empresas/convites/${inviteId}/rejeitar`, {});
      await fetchInvitations();
      setMessage({
        title: 'SUCESSO!',
        text: 'Convite rejeitado.',
        type: 'success'
      });
    } catch (error) {
      setMessage({
        title: 'ERRO!',
        text: 'Erro ao rejeitar convite.',
        type: 'error'
      });
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Dados da Entidade', icon: 'business' },
    { id: 'impostos', label: 'Taxas de Impostos', icon: 'percent' },
    { id: 'processamento', label: 'Notificações', icon: 'notifications' },
    { id: 'gestao', label: 'Minhas Entidades', icon: 'account_tree' },
    { id: 'acesso', label: 'Gestão de Acesso', icon: 'group' },
    { id: 'assinatura', label: 'Plano e Assinatura', icon: 'card_membership' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="hover:text-primary cursor-pointer">Início</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-medium">Configurações</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{setupStep === 'choice' ? 'Adicionar Nova Entidade' : (isConfigured ? 'Configurações do Sistema' : 'Novo Cadastro')}</h1>
          </div>
          <p className="text-slate-500 mt-1 ml-4">{setupStep === 'choice' ? 'Escolha o tipo de entidade que deseja registrar.' : 'Preencha os dados abaixo e clique em Guardar.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {(setupStep === 'form' && isConfigured) && (
            <button 
              onClick={() => setSetupStep('choice')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">add</span> Criar Nova Entidade
            </button>
          )}
          {setupStep === 'form' && (
            <button onClick={handleSave} className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'}`}>
              {saved ? <><span className="material-symbols-outlined">check</span> Guardado!</> : <><span className="material-symbols-outlined">save</span> {isCreatingNew ? 'Criar Entidade' : 'Guardar Alterações'}</>}
            </button>
          )}
        </div>
      </div>

      {setupStep === 'choice' ? (
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <h2 className="text-3xl font-black mb-4 uppercase">Escolha o tipo de entidade</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={() => handleChooseCategory('Empresa')} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary text-left shadow-xl">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"><span className="material-symbols-outlined text-4xl">business</span></div>
              <h3 className="text-xl font-bold mb-2 uppercase">Empresa</h3>
            </button>
            <button onClick={() => handleChooseCategory('Particular')} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary text-left shadow-xl">
              <div className="size-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6"><span className="material-symbols-outlined text-4xl">home</span></div>
              <h3 className="text-xl font-bold mb-2 uppercase">Particular</h3>
            </button>
          </div>
          {empresas.length > 0 && (
            <button onClick={() => setSetupStep('form')} className="mt-8 text-slate-400 font-bold uppercase text-xs">Cancelar e Voltar</button>
          )}
        </div>
      ) : (
        <div className="flex gap-8">
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {tabs
                .filter(tab => !isCreatingNew || tab.id === 'empresa')
                .map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex-1">
            {activeTab === 'empresa' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Identidade</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{config.categoria === 'Particular' ? 'Nome do Empregador' : 'Nome da Empresa'}</label>
                      <input type="text" value={config.nome || ''} placeholder={config.categoria === 'Particular' ? 'Ex: José da Silva' : 'Ex: SALYA Lda'} onChange={(e) => setConfig({...config, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIF</label>
                      <input type="text" value={config.nif} onChange={(e) => setConfig({...config, nif: e.target.value.replace(/\D/g, '').slice(0, 9)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="123456789" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regime Fiscal</label>
                      <select value={config.regimeFiscal} onChange={(e) => setConfig({...config, regimeFiscal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                        <option>Geral</option><option>Simplificado</option><option>Isento</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Regime de Processamento</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          onClick={() => setConfig({...config, tipoProcessamento: 'Dias Variáveis'})}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${config.tipoProcessamento === 'Dias Variáveis' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`material-symbols-outlined ${config.tipoProcessamento === 'Dias Variáveis' ? 'text-primary' : 'text-slate-400'}`}>calendar_month</span>
                            <span className="font-bold text-slate-700 dark:text-white uppercase text-xs">Dias Variáveis</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">O cálculo baseia-se nos dias úteis reais de cada mês (ex: 20, 21 ou 23 dias).</p>
                        </div>

                        <div 
                          onClick={() => setConfig({...config, tipoProcessamento: 'Dias Fixos'})}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${config.tipoProcessamento === 'Dias Fixos' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`material-symbols-outlined ${config.tipoProcessamento === 'Dias Fixos' ? 'text-primary' : 'text-slate-400'}`}>pin</span>
                            <span className="font-bold text-slate-700 dark:text-white uppercase text-xs">Dias Fixos (22 dias)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">A base de cálculo é sempre 22 dias, independentemente do mês.</p>
                        </div>
                      </div>

                      {/* Explicação Visual */}
                      <div className="mt-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-primary text-sm">info</span>
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Como funciona o cálculo?</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                          <div className="space-y-4">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                              Se o funcionário trabalhar o <strong>mês completo</strong>, o valor final será igual ao salário base em ambos os regimes. A diferença aparece apenas em <strong>meses incompletos</strong> (admissões, demissões ou faltas).
                            </p>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Exemplo (Salário: 180.000 Kz)</p>
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                    <th className="pb-2 text-left">Situação</th>
                                    <th className="pb-2 text-right">Dias Fixos</th>
                                    <th className="pb-2 text-right">Dias Variáveis</th>
                                  </tr>
                                </thead>
                                <tbody className="text-slate-700 dark:text-slate-300">
                                  <tr className="border-b border-slate-50 dark:border-slate-800">
                                    <td className="py-2">Mês Completo</td>
                                    <td className="py-2 text-right font-bold text-emerald-500">180.000 Kz</td>
                                    <td className="py-2 text-right font-bold text-emerald-500">180.000 Kz</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2">10 Dias (Fev/20)</td>
                                    <td className="py-2 text-right">81.818 Kz</td>
                                    <td className="py-2 text-right text-primary font-bold">90.000 Kz</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                            <h5 className="text-[10px] font-black text-primary uppercase mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">calculate</span>
                              Fórmulas Aplicadas
                            </h5>
                            <div className="space-y-4">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Regime Fixo</p>
                                <p className="text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-primary/10 text-slate-700 dark:text-slate-300">Base ÷ 22 × Dias_Trab</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Regime Variável</p>
                                <p className="text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-primary/10 text-slate-700 dark:text-slate-300">Base ÷ Úteis ÷ Dias_Trab</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Localização e Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">País</label>
                      <select value={config.pais} onChange={(e) => setConfig({...config, pais: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                        {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Província</label>
                       <input type="text" value={config.provincia} onChange={(e) => setConfig({...config, provincia: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Endereço</label>
                       <input type="text" value={config.endereco} onChange={(e) => setConfig({...config, endereco: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Município</label>
                       <input type="text" value={config.municipio} onChange={(e) => setConfig({...config, municipio: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Província</label>
                       <input type="text" value={config.provincia} onChange={(e) => setConfig({...config, provincia: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                       <input type="text" value={config.telefone} onChange={(e) => setConfig({...config, telefone: e.target.value.replace(/[^0-9+]/g, '').slice(0, 13)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="+244912345678" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                       <input type="email" value={config.email} onChange={(e) => setConfig({...config, email: e.target.value})} onBlur={(e) => { if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) { setConfig({...config, email: ''}); }}} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="exemplo@email.com" />
                    </div>
                  </div>
                </div>

                {/* Calendário de Feriados */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-lg uppercase tracking-wider text-slate-800 dark:text-white">Calendário Vigente ({new Date().getFullYear()})</h3>
                    {holidaysLoading && <span className="text-xs text-primary animate-pulse font-bold uppercase">A carregar feriados...</span>}
                  </div>
                  
                  {holidays.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {holidays.map((h, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-primary transition-colors">
                          <p className="text-[10px] font-black text-primary uppercase mb-1">{new Date(h.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long' })}</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-white truncate">{h.localName}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-medium truncate">{h.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">calendar_today</span>
                      <p className="text-sm text-slate-400">Nenhum feriado carregado para {config.pais}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'impostos' && (
               <div className="space-y-6">
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Taxas de INSS</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa Trabalhador (%)</label>
                       <input type="number" min="0" step="0.01" value={config.taxaINSS} onChange={(e) => setConfig({...config, taxaINSS: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa Patronal (%)</label>
                       <input type="number" min="0" step="0.01" value={config.taxaINSSPatronal} onChange={(e) => setConfig({...config, taxaINSSPatronal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                     </div>
                   </div>
                 </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Tabela de IRT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Escalão</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Mínimo</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Máximo</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Taxa</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Parcela</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {taxasLoading ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-xs text-slate-400">A carregar...</td>
                          </tr>
                        ) : taxasIRT.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-xs text-slate-400">{taxasError || 'Sem dados disponíveis.'}</td>
                          </tr>
                        ) : (
                          taxasIRT.map((t, idx) => (
                            <tr key={`irt-${idx}`} className="hover:bg-slate-50/50 transition-all font-bold text-sm">
                              <td className="p-4">{t.faixa}</td>
                              <td className="p-4">{t.minimo.toLocaleString()}</td>
                              <td className="p-4">{t.maximo.toLocaleString()}</td>
                              <td className="p-4">{t.taxa}%</td>
                              <td className="p-4 text-right">{t.parcelaAbt.toLocaleString()} Kz</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'processamento' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Notificações Automatizadas</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-white">Notificar para Processar</p>
                        <p className="text-xs text-slate-400 mt-1">Receba um alerta quando chegar o dia de processar os salários</p>
                      </div>
                      <button onClick={() => setConfig({...config, processamentoAutomatico: !config.processamentoAutomatico})} className={`w-14 h-7 rounded-full flex items-center px-1 ${config.processamentoAutomatico ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}>
                        <div className="size-5 bg-white rounded-full shadow-lg" />
                      </button>
                    </div>
                    <div className={`flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl transition-all ${!config.processamentoAutomatico ? 'opacity-50' : 'opacity-100'}`}>
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-white">Dia de Processamento</p>
                        <p className="text-xs text-slate-400 mt-1">Dia do mês em que deseja ser notificado</p>
                      </div>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={config.diaProcessamento} 
                        disabled={!config.processamentoAutomatico}
                        onChange={(e) => setConfig({...config, diaProcessamento: Number(e.target.value) || 1})} 
                        className={`w-20 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-center font-black ${!config.processamentoAutomatico ? 'cursor-not-allowed text-slate-400' : ''}`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'gestao' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Minhas Entidades</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {empresas.map((bus, idx) => (
                      <div key={`empresa-${bus.id || idx}`} className={`p-6 rounded-xl border-2 transition-all ${empresaId === bus.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">{bus.categoria === 'Particular' ? 'home' : 'business'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{bus.nome}</p>
                            <p className="text-xs text-slate-400">NIF: {bus.nif}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSelectBusiness(bus)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${empresaId === bus.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                          >
                            {empresaId === bus.id ? 'Selecionado' : 'Selecionar'}
                          </button>
                          <button 
                            onClick={() => handleDeleteBusiness(bus.id)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            title="Eliminar Entidade"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'acesso' && (
              <div className="space-y-6">
                {/* Convites Recebidos */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">mail</span>
                    Convites Recebidos
                  </h3>
                  
                  {loadingInvitations ? (
                    <p className="text-center py-8 text-slate-400">A carregar convites...</p>
                  ) : invitations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {invitations.map((invite) => (
                        <div key={invite.id} className="p-6 rounded-xl border-2 border-primary/20 bg-primary/5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined">business</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{invite.empresa.nome}</p>
                              <p className="text-xs text-slate-400">Convidado por: {invite.invitedBy.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAcceptInvite(invite.id)}
                              className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold uppercase hover:bg-primary/90 transition-all"
                            >
                              Aceitar
                            </button>
                            <button 
                              onClick={() => handleRejectInvite(invite.id)}
                              className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">inbox</span>
                      <p className="text-sm text-slate-400">Nenhum convite pendente.</p>
                    </div>
                  )}
                </div>

                {/* Conceder Acesso (Apenas para empresas onde sou dono) */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">person_add</span>
                    Conceder Acesso
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 italic">Selecione a empresa e insira o email do usuário para conceder acesso.</p>
                  
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empresa</label>
                        <select 
                          value={selectedEmpresaId} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedEmpresaId(val === "" ? "" : Number(val));
                          }}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                        >
                          <option value="">Selecione uma empresa...</option>
                          {empresas.filter(e => e.user?.id === user?.id).map(e => (
                            <option key={e.id} value={e.id}>{e.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuário (Email ou Nome)</label>
                        <div className="relative">
                          <input 
                            type="email" 
                            placeholder="usuario@email.com" 
                            value={inviteEmail}
                            onChange={(e) => handleSearchUsers(e.target.value)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onFocus={() => inviteEmail.length >= 2 && setShowSuggestions(true)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                          {showSuggestions && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                              {searchResults.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => selectUser(u)}
                                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                >
                                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {u.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{u.name}</p>
                                    <p className="text-[10px] text-slate-400">{u.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => selectedEmpresaId && handleSendInvite(selectedEmpresaId as number)}
                        disabled={inviteLoading || !inviteEmail || !selectedEmpresaId}
                        className="px-8 py-2.5 rounded-lg bg-primary text-white text-xs font-black uppercase hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {inviteLoading ? 'A enviar...' : <><span className="material-symbols-outlined text-sm">send</span> Enviar Convite</>}
                      </button>
                    </div>
                  </div>

                  {/* Lista de usuários com acesso por empresa */}
                  <div className="mt-8 space-y-4">
                    {empresas.filter(e => e.user?.id === user?.id).map((bus) => bus.sharedUsers && bus.sharedUsers.length > 0 && (
                      <div key={`shared-${bus.id}`} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">business</span>
                          Acesso em: {bus.nome}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {bus.sharedUsers.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                              <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {u.name.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{u.name}</span>
                              <span className="text-[10px] text-slate-400">({u.email})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assinatura' && (
              <div className="space-y-8">
                {/* Status Atual */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">stars</span>
                        </div>
                        <h3 className="font-black text-xl uppercase tracking-tight text-slate-800 dark:text-white">A Sua Assinatura</h3>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-slate-500 font-medium italic">Plano Actual:</p>
                        <h4 className="text-4xl font-black text-primary uppercase tracking-tighter mb-2">{user?.activePlanName || user?.planType || 'DEMO'}</h4>
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            user?.subscriptionStatus === 'ATIVA' ? 'bg-emerald-100 text-emerald-700' : 
                            user?.subscriptionStatus === 'PENDENTE_APROVACAO' ? 'bg-amber-100 text-amber-700' : 
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {user?.subscriptionStatus}
                          </span>
                          {user?.subscriptionExpiry && (
                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              Expira em: {new Date(user.subscriptionExpiry).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {user?.subscriptionStatus !== 'ATIVA' && (
                        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 max-w-sm">
                          <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                            <span className="font-black">Atenção:</span> O seu acesso está limitado. Actualize ou aguarde a aprovação para continuar a usar todas as funcionalidades.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Planos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {plans.map((p) => (
                    <div 
                      key={p.id} 
                      className={`group p-8 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] flex flex-col ${
                        user?.planType === p.type ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="mb-6">
                        <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-12 ${
                           user?.planType === p.type ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-2xl">
                            {p.type === 'DEMO' ? 'rocket_launch' : p.type === 'BASIC' ? 'person' : p.type === 'PRO' ? 'groups' : 'corporate_fare'}
                          </span>
                        </div>
                        <h5 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white mb-1">{p.name}</h5>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</p>
                      </div>

                      <div className="mb-8">
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">{p.price.toLocaleString()}</span>
                          <span className="text-xs font-black text-slate-400 uppercase">Kz / {p.durationDays} dias</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[3rem]">{p.description || `Plano ${p.name} ideal para as suas necessidades de processamento.`}</p>
                      </div>

                      <ul className="space-y-4 mb-10 flex-1">
                        {[
                          'Processamento Ilimitado',
                          p.type === 'DEMO' ? 'Apenas 24 Horas' : `Acesso por ${p.durationDays} dias`,
                          'Suporte Prioritário',
                          'Relatórios Automáticos'
                        ].map((feat, i) => (
                          <li key={i} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                            {feat}
                          </li>
                        ))}
                      </ul>

                      <button 
                        onClick={() => handleUpgradePlan(p.id, p.name)}
                        disabled={user?.planType === p.type || (p.type === 'DEMO' && user?.planType !== 'DEMO')}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                          user?.planType === p.type || (p.type === 'DEMO' && user?.planType !== 'DEMO')
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default' 
                            : 'bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20'
                        }`}
                      >
                        {user?.planType === p.type ? 'Plano Actual' : p.type === 'DEMO' ? 'Indisponível' : 'Escolher Plano'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  <div className="relative">
                    <h5 className="text-xl font-black uppercase tracking-tight mb-2">Precisa de Ajuda?</h5>
                    <p className="text-sm text-slate-400 font-medium">Tem dúvidas sobre qual plano escolher ou precisa de um plano customizado?</p>
                  </div>
                  <button className="relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                    Falar com Consultor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Configurações;

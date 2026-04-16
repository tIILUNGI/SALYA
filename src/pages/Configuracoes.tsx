import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../services/api';
import Swal from 'sweetalert2';

interface ConfiguracaoEmpresa {
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
  taxaINSS: number;
  taxaINSSPatronal: number;
  taxaAGT: number;
  processamentoAutomatico: boolean;
  envioAutomaticoContracheques: boolean;
  diaProcessamento: number;
  regimeFiscal: string;
  tipoEntidade: string;
  categoria: string;
}

interface TaxaIRT {
  id: number;
  faixa: string;
  minimo: number;
  maximo: number;
  taxa: number;
  parcelaAbt: number;
}

// Função para mapear empresa da API para ConfiguracaoEmpresa
const mapEmpresaToConfig = (emp: any): ConfiguracaoEmpresa => ({
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
  taxaINSS: emp.taxaINSS ?? 3,
  taxaINSSPatronal: emp.taxaINSSPatronal ?? 8,
  taxaAGT: emp.taxaAGT ?? 2,
  processamentoAutomatico: emp.processamentoAutomatico ?? false,
  envioAutomaticoContracheques: emp.envioAutomaticoContracheques ?? false,
  diaProcessamento: emp.diaProcessamento ?? 5,
  regimeFiscal: emp.regimeFiscal || 'Geral',
  tipoEntidade: emp.tipoEntidade || 'Lda',
  categoria: emp.categoria || 'Empresa'
});

const Configuracoes: React.FC = () => {
  const { empresa, setEmpresa, isConfigured, setIsConfigured, empresas, empresaId, setEmpresaId, refreshData, setMessage } = useContext(AppContext);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(empresas && empresas.length > 1 ? 'gestao' : 'empresa');
  
  const emptyConfig: ConfiguracaoEmpresa = {
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
    taxaINSS: 3,
    taxaINSSPatronal: 8,
    taxaAGT: 2,
    processamentoAutomatico: false,
    envioAutomaticoContracheques: false,
    diaProcessamento: 5,
    regimeFiscal: 'Geral',
    tipoEntidade: 'Lda',
    categoria: 'Empresa'
  };

  const [config, setConfig] = useState<ConfiguracaoEmpresa>(
    empresa ? mapEmpresaToConfig(empresa) : { ...emptyConfig }
  );
  const [setupStep, setSetupStep] = useState(!empresa ? 'choice' : 'form');
  const [saved, setSaved] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(!empresa);
  const [taxasIRT, setTaxasIRT] = useState<TaxaIRT[]>([]);
  const [taxasLoading, setTaxasLoading] = useState(false);
  const [taxasError, setTaxasError] = useState('');

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
      } catch (error) {
        setTaxasIRT([]);
        setTaxasError('Erro ao carregar taxas.');
      } finally {
        setTaxasLoading(false);
      }
    };
    fetchTaxas();
  }, []);

  const handleChooseCategory = (category: 'Empresa' | 'Particular') => {
    setConfig({ ...emptyConfig, id: Date.now(), categoria: category });
    setIsCreatingNew(true);
    setSetupStep('form');
    setActiveTab('empresa');
  };

 const handleSave = async () => {
  console.group('💾 SAVING COMPANY');
  console.log('Config atual:', config);
  console.log('isCreatingNew:', isCreatingNew);
  console.log('empresa?.id:', empresa?.id);
  
  if (!config.nome || !config.nif) {
    console.warn('❌ Nome ou NIF vazio');
    setMessage({
      title: 'ERRO!',
      text: 'Por favor, preencha o Nome e o NIF antes de salvar.',
      type: 'error'
    });
    console.groupEnd();
    return;
  }

    try {
      const dataToSave = { ...config };

      
      if (!isCreatingNew && empresa?.id) {
        await api.put(`/empresas/${empresa.id}`, dataToSave);


      } else {
        // Excluir ID para o backend gerar e evitar erro 409 Conflict
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
      console.error('Error saving configurations:', error);
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
          console.error('Erro ao eliminar a empresa:', error);
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

  const tabs = [
    { id: 'empresa', label: 'Dados da Entidade', icon: 'business' },
    { id: 'impostos', label: 'Taxas de Impostos', icon: 'percent' },
    { id: 'processamento', label: 'Notificações', icon: 'notifications' },
    { id: 'gestao', label: 'Minhas Entidades', icon: 'account_tree' },
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
              {tabs.map(tab => (
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
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Localização e Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            )}
            {activeTab === 'impostos' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Taxas de INSS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa Trabalhador (%)</label>
                      <input type="number" value={config.taxaINSS} onChange={(e) => setConfig({...config, taxaINSS: Number(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa Patronal (%)</label>
                      <input type="number" value={config.taxaINSSPatronal} onChange={(e) => setConfig({...config, taxaINSSPatronal: Number(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
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
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-white">Dia de Processamento</p>
                        <p className="text-xs text-slate-400 mt-1">Dia do mês em que deseja ser notificado</p>
                      </div>
                      <input type="number" min="1" max="31" value={config.diaProcessamento} onChange={(e) => setConfig({...config, diaProcessamento: Number(e.target.value) || 1})} className="w-20 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-center font-black" />
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;
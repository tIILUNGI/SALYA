import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../services/api';
import { taxasIRT } from '../data/mockData';
import { ConfiguracaoEmpresa } from '../types';

const Configuracoes: React.FC = () => {
  const { empresa, setEmpresa, isConfigured, setIsConfigured, empresas, setEmpresas, empresaId, setEmpresaId, showConfirm } = useContext(AppContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('empresa');
  
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

  const [config, setConfig] = useState<ConfiguracaoEmpresa>(empresa ? { ...empresa, id: empresa.id || Date.now() } : { ...emptyConfig });
  const [setupStep, setSetupStep] = useState(!empresa ? 'choice' : 'form');
  const [saved, setSaved] = useState(false);

  // Sincronizar quando a empresa mudar via switcher
  useEffect(() => {
    if (empresa) {
      setConfig({ ...empresa });
    }
  }, [empresa]);

  const handleChooseCategory = (category: 'Empresa' | 'Particular') => {
    setConfig({ ...emptyConfig, id: Date.now(), categoria: category });
    setSetupStep('form');
    setActiveTab('empresa');
  };

  const handleSave = async () => {
    if (!config.nome || !config.nif) {
      alert('Por favor, preencha o Nome e o NIF antes de salvar.');
      return;
    }

    try {
      let savedEmpresa;
      if (empresa?.id) {
        savedEmpresa = await api.put(`/empresas/${empresa.id}`, config);
      } else {
        savedEmpresa = await api.post('/empresas', config);
      }
      
      const empresasData = await api.get('/empresas');
      const novasEmpresas = empresasData._embedded?.empresas || [];
      
      setEmpresas(novasEmpresas);
      setEmpresa(savedEmpresa);
      setEmpresaId(savedEmpresa.id || null);
      setIsConfigured(true);
      setSaved(true);
      
      setTimeout(() => {
        setSaved(false);
        if (!isConfigured) {
          navigate('/processamento');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving configurations:', error);
      alert('Erro ao salvar as configurações.');
    }
  };

  const handleSelectBusiness = (bus: any) => {
    setEmpresa(bus);
    setEmpresaId(bus.id);
    setConfig({ ...bus });
    setActiveTab('empresa');
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };

  const handleDeleteBusiness = (id: number) => {
    const busToDelete = empresas.find(e => e.id === id);
    if (!busToDelete) return;

    showConfirm({
      title: 'Eliminar Negócio',
      text: `Tem a certeza que deseja eliminar "${busToDelete.nome}"? Todos os dados associados serão perdidos permanentemente.`,
      onConfirm: () => {
        const novasEmpresas = empresas.filter(e => e.id !== id);
        setEmpresas(novasEmpresas);

        if (empresaId === id) {
          if (novasEmpresas.length > 0) {
            const nextBus = novasEmpresas[0];
            setEmpresa(nextBus);
            setEmpresaId(nextBus.id);
            setConfig({ ...nextBus });
          } else {
            setEmpresa(null);
            setEmpresaId(null);
            setIsConfigured(false);
            setSetupStep('choice');
          }
        }
      }
    });
  };

  const tabs = [
    { id: 'empresa', label: 'Dados da Empresa', icon: 'business' },
    { id: 'impostos', label: 'Taxas de Impostos', icon: 'percent' },
    { id: 'processamento', label: 'Processamento', icon: 'sync' },
    { id: 'gestao', label: 'Meus Negócios', icon: 'account_tree' },
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
          <h1 className="text-3xl font-black tracking-tight">{setupStep === 'choice' ? 'Adicionar Novo Negócio' : (isConfigured ? 'Configurações do Sistema' : 'Novo Cadastro')}</h1>
          <p className="text-slate-500 mt-1">{setupStep === 'choice' ? 'Escolha o tipo de perfil para o novo negócio.' : 'Preencha os dados abaixo e clique em Salvar.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {(setupStep === 'form' && isConfigured) && (
            <button 
              onClick={() => setSetupStep('choice')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">add</span> Criar Novo Negócio
            </button>
          )}
          {setupStep === 'form' && (
            <button onClick={handleSave} className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'}`}>
              {saved ? <><span className="material-symbols-outlined">check</span> Guardado!</> : <><span className="material-symbols-outlined">save</span> Criar/Salvar Negócio</>}
            </button>
          )}
        </div>
      </div>

      {setupStep === 'choice' ? (
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <h2 className="text-3xl font-black mb-4 uppercase">Escolha o seu perfil</h2>
          <p className="text-slate-500 mb-10">Como pretende utilizar o SALYA? Seleccione a opção que melhor se adapta a si.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={() => handleChooseCategory('Empresa')} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary transition-all group text-left shadow-xl">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-4xl">business</span></div>
              <h3 className="text-xl font-bold mb-2 uppercase">Empresa ou Negócio</h3>
              <p className="text-slate-500 text-sm">Para empresas com diversos funcionários e obrigações fiscais complexas.</p>
            </button>
            <button onClick={() => handleChooseCategory('Particular')} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary transition-all group text-left shadow-xl">
              <div className="size-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-4xl">home</span></div>
              <h3 className="text-xl font-bold mb-2 uppercase">Particular / Doméstico</h3>
              <p className="text-slate-500 text-sm">Para gerir funcionários em sua residência particular ou prestadores únicos.</p>
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
                      <input type="text" value={config.nif || ''} onChange={(e) => setConfig({...config, nif: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regime Fiscal</label>
                      <select value={config.regimeFiscal || 'Geral'} onChange={(e) => setConfig({...config, regimeFiscal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                        <option>Geral</option><option>Simplificado</option><option>Isento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Entidade</label>
                      <select value={config.tipoEntidade || 'Lda'} onChange={(e) => setConfig({...config, tipoEntidade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                        <option>Lda</option><option>SA</option><option>EI</option><option>Sucursal</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Localização e Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Endereço</label>
                       <input type="text" value={config.endereco || ''} onChange={(e) => setConfig({...config, endereco: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Município</label>
                       <input type="text" value={config.municipio || ''} onChange={(e) => setConfig({...config, municipio: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Província</label>
                       <input type="text" value={config.provincia || ''} onChange={(e) => setConfig({...config, provincia: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                       <input type="text" value={config.telefone} onChange={(e) => setConfig({...config, telefone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                       <input type="email" value={config.email} onChange={(e) => setConfig({...config, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
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
                      <input type="number" value={config.taxaINSS} onChange={(e) => setConfig({...config, taxaINSS: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa Patronal (%)</label>
                      <input type="number" value={config.taxaINSSPatronal} onChange={(e) => setConfig({...config, taxaINSSPatronal: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Tabela de IRT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50"><th className="p-4 text-[10px] font-black text-slate-400 uppercase">Escalão</th><th className="p-4 text-[10px] font-black text-slate-400 uppercase">Mínimo</th><th className="p-4 text-[10px] font-black text-slate-400 uppercase">Máximo</th><th className="p-4 text-[10px] font-black text-slate-400 uppercase">Taxa</th><th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Parcela</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {taxasIRT.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-all font-bold text-sm"><td className="p-4">{t.faixa}</td><td className="p-4">{t.minimo.toLocaleString()}</td><td className="p-4">{t.maximo.toLocaleString()}</td><td className="p-4">{t.taxa}%</td><td className="p-4 text-right">{t.parcelaAbt.toLocaleString()} Kz</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'processamento' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Automações</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div><p className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-white">Processamento Automático</p><p className="text-xs text-slate-400 mt-1">Executar cálculos na data definida</p></div>
                      <button onClick={() => setConfig({...config, processamentoAutomatico: !config.processamentoAutomatico})} className={`w-14 h-7 rounded-full transition-all flex items-center px-1 ${config.processamentoAutomatico ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}><div className="size-5 bg-white rounded-full shadow-lg" /></button>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div><p className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-white">Dia de Processamento</p><p className="text-xs text-slate-400 mt-1">Dia do mês para fecho salarial</p></div>
                      <input type="number" min={1} max={28} value={config.diaProcessamento} onChange={(e) => setConfig({...config, diaProcessamento: Number(e.target.value)})} className="w-20 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-center font-black" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'gestao' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-slate-800 dark:text-white">Meus Negócios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {empresas.map((bus) => (
                      <div key={bus.id} className={`p-6 rounded-xl border-2 transition-all ${empresaId === bus.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}>
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
                            title="Eliminar Negócio"
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

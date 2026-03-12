import React, { useState } from 'react';
import { transacoesMulticaixa } from '../data/mockData';

const Multicaixa: React.FC = () => {
  const [entityCode, setEntityCode] = useState('902345');
  const [apiKey, setApiKey] = useState('••••••••••••');
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const totalArrecadado = transacoesMulticaixa
    .filter(t => t.status === 'Processado')
    .reduce((sum, t) => sum + t.valor, 0);
  
  const totalPendente = transacoesMulticaixa
    .filter(t => t.status === 'Pendente')
    .reduce((sum, t) => sum + t.valor, 0);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'configuracao', label: 'Configuração', icon: 'settings' },
    { id: 'transacoes', label: 'Transações', icon: 'receipt_long' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="hover:text-primary cursor-pointer">Início</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="hover:text-primary cursor-pointer">Configurações</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Integração Multicaixa</span>
        </nav>
        <h1 className="text-3xl font-black tracking-tight">Integração Rede Multicaixa (EMIS)</h1>
        <p className="text-slate-500 mt-1">Gerencie os pagamentos via referências Multicaixa e integração com a EMIS.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
              </div>
              <div>
                <h2 className="font-bold text-lg">Rede Multicaixa Express</h2>
                <p className="text-sm text-slate-500">Integração com EMIS - Sistema Electrónico de Meios de Pagamento</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                  <span className="text-sm font-medium">Arrecadado</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{totalArrecadado.toLocaleString()} Kz</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <span className="material-symbols-outlined text-xl">schedule</span>
                  <span className="text-sm font-medium">Pendente</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{totalPendente.toLocaleString()} Kz</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <span className="material-symbols-outlined text-xl">receipt</span>
                  <span className="text-sm font-medium">Total Transações</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{transacoesMulticaixa.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className={`p-6 rounded-xl border shadow-sm ${
            isConnected 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`material-symbols-outlined text-2xl ${isConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                {isConnected ? 'wifi' : 'wifi_off'}
              </span>
              <div>
                <p className="font-bold">{isConnected ? 'Conectado' : 'Desconectado'}</p>
                <p className="text-sm text-slate-500">Status da API EMIS</p>
              </div>
            </div>
            <button 
              onClick={() => setIsConnected(!isConnected)}
              className={`w-full py-2 rounded-lg font-medium ${
                isConnected 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {isConnected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold">Transações Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Referência</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transacoesMulticaixa.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="p-4 font-mono text-sm">{t.referencia}</td>
                    <td className="p-4 text-sm">{t.data}</td>
                    <td className="p-4 font-medium">{t.descricao}</td>
                    <td className="p-4 text-right font-bold">{t.valor.toLocaleString()} Kz</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.status === 'Processado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'configuracao' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Credenciais de Acesso</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Código de Entidade</label>
                <input 
                  type="text" 
                  value={entityCode}
                  onChange={(e) => setEntityCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Chave API</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button className="py-2.5 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
                Atualizar Credenciais
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Configurações de Referências</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium">Geração Automática de Referências</p>
                  <p className="text-sm text-slate-500">Gerar referências automaticamente ao emitir faturas</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-primary">
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium">Notificações por Email</p>
                  <p className="text-sm text-slate-500">Enviar email ao receber pagamento</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-primary">
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transacoes' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold">Todas as Transações</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
              <span className="material-symbols-outlined">download</span>
              Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Referência</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transacoesMulticaixa.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="p-4 font-mono text-sm">{t.referencia}</td>
                    <td className="p-4 text-sm">{t.data}</td>
                    <td className="p-4 font-medium">{t.descricao}</td>
                    <td className="p-4 text-right font-bold">{t.valor.toLocaleString()} Kz</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.status === 'Processado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Multicaixa;

import React from 'react';

const Relatorios: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2">Relatórios de Folha de Pagamento</h1>
      <p className="text-slate-500 mb-8">Genere relatórios detalhados da folha de pagamento.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Resumo da Folha', 'Relatório Bancário', 'Custos por Centro', 'Impostos e Taxas'].map((title, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-primary cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-3xl text-primary mb-3">{['table_chart', 'account_balance', 'people', 'receipt'][i]}</span>
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm text-slate-500">{['Visão geral dos valores', 'Resumo de transferências', 'Análise por departamento', 'IRT e INSS'][i]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Relatorios;

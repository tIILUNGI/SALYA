import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: 'account_balance_wallet',
      title: 'Processamento Salarial',
      description: 'Calcule salários, impostos e contribuições de forma automática e precisa.'
    },
    {
      icon: 'groups',
      title: 'Gestão de Colaboradores',
      description: 'Gerencie contratos, férias, atestados e dados dos seus funcionários.'
    },
    {
      icon: 'description',
      title: 'Recibo de Salário',
      description: 'Gere recibos individuais ou em lote, prontos para impressão e envio.'
    },
    {
      icon: 'notifications_active',
      title: 'Alertas e Notificações',
      description: 'Receba alertas sobre vencimentos de contratos, documentos e obrigações.'
    },
    {
      icon: 'calculate',
      title: 'Simulações',
      description: 'Simule cenários salariais para planeamento financeiro.'
    },
    {
      icon: 'person_remove',
      title: 'Rescisões',
      description: 'Calcule automaticamente rescisões, liquidções e férias não gozo.'
    },
    {
      icon: 'insights',
      title: 'Relatórios',
      description: 'Relatórios detalhados para gestão e obrigações fiscais.'
    },
    {
      icon: 'business',
      title: 'Multi-Entidades',
      description: 'Gerencie várias empresas ou entidades num único sistema.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-lg">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-primary">SALYA</h1>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-black text-slate-800 mb-6 tracking-tight">
            Sistema de Gestão de Recibo Salarial
          </h2>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
            Simplifique a gestão salarial da sua empresa. Calcule salários, gere recibos, 
            manage colaboradores e mantenha-se em conformidade com as obrigações fiscais de Angola.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-primary text-white font-bold rounded-xl text-lg"
          >
            Começar Agora
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-black text-slate-800 mb-12 text-center uppercase tracking-wider">
           Funcionalidades
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-3xl text-primary mb-4">
                  {feature.icon}
                </span>
                <h4 className="font-bold text-slate-800 mb-2">{feature.title}</h4>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-black text-slate-800 mb-8 text-center uppercase tracking-wider">
            Porquê escolher o SALYA?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <div>
                <h4 className="font-bold text-slate-800">Cálculos Precisos</h4>
                <p className="text-sm text-slate-500">Cálculos automáticos de IRT, INSS e outras deduções segundo a legislação angolana.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <div>
                <h4 className="font-bold text-slate-800">Economia de Tempo</h4>
                <p className="text-sm text-slate-500">Reduza horas de trabalho administrativo com processamento automático.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <div>
                <h4 className="font-bold text-slate-800">Compliance Fiscal</h4>
                <p className="text-sm text-slate-500">Mantenha-se em conformidade com as autoridades fiscais de Angola.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <div>
                <h4 className="font-bold text-slate-800">Segurança dos Dados</h4>
                <p className="text-sm text-slate-500">Seus dados protegidos com backup automático.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-400">
          <p>© 2026 SALYA SOFTWARE SOLUTIONS. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
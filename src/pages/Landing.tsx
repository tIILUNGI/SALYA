import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const funcionalidades = [
    {
      titulo: 'Colaboradores',
      descricao: 'Gerencie os dados dos seus colaboradores: cadastro, informações pessoais, contato, função e departamento. Tenha total controle sobre a sua base de funcionários.',
      imagem: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Colaboradores'
    },
    {
      titulo: 'Processamento Salarial',
      descricao: 'Calcule salários com precisão, aplicandodeduções de IRT (Imposto sobre o Rendimento do Trabalho) e INSS (Instituto Nacional de Segurança Social). Processe em bulk todos os colaboradores de forma rápida.',
      imagem: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Processamento'
    },
    {
      titulo: 'Geração de Recibos',
      descricao: 'Gere recibos salariais profissionais para impressão ou download em PDF. Cada recibo contém todos os detalhes do salário: vencimentos, descontos, líquidos e molto.',
      imagem: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Recibos'
    },
    {
      titulo: 'Relatórios',
      descricao: 'Acesse relatórios detalhados de folha de pagamento, histórica de salários por colaborador, e exportação de dados para análises externas.',
      imagem: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Relatórios'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
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

      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-black text-slate-800 mb-6 tracking-tight">
            Sistema de Gestão de Recibo Salarial
          </h2>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
            Calcule salários, gere recibos e gerencie dados dos colaboradores.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-primary text-white font-bold rounded-xl text-lg"
          >
            Começar Agora
          </button>
        </div>
      </section>

      <section className="py-16 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">
                calculate
              </span>
              <h4 className="font-bold text-slate-800 mb-2">Processamento Salarial</h4>
              <p className="text-sm text-slate-500">Calcule salários com IRT e INSS.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">
                description
              </span>
              <h4 className="font-bold text-slate-800 mb-2">Recibo de Salário</h4>
              <p className="text-sm text-slate-500">Gere recibos para impressão.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">
                groups
              </span>
              <h4 className="font-bold text-slate-800 mb-2">Colaboradores</h4>
              <p className="text-sm text-slate-500">Gerencie dados dos funcionários.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-8" id="sobre">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-black text-slate-800 mb-8 text-center">SOBRE O SISTEMA</h3>
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              O <strong>SALYA</strong> é um sistema de gestão de recibo salarial desenvolvido especificamente para empresas angolanas. A nossa plataforma simplifica todo o processo de cálculo e emissão de recibossalariais, garantindo conformidade com a legislação angolana.
            </p>
            <p className="text-lg text-slate-600 mb-6">
              <strong>Para quem serve?</strong> O SALYA é ideal para pequenas e médias empresas em Angola que precisam de uma solução simples e eficiente para gerir a folha de pagamento dos seus colaboradores.
            </p>
            <p className="text-lg text-slate-600 mb-6">
              <strong>O que faz?</strong> O sistema permite gerir os dados dos colaboradores, calcular salarios com as devidas deduções de IRT e INSS conforme a legislação angolana vigente, e gerar recibos salariais profissionais para entrega aos colaboradores.
            </p>
            <p className="text-lg text-slate-600">
              Com o SALYA, voce pode processar a folha de pagamento de forma rapida e precisa, eliminando erros manuais e economizando tempo significativo no processo de gestão salarial.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-8 bg-slate-50" id="funcionalidades">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-black text-slate-800 mb-12 text-center">FUNCIONALIDADES</h3>
          <div className="space-y-16">
            {funcionalidades.map((func, index) => (
              <div key={index} className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
                <div className="flex-1">
                  <img 
                    src={func.imagem} 
                    alt={func.titulo}
                    className="w-full rounded-xl shadow-lg"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-slate-800 mb-4">{func.titulo}</h4>
                  <p className="text-lg text-slate-600">{func.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-8 bg-primary" id="porque-usar">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-black text-white mb-8 text-center">PORQUE USAR O SALYA?</h3>
          <div className="space-y-6 text-white">
            <div className="bg-white/10 p-6 rounded-xl">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">gavel</span>
                Conformidade Legal
              </h4>
              <p className="text-white/90">
                Em Angola, a legislação trabalhista e fiscal exige que os empregadores emitam recibos salariais para os colaboradores. O Decreto Presidencial sobre a Organização do Sistema de Remuneração dos Funcionários e Agentes do Estado e a Lei Geral do Trabalho estabelecem a obrigatoriedade de comprovativos de pagamento salarial. O SALYA garante que a sua empresa esteja em conformidade com estas exigências legais, gerando recibos profissionais e detalhados.
              </p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">speed</span>
                Agilidade no Processamento
              </h4>
              <p className="text-white/90">
                Processe a folha de pagamento de todos os colaboradores em segundos. O cálculo automático de IRT e INSS elimina erros manuais e economiza tempo.
              </p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">savings</span>
                Economia de Custos
              </h4>
              <p className="text-white/90">
                Elimine a necessidade de papelada física e serviços de contabilidade externos. Tenha tudo digitalizado e organizado num único sistema.
              </p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">verified</span>
                Segurança e Confiabilidade
              </h4>
              <p className="text-white/90">
                Os dados dos seus colaboradores e informações salariais são armazenados de forma segura, com Processo automático e controle de acesso.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-400">
          <p>© 2026 SALYA. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

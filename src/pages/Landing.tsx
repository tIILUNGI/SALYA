import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const funcionalidades = [
    {
      titulo: 'Colaboradores',
      descricao: 'Gerencie os dados dos seus colaboradores: cadastro, informações pessoais, contacto, função e departamento. Tenha total controle sobre a sua base de funcionários.',
      imagem: '/Colaborador.png'
    },
    {
      titulo: 'Processamento Salarial',
      descricao: 'Calcule salários com precisão, aplicando deduções de IRT (Imposto sobre o Rendimento do Trabalho) e INSS (Instituto Nacional de Segurança Social). Processe em lote de forma rápida.',
      imagem: '/Processamento.png'
    },
    {
      titulo: 'Geração de Recibos',
      descricao: 'Gere recibos salariais profissionais para impressão ou download em PDF. Cada recibo contém todos os detalhes do salário: vencimentos, descontos e líquidos.',
      imagem: '/Recibos .jpeg'
    },
    {
      titulo: 'Relatórios & BI',
      descricao: 'Acesse relatórios detalhados de folha de pagamento, histórico de salários por colaborador, e exportação de dados para análises externas.',
      imagem: '/Relatorios.png'
    }
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-app">
      <header className="border-b border-corporate-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-1.5 rounded">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h1 className="text-xl font-semibold text-corporate-800">SALYA</h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-6">
              <button onClick={() => scrollToSection('sobre')} className="text-sm text-corporate-500 hover:text-primary transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('funcionalidades')} className="text-sm text-corporate-500 hover:text-primary transition-colors">Funcionalidades</button>
              <button onClick={() => scrollToSection('porque-usar')} className="text-sm text-corporate-500 hover:text-primary transition-colors">Vantagens</button>
            </nav>
            <button onClick={() => navigate('/login')} className="px-6 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors">
              Entrar
            </button>
          </div>
        </div>
      </header>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-corporate-800 mb-6">
            Gestão de <br/> <span className="text-primary">Recibos Salariais</span>
          </h2>
          
          <button 
            onClick={() => navigate('/login')}
            className="px-10 py-3 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Começar Agora
          </button>
        </div>
      </section>

      <section className="py-16 px-6 bg-corporate-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border border-corporate-200 shadow-card">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">calculate</span>
              <h4 className="text-base font-medium text-corporate-800 mb-2">Cálculo Automático</h4>
              <p className="text-sm text-corporate-500">Processamento preciso de IRT e INSS com as taxas atualizadas conforme a lei vigente.</p>
            </div>
            <div className="bg-white p-6 rounded border border-corporate-200 shadow-card">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">description</span>
              <h4 className="text-base font-medium text-corporate-800 mb-2">Recibos em PDF</h4>
              <p className="text-sm text-corporate-500">Geração instantânea de recibos profissionais prontos para impressão ou envio digital.</p>
            </div>
            <div className="bg-white p-6 rounded border border-corporate-200 shadow-card">
              <span className="material-symbols-outlined text-3xl text-primary mb-4">groups</span>
              <h4 className="text-base font-medium text-corporate-800 mb-2">Gestão de Equipa</h4>
              <p className="text-sm text-corporate-500">Controlo total sobre perfis, documentos e histórico profissional de cada colaborador.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white" id="sobre">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-lg font-medium text-corporate-500 mb-8">Sobre o Sistema</h3>
          <div className="space-y-6 text-center md:text-left">
            <p className="text-lg text-corporate-600">
              O <strong className="text-corporate-800">SALYA</strong> é um sistema desenvolvido especificamente para o mercado angolano, simplificando a emissão de recibos e a gestão salarial.
            </p>
            <div className="grid md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <h5 className="font-medium text-primary">Para quem serve?</h5>
                <p className="text-sm text-corporate-500">Ideal para PME's em Angola que precisam de uma solução simples, moderna e eficiente para gerir a sua folha de pagamento.</p>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium text-primary">O que faz?</h5>
                <p className="text-sm text-corporate-500">Gere dados, calcula impostos (IRT/INSS) e emite recibos oficiais em conformidade com as diretrizes fiscais de Angola.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white" id="funcionalidades">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-semibold text-corporate-800 mb-10 text-center">Funcionalidades</h3>
          <div className="space-y-8">
            {funcionalidades.map((func, index) => (
              <div key={index} data-index={index} className="func-item">
                <div className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center p-6 bg-corporate-50 rounded border border-corporate-200`}>
                  <div className="flex-1 w-full">
                    <img src={func.imagem} alt={func.titulo} className="w-full h-48 object-cover rounded" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h4 className="text-lg font-medium text-corporate-800">{func.titulo}</h4>
                    <p className="text-sm text-corporate-500">{func.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-corporate-800" id="porque-usar">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-medium text-white mb-8 text-center">Vantagens</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-corporate-700 p-6 rounded border border-corporate-600">
              <h4 className="text-base font-medium mb-2 flex items-center gap-2 text-white"><span className="material-symbols-outlined text-primary">gavel</span> Conformidade Legal</h4>
              <p className="text-sm text-corporate-300">O SALYA garante conformidade com o Decreto Presidencial e a Lei Geral do Trabalho.</p>
            </div>
            <div className="bg-corporate-700 p-6 rounded border border-corporate-600">
              <h4 className="text-base font-medium mb-2 flex items-center gap-2 text-white"><span className="material-symbols-outlined text-primary">speed</span> Agilidade Total</h4>
              <p className="text-sm text-corporate-300">O processamento em lote permite liquidar salários em segundos.</p>
            </div>
            <div className="bg-corporate-700 p-6 rounded border border-corporate-600">
              <h4 className="text-base font-medium mb-2 flex items-center gap-2 text-white"><span className="material-symbols-outlined text-primary">savings</span> Redução de Custos</h4>
              <p className="text-sm text-corporate-300">Digitalize os processos e elimine papelada com uma solução centralizada.</p>
            </div>
            <div className="bg-corporate-700 p-6 rounded border border-corporate-600">
              <h4 className="text-base font-medium mb-2 flex items-center gap-2 text-white"><span className="material-symbols-outlined text-primary">verified</span> Segurança de Dados</h4>
              <p className="text-sm text-corporate-300">Dados armazenados com criptografia e backups periódicos.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 bg-white border-t border-corporate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-2 text-corporate-500">
             <div className="bg-primary text-white size-6 rounded flex items-center justify-center"><span className="material-symbols-outlined text-xs">payments</span></div>
             <span className="text-sm font-medium">SALYA</span>
           </div>
      
           <div className="flex gap-4">
             <button className="text-xs text-corporate-400 hover:text-primary">Termos</button>
             <button className="text-xs text-corporate-400 hover:text-primary">Privacidade</button>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
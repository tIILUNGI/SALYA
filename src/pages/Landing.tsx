import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [animatedItems, setAnimatedItems] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setAnimatedItems(prev => new Set(prev).add(index));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.func-item').forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-app selection:bg-primary selection:text-white">
      {/* Header com Design Polido */}
      <header className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">SALYA<span className="text-primary italic">.</span></h1>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-6">
              <button onClick={() => scrollToSection('sobre')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('funcionalidades')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Funcionalidades</button>
              <button onClick={() => scrollToSection('porque-usar')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Vantagens</button>
            </nav>
            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all active:scale-95 shadow-xl shadow-primary/10">Entrar</button>
          </div>
        </div>
      </header>

      {/* Hero Section Polida */}
      <section className="py-24 px-8 relative overflow-hidden bg-white">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-6xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-none">
            Gestão de <br/> <span className="text-primary italic">Recibos Salariais</span>
          </h2>
          
          <button 
            onClick={() => navigate('/login')}
            className="px-12 py-5 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95"
          >
            Começar Agora
          </button>
        </div>
      </section>

      {/* Cards de Destaque */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">calculate</span>
              <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Cálculo Automático</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Processamento preciso de IRT e INSS com as taxas atualizadas conforme a lei vigente.</p>
            </div>
            <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">description</span>
              <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Recibos em PDF</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Geração instantânea de recibos profissionais prontos para impressão ou envio digital.</p>
            </div>
            <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">groups</span>
              <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Gestão de Equipa</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Controlo total sobre perfis, documentos e histórico profissional de cada colaborador.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre o Sistema - Original Restaurado e Ajeitado */}
      <section className="py-24 px-8 bg-slate-100" id="sobre">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-10 justify-center">
             <div className="h-px bg-slate-300 flex-1"></div>
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[10px]">Sobre o Sistema</h3>
             <div className="h-px bg-slate-300 flex-1"></div>
          </div>
          <div className="space-y-8 text-center md:text-left">
            <p className="text-xl text-slate-600 leading-relaxed font-medium italic">
              O <strong className="text-slate-900 not-italic">SALYA</strong> é um sistema desenvolvido especificamente para o mercado angolano, simplificando a emissão de recibos e a gestão salarial.
            </p>
            <div className="grid md:grid-cols-2 gap-10 text-left pt-6">
               <div className="space-y-4">
                  <h5 className="font-black text-primary uppercase text-xs tracking-widest italic">Para quem serve?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">Ideal para PME's em Angola que precisam de uma solução simples, moderna e eficiente para gerir a sua folha de pagamento.</p>
               </div>
               <div className="space-y-4">
                  <h5 className="font-black text-primary uppercase text-xs tracking-widest italic">O que faz?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">Gere dados, calcula impostos (IRT/INSS) e emite recibos oficiais em conformidade com as diretrizes fiscais de Angola.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades - Original Restaurado com Design Ajustado */}
      <section className="py-24 px-8 bg-white" id="funcionalidades">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-black text-slate-900 mb-16 text-center uppercase tracking-tighter italic">Funcionalidades do <span className="text-primary not-italic">Software</span></h3>
          <div className="space-y-12">
            {funcionalidades.map((func, index) => (
              <div key={index} data-index={index} className="func-item animate-on-scroll">
                <div className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center p-10 bg-slate-50 rounded-[40px] border border-slate-100`}>
                  <div className="flex-1 w-full shadow-2xl rounded-3xl overflow-hidden group">
                    <img src={func.imagem} alt={func.titulo} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg">{index + 1}</span>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{func.titulo}</h4>
                    </div>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">{func.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Porque Usar - Original Restaurado e Ajeitado */}
      <section className="py-24 px-8 bg-slate-900 relative overflow-hidden" id="porque-usar">
        <div className="max-w-5xl mx-auto relative z-10">
          <h3 className="text-3xl font-black text-white mb-16 text-center uppercase tracking-tighter">Vantagens de Escolher o <span className="text-primary italic">Salya</span></h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-10 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
              <h4 className="text-xl font-black mb-4 flex items-center gap-4 text-white uppercase tracking-tighter"><span className="material-symbols-outlined text-primary">gavel</span> Conformidade Legal</h4>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">O SALYA garante conformidade com o Decreto Presidencial e a Lei Geral do Trabalho, gerando recibos profissionais que atendem às exigências fiscais angolanas.</p>
            </div>
            <div className="bg-white/5 p-10 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
              <h4 className="text-xl font-black mb-4 flex items-center gap-4 text-white uppercase tracking-tighter"><span className="material-symbols-outlined text-primary">speed</span> Agilidade Total</h4>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">O processamento em lote permite liquidar salários em segundos, eliminando erros manuais e otimizando o tempo da sua equipa de RH.</p>
            </div>
            <div className="bg-white/5 p-10 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
              <h4 className="text-xl font-black mb-4 flex items-center gap-4 text-white uppercase tracking-tighter"><span className="material-symbols-outlined text-primary">savings</span> Redução de Custos</h4>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">Digitalize os processos, elimine papelada e reduza a dependência de serviços externos pesados com uma solução centralizada.</p>
            </div>
            <div className="bg-white/5 p-10 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
              <h4 className="text-xl font-black mb-4 flex items-center gap-4 text-white uppercase tracking-tighter"><span className="material-symbols-outlined text-primary">verified</span> Segurança de Dados</h4>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">Dados armazenados com criptografia e backups periódicos, garantindo total privacidade e disponibilidade das informações críticas.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-8 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3 opacity-50">
              <div className="bg-primary text-white size-8 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">payments</span></div>
              <span className="text-sm font-black text-slate-900 uppercase">SALYA</span>
           </div>
       
           <div className="flex gap-6">
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Termos</button>
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Privacidade</button>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
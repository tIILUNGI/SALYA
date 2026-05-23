import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const funcionalidades = [
    {
      titulo: 'Gestão de Colaboradores',
      descricao: 'Controle completo sobre dados pessoais, contratuais e histórico profissional da sua equipa em um ambiente centralizado.',
      imagem: '/Colaborador.png'
    },
    {
      titulo: 'Folha de Pagamento Profissional',
      descricao: 'Cálculos automatizados de IRT e INSS em conformidade total com a legislação angolana e o Decreto Presidencial.',
      imagem: '/Processamento.png'
    },
    {
      titulo: 'Geração de Recibos em PDF',
      descricao: 'Emita recibos de vencimento detalhados e profissionais com apenas um clique, prontos para partilha digital segura.',
      imagem: '/Recibos .jpeg'
    },
    {
      titulo: 'Relatórios & Business Intelligence',
      descricao: 'Aceda a métricas precisas sobre a sua folha de pagamento e exporte relatórios mensais fundamentais para a sua gestão.',
      imagem: '/Relatorios.png'
    }
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-app selection:bg-primary/10 selection:text-primary">
      <header className="border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="Salya Logo" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('sobre')} className="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('funcionalidades')} className="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">Funcionalidades</button>
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-soft hover:shadow-lg hover:bg-primary/90 transition-all">
                Começar Agora
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-400/20 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            Gestão Moderna de <br/> <span className="text-primary italic">Folha de Pagamento</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Simplifique a sua folha de pagamento, automatize cálculos de IRT e INSS e emita recibos profissionais em segundos com a SALYA.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-base font-bold rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all"
            >
              Começar conta gratuita
            </button>
            <button 
              onClick={() => scrollToSection('funcionalidades')}
              className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-white text-base font-bold rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all"
            >
              Explorar Funcionalidades
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card hover:border-primary/30 transition-all">
              <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl text-primary">calculate</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">Cálculos Automatizados</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Processamento preciso de IRT e INSS com as taxas oficiais da AGT sempre atualizadas conforme a lei vigente.</p>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card hover:border-primary/30 transition-all">
              <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl text-primary">description</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">Recibos Profissionais</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Geração instantânea de recibos profissionais em PDF, organizados e prontos para envio digital seguro.</p>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card hover:border-primary/30 transition-all">
              <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl text-primary">groups</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">Liderança de Equipa</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Controlo digital sobre perfis, cargos e histórico profissional de cada colaborador em um ambiente integrado.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-slate-900 overflow-hidden" id="sobre">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">A Plataforma</h3>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
              A Solução de <span className="text-primary italic">Folha de Pagamento</span> Líder em Angola.
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              O SALYA foi desenhado especificamente para as necessidades das PME's angolanas, removendo a complexidade técnica e burocrática da folha de pagamento.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-3 p-6 bg-white/5 rounded-2xl border border-white/10">
                <h5 className="font-bold text-primary text-sm uppercase tracking-wider">Conformidade</h5>
                <p className="text-xs text-slate-400 leading-relaxed">Cálculos baseados nas últimas tabelas de IRT e diretrizes da AGT.</p>
              </div>
              <div className="space-y-3 p-6 bg-white/5 rounded-2xl border border-white/10">
                <h5 className="font-bold text-primary text-sm uppercase tracking-wider">Segurança</h5>
                <p className="text-xs text-slate-400 leading-relaxed">Dados cifrados e infraestrutura robusta para proteção da sua empresa.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 relative w-full lg:w-auto">
             <div className="size-64 bg-primary/20 rounded-full blur-[100px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
             <div className="relative z-10 p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl space-y-8">
                <div className="flex items-center gap-5 group">
                   <div className="size-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-emerald-400">verified</span>
                   </div>
                   <div>
                      <p className="text-white font-bold tracking-tight">Processamento em Lote</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Eficiência Operacional</p>
                   </div>
                </div>
                <div className="flex items-center gap-5 group">
                   <div className="size-12 rounded-2xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-violet-400">description</span>
                   </div>
                   <div>
                      <p className="text-white font-bold tracking-tight">Recibos Oficiais</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Padrão Corporativo</p>
                   </div>
                </div>
                <div className="flex items-center gap-5 group">
                   <div className="size-12 rounded-2xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-amber-400">analytics</span>
                   </div>
                   <div>
                      <p className="text-white font-bold tracking-tight">Dashboards de BI</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Dados Inteligentes</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white dark:bg-slate-900" id="funcionalidades">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Funcionalidades</h3>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Potencialize a sua Gestão</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {funcionalidades.map((func, index) => (
              <div key={index} className="group flex flex-col gap-8 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all overflow-hidden shadow-soft">
                <div className="relative h-72 overflow-hidden rounded-[2.2rem]">
                  <img src={func.imagem} alt={func.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 text-transparent" />
                </div>
                <div className="px-8 pb-10 space-y-4">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{func.titulo}</h4>
                  <p className="text-slate-500 leading-relaxed font-medium">{func.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-4">
             <div className="flex items-center gap-3">
               <img src="/logo.png" alt="Salya Logo" className="h-8 w-auto" />
             </div>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">© 2026 SALYA</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
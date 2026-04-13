import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

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

      <footer className="border-t border-slate-100 py-8 px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-400">
          <p>© 2026 SALYA. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
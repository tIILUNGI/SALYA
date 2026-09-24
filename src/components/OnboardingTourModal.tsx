import React, { useState } from 'react';

interface Step {
  title: string;
  description: string;
  icon: string;
  path: string;
}

const steps: Step[] = [
  {
    title: '1. Dashboard & Visão Geral',
    description: 'Acompanhe as métricas de salários, total bruto, retenções de IRT/INSS e estado de processamentos em tempo real.',
    icon: 'dashboard',
    path: '/dashboard'
  },
  {
    title: '2. Gestão de Colaboradores',
    description: 'Cadastre e edite funcionários com ficha corporativa completa, cálculo de subsídios, IBAN e dados contratuais.',
    icon: 'group',
    path: '/colaboradores'
  },
  {
    title: '3. Processamento Salarial',
    description: 'Execute o cálculo de folha em lote com 1 clique, aplique faltas e consulte o Histórico de Processamento com busca rápida.',
    icon: 'payments',
    path: '/processamento'
  },
  {
    title: '4. Relatórios & Primavera ERP',
    description: 'Exporte relatórios consolidados em PDF, mapa de retenções em CSV ou ficheiros diretos para o ERP Primavera.',
    icon: 'description',
    path: '/relatorios'
  },
  {
    title: '5. SalIA & Legislação Angola',
    description: 'Use a SalIA flutuante no canto inferior direito para tirar dúvidas sobre a Lei Geral do Trabalho (LGT 12/23), IRT e INSS.',
    icon: 'smart_toy',
    path: '/dashboard'
  }
];

export const OnboardingTourModal: React.FC<{ isOpen: boolean; onClose: () => void; onNavigate: (path: string) => void }> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      onNavigate(steps[nextIndex].path);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      onNavigate(steps[prevIndex].path);
    }
  };

  return (
    <div className="fixed bottom-6 left-4 sm:left-6 z-[160] w-[calc(100vw-2rem)] sm:w-[420px] max-w-full shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in slide-in-from-bottom duration-200">
      {/* Cabeçalho do Card */}
      <div className="bg-gradient-to-r from-slate-900 via-[#8e34eb] to-purple-900 p-4 px-5 text-white relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shrink-0">
            <span className="material-symbols-outlined text-xl text-white">{step.icon}</span>
          </div>
          <div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white tracking-wider">
              Guia Guiado • {currentStep + 1} de {steps.length}
            </span>
            <h2 className="text-sm font-bold text-white leading-tight mt-0.5">{step.title}</h2>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-5 space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {step.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-all ${i === currentStep ? 'w-5 bg-[#8e34eb]' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-[#8e34eb] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-purple-500/20"
          >
            {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
};

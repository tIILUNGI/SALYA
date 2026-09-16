import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return sessionStorage.getItem('salya_pwa_collapsed') === 'true';
  });
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    const dismissed = sessionStorage.getItem('salya_pwa_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !(window.navigator as any).standalone) {
      setIsIOS(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        console.log('Utilizador instalou a App SALYA PWA!');
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    sessionStorage.setItem('salya_pwa_collapsed', String(nextState));
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('salya_pwa_dismissed', 'true');
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 md:right-6 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-auto transition-all duration-300">
        {isCollapsed ? (
          <button
            onClick={handleToggleCollapse}
            className="group flex items-center gap-3 px-4 py-3 bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-xl border border-primary/40 rounded-full shadow-2xl transition-all hover:scale-105"
            title="Expandir painel de instalação da App SALYA"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/20 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              <img src="/pwa-192x192.png" alt="Salya" className="w-full h-full object-cover rounded-lg" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Instalar App SALYA
            </span>
            <div className="w-6 h-6 rounded-full bg-primary/20 group-hover:bg-primary/40 flex items-center justify-center text-primary transition-colors ml-1">
              <span className="material-symbols-outlined text-base">expand_less</span>
            </div>
          </button>
        ) : (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-primary/40 rounded-3xl p-4 shadow-2xl text-white space-y-3.5 transition-all">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/20 p-1 shrink-0 shadow-lg shadow-primary/20 overflow-hidden flex items-center justify-center">
                  <img src="/pwa-192x192.png" alt="Salya App" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">SALYA App</h4>
                  <p className="text-[11px] text-slate-300">Instalar no seu dispositivo</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1"
                  title="Recolher banner"
                >
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-all"
                  title="Fechar permanentemente nesta sessão"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed px-1">
              Aceda à plataforma de folha de pagamento instantaneamente como uma aplicação nativa no seu dispositivo.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Instalar App
              </button>
              <button
                onClick={handleToggleCollapse}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all border border-white/5"
                title="Recolher para o canto"
              >
                Recolher
              </button>
            </div>
          </div>
        )}
      </div>

      {showIOSPrompt && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">phone_iphone</span>
                <h3 className="font-bold text-sm">Instalar no iPhone / iPad</h3>
              </div>
              <button onClick={() => setShowIOSPrompt(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para instalar a aplicação <strong>SALYA</strong> no seu ecrã principal:
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <li>Toque no ícone <strong>Partilhar</strong> (<span className="material-symbols-outlined text-sm align-middle">ios_share</span>) no Safari.</li>
              <li>Procure e selecione <strong>Adicionar ao Ecrã Principal</strong>.</li>
              <li>Clique em <strong>Adicionar</strong> no canto superior direito.</li>
            </ol>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-wider"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

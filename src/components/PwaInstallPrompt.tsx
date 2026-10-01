import React, { useState, useEffect } from 'react';

// Componentes de ícone SVG limpos inline para evitar dependências de fontes (eliminando o problema de texto "expand_less", "download", etc.)
const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4 inline-block align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return sessionStorage.getItem('salya_pwa_collapsed') === 'true';
  });
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    return localStorage.getItem('salya_pwa_installed') === 'true';
  });

  useEffect(() => {
    // 1. Detectar se é um dispositivo móvel (Smartphones/Tablets)
    const userAgent = (window.navigator.userAgent || window.navigator.vendor || (window as any).opera || '').toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|touch|webos/i.test(userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    const mobileCheck = isMobileUA || (isSmallScreen && isTouchDevice);
    setIsMobile(mobileCheck);

    if (!mobileCheck) {
      return; // NÃO exibe em computadores/desktops
    }

    // 2. Verificar se a app já está instalada ou em modo Standalone
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('salya_pwa_installed') === 'true';

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    const dismissed = sessionStorage.getItem('salya_pwa_dismissed') || localStorage.getItem('salya_pwa_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
        localStorage.setItem('salya_pwa_installed', 'true');
        setIsInstalled(true);
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
    localStorage.setItem('salya_pwa_dismissed', 'true');
  };

  // Cláusulas de guarda: Oculta em computadores, se instalado ou se dispensado
  if (!isMobile || isStandalone || isInstalled || isDismissed) {
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
              <ChevronUpIcon />
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
                  <p className="text-[11px] text-slate-300">Instalar no seu telemóvel</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1"
                  title="Recolher banner"
                >
                  <ChevronDownIcon />
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-all"
                  title="Fechar permanentemente"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed px-1">
              Aceda à plataforma de folha de pagamento instantaneamente como uma aplicação nativa no seu telemóvel.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <DownloadIcon />
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
                <PhoneIcon />
                <h3 className="font-bold text-sm">Instalar no iPhone / iPad</h3>
              </div>
              <button onClick={() => setShowIOSPrompt(false)} className="text-slate-400 hover:text-white">
                <CloseIcon />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para instalar a aplicação <strong>SALYA</strong> no seu ecrã principal:
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <li>Toque no ícone <strong>Partilhar</strong> (<ShareIcon />) no Safari.</li>
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

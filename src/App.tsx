import React, { useState, useEffect, useCallback } from 'react';

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alertas from './pages/Alertas';
import Relatorios from './pages/Relatorios';
import Colaboradores from './pages/Colaboradores';
import Processamento from './pages/Processamento';
import Configuracoes from './pages/Configuracoes';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Colaborador,Empresa  } from './types';
import { api } from './services/api';
import { notify } from './utils/notifications';


interface User {
  email: string;
  name: string;
  id?: number;
  subscriptionStatus?: 'ATIVA' | 'PENDENTE_APROVACAO' | 'EXPIRADA' | 'CANCELADA';
  subscriptionExpiry?: string;
  planType?: string;
  activePlanName?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  isConfigured: boolean;
  setIsConfigured: (value: boolean) => void;
  isLoadingData: boolean;
  empresas: Empresa[];
  setEmpresas: (value: Empresa[]) => void;
  empresa: Empresa | null;
  setEmpresa: (value: Empresa | null) => void;
  empresaId: number | null;
  setEmpresaId: (value: number | null) => void;
  colaboradores: Colaborador[];
  setColaboradores: (value: Colaborador[]) => void;
  setMessage: (msg: { title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null) => void;
  showConfirm: (config: { title: string; text: string; onConfirm: () => void }) => void;
  refreshData: () => Promise<void>;
  effectivePlan: { tipo: string; status: string } | null;
}


export const AppContext = React.createContext<AppContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isConfigured: false,
  setIsConfigured: () => {},
  isLoadingData: true,
  empresas: [],
  setEmpresas: () => {},
  empresa: null,
  setEmpresa: () => {},
  empresaId: null,
  setEmpresaId: () => {},
  colaboradores: [],
  setColaboradores: () => {},
  setMessage: () => {},
  showConfirm: () => {},
  refreshData: async () => {},
  effectivePlan: null,
});


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [effectivePlan, setEffectivePlan] = useState<{ tipo: string; status: string } | null>(null);


  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const clearCompanyState = useCallback(() => {
    setEmpresas([]);
    setEmpresa(null);
    setEmpresaId(null);
    setColaboradores([]);
    setIsConfigured(false);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('salya_token') || localStorage.getItem('token');
      if (!token) {
        clearCompanyState();
        return;
      }

      // Fetch Empresas — o backend filtra automaticamente pelo utilizador autenticado
      const empresasData = await api.get('/empresas?size=1000');
      const empresasList = normalizeList(empresasData, 'empresas');
      setEmpresas(empresasList);

      // Determinar a empresa activa usando o valor local (evita closure stale do estado)
      let activeEmpresaId: number | null = empresaId;

      if (empresasList.length > 0 && !activeEmpresaId) {
        activeEmpresaId = empresasList[0].id;
        setEmpresa(empresasList[0]);
        setEmpresaId(activeEmpresaId);
        setIsConfigured(true);
      } else if (empresasList.length > 0 && activeEmpresaId) {
        // Garantir que a empresa seleccionada ainda existe na lista
        const found = empresasList.find((e: Empresa) => e.id === activeEmpresaId);
        if (found) {
          setEmpresa(found);
          setIsConfigured(true);
        } else {
          // A empresa seleccionada já não pertence ao utilizador — reset
          activeEmpresaId = empresasList[0].id;
          setEmpresa(empresasList[0]);
          setEmpresaId(activeEmpresaId);
          setIsConfigured(true);
        }
      } else if (empresasList.length === 0) {
        clearCompanyState();
        return;
      }

      // Só busca colaboradores se tiver uma empresa activa válida
      if (activeEmpresaId) {
        const colaboradoresData = await api.get(`/trabalhadores?empresaId=${activeEmpresaId}&size=1000`);
        setColaboradores(normalizeList(colaboradoresData, 'colaboradores'));

        // Fetch effective plan
        try {
          const planInfo = await api.get(`/empresas/${activeEmpresaId}/plano-efetivo`);
          setEffectivePlan(planInfo);
        } catch (e) {
          setEffectivePlan(null);
        }
      } else {
        setColaboradores([]);
        setEffectivePlan(null);
      }
    } catch (error) {
      setColaboradores([]);
      setEffectivePlan(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [clearCompanyState, empresaId]);


  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('salya_token') || localStorage.getItem('token');
      const userData = localStorage.getItem('salya_user');
      const savedEmpresaId = localStorage.getItem('salya_empresaId');
      const savedEmpresa = localStorage.getItem('salya_empresa');

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        clearCompanyState();
        setIsAuthChecking(false);
        return;
      }

      // Check if token is expired (client-side)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn("Sessão expirada detectada no carregamento inicial.");
          setIsAuthenticated(false);
          setUser(null);
          clearCompanyState();
          setIsAuthChecking(false);
          localStorage.removeItem('salya_token');
          localStorage.removeItem('token');
          return;
        }
      } catch (e) {
        // Se o token estiver malformado, tratamos como não autenticado
        console.error("Token malformado detectado.");
        setIsAuthenticated(false);
        setIsAuthChecking(false);
        return;
      }

      setIsAuthenticated(true);
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch {
        }
      }

      if (savedEmpresaId) {
        setEmpresaId(Number(savedEmpresaId));
      }
      if (savedEmpresa) {
        try {
          setEmpresa(JSON.parse(savedEmpresa));
        } catch {
        }
      }

      setIsAuthChecking(false);
    };

    checkAuth();
  }, [clearCompanyState]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('salya_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('salya_user');
    }
  }, [user]);

  useEffect(() => {
    if (empresaId !== null) {
      localStorage.setItem('salya_empresaId', String(empresaId));
    } else {
      localStorage.removeItem('salya_empresaId');
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresa) {
      localStorage.setItem('salya_empresa', JSON.stringify(empresa));
    } else {
      localStorage.removeItem('salya_empresa');
    }
  }, [empresa]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);

  // Listen for subscription-blocked events fired by api.ts when backend returns a subscription 403
  useEffect(() => {
    const handleSubscriptionBlocked = (e: Event) => {
      const detail = (e as CustomEvent).detail as { status: string; code: string; message: string };
      if (detail?.status) {
        setUser(prev => prev ? { ...prev, subscriptionStatus: detail.status as any } : prev);
      }
    };
    window.addEventListener('salya:subscription-blocked', handleSubscriptionBlocked);
    return () => window.removeEventListener('salya:subscription-blocked', handleSubscriptionBlocked);
  }, []);
  // Re-check subscription status when user returns to the tab (catches plans that expired while idle)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        const token = localStorage.getItem('salya_token') || localStorage.getItem('token');
        if (token) {
          // Lightweight check: re-fetch user profile to get fresh subscriptionStatus
          fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api'}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data?.subscriptionStatus) {
                setUser(prev => prev ? { ...prev, subscriptionStatus: data.subscriptionStatus, subscriptionExpiry: data.subscriptionExpiry } : prev);
              }
            })
            .catch(() => {}); // silent
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  const showConfirm = async (config: { title: string; text: string; onConfirm: () => void }) => {
    const isConfirmed = await notify.modal.confirm(config.title, config.text);
    if (isConfirmed) {
      config.onConfirm();
    }
  };

  const setAppMessage = (msg: { title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null) => {
    if (!msg) return;
    notify[msg.type](msg.title, msg.text);
  };


  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">A verificar sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      user, setUser, isAuthenticated, setIsAuthenticated, isConfigured, setIsConfigured,
      isLoadingData,
      empresas, setEmpresas, empresa, setEmpresa, empresaId, setEmpresaId, 
      colaboradores, setColaboradores, 
      setMessage: setAppMessage, showConfirm, refreshData,
      effectivePlan
    }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );

}

function MainLayout() {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, isAuthenticated, empresa, isConfigured, isLoadingData, refreshData, setMessage } = React.useContext(AppContext);


  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    setCurrentPage(path);
  }, [location]);

  // Verificar se o usuário tem empresa configurada
  const hasEmpresa = isConfigured && empresa && empresa.id;

  // Enquanto os dados carregam, não redireccionamos para evitar flash de /configuracoes
  if (isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">A carregar dados...</p>
        </div>
      </div>
    );
  }

  // Função para atualizar após criar empresa
  const handleCompanyCreated = async () => {
    await refreshData();
    if (isConfigured) {
      setMessage({
        title: 'SUCESSO!',
        text: 'Empresa criada com sucesso! Agora você pode começar a usar o sistema.',
        type: 'success'
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar - passa a função de callback */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onCompanyCreated={handleCompanyCreated}
      />
      
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full md:w-[calc(100%-16rem)]">
        {/* Subscription Barrier */}
        <SubscriptionBarrier />
        
        <Header />
        <main className="flex-1 p-0">
          <Routes>
            <Route path="/" element={<Navigate to={hasEmpresa ? "/dashboard" : "/configuracoes"} replace />} />
            <Route 
              path="/dashboard" 
              element={hasEmpresa ? <Dashboard /> : <Navigate to="/configuracoes" replace />} 
            />
            
            {/* Rotas que exigem empresa configurada */}
            <Route 
              path="/alertas" 
              element={hasEmpresa ? <Alertas /> : <Navigate to="/configuracoes" replace />} 
            />
            <Route 
              path="/colaboradores" 
              element={hasEmpresa ? <Colaboradores /> : <Navigate to="/configuracoes" replace />} 
            />
            <Route 
              path="/processamento" 
              element={hasEmpresa ? <Processamento /> : <Navigate to="/configuracoes" replace />} 
            />
            <Route 
              path="/relatorios" 
              element={hasEmpresa ? <Relatorios /> : <Navigate to="/configuracoes" replace />} 
            />
            
            {/* Configurações - sempre acessível */}
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </main>
        <footer className="py-8 text-center opacity-[0.05] pointer-events-none">
        <p className="text-xs text-slate-400 font-medium tracking-widest">
          © {new Date().getFullYear()} SALYA PAYROLL • TODOS OS DIREITOS RESERVADOS
        </p>
      </footer>
      </div>
    </div>
  );
}

function SubscriptionBarrier() {
  const { user, effectivePlan } = React.useContext(AppContext);
  
  if (!user || user.planType === 'ADMIN') {
    return null;
  }

  // Se estivermos num contexto de empresa, o status efetivo manda.
  // Caso contrário (ex: configurações gerais), o status do usuário manda.
  const status = effectivePlan ? effectivePlan.status : user.subscriptionStatus;

  if (status === 'ATIVA') {
    return null;
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'PENDENTE_APROVACAO':
        return {
          title: 'Assinatura Pendente de Aprovação',
          message: 'A sua subscrição está aguardando aprovação do administrador. Você não poderá acessar o sistema até que seja aprovado. Entre em contacto com o suporte se necessário.',
          icon: 'hourglass_empty',
          color: 'amber'
        };
      case 'EXPIRADA':
        return {
          title: 'Assinatura Expirada',
          message: 'O período de subscrição terminou. Por favor, renove o plano para continuar a aceder.',
          icon: 'event_busy',
          color: 'rose'
        };
      case 'CANCELADA':
        return {
          title: 'Acesso Suspenso',
          message: 'O acesso foi suspenso ou a subscrição foi cancelada.',
          icon: 'block',
          color: 'slate'
        };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-10 text-center">
          <div 
            className="size-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg transition-all"
            style={{ 
              backgroundColor: info.color === 'amber' ? 'rgb(254 243 199)' : info.color === 'rose' ? 'rgb(255 228 230)' : 'rgb(241 245 249)',
              color: info.color === 'amber' ? 'rgb(180 83 9)' : info.color === 'rose' ? 'rgb(225 29 72)' : 'rgb(71 85 105)'
            }}
          >
            <span className="material-symbols-outlined text-4xl">{info.icon}</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4">{info.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            {info.message}
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.href = '/configuracoes'}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">upgrade</span>
              Ver Configurações
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

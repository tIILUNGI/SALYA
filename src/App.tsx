import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import PageTitleSync from './components/PageTitleSync';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alertas from './pages/Alertas';
import Relatorios from './pages/Relatorios';
import Colaboradores from './pages/Colaboradores';
import Processamento from './pages/Processamento';
import ProcessamentoAtraso from './pages/ProcessamentoAtraso';
import Configuracoes from './pages/Configuracoes';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Colaborador, Empresa } from './types';
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
  cargo?: string;
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
  refreshSubscriptionStatus: () => Promise<void>;
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
  refreshSubscriptionStatus: async () => {},
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
  // Track if subscription is currently blocked to prevent loop of failed requests
  const subscriptionBlockedRef = useRef(false);


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
    // Guard: do not hammer blocked endpoints when subscription is not active
    if (subscriptionBlockedRef.current) return;
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

  // Exposed helper to check /auth/me and update subscription status silently
  const refreshSubscriptionStatus = useCallback(async () => {
    const token = localStorage.getItem('salya_token') || localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api'}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.subscriptionStatus) {
          const newStatus = data.subscriptionStatus as User['subscriptionStatus'];
          setUser(prev => {
            if (!prev || prev.subscriptionStatus === newStatus) return prev;
            return { ...prev, subscriptionStatus: newStatus, subscriptionExpiry: data.subscriptionExpiry };
          });
          // If approved, unblock and reload company data
          if (newStatus === 'ATIVA' && subscriptionBlockedRef.current) {
            subscriptionBlockedRef.current = false;
            refreshData();
          }
        }
      }
    } catch {
      // silent
    }
  }, [refreshData]);


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
          if (process.env.NODE_ENV !== 'production') {
            console.warn("Sessão expirada detectada no carregamento inicial.");
          }
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
        if (process.env.NODE_ENV !== 'production') {
          console.error("Token malformado detectado.");
        }
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
        // Only update state if status actually changed — prevents cascading re-renders
        setUser(prev => {
          if (!prev) return prev;
          if (prev.subscriptionStatus === detail.status) return prev; // no change, no re-render
          subscriptionBlockedRef.current = true;
          return { ...prev, subscriptionStatus: detail.status as any };
        });
        // Mark as blocked so refreshData stops hammering
        subscriptionBlockedRef.current = true;
      }
    };
    window.addEventListener('salya:subscription-blocked', handleSubscriptionBlocked);
    return () => window.removeEventListener('salya:subscription-blocked', handleSubscriptionBlocked);
  }, []);

  // Poll /auth/me every 30s while subscription is blocked — auto-unlock when admin approves
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (subscriptionBlockedRef.current) {
        refreshSubscriptionStatus();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSubscriptionStatus]);

  // Re-check subscription status when user returns to the tab (catches plans that expired while idle)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshSubscriptionStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, refreshSubscriptionStatus]);

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
       setMessage: setAppMessage, showConfirm, refreshData, refreshSubscriptionStatus,
       effectivePlan
     }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PageTitleSync />
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/registar/planos" element={<Login />} />
          <Route path="/registar/verificar" element={<Login />} />
          <Route path="/registar" element={<Login />} />
          <Route path="/recuperar-senha" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
          >
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/alertas" element={<AlertasRoute />} />
            <Route path="/colaboradores" element={<ColaboradoresRoute />} />
            <Route path="/processamento" element={<ProcessamentoRoute />} />
            <Route path="/processamento-atraso" element={<ProcessamentoAtrasoRoute />} />
            <Route path="/relatorios" element={<RelatoriosRoute />} />
            <Route path="/configuracoes" element={<ConfiguracoesIndexRedirect />} />
            <Route path="/configuracoes/:tab" element={<Configuracoes />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );

}

function useRequiresEmpresa() {
  const { empresa, isConfigured } = React.useContext(AppContext);
  return Boolean(isConfigured && empresa && empresa.id);
}

function DashboardRoute() {
  return useRequiresEmpresa() ? <Dashboard /> : <Navigate to="/configuracoes/empresa" replace />;
}
function AlertasRoute() {
  return useRequiresEmpresa() ? <Alertas /> : <Navigate to="/configuracoes/empresa" replace />;
}
function ColaboradoresRoute() {
  return useRequiresEmpresa() ? <Colaboradores /> : <Navigate to="/configuracoes/empresa" replace />;
}
function ProcessamentoRoute() {
  return useRequiresEmpresa() ? <Processamento /> : <Navigate to="/configuracoes/empresa" replace />;
}
function ProcessamentoAtrasoRoute() {
  return useRequiresEmpresa() ? <ProcessamentoAtraso /> : <Navigate to="/configuracoes/empresa" replace />;
}
function RelatoriosRoute() {
  return useRequiresEmpresa() ? <Relatorios /> : <Navigate to="/configuracoes/empresa" replace />;
}

function ConfiguracoesIndexRedirect() {
  const { empresas } = React.useContext(AppContext);
  const tab = empresas && empresas.length > 1 ? 'gestao' : 'empresa';
  return <Navigate to={`/configuracoes/${tab}`} replace />;
}

function MainLayout() {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoadingData, refreshData, setMessage } = React.useContext(AppContext);

  useEffect(() => {
    const segment = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    setCurrentPage(segment);
  }, [location.pathname]);

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
    setMessage({
      title: 'SUCESSO!',
      text: 'Empresa criada com sucesso! Agora você pode começar a usar o sistema.',
      type: 'success'
    });
  };

   return (
     <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
       {/* Sidebar - passa as props de controle */}
       <Sidebar 
         currentPage={currentPage} 
         setCurrentPage={setCurrentPage}
         onCompanyCreated={handleCompanyCreated}
         sidebarOpen={sidebarOpen}
         setSidebarOpen={setSidebarOpen}
       />
       
       <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full md:w-[calc(100%-16rem)]">
         {/* Subscription Barrier */}
         <SubscriptionBarrier />
         
         <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
         <main className="flex-1 p-0">
          <Outlet />
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
  const { user, effectivePlan, refreshSubscriptionStatus } = React.useContext(AppContext);
  const [view, setView] = React.useState<'message' | 'renew' | 'confirm'>('message');
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [checkMsg, setCheckMsg] = React.useState('');
  const [pendingPlan, setPendingPlan] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (view === 'renew') {
      setLoadingPlans(true);
      api.get('/plans', true)
        .then(data => setPlans(Array.isArray(data) ? data : []))
        .catch(() => setPlans([]))
        .finally(() => setLoadingPlans(false));
    }
  }, [view]);
  
  if (!user || user.planType === 'ADMIN') {
    return null;
  }

  const status = effectivePlan ? effectivePlan.status : user.subscriptionStatus;

  if (status === 'ATIVA') {
    return null;
  }

  const handleCheckNow = async () => {
    setChecking(true);
    setCheckMsg('');
    try {
      await refreshSubscriptionStatus();
      setTimeout(() => setCheckMsg(''), 2000);
    } finally {
      setChecking(false);
    }
  };

  const handleSelectPlan = (plan: any) => {
    setPendingPlan(plan);
    setView('confirm');
  };

  const confirmSubscribe = async () => {
    if (!pendingPlan) return;
    setSubmitting(true);
    try {
      await api.post(`/plans/${pendingPlan.id}/subscribe`, {}, true);
      await Swal.fire({
        title: 'Solicitação Enviada!',
        text: 'O seu pedido foi enviado com sucesso. O administrador irá validar e activar o acesso.',
        icon: 'success',
        confirmButtonColor: '#6366f1',
      });
      localStorage.clear();
      window.location.href = '/login';
    } catch (e: any) {
      if (!e?.isSubscriptionBlock) {
        Swal.fire('Erro', 'Não foi possível processar o pedido. Tente novamente.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'confirm' && pendingPlan) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Confirmar Plano</h2>
              <p className="text-sm text-slate-500 mt-1">Reveja os detalhes antes de solicitar.</p>
            </div>
            <button onClick={() => setView('renew')} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Plan summary card */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Plano Selecionado</p>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{pendingPlan.name}</h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  {pendingPlan.durationDays} dias
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-primary">{pendingPlan.price.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Kz</span>
              </div>
            </div>

            {/* Next steps info */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximos Passos</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">counter_1</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Clique em <strong>"Solicitar Plano"</strong> para registar o seu pedido.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">counter_2</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Efectue o pagamento e envie o comprovativo ao suporte.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">counter_3</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">O administrador irá validar e activar o seu acesso.</p>
                </div>
              </div>
            </div>

            {/* Support email card */}
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-indigo-500 text-xl">support_agent</span>
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Suporte Técnico</p>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-1">Para pagamentos, comprovativo e activação:</p>
              <a
                href="mailto:solucoes@ilungi.ao"
                className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 underline underline-offset-2 transition-colors"
              >
                solucoes@ilungi.ao
              </a>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setView('renew')}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={confirmSubscribe}
                disabled={submitting}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> A enviar...</>
                  : <><span className="material-symbols-outlined text-sm">send</span> Solicitar Plano</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'renew') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Escolha o Seu Plano</h2>
              <p className="text-sm text-slate-500">Selecione um plano para reactivar a sua conta.</p>
            </div>
            <button onClick={() => setView('message')} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            {loadingPlans ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.filter(p => p.type !== 'DEMO').map(p => (
                  <div key={p.id} className="p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary transition-all flex flex-col group cursor-pointer" onClick={() => handleSelectPlan(p)}>
                    <h3 className="font-black text-lg uppercase mb-2">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-black">{p.price.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kz / {p.durationDays} dias</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-2 text-xs text-slate-500"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Processamento Ilimitado</li>
                      <li className="flex items-center gap-2 text-xs text-slate-500"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Relatórios Exportáveis</li>
                      <li className="flex items-center gap-2 text-xs text-slate-500"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Suporte Prioritário</li>
                    </ul>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSelectPlan(p); }}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase text-xs hover:bg-primary/90 transition-all"
                    >
                      Escolher Plano
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <span className="material-symbols-outlined text-base">support_agent</span>
                <span className="text-xs font-bold">Suporte Técnico:</span>
              </div>
              <a href="mailto:solucoes@ilungi.ao" className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline">
                solucoes@ilungi.ao
              </a>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
              <p className="text-xs text-slate-400">Após escolher, envie o comprovativo de pagamento ao suporte.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'PENDENTE_APROVACAO':
        return { title: 'Assinatura Pendente', message: 'A sua subscrição está a aguardar aprovação pelo administrador.', icon: 'hourglass_empty', color: 'amber', showCheck: true };
      case 'EXPIRADA':
        return { title: 'Assinatura Expirada', message: 'O período de subscrição terminou. Escolha um novo plano para continuar.', icon: 'event_busy', color: 'rose', showCheck: false };
      case 'CANCELADA':
        return { title: 'Acesso Suspenso', message: 'O seu acesso foi suspenso. Contacte o suporte ou subscreva um novo plano.', icon: 'block', color: 'slate', showCheck: false };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  const bgColor = info.color === 'amber' ? 'rgb(254 243 199)' : info.color === 'rose' ? 'rgb(255 228 230)' : 'rgb(241 245 249)';
  const fgColor = info.color === 'amber' ? 'rgb(180 83 9)' : info.color === 'rose' ? 'rgb(225 29 72)' : 'rgb(71 85 105)';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-10 text-center">
          <div className="size-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg" style={{ backgroundColor: bgColor, color: fgColor }}>
            <span className="material-symbols-outlined text-4xl">{info.icon}</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4">{info.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">{info.message}</p>
          
          <div className="flex flex-col gap-3">
            {info.showCheck && (
              <button 
                onClick={handleCheckNow}
                disabled={checking}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {checking
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> A verificar...</>
                  : <><span className="material-symbols-outlined">refresh</span> Verificar Aprovação</>
                }
              </button>
            )}
            {checkMsg && <p className="text-xs text-slate-400 font-medium">{checkMsg}</p>}
            <button 
              onClick={() => setView('renew')}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">upgrade</span>
              {info.showCheck ? 'Solicitar Nova Assinatura' : 'Escolher Plano'}
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Sair da Conta
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-6 font-medium">
            ⏱ A verificar automaticamente a cada 30 segundos
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

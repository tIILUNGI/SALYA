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
      } else {
        setColaboradores([]);
      }
    } catch (error) {
      setColaboradores([]);
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
      setMessage: setAppMessage, showConfirm, refreshData
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
  const { empresa, isConfigured, isLoadingData, refreshData, setMessage } = React.useContext(AppContext);


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
        <footer className="mt-auto p-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          © 2026 SALYA SOFTWARE SOLUTIONS. TODOS OS DIREITOS RESERVADOS.
        </footer>
      </div>
    </div>
  );
}

export default App;

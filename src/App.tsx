import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alertas from './pages/Alertas';
import Simulacao from './pages/Simulacao';
import Rescisoes from './pages/Rescisoes';
import Relatorios from './pages/Relatorios';
import Colaboradores from './pages/Colaboradores';
import Processamento from './pages/Processamento';
import Configuracoes from './pages/Configuracoes';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Colaborador,Empresa  } from './types';
import { api } from './services/api';

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
  empresas: Empresa[];
  setEmpresas: (value: Empresa[]) => void;
  empresa: Empresa | null;
  setEmpresa: (value: Empresa | null) => void;
  empresaId: number | null;
  setEmpresaId: (value: number | null) => void;
  colaboradores: Colaborador[];
  setColaboradores: (value: Colaborador[]) => void;
  message: { title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
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
  empresas: [],
  setEmpresas: () => {},
  empresa: null,
  setEmpresa: () => {},
  empresaId: null,
  setEmpresaId: () => {},
  colaboradores: [],
  setColaboradores: () => {},
  message: null,
  setMessage: () => {},
  showConfirm: () => {},
  refreshData: async () => {},
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [message, setMessage] = useState<{ title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ title: string; text: string; onConfirm: () => void } | null>(null);

  const refreshData = async () => {
    try {
      const token = localStorage.getItem('salya_token');
      if (!token) return;

      // Fetch Empresas
      const empresasData = await api.get('/empresas?size=1000');
      const empresasList = empresasData._embedded?.empresas || [];
      setEmpresas(empresasList);
      
      if (empresasList.length > 0) {
        setEmpresa(empresasList[0]);
        setEmpresaId(empresasList[0].id);
        setIsConfigured(true);
      } else {
        setEmpresa(null);
        setEmpresaId(null);
        setIsConfigured(false);
      }

      // Fetch Colaboradores
      const colaboradoresData = await api.get('/trabalhadores?size=1000');
      setColaboradores(colaboradoresData._embedded?.colaboradores || []);
    } catch (error) {
      console.error('Error fetching global data:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  const showConfirm = (config: { title: string; text: string; onConfirm: () => void }) => {
    setConfirmData(config);
  };

  return (
    <AppContext.Provider value={{ 
      user, setUser, isAuthenticated, setIsAuthenticated, isConfigured, setIsConfigured, 
      empresas, setEmpresas, empresa, setEmpresa, empresaId, setEmpresaId, 
      colaboradores, setColaboradores, message, setMessage, showConfirm, refreshData
    }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} />
        </Routes>

        {/* Global Notification Modal */}
        {message && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className={`h-2 w-full ${
                  message.type === 'success' ? 'bg-emerald-500' : 
                  message.type === 'error' ? 'bg-red-500' : 
                  message.type === 'warning' ? 'bg-amber-500' : 'bg-primary'
                }`} />
                <div className="p-8 text-center text-slate-900 border-none">
                   <div className={`size-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                     message.type === 'success' ? 'bg-emerald-50' : 
                     message.type === 'error' ? 'bg-red-50' : 
                     message.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                   }`}>
                      <span className={`material-symbols-outlined text-3xl ${
                        message.type === 'success' ? 'text-emerald-500' : 
                        message.type === 'error' ? 'text-red-500' : 
                        message.type === 'warning' ? 'text-amber-500' : 'text-primary'
                      }`}>
                         {message.type === 'success' ? 'check_circle' : 
                          message.type === 'error' ? 'error' : 
                          message.type === 'warning' ? 'warning' : 'info'}
                      </span>
                   </div>
                   <h3 className="text-xl font-black mb-2 dark:text-white">{message.title}</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{message.text}</p>
                   <button 
                     onClick={() => setMessage(null)}
                     className={`mt-6 w-full py-3 rounded-xl font-black text-white shadow-lg transition-transform active:scale-95 ${
                        message.type === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 
                        message.type === 'error' ? 'bg-red-500 shadow-red-200' : 
                        message.type === 'warning' ? 'bg-amber-500 shadow-amber-200' : 'bg-primary shadow-primary/20'
                     }`}
                   >
                     Entendido
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Global Confirmation Modal */}
        {confirmData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-2 w-full bg-red-500" />
                <div className="p-8 text-center">
                   <div className="size-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
                   </div>
                   <h3 className="text-xl font-black mb-2 dark:text-white uppercase tracking-tight">{confirmData.title}</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{confirmData.text}</p>
                   
                   <div className="grid grid-cols-2 gap-3 mt-8">
                     <button 
                       onClick={() => setConfirmData(null)}
                       className="py-3 rounded-xl font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest border border-slate-100 dark:border-slate-800"
                     >
                       Cancelar
                     </button>
                     <button 
                       onClick={() => {
                         confirmData.onConfirm();
                         setConfirmData(null);
                       }}
                       className="py-3 rounded-xl font-black text-white bg-red-500 shadow-lg shadow-red-200 uppercase text-xs tracking-widest transition-transform active:scale-95"
                     >
                       Confirmar
                     </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </Router>
    </AppContext.Provider>
  );
}

function MainLayout() {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { empresa, isConfigured, setIsConfigured, refreshData, setMessage } = React.useContext(AppContext);

  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    setCurrentPage(path);
  }, [location]);

  // Verificar se o usuário tem empresa configurada
  const hasEmpresa = isConfigured && empresa && empresa.id;

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
              path="/simulacao" 
              element={hasEmpresa ? <Simulacao /> : <Navigate to="/configuracoes" replace />} 
            />
            <Route 
              path="/rescisoes" 
              element={hasEmpresa ? <Rescisoes /> : <Navigate to="/configuracoes" replace />} 
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
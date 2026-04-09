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
import { Colaborador } from './types';
import { api } from './services/api';

interface User {
  email: string;
  name: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  isConfigured: boolean;
  setIsConfigured: (value: boolean) => void;
  empresas: any[];
  setEmpresas: (value: any[]) => void;
  empresa: any;
  setEmpresa: (value: any) => void;
  empresaId: number | null;
  setEmpresaId: (value: number | null) => void;
  colaboradores: Colaborador[];
  setColaboradores: (value: Colaborador[]) => void;
  message: { title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  setMessage: (msg: { title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null) => void;
  showConfirm: (config: { title: string; text: string; onConfirm: () => void }) => void;
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
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [message, setMessage] = useState<{ title: string; text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ title: string; text: string; onConfirm: () => void } | null>(null);

  const fetchGlobalData = async () => {
    try {
      // Fetch Empresas
      const empresasData = await api.get('/empresas?size=1000');
      const empresasList = empresasData._embedded?.empresas || [];
      setEmpresas(empresasList);
      
      if (empresasList.length > 0) {
        setEmpresa(empresasList[0]);
        setEmpresaId(empresasList[0].id);
        setIsConfigured(true);
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
      fetchGlobalData();
    }
  }, [isAuthenticated]);

  const showConfirm = (config: { title: string; text: string; onConfirm: () => void }) => {
    setConfirmData(config);
  };

  return (
    <AppContext.Provider value={{ 
      user, setUser, isAuthenticated, setIsAuthenticated, isConfigured, setIsConfigured, 
      empresas, setEmpresas, empresa, setEmpresa, empresaId, setEmpresaId, 
      colaboradores, setColaboradores, message, setMessage, showConfirm 
    }}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} />
        </Routes>

        {/* Global Notification Modal */}
        {message && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
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
  const { empresa } = React.useContext(AppContext);

  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    setCurrentPage(path);
  }, [location]);

  const hasEmpresa = empresa && empresa.nome && empresa.nif;
  const canAcessarSemEmpresa = location.pathname === '/dashboard' || location.pathname === '/configuracoes';
  const deveRedirecionar = !hasEmpresa && !canAcessarSemEmpresa;

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {hasEmpresa ? (
        <div className="w-64 shrink-0 fixed h-full z-20">
          <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
      ) : (
        <div className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 hidden md:flex flex-col fixed h-full z-20">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">SALYA</h1>
          </div>
          <div className="text-slate-500 text-sm mt-4 leading-relaxed">
            <p className="font-medium">Bem-vindo ao sistema de processamento de salários.</p>
            <p className="mt-2 text-xs">Por favor, configure os dados da sua empresa para começar a utilizar todas as funcionalidades.</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full md:w-[calc(100%-16rem)]">
        <Header />
        <main className="flex-1 p-0">
          {deveRedirecionar ? (
            <Navigate to="/configuracoes" replace />
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {hasEmpresa && (
                <>
                  <Route path="/alertas" element={<Alertas />} />
                  <Route path="/colaboradores" element={<Colaboradores />} />
                  <Route path="/processamento" element={<Processamento />} />
                  <Route path="/simulacao" element={<Simulacao />} />
                  <Route path="/rescisoes" element={<Rescisoes />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                </>
              )}
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          )}
        </main>
        <footer className="mt-auto p-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          © 2026 SALYA SOFTWARE SOLUTIONS. TODOS OS DIREITOS RESERVADOS.
        </footer>
      </div>
    </div>
  );
}

export default App;

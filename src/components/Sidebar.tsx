import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api, clearAuthStorage } from '../services/api';
import { PLAN_LIMITS, PlanType } from '../types';
import Swal from 'sweetalert2';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onCompanyCreated?: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onCompanyCreated, sidebarOpen = false, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated, empresa, setEmpresa, setEmpresaId, setEmpresas, empresas, setIsConfigured, setColaboradores, refreshData, setMessage } = useContext(AppContext);

  // Scroll lock quando sidebar aberta no mobile
  useEffect(() => {
    const updateBodyOverflow = () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768; // md breakpoint
      if (sidebarOpen && isMobile) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    updateBodyOverflow();

    const handleResize = () => {
      updateBodyOverflow();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && setSidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen, setSidebarOpen]);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    nome: '',
    nif: '',
    email: '',
    telefone: '',
    endereco: '',
    provincia: '',
    municipio: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'alertas', label: 'Alertas', icon: 'notifications_active' },
    { id: 'colaboradores', label: 'Colaboradores', icon: 'group' },
    { id: 'processamento', label: 'Processamento', icon: 'account_balance_wallet' },
    { id: 'processamento-atraso', label: 'Salários em Atraso', icon: 'history' },
    { id: 'relatorios', label: 'Relatórios', icon: 'assessment' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
    if (setSidebarOpen) setSidebarOpen(false);
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Terminar Sessão',
      text: 'Tem a certeza que deseja sair do sistema?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, sair',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    }).then((result) => {
      if (result.isConfirmed) {
        clearAuthStorage();
        setIsAuthenticated(false);
        setUser(null);
        setIsConfigured(false);
        setEmpresa(null);
        setEmpresaId(null);
        setEmpresas([]);
        setColaboradores([]);
        navigate('/login');
      }
    });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    const planType = user?.planType as PlanType | undefined;
    const limits = planType ? PLAN_LIMITS[planType] : PLAN_LIMITS.DEMO;
    
    if (empresas.length >= limits.maxEmpresas) {
      setError(`O plano ${user?.planType || 'DEMO'} permite apenas ${limits.maxEmpresas} entidade(s). Atualize seu plano para criar mais entidades.`);
      setIsCreating(false);
      return;
    }

    try {
      const empresaCriada = await api.post('/empresas', newCompany);
      if (empresaCriada) {
        setEmpresa(empresaCriada);
        setEmpresaId(empresaCriada.id);
        setEmpresas([...empresas, empresaCriada]);
        setIsConfigured(true);
        setShowCompanyModal(false);

        // Reset form
        setNewCompany({
          nome: '',
          nif: '',
          email: '',
          telefone: '',
          endereco: '',
          provincia: '',
          municipio: ''
        });

        // Refresh data
        await refreshData();

        if (onCompanyCreated) {
          onCompanyCreated();
        }

        setMessage({
          title: 'SUCESSO!',
          text: 'Empresa criada com sucesso!',
          type: 'success'
        });

        // Navigate to dashboard
        setCurrentPage('dashboard');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão com o servidor');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className={`w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col fixed h-full z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
      {/* Logo header */}
      <div className="p-6 flex items-center gap-3 mb-2">
        <img src="/logo.png" alt="Salya Logo" className="h-10 w-auto" />
      </div>


      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto px-4">
        {!empresa ? (
          // Estado: empresa não configurada
          <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-primary">business</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
              Bem-vindo ao Salya!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Complete o cadastro da sua empresa para começar.
            </p>
            <button
              onClick={() => {
                if (currentPage !== 'configuracoes') {
                  handleNavigate('configuracoes');
                }
              }}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 w-full"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              Ir para Configurações
            </button>
          </div>
        ) : (
          // Estado: empresa configurada - menu de navegação
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
                  currentPage === item.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-primary'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined transition-colors ${currentPage === item.id ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                {item.label}
                {currentPage === item.id && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full" />
                )}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* User section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 p-2">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
            {user?.name?.substring(0, 2) || 'US'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold truncate">{user?.name || 'Administrador'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@salya.com'}</p>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <button
            onClick={() => handleNavigate('profile')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-primary transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-lg">person</span>
            Meu Perfil
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Terminar Sessão
          </button>
        </div>
      </div>

      {/* Modal de criação de empresa */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg mx-4 p-6 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Criar Nova Entidade</h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Entidade *</label>
                <input
                  type="text"
                  required
                  value={newCompany.nome}
                  onChange={(e) => setNewCompany({ ...newCompany, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Salya Payroll Lda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">NIF *</label>
                <input
                  type="text"
                  required
                  value={newCompany.nif}
                  onChange={(e) => setNewCompany({ ...newCompany, nif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="5000000001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="tel"
                  value={newCompany.telefone}
                  onChange={(e) => setNewCompany({ ...newCompany, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="923456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <input
                  type="text"
                  value={newCompany.endereco}
                  onChange={(e) => setNewCompany({ ...newCompany, endereco: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Av. Marginal, Luanda"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Província</label>
                  <input
                    type="text"
                    value={newCompany.provincia}
                    onChange={(e) => setNewCompany({ ...newCompany, provincia: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Luanda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Município</label>
                  <input
                    type="text"
                    value={newCompany.municipio}
                    onChange={(e) => setNewCompany({ ...newCompany, municipio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Luanda"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">check</span>
                      Criar Entidade
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

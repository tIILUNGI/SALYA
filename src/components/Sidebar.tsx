import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onCompanyCreated?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onCompanyCreated }) => {
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated, empresa, setEmpresa, setIsConfigured, refreshData, setMessage } = useContext(AppContext);
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
    { id: 'colaboradores', label: 'Funcionários', icon: 'group' },
    { id: 'processamento', label: 'Processamento', icon: 'account_balance_wallet' },
    { id: 'simulacao', label: 'Simulações', icon: 'calculate' },
    { id: 'rescisoes', label: 'Rescisões', icon: 'person_remove' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('salya_token');
    setIsAuthenticated(false);
    setUser(null);
    setIsConfigured(false);
    setEmpresa(null);
    navigate('/login');
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('salya_token');
      const response = await fetch('http://localhost:8081/api/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCompany)
      });

      if (response.ok) {
        const empresaCriada = await response.json();
        setEmpresa(empresaCriada);
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
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || 'Erro ao criar empresa');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setIsCreating(false);
    }
  };

  // Se não tiver empresa configurada, mostrar tela de configuração inicial
  if (!empresa) {
    return (
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="bg-primary text-white p-1.5 rounded-lg">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-primary">SALYA</h2>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">business</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
            Bem-vindo ao Salya!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Complete o cadastro da sua empresa nas Configurações.
          </p>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
              {user?.name?.substring(0, 2) || 'US'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name || 'Administrador'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@salya.com'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-rose-500 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Terminar Sessão
          </button>
        </div>

        {/* Modal de criação de empresa */}
        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Criar Nova Empresa</h3>
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
                  <label className="block text-sm font-medium mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={newCompany.nome}
                    onChange={(e) => setNewCompany({...newCompany, nome: e.target.value})}
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
                    onChange={(e) => setNewCompany({...newCompany, nif: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="5000000001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="contato@empresa.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={newCompany.telefone}
                    onChange={(e) => setNewCompany({...newCompany, telefone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="923456789"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Endereço</label>
                  <input
                    type="text"
                    value={newCompany.endereco}
                    onChange={(e) => setNewCompany({...newCompany, endereco: e.target.value})}
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
                      onChange={(e) => setNewCompany({...newCompany, provincia: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Luanda"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Município</label>
                    <input
                      type="text"
                      value={newCompany.municipio}
                      onChange={(e) => setNewCompany({...newCompany, municipio: e.target.value})}
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
                        Criar Empresa
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
  }

  // Sidebar normal quando tem empresa configurada
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col fixed h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary text-white p-1.5 rounded-lg">
          <span className="material-symbols-outlined">payments</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-primary">SALYA</h2>
      </div>
      
      {/* Informação da empresa ativa */}
      <div className="mx-4 mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-sm">business</span>
          <span className="text-xs font-medium">Empresa Ativa</span>
        </div>
        <p className="text-sm font-semibold mt-1 truncate">{empresa.nome}</p>
        <p className="text-xs text-slate-500">NIF: {empresa.nif}</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentPage === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-2">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
            {user?.name?.substring(0, 2) || 'US'}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{user?.name || 'Administrador'}</p>
            </div>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@salya.com'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-rose-500 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Terminar Sessão
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
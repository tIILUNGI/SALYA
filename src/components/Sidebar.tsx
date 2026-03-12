import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated, setIsConfigured, empresa } = useContext(AppContext);

  const menuItems = [
    { id: 'colaboradores', label: 'Colaboradores', icon: 'group' },
    { id: 'processamento', label: 'Processamento', icon: 'account_balance_wallet' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setIsConfigured(false);
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col fixed h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary text-white p-1.5 rounded-lg">
          <span className="material-symbols-outlined">payments</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-primary">SALYA</h2>
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
              {empresa?.categoria === 'Particular' && (
                <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter">Patronal</span>
              )}
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

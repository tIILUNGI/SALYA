import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { api } from '../services/api';

const Header: React.FC = () => {
<<<<<<< HEAD
  const { empresa, setEmpresa, empresaId, setEmpresaId, empresas } = useContext(AppContext);
=======
  const { empresa, empresaId } = useContext(AppContext);
>>>>>>> 67727589e0d247b3d63f7d4317424210e00a57fd
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Fetch real notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!empresaId) return;
      setLoadingNotifs(true);
      try {
        const data = await api.get(`/notificacoes?empresaId=${empresaId}`);
        const notifList = data._embedded?.notificacoes || [];
        // Transform backend data to frontend format
        const transformed = notifList.map((n: any) => ({
          id: n.id,
          title: n.titulo,
          message: n.mensagem,
          time: formatTimeAgo(n.createdAt),
          read: n.lido,
          tipo: n.tipo
        }));
        setNotifications(transformed);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Keep empty on error - no fake notifications
        setNotifications([]);
      } finally {
        setLoadingNotifs(false);
      }
    };
    fetchNotifications();
  }, [empresaId]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} minutos atrás`;
    if (diffHours < 24) return `${diffHours} horas atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-AO');
  };

  const currentDate = new Date().toLocaleDateString('pt-AO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    // Mark all as read in backend
    try {
      for (const notif of notifications) {
        if (!notif.read) {
          await api.patch(`/notificacoes/${notif.id}`, { lido: true });
        }
      }
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleClearAll = async () => {
    // Delete all notifications in backend
    try {
      for (const notif of notifications) {
        await api.delete(`/notificacoes/${notif.id}`);
      }
      setNotifications([]);
      setShowNotifications(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notificacoes/${id}`, { lido: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="max-w-md w-full relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm outline-none"
            placeholder="Pesquisar..."
            type="text"
          />
        </div>
        <div className="relative group">
          {empresa && (
            <button className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10 transition-all">
              <span className="material-symbols-outlined text-primary text-sm">domain</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{empresa.nome}</span>
              <span className="material-symbols-outlined text-primary text-xs">expand_more</span>
            </button>
          )}
          
          <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Meus Negócios</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {empresas.map((bus) => (
                <button 
                  key={bus.id}
                  onClick={() => {
                    setEmpresa(bus);
                    setEmpresaId(bus.id);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${empresaId === bus.id ? 'bg-primary/5' : ''}`}
                >
                  <div className={`size-8 rounded-lg flex items-center justify-center ${empresaId === bus.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">{bus.categoria === 'Particular' ? 'home' : 'business'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${empresaId === bus.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{bus.nome}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">NIF: {bus.nif}</p>
                  </div>
                  {empresaId === bus.id && (
                    <span className="material-symbols-outlined text-primary text-sm">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark animate-pulse"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Notificações</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{unreadCount} mensagens não lidas</p>
                </div>
                {notifications.length > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest"
                  >
                    Marcar tudo como lido
                  </button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">notifications_off</span>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sem notificações</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => markAsRead(notif.id)}
                      className={`p-5 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative ${!notif.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                    >
                      {!notif.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 size-2 shrink-0 rounded-full ${notif.read ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary'}`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className={`text-sm tracking-tight ${notif.read ? 'font-medium text-slate-500' : 'font-black text-slate-900 dark:text-white'}`}>{notif.title}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{notif.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button 
                    onClick={handleClearAll}
                    className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-[2px] w-full py-2 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">clear_all</span>
                    Limpar todas as notificações
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:block opacity-60">{currentDate}</span>
      </div>
    </header>
  );
};

export default Header;

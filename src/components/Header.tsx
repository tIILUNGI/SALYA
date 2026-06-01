import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppContext } from '../App';
import { api } from '../services/api';

interface LocalNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  tipo: 'processamento' | 'info' | 'alerta' | 'backend';
}

const Header: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { empresa, setEmpresa, empresaId, setEmpresaId, empresas, user } = useContext(AppContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const formatTimeAgo = useCallback((dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-AO');
  }, []);

  useEffect(() => {
    if (!empresa) return;
    const diaProcessamento = (empresa as any).diaProcessamento;
    const processamentoAutomatico = (empresa as any).processamentoAutomatico;
    if (!processamentoAutomatico || !diaProcessamento) return;

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    const chave = `salya_proc_notif_${empresaId}_${ano}_${mes}`;
    if (localStorage.getItem(chave)) return;

    if (diaHoje === Number(diaProcessamento)) {
      const novaNotif: LocalNotification = {
        id: `proc_${Date.now()}`,
        title: 'Hoje é dia de processamento!',
        message: `Processe os salários de "${empresa.nome}".`,
        time: 'agora',
        read: false,
        tipo: 'processamento',
      };
      setNotifications(prev => [novaNotif, ...prev]);
      setShowBanner(true);
      localStorage.setItem(chave, '1');
    }
  }, [empresa, empresaId]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!empresaId) return;
      try {
        const data = await api.get(`/notificacoes?empresaId=${empresaId}`);
        const notifList: any[] = data || [];
        const transformed: LocalNotification[] = notifList.map((n: any) => ({
          id: String(n.id),
          title: n.titulo,
          message: n.mensagem,
          time: formatTimeAgo(n.createdAt),
          read: n.lido,
          tipo: 'backend' as const,
        }));
        setNotifications(prev => {
          const locais = prev.filter(n => n.tipo === 'processamento');
          return [...locais, ...transformed];
        });
      } catch {}
    };
    fetchNotifications();
  }, [empresaId, formatTimeAgo]);


  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.patch(`/notificacoes/lidas?empresaId=${empresaId}`, {});
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    const backendIds = notifications.filter(n => n.tipo === 'backend').map(n => n.id);
    try {
      for (const id of backendIds) {
        await api.delete(`/notificacoes/${id}`);
      }
    } catch {}
    setNotifications(prev => prev.filter(n => n.tipo === 'processamento' && !n.read));
    setShowNotifications(false);
  };

  const markAsRead = async (id: string, tipo: string) => {
    if (tipo === 'backend') {
      try { await api.patch(`/notificacoes/${id}`, { lido: true }); } catch {}
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismissBanner = () => setShowBanner(false);

  return (
    <>
      {showBanner && (
        <div className="bg-amber-500 px-4 py-2 flex items-center justify-between gap-4 z-20 relative">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white text-sm">payments</span>
            <p className="text-sm font-medium text-white">Hoje é dia de processar os salários!</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigate('/processamento'); dismissBanner(); }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium text-white"
            >
              Processar agora
            </button>
            <button onClick={dismissBanner} className="p-1 hover:bg-white/20 rounded">
              <span className="material-symbols-outlined text-white text-sm">close</span>
            </button>
          </div>
        </div>
      )}

<header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          {/* Botão menu mobile */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          )}

          <div className="relative group ml-4">
            {empresa && (
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all min-h-[44px]">
                <span className="material-symbols-outlined text-primary text-xl">business_center</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 lg:max-w-[200px] truncate">{empresa.nome}</span>
                <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
              </button>
            )}
            <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all z-50">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternar Entidade</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {empresas.map((bus) => (
                  <button
                    key={bus.id}
                    onClick={() => { setEmpresa(bus); setEmpresaId(bus.id); }}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${empresaId === bus.id ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center ${empresaId === bus.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <span className="material-symbols-outlined text-lg">{(bus as any).categoria === 'Particular' ? 'person' : 'apartment'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${empresaId === bus.id ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{bus.nome}</p>
                      <p className="text-[10px] text-slate-400">NIF: {bus.nif}</p>
                    </div>
                    {empresaId === bus.id && (
                      <div className="size-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Icons from model */}
          <div className="flex items-center gap-1 mr-2 px-2 border-r border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              <span className="material-symbols-outlined text-xl">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all relative"
              >
                <span className={`material-symbols-outlined text-xl ${unreadCount > 0 ? 'text-amber-500' : ''}`}>
                  {unreadCount > 0 ? 'notifications_active' : 'notifications'}
                </span>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Notificações</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{unreadCount} mensagens não lidas</p>
                      </div>
                      {notifications.length > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-primary uppercase hover:underline">
                          Marcar tudo
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-12 px-6 text-center">
                          <div className="size-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="material-symbols-outlined text-slate-300">notifications_off</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Tudo limpo por aqui!</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id, notif.tipo)}
                            className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <p className={`text-xs leading-relaxed ${notif.read ? 'text-slate-500' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[9px] font-medium text-slate-400 shrink-0 uppercase">{notif.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.some(n => n.tipo === 'backend') && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                        <button onClick={handleClearAll} className="text-[10px] font-bold text-rose-500 uppercase hover:underline">
                          Limpar Histórico
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pl-2 group cursor-pointer" onClick={() => navigate('/profile')}>
            <div className="hidden lg:block text-right">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'Administrador'}</p>
              {user?.cargo && <p className="text-[10px] text-slate-400 font-medium uppercase">{user.cargo}</p>}
            </div>
            <div className="size-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-sm group-hover:shadow-md transition-all uppercase">
              {user?.name?.substring(0, 2) || 'US'}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
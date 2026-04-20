import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface LocalNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  tipo: 'processamento' | 'info' | 'alerta' | 'backend';
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { empresa, setEmpresa, empresaId, setEmpresaId, empresas } = useContext(AppContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [showBanner, setShowBanner] = useState(false);

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

  const currentDate = new Date().toLocaleDateString('pt-AO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    const backendIds = notifications.filter(n => !n.read && n.tipo === 'backend').map(n => n.id);
    try {
      for (const id of backendIds) {
        await api.patch(`/notificacoes/${id}`, { lido: true });
      }
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
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium text-white transition-colors"
            >
              Processar agora
            </button>
            <button onClick={dismissBanner} className="p-1 hover:bg-white/20 rounded">
              <span className="material-symbols-outlined text-white text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      <header className="h-14 border-b border-corporate-200 bg-white sticky top-0 z-10 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="max-w-sm w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-corporate-400 text-sm">search</span>
            <input
              className="w-full pl-9 pr-4 py-1.5 bg-corporate-100 border-none rounded text-sm outline-none"
              placeholder="Pesquisar..."
              type="text"
            />
          </div>

          <div className="relative group">
            {empresa && (
              <button className="flex items-center gap-2 px-3 py-1.5 bg-corporate-50 rounded border border-corporate-200 hover:bg-corporate-100 transition-all">
                <span className="material-symbols-outlined text-corporate-500 text-sm">domain</span>
                <span className="text-sm text-corporate-700 max-w-[120px] truncate">{empresa.nome}</span>
                <span className="material-symbols-outlined text-corporate-400 text-xs">expand_more</span>
              </button>
            )}
            <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded shadow-lg border border-corporate-200 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-3 border-b border-corporate-100 bg-corporate-50">
                <h3 className="text-xs font-medium text-corporate-500">Empresas</h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {empresas.map((bus) => (
                  <button
                    key={bus.id}
                    onClick={() => { setEmpresa(bus); setEmpresaId(bus.id); }}
                    className={`w-full flex items-center gap-2 p-3 hover:bg-corporate-50 transition-colors text-left ${empresaId === bus.id ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`size-7 rounded flex items-center justify-center ${empresaId === bus.id ? 'bg-primary text-white' : 'bg-corporate-100 text-corporate-400'}`}>
                      <span className="material-symbols-outlined text-sm">{(bus as any).categoria === 'Particular' ? 'home' : 'business'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${empresaId === bus.id ? 'text-primary font-medium' : 'text-corporate-700'}`}>{bus.nome}</p>
                      <p className="text-[10px] text-corporate-400">NIF: {bus.nif}</p>
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

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-corporate-500 hover:bg-corporate-100 rounded relative transition-colors"
            >
              <span className={`material-symbols-outlined text-sm ${unreadCount > 0 ? 'text-amber-500' : ''}`}>
                {unreadCount > 0 ? 'notifications_active' : 'notifications'}
              </span>
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded shadow-lg border border-corporate-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-corporate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-corporate-700">Notificações</h3>
                      <p className="text-xs text-corporate-400">{unreadCount} não lidas</p>
                    </div>
                    {notifications.length > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                        Marcar tudo
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-corporate-400">Sem notificações</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id, notif.tipo)}
                          className={`p-4 border-b border-corporate-50 hover:bg-corporate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-sm ${notif.read ? 'text-corporate-500' : 'text-corporate-800 font-medium'}`}>
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-corporate-400 shrink-0">{notif.time}</span>
                          </div>
                          <p className="text-xs text-corporate-500 mt-1">{notif.message}</p>
                          {notif.tipo === 'processamento' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/processamento'); setShowNotifications(false); }}
                              className="mt-2 text-xs text-primary hover:underline"
                            >
                              Ir para Processamento
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.some(n => n.tipo === 'backend') && (
                    <div className="p-3 border-t border-corporate-100 text-center">
                      <button onClick={handleClearAll} className="text-xs text-rose-500 hover:underline">
                        Limpar notificações
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <span className="text-xs text-corporate-400 hidden lg:block">{currentDate}</span>
        </div>
      </header>
    </>
  );
};

export default Header;
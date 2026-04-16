import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// ─── Tipos ───────────────────────────────────────────────────────────────────
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

  // ─── Formatar tempo relativo ──────────────────────────────────────────────
  const formatTimeAgo = useCallback((dateString: string) => {
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
  }, []);

  // ─── Verificar dia de processamento ──────────────────────────────────────
  useEffect(() => {
    if (!empresa) return;

    const diaProcessamento = (empresa as any).diaProcessamento;
    const processamentoAutomatico = (empresa as any).processamentoAutomatico;
    if (!processamentoAutomatico || !diaProcessamento) return;

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    // Chave única por empresa/mês/ano — evita repetir a notificação no mesmo mês
    const chave = `salya_proc_notif_${empresaId}_${ano}_${mes}`;
    if (localStorage.getItem(chave)) return;

    if (diaHoje === Number(diaProcessamento)) {
      const novaNotif: LocalNotification = {
        id: `proc_${Date.now()}`,
        title: '⚠️ Hoje é o dia de processamento salarial!',
        message: `A empresa "${empresa.nome}" tem o processamento de salários programado para o dia ${diaProcessamento}. Aceda ao módulo de Processamento para processar os recibos.`,
        time: 'agora',
        read: false,
        tipo: 'processamento',
      };
      setNotifications(prev => [novaNotif, ...prev]);
      setShowBanner(true);
      localStorage.setItem(chave, '1');
    }
  }, [empresa, empresaId]);

  // ─── Buscar notificações do backend ──────────────────────────────────────
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
          // Manter notificações locais de processamento + backend
          const locais = prev.filter(n => n.tipo === 'processamento');
          return [...locais, ...transformed];
        });
      } catch {
        // silencioso — notificações backend são opcionais
      }
    };
    fetchNotifications();
  }, [empresaId, formatTimeAgo]);

  const currentDate = new Date().toLocaleDateString('pt-AO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Acções ───────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    const backendIds = notifications.filter(n => !n.read && n.tipo === 'backend').map(n => n.id);
    try {
      for (const id of backendIds) {
        await api.patch(`/notificacoes/${id}`, { lido: true });
      }
    } catch { /* silencioso */ }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    const backendIds = notifications.filter(n => n.tipo === 'backend').map(n => n.id);
    try {
      for (const id of backendIds) {
        await api.delete(`/notificacoes/${id}`);
      }
    } catch { /* silencioso */ }
    setNotifications(prev => prev.filter(n => n.tipo === 'processamento' && !n.read));
    setShowNotifications(false);
  };

  const markAsRead = async (id: string, tipo: string) => {
    if (tipo === 'backend') {
      try { await api.patch(`/notificacoes/${id}`, { lido: true }); } catch { /* silencioso */ }
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismissBanner = () => setShowBanner(false);

  const getNotifStyle = (tipo: string) => {
    if (tipo === 'processamento') return { icon: 'payments', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (tipo === 'alerta') return { icon: 'warning', color: 'text-red-500', bg: 'bg-red-500/10' };
    return { icon: 'info', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  };

  return (
    <>
      {/* ── Banner de dia de processamento ──────────────────────────────── */}
      {showBanner && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 flex items-center justify-between gap-4 shadow-lg z-20 relative">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white animate-pulse">payments</span>
            <div>
              <p className="font-black text-sm uppercase tracking-tight">Hoje é o dia de processar os salários!</p>
              <p className="text-xs opacity-90">
                Emita os recibos da empresa <strong>{empresa?.nome}</strong> no módulo de Processamento.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { navigate('/processamento'); dismissBanner(); }}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap"
            >
              Processar agora
            </button>
            <button onClick={dismissBanner} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
        {/* ── Esquerda: pesquisa + switcher de empresa ─────────────────── */}
        <div className="flex items-center gap-4 flex-1">
          <div className="max-w-md w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm outline-none"
              placeholder="Pesquisar..."
              type="text"
            />
          </div>

          {/* Switcher de empresa */}
          <div className="relative group">
            {empresa && (
              <button className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10 transition-all">
                <span className="material-symbols-outlined text-primary text-sm">domain</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest max-w-[140px] truncate">{empresa.nome}</span>
                <span className="material-symbols-outlined text-primary text-xs">expand_more</span>
              </button>
            )}
            {/* Dropdown de empresas */}
            <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Meus Negócios</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {empresas.map((bus) => (
                  <button
                    key={bus.id}
                    onClick={() => { setEmpresa(bus); setEmpresaId(bus.id); }}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${empresaId === bus.id ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center ${empresaId === bus.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <span className="material-symbols-outlined text-sm">{(bus as any).categoria === 'Particular' ? 'home' : 'business'}</span>
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

        {/* ── Direita: sino + data ──────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
            >
              <span className={`material-symbols-outlined ${unreadCount > 0 ? 'text-amber-500' : ''}`}>
                {unreadCount > 0 ? 'notifications_active' : 'notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white dark:border-background-dark flex items-center justify-center">
                  <span className="text-[9px] font-black text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                {/* Overlay para fechar ao clicar fora */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                  {/* Cabeçalho */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Notificações</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{unreadCount} não lidas</p>
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

                  {/* Listagem */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center">
                        <span className="material-symbols-outlined text-slate-200 text-5xl mb-3 block">notifications_off</span>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sem notificações</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const style = getNotifStyle(notif.tipo);
                        return (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id, notif.tipo)}
                            className={`p-5 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative ${!notif.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                          >
                            {!notif.read && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
                            )}
                            <div className="flex items-start gap-4">
                              <div className={`mt-0.5 size-8 shrink-0 rounded-lg flex items-center justify-center ${style.bg}`}>
                                <span className={`material-symbols-outlined text-sm ${style.color}`}>{style.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className={`text-sm tracking-tight leading-snug ${notif.read ? 'font-medium text-slate-500' : 'font-black text-slate-900 dark:text-white'}`}>
                                    {notif.title}
                                  </p>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">{notif.time}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{notif.message}</p>
                                {notif.tipo === 'processamento' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/processamento'); setShowNotifications(false); }}
                                    className="mt-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                  >
                                    Ir para Processamento →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Rodapé — limpar apenas notificações do servidor */}
                  {notifications.some(n => n.tipo === 'backend') && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                      <button
                        onClick={handleClearAll}
                        className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-[2px] w-full py-2 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">clear_all</span>
                        Limpar notificações do servidor
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:block opacity-60">{currentDate}</span>
        </div>
      </header>
    </>
  );
};

export default Header;

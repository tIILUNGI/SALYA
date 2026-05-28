import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api, clearAuthStorage, getApiErrorMessage, setAuthToken } from '../services/api';

type ViewMode = 'login' | 'register' | 'select-plan' | 'confirm' | 'forgot';

type Plan = {
  id: number;
  name: string;
  price?: string;
  durationDays?: number;
  type: string;
  isActive?: boolean;
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    setIsAuthenticated, setUser, setEmpresa, setEmpresaId, setEmpresas, setIsConfigured, setColaboradores, setMessage
  } = useContext(AppContext);

  const [mode, setMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorString, setErrorString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const showError = (msg: string) => {
    setErrorString(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  useEffect(() => {
    if (mode !== 'select-plan') return;

    setIsLoading(true);
    api.get('/auth/plans', true)
      .then((data: any) => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch((error: any) => {
        console.error('Erro ao carregar planos:', error);
        showError('Não foi possível carregar os planos no momento.');
      })
      .finally(() => setIsLoading(false));
    }, [mode]);

  const startCleanSession = (token: string, user: any) => {
    clearAuthStorage();
    setEmpresas([]);
    setEmpresa(null);
    setEmpresaId(null);
    setColaboradores([]);
    setIsConfigured(false);
    setAuthToken(token);
    localStorage.setItem('salya_user', JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorString('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password }, true);
      const { token, user } = response;

      if (token) {
        startCleanSession(token, user);
        navigate('/dashboard');
      }
    } catch (error: any) {
      showError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorString('');
    if (password !== confirmPassword) {
      showError('As palavras-passe não coincidem.');
      return;
    }
    if (password.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!selectedPlan) {
      showError('Por favor, selecione um plano primeiro.');
      setMode('select-plan');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password, planId: Number(selectedPlan) }, true);

      if (response.requiresVerification) {
        setMessage({
          title: 'Verificação Necessária',
          text: response.message || 'Verifique o seu email para ativar a conta.',
          type: 'info'
        });
        setMode('confirm');
        return;
      }

      const { token, user } = response;

      if (token) {
        startCleanSession(token, user);
        navigate('/configuracoes');
      }
    } catch (error: any) {
      showError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { email, code: confirmCode }, true);
      setMessage({ title: 'Sucesso', text: 'Email verificado! Pode fazer login.', type: 'success' });
      setMode('login');
      console.log(response);
    } catch (error: any) {
      showError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, true);
      setMessage({ title: 'Email Enviado', text: 'Se o email existir, receberá instruções de recuperação.', type: 'info' });
      setMode('login');
    } catch (error: any) {
      showError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: ViewMode) => {
    setMode(newMode);
    setErrorString('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50 dark:bg-slate-950 font-app selection:bg-primary/10 selection:text-primary">
      <div className="relative flex h-auto w-full max-w-[1000px] flex-col md:flex-row bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-[45%] bg-primary flex-col justify-center items-center p-12 text-white relative">
          <div className="relative z-10 flex flex-col items-center">
             {/* Logo Design Substituto */}
             <div className="flex flex-col items-center">
                <span className="text-6xl font-black tracking-tighter text-white select-none">SALYA</span>
                <p className="mt-2 text-white/50 text-[9px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">
                  GESTÃO DE FOLHA DE PAGAMENTO
                </p>
             </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
             <button 
               onClick={() => navigate('/')} 
               className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
             >
                <span className="material-symbols-outlined text-sm">west</span>
                Voltar ao Início
             </button>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="w-full md:w-[55%] p-10 md:p-16 flex flex-col justify-center bg-white dark:bg-slate-900">
          {/* Global Error Display */}
          <div className={`${errorString ? 'mb-6' : ''} transition-all duration-300`}>
            {errorString && (
              <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center gap-3 ${shake ? 'animate-shake' : ''}`}>
                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                <p className="text-xs font-bold text-red-600 dark:text-red-400">{errorString}</p>
              </div>
            )}
          </div>
          {/* LOGIN MODE */}
{mode === 'login' && (
             <form onSubmit={handleLogin} className="space-y-8">
               <div>
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Acesso ao Sistema</h2>
                 <p className="text-sm font-medium text-slate-500">Gestão simplificada de folha de pagamento.</p>
               </div>


              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@empresa.ao"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-medium dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Esqueceu?</button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 pr-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-medium dark:text-white outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Entrar <span className="material-symbols-outlined text-lg">east</span></>
                )}
              </button>

              <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800 mt-6 md:hidden">
                 <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 flex items-center gap-2 justify-center"><span className="material-symbols-outlined text-sm">west</span> Volatar ao Início</button>
              </div>

              <div className="text-center pt-8 md:pt-4">
                <p className="text-sm font-medium text-slate-500">
                  Novo na Salya? 
                  <button type="button" onClick={() => switchMode('select-plan')} className="ml-1.5 text-primary font-bold hover:underline">Configurar Conta</button>
                </p>
              </div>
            </form>
          )}

          {/* SELECT PLAN MODE */}
          {mode === 'select-plan' && (
            <div className="space-y-8 animate-fadeIn">
               <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Escolha o seu Plano</h2>
                <p className="text-sm font-medium text-slate-500">Soluções adaptadas ao tamanho da sua equipa.</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {plans.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPlan(String(p.id))} 
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedPlan === String(p.id) ? 'border-primary bg-primary/5 shadow-soft' : 'border-slate-50 hover:border-slate-100 dark:border-slate-800'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-800 dark:text-white">{p.name}</span>
                      <span className="text-primary uppercase text-xs">{p.price ? `${Number(p.price).toLocaleString('pt-BR')} KZ` : 'Testar'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 tracking-widest uppercase">{p.type}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => switchMode('register')} 
                  disabled={!selectedPlan}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  Continuar para Registo
                </button>
                <button onClick={() => switchMode('login')} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancelar</button>
              </div>
            </div>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
             <form onSubmit={handleRegister} className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Criar Conta</h2>
                  <p className="text-sm font-medium text-slate-500">Preencha os dados do gestor principal.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como gostaria de ser chamado?" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Profissional</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.ao" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirmar</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" required />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                   <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all">
                      {isLoading ? 'A Processar...' : 'Finalizar Registo'}
                   </button>
                   <button type="button" onClick={() => switchMode('select-plan')} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Alterar Plano</button>
                </div>
             </form>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
             <form onSubmit={handleForgot} className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Recuperar Senha</h2>
                  <p className="text-sm font-medium text-slate-500">Enviaremos instruções para o seu e-mail.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail Registado</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.ao" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" required />
                </div>

                <div className="flex flex-col gap-4">
                   <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all">
                      {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                   </button>
                   <button type="button" onClick={() => switchMode('login')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-center">Voltar ao Login</button>
                </div>
             </form>
          )}

          {/* CONFIRM / VERIFY MODE */}
          {mode === 'confirm' && (
             <form onSubmit={handleConfirm} className="space-y-8 animate-fadeIn">
                <div className="text-center">
                  <div className="size-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verifique o seu Email</h2>
                  <p className="text-sm font-medium text-slate-500 px-4">Introduza o código de verificação enviado para {email}.</p>
                </div>

                <div>
                  <input 
                    type="text" 
                    value={confirmCode} 
                    onChange={(e) => setConfirmCode(e.target.value)} 
                    placeholder="Código de 6 dígitos" 
                    className="w-full px-5 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-center text-2xl font-black tracking-[0.5em] focus:border-primary outline-none transition-all dark:text-white" 
                    maxLength={6} 
                    required 
                  />
                </div>

                <div className="flex flex-col gap-4">
                   <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all">
                      {isLoading ? 'Verificando...' : 'Verificar e Entrar'}
                   </button>
                   <button type="button" onClick={() => switchMode('login')} className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Cancelar</button>
                </div>
             </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;

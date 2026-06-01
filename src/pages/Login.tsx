import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api, clearAuthStorage, getApiErrorMessage, setAuthToken } from '../services/api';
import { APP_URL } from '../config/urls';

type ViewMode = 'login' | 'register' | 'select-plan' | 'confirm' | 'forgot';

const MODE_PATHS: Record<ViewMode, string> = {
  login: '/login',
  'select-plan': '/registar/planos',
  register: '/registar',
  confirm: '/registar/verificar',
  forgot: '/recuperar-senha',
};

function modeFromPath(pathname: string): ViewMode {
  if (pathname.startsWith('/registar/planos')) return 'select-plan';
  if (pathname === '/registar/verificar') return 'confirm';
  if (pathname === '/registar') return 'register';
  if (pathname === '/recuperar-senha') return 'forgot';
  return 'login';
}

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
  const location = useLocation();
  const {
    setIsAuthenticated, setUser, setEmpresa, setEmpresaId, setEmpresas, setIsConfigured, setColaboradores, setMessage
  } = useContext(AppContext);

  const [mode, setMode] = useState<ViewMode>(() => modeFromPath(location.pathname));

  useEffect(() => {
    setMode(modeFromPath(location.pathname));
  }, [location.pathname]);
  
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
  const [tempUserId, setTempUserId] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(true);

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
      .catch(() => {
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
      // Verifica se é erro de email não verificado
      if (error.body?.requiresVerification) {
        setMessage({
          title: 'Email não verificado',
          text: error.body.error || 'Por favor, verifique seu email antes de fazer login.',
          type: 'warning'
        });
        setEmail(error.body.email || email);
        navigate('/registar/verificar');
      } else {
        showError(getApiErrorMessage(error));
      }
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
      navigate('/registar/planos');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { 
        name, 
        email, 
        password, 
        planId: Number(selectedPlan) 
      }, true);

      if (response.requiresVerification) {
        setTempUserId(response.tempUserId);
        setMessage({
          title: 'Código Enviado!',
          text: response.message || 'Verifique seu email para ativar a conta.',
          type: 'success'
        });
        navigate('/registar/verificar');
        return;
      }

      const { token, user } = response;

      if (token) {
        startCleanSession(token, user);
        navigate('/configuracoes/empresa');
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
    setErrorString('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/verify-email', { 
        email, 
        code: confirmCode 
      }, true);

      // Verifica se retornou token (usuário já existia ou foi criado agora)
      if (response.token) {
        const { token, user } = response;
        startCleanSession(token, user);
        setMessage({
          title: 'Sucesso!',
          text: response.message || 'Email verificado e conta ativada!',
          type: 'success'
        });
        navigate('/dashboard');
      } else {
        setMessage({
          title: 'Sucesso!',
          text: response.message || 'Email verificado! Faça login para continuar.',
          type: 'success'
        });
        navigate('/login');
      }
    } catch (error: any) {
      // Verifica se tem informações de tentativas restantes
      if (error.body?.remainingAttempts !== undefined) {
        setRemainingAttempts(error.body.remainingAttempts);
        setCanResend(error.body.canResend || false);
        showError(error.body.error || 'Código inválido');
      } else {
        showError(getApiErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, frontendUrl: APP_URL }, true);
      setMessage({ 
        title: 'Email Enviado', 
        text: 'Se o email existir, receberá instruções de recuperação.', 
        type: 'info' 
      });
      navigate('/login');
    } catch (error: any) {
      showError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: ViewMode) => {
    navigate(MODE_PATHS[newMode]);
    setErrorString('');
    setRemainingAttempts(0);
    setCanResend(true);
  };

  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendCode = async () => {
    if (resendTimer > 0 || isLoading) return;
    
    if (!email) {
      showError('Por favor, informe seu email primeiro.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/auth/resend-code', { email }, true);
      setMessage({ 
        title: 'Código Reenviado', 
        text: response.message || 'Um novo código foi enviado para o seu email.', 
        type: 'info' 
      });
      setResendTimer(60);
      setRemainingAttempts(0);
      setCanResend(true);
    } catch (error: any) {
      // Verifica erro de cooldown
      if (error.body?.secondsToWait) {
        const seconds = error.body.secondsToWait;
        setResendTimer(seconds);
        showError(error.body.error || `Aguarde ${seconds} segundos para reenviar`);
      } else {
        showError(getApiErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50 dark:bg-slate-950 font-app selection:bg-primary/10 selection:text-primary">
      <div className="relative flex h-auto w-full max-w-[1000px] flex-col md:flex-row bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-[45%] bg-primary flex-col justify-center items-center p-12 text-white relative">
          <div className="relative z-10 flex flex-col items-center">
             <div className="flex flex-col items-center">
                <img
                  src="/logo login.png"
                  alt="SALYA"
                  className="h-20 w-auto max-w-[min(100%,280px)] object-contain select-none"
                />
                <p className="mt-4 text-white/50 text-[9px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">
                  GESTÃO DE FOLHA DE PAGAMENTO
                </p>
             </div>
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
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Como gostaria de ser chamado?" 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Profissional</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="email@empresa.ao" 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••" 
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirmar</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="••••••" 
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all"
                >
                  {isLoading ? 'A Processar...' : 'Finalizar Registo'}
                </button>
                <button 
                  type="button" 
                  onClick={() => switchMode('select-plan')} 
                  className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest"
                >
                  Alterar Plano
                </button>
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
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="email@empresa.ao" 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white" 
                  required 
                />
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
                <button 
                  type="button" 
                  onClick={() => switchMode('login')} 
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-center"
                >
                  Voltar ao Login
                </button>
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
                <p className="text-sm font-medium text-slate-500 px-4">
                  Introduza o código de verificação enviado para <strong className="text-primary">{email}</strong>
                </p>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={confirmCode} 
                  onChange={(e) => setConfirmCode(e.target.value)} 
                  placeholder="Código de 6 dígitos" 
                  className="w-full px-5 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-center text-2xl font-black tracking-[0.5em] focus:border-primary outline-none transition-all dark:text-white" 
                  maxLength={6} 
                  required 
                />
                
                {/* Aviso de tentativas restantes */}
                {remainingAttempts > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      
                       Código inválido. Você tem mais {remainingAttempts} tentativa(s).
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={handleResendCode} 
                    disabled={resendTimer > 0 || isLoading}
                    className="text-xs font-bold text-primary hover:underline disabled:text-slate-400 disabled:no-underline uppercase tracking-widest transition-all"
                  >
                    {resendTimer > 0 
                      ? `Reenviar código em ${resendTimer}s` 
                      : canResend 
                        ? 'Não recebeu o código? Reenviar' 
                        : 'Limite de tentativas excedido. Solicite um novo código.'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? 'Verificando...' : 'Verificar e Continuar'}
                </button>
                <button 
                  type="button" 
                  onClick={() => switchMode('login')} 
                  className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { configuracaoEmpresa, colaboradores as mockColaboradores } from '../data/mockData';

type ViewMode = 'login' | 'register' | 'confirm' | 'forgot';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { 
    setIsAuthenticated, setColaboradores, setEmpresa, setUser, 
    setIsConfigured, setEmpresas, setEmpresaId 
  } = useContext(AppContext);
  
  const [mode, setMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('admin@salya.com');
  const [password, setPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorString, setErrorString] = useState('');

  const executeLogin = (userEmail: string, userName: string) => {
    setIsAuthenticated(true);
    setUser({ email: userEmail, name: userName });

    if (userEmail === 'admin@salya.com') {
      const empresaComId = { ...configuracaoEmpresa, id: 1 };
      setEmpresas([empresaComId]);
      setEmpresaId(1);
      setEmpresa(empresaComId);
      setColaboradores(mockColaboradores.map(c => ({ ...c, empresaId: 1 })));
      setIsConfigured(true);
      navigate('/processamento');
    } else {
      setEmpresas([]);
      setEmpresaId(null);
      setEmpresa(null);
      setColaboradores([]);
      setIsConfigured(false);
      navigate('/configuracoes');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    if (email && password) {
      executeLogin(email, 'Administrador');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    if (password !== confirmPassword) {
      setErrorString('As palavras-passe não coincidem.');
      return;
    }
    if (name && email && password) {
      setMode('confirm');
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmCode) {
      setMode('login');
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
      setConfirmCode('');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark">
      <div className="relative flex h-auto w-full max-w-[1100px] flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-primary items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800")' }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-slate-900/40"></div>
          
          <div className="relative z-10 flex flex-col gap-6 text-white">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="SALYA Logo" className="w-16 h-16 object-contain bg-white/10 p-2 rounded-lg" />
              <h1 className="text-3xl font-black tracking-tight">SALYA</h1>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight uppercase tracking-widest">Processamento Digital</h2>
              {/* Slogan removed as requested */}
            </div>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-3 mb-10">
            <img src="/logo.png" alt="SALYA Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">SALYA</h1>
          </div>
          
          {mode === 'login' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Iniciar Sessão</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Introduza os seus dados para aceder ao sistema</p>
              </div>
              
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Utilizador / E-mail</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white font-bold"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Palavra-passe</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer" id="remember-me" type="checkbox" />
                    <label className="ml-2 block text-xs font-bold text-slate-500 uppercase cursor-pointer" htmlFor="remember-me">
                      Manter sessão activa
                    </label>
                  </div>
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary font-black uppercase hover:underline">
                    Esqueceu?
                  </button>
                </div>
                
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm active:scale-[0.98]">
                  Entrar
                  <span className="material-symbols-outlined text-lg">login</span>
                </button>

                <p className="mt-6 text-center text-slate-400 text-xs font-bold uppercase">
                  Novo por aqui?{' '}
                  <button type="button" onClick={() => setMode('register')} className="text-primary font-black hover:underline">Criar uma conta</button>
                </p>
              </form>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Criar Conta</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Preencha os dados abaixo</p>
                {errorString && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-[10px] font-black border border-red-100 uppercase text-center">
                    {errorString}
                  </div>
                )}
              </div>
              
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-1.5 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                  <label>Nome da Empresa / Administrador</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-bold" required />
                </div>
                <div className="space-y-1.5 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                  <label>E-mail Corporativo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-bold" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                    <label>Palavra-passe</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-bold" required />
                  </div>
                  <div className="space-y-1.5 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                    <label>Confirmar</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-bold" required />
                  </div>
                </div>
                
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 mt-4 rounded-xl shadow-xl shadow-primary/20 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                  Registar Conta
                </button>

                <p className="mt-4 text-center text-slate-400 text-xs font-bold uppercase">
                   Já tem conta? <button type="button" onClick={() => setMode('login')} className="text-primary font-black hover:underline">Fazer Login</button>
                </p>
              </form>
            </>
          )}

          {mode === 'confirm' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Validar Acesso</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Introduza o código enviado para o seu email</p>
              </div>
              
              <form className="space-y-6" onSubmit={handleConfirm}>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    className="w-full max-w-[200px] text-center text-4xl font-black tracking-[10px] py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-primary outline-none dark:text-white font-mono"
                    placeholder="000000"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 transition-all uppercase tracking-widest text-sm active:scale-[0.98]">
                  Verificar Código
                </button>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <div className="mb-8 text-center sm:text-left">
                <button type="button" onClick={() => setMode('login')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors mb-6 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-lg">west</span>
                  Voltar
                </button>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Recuperar Acesso</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Insira o seu e-mail para receber um link de redefinição.</p>
              </div>
              
              <form className="space-y-5" onSubmit={handleForgotPassword}>
                <div className="space-y-2 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                  <label>E-mail de Registo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-bold" required />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                  Enviar Link
                </button>
              </form>
            </>
          )}

          <div className="mt-auto pt-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[6px]">
            SALYA Ecosystem © 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

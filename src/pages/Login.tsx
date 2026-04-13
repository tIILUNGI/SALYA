import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../services/api';

type ViewMode = 'login' | 'register' | 'confirm' | 'forgot';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    setIsAuthenticated, setColaboradores, setEmpresa, setUser,
    setIsConfigured, setEmpresas, setEmpresaId, setMessage
  } = useContext(AppContext);

  const [mode, setMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('admin@salya.com');
  const [password, setPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorString, setErrorString] = useState('');

  const normalizeList = (data: any, key?: string) => {
    if (Array.isArray(data)) return data;
    return key ? data?._embedded?.[key] || [] : [];
  };

  const fetchGlobalData = async () => {
    try {
      const empresasData = await api.get('/api/empresas?size=1000');
      const empresasList = normalizeList(empresasData, 'empresas');
      setEmpresas(empresasList);

      if (empresasList.length > 0) {
        setEmpresa(empresasList[0]);
        setEmpresaId(empresasList[0].id);
        setIsConfigured(true);
        return true;
      } else {
        setIsConfigured(false);
        return false;
      }
    } catch (error) {
      console.error('Error fetching global data:', error);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response;

      if (token) {
        localStorage.setItem('salya_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('salya_user', JSON.stringify(user));
        setIsAuthenticated(true);
        setUser(user);
      }

      const hasEmpresa = await fetchGlobalData();
      navigate(hasEmpresa ? '/dashboard' : '/configuracoes');
    } catch (error: any) {
      setErrorString(error.message || 'Erro ao realizar login');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    if (password !== confirmPassword) {
      setErrorString('As palavras-passe não coincidem.');
      return;
    }

    try {
      const response = await api.post('/auth/register', { name, email, password });

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
        localStorage.setItem('salya_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('salya_user', JSON.stringify(user));
        setIsAuthenticated(true);
        setUser(user);

        const hasEmpresa = await fetchGlobalData();
        navigate(hasEmpresa ? '/dashboard' : '/configuracoes');
      }
    } catch (error: any) {
      setErrorString(error.message || 'Erro ao registar');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    try {
      const response = await api.post('/auth/verify-email', { email, code: confirmCode });
      const { token, user } = response;

      localStorage.setItem('salya_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('salya_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user);

      const hasEmpresa = await fetchGlobalData();
      navigate(hasEmpresa ? '/dashboard' : '/configuracoes');
    } catch (error: any) {
      setErrorString(error.message || 'Erro ao confirmar');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage({ 
        title: 'Sucesso', 
        text: 'Email de recuperação enviado (caso exista conta).', 
        type: 'success' 
      });
    } catch (error: any) {
      setErrorString(error.message || 'Erro ao recuperar password');
    }
  };

  const switchMode = (newMode: ViewMode) => {
    setMode(newMode);
    setErrorString('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark">
      <div className="relative flex h-auto w-full max-w-[1100px] flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-center items-center p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative z-10 text-center">
            <div className="mb-8">
              <span className="material-symbols-outlined text-8xl">payments</span>
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">SALYA</h1>
            <p className="text-xl font-medium opacity-90">Sistema de Gestão de Recibo Salarial</p>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <span className="material-symbols-outlined text-primary text-3xl">payments</span>
            <h1 className="text-2xl font-black text-primary">SALYA</h1>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Bem-vindo</h2>
                <p className="text-slate-500 dark:text-slate-400">Entre na sua conta para continuar</p>
              </div>

              {errorString && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorString}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Palavra-passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Entrar
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Esqueceu a palavra-passe?
                </button>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Não tem conta? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Criar conta
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button 
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-sm text-slate-400 hover:text-slate-600 font-medium"
                  >
                    ← Voltar à página inicial
                  </button>
                </div>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Criar Conta</h2>
                <p className="text-slate-500 dark:text-slate-400">Preencha os dados para se registar</p>
              </div>

              {errorString && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorString}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Palavra-passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirmar Palavra-passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Criar Conta
              </button>

              <div className="text-center">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Já tem conta? </span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Entrar
                </button>
              </div>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Confirmar Email</h2>
                <p className="text-slate-500 dark:text-slate-400">Introduza o código de verificação enviado por email</p>
              </div>

              {errorString && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorString}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Código de Confirmação</label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium text-center tracking-widest"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Confirmar
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Recuperar Password</h2>
                <p className="text-slate-500 dark:text-slate-400">Introduza o seu email para receber o código de recuperação</p>
              </div>

              {errorString && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorString}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Enviar Código
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Voltar ao login
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
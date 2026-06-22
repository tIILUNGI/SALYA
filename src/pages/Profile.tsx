import React, { useState, useContext, useEffect } from 'react';
import Swal from 'sweetalert2';

import { AppContext } from '../App';
import { api, getApiErrorMessage } from '../services/api';

const Profile: React.FC = () => {
  const { user, setUser } = useContext(AppContext);
   const [name, setName] = useState(user?.name || '');
   const [email, setEmail] = useState(user?.email || '');
   const [cargo, setCargo] = useState(user?.cargo || '');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [isLoading, setIsLoading] = useState(false);

   useEffect(() => {
     if (user) {
       setName(user.name);
       setEmail(user.email);
       setCargo(user.cargo || '');
     }
   }, [user]);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      Swal.fire('Erro', 'As palavras-passe não coincidem.', 'error');
      return;
    }

    if (password && password.length < 6) {
        Swal.fire('Erro', 'A palavra-passe deve ter no mínimo 6 caracteres.', 'error');
        return;
    }

    setIsLoading(true);
     try {
        const data: any = { name, email, cargo };
        if (password) data.password = password;

      const response = await api.put('/users/profile', data);
      
      if (setUser && response && response.user) {
        // Atualizar localStorage atômicamente com os dados retornados
        localStorage.setItem('salya_user', JSON.stringify({
          ...user,
          name: response.user.name,
          email: response.user.email,
          cargo: response.user.cargo
        }));
        setUser({
          ...user,
          name: response.user.name,
          email: response.user.email,
          cargo: response.user.cargo
        });
      }

      Swal.fire({
        title: 'Sucesso!',
        text: 'Perfil atualizado com sucesso.',
        icon: 'success',
        confirmButtonColor: '#6366f1',
      });
      
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Swal.fire('Erro', getApiErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Premium Section */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] -ml-16 -mb-16" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="size-32 md:size-40 rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-600 p-1 shadow-2xl shadow-primary/20">
            <div className="w-full h-full rounded-[2.3rem] bg-slate-900 flex items-center justify-center overflow-hidden border border-white/10">
              <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 uppercase">
                {name?.charAt(0) || user?.name?.charAt(0) || 'S'}
              </span>
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
              {name || 'Meu Perfil'}
            </h1>
            <p className="text-lg text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
              <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
              {cargo || 'Utilizador Salya'}
            </p>
            <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                ID: {user?.id || '---'}
              </span>
              <span className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                {user?.isAdmin ? 'Administrador' : 'Gestor'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-soft">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Dados Pessoais</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Informações de Identidade</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800 rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-bold text-lg shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">Endereço de Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800 rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-bold shadow-sm"
                    required
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">Profissão / Função</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ex: Gestor de Recursos Humanos"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800 rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Settings & Actions */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-soft">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="size-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500">lock</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Segurança</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Controlo de Acesso</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Nova Palavra-passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800 rounded-2xl focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-bold shadow-sm"
                />
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Confirmar Palavra-passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent dark:border-slate-800 rounded-2xl focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white font-bold shadow-sm"
                />
              </div>
              
              <p className="px-2 text-[10px] text-slate-400 font-medium leading-relaxed italic">
                * Deixe os campos de password em branco se não desejar alterar a sua credencial atual.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full group relative overflow-hidden px-8 py-5 bg-slate-900 dark:bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 dark:group-hover:opacity-100 dark:bg-primary/90 transition-opacity" />
            
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined transition-transform group-hover:rotate-12">verified</span>
            )}
            <span className="relative z-10">Atualizar Perfil</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;

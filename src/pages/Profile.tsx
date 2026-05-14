import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { api, getApiErrorMessage } from '../services/api';
import Swal from 'sweetalert2';

const Profile: React.FC = () => {
  const { user, setUser } = useContext(AppContext);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
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
      const data: any = { name, email };
      if (password) data.password = password;

      const response = await api.put('/users/profile', data);
      
      if (setUser) {
        setUser({
          ...user,
          ...response.user
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Meu Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações pessoais e segurança da conta.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informações Básicas */}
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Informações Básicas
                </h2>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              {/* Segurança */}
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">shield</span>
                  Segurança
                </h2>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Nova Palavra-passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Confirmar Nova Palavra-passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">save</span>
                )}
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

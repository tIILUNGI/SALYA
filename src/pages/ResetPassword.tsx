import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import { api, getApiErrorMessage } from '../services/api';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      return;
    }
    
    // Opcional: Validar token no backend antes de mostrar o form
    setIsValidToken(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire('Erro', 'As palavras-passe não coincidem.', 'error');
      return;
    }

    // Validação ISO 27001 — Controlo A.9.4.3
    if (!password || password.length < 8) {
      Swal.fire('Palavra-passe Fraca', 'A palavra-passe deve ter no mínimo 8 caracteres.', 'warning');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Swal.fire('Palavra-passe Fraca', 'A palavra-passe deve conter pelo menos uma letra maiúscula (A-Z).', 'warning');
      return;
    }
    if (!/[a-z]/.test(password)) {
      Swal.fire('Palavra-passe Fraca', 'A palavra-passe deve conter pelo menos uma letra minúscula (a-z).', 'warning');
      return;
    }
    if (!/[0-9]/.test(password)) {
      Swal.fire('Palavra-passe Fraca', 'A palavra-passe deve conter pelo menos um dígito (0-9).', 'warning');
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?\\]/.test(password)) {
      Swal.fire('Palavra-passe Fraca', 'A palavra-passe deve conter pelo menos um caractere especial (!@#$%...).', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/setup-password', { token, newPassword: password, confirmPassword }, true);
      
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Sua palavra-passe foi redefinida com sucesso. Agora você pode entrar na sua conta.',
        icon: 'success',
        confirmButtonColor: '#6366f1',
      });
      
      navigate('/login');
    } catch (error: any) {
      Swal.fire('Erro', getApiErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-corporate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">error</span>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Link Inválido</h2>
          <p className="text-slate-500 mb-6">Este link de recuperação é inválido ou já expirou.</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-corporate-50">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl">lock_reset</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nova Palavra-passe</h2>
          <p className="text-slate-500 text-sm">Defina sua nova palavra-passe de acesso.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Nova Palavra-passe <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
              required
              disabled={isLoading}
              placeholder="Mínimo 8 caracteres"
            />
            {/* Indicador de força — ISO 27001 */}
            {password.length > 0 && (() => {
              const checks = {
                length:  password.length >= 8,
                upper:   /[A-Z]/.test(password),
                lower:   /[a-z]/.test(password),
                number:  /[0-9]/.test(password),
                special: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?\\]/.test(password),
              };
              const score = Object.values(checks).filter(Boolean).length;
              const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-emerald-500'];
              const labels = ['Muito fraca','Fraca','Média','Boa','Forte'];
              return (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i < score ? colors[score - 1] : 'bg-slate-200'
                      }`} />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Força: <span className={score >= 5 ? 'text-emerald-500' : score >= 3 ? 'text-blue-500' : 'text-orange-500'}>{labels[score - 1] || 'Muito fraca'}</span></p>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Confirmar Nova Palavra-passe <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
              required
              disabled={isLoading}
              placeholder="Repita a palavra-passe"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined">check_circle</span>
            )}
            Redefinir Palavra-passe
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

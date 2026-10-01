import React, { useState, useContext } from 'react';
import Swal from 'sweetalert2';
import { api } from '../services/api';
import { AppContext } from '../App';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('SALYA60D');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { refreshSubscriptionStatus, refreshData } = useContext(AppContext);

  if (!isOpen) return null;

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Por favor introduza o código do voucher.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await api.post('/vouchers/redeem', { code: code.trim().toUpperCase() });

      await refreshSubscriptionStatus();
      await refreshData();

      const stacked: boolean = result?.stackedDaysAdded === true;
      const newExpiry: string = result?.subscriptionExpiry
        ? new Date(result.subscriptionExpiry).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';

      Swal.fire({
        icon: 'success',
        title: stacked ? '🗓️ DIAS ADICIONADOS!' : '🎉 VOUCHER ATIVADO!',
        html: stacked
          ? `
            <div class="py-2">
              <p class="text-base font-bold text-slate-800 mb-2">+${result?.durationDays ?? 60} dias acumulados ao seu plano!</p>
              <p class="text-sm text-slate-500">Os dias foram somados ao tempo restante da sua assinatura atual.</p>
              ${newExpiry ? `<div class="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-700 text-xs font-semibold">
                Nova data de expiração: <strong>${newExpiry}</strong>
              </div>` : ''}
            </div>
          `
          : `
            <div class="py-2">
              <p class="text-base font-bold text-slate-800 mb-2">Parabéns! ${result?.durationDays ?? 60} Dias de Acesso Total Concedidos.</p>
              <p class="text-sm text-slate-500">O seu plano <b>CORPORATIVO</b> foi ativado com sucesso para a sua conta.</p>
              ${newExpiry ? `<div class="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-700 text-xs font-semibold">
                Válido até: <strong>${newExpiry}</strong>
              </div>` : ''}
            </div>
          `,
        confirmButtonText: stacked ? 'PERFEITO, OBRIGADO!' : 'COMEÇAR A USAR O SALYA',
        confirmButtonColor: '#9333ea',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-2xl px-6 py-3 font-bold uppercase text-xs tracking-wider'
        }
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao ativar voucher:', err);
      const backendMessage = err?.data?.error || err?.message || 'Erro ao ativar o voucher. Verifique o código e tente novamente.';
      setErrorMsg(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100 dark:border-purple-900/40 relative">
        {/* Fechar modal */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Top Header Design Banner */}
        <div className="bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
          {/* Subtle background blur shapes */}
          <div className="absolute -top-10 -right-10 size-40 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 size-40 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full mb-4">
            <span className="material-symbols-outlined text-yellow-300 text-sm">workspace_premium</span>
            <span className="text-[11px] font-black tracking-widest uppercase text-purple-100">PROMOÇÃO ESPECIAL</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
            SALYA 60D <span className="text-purple-300 block text-2xl font-extrabold mt-1">60 DIAS GRÁTIS</span>
          </h2>
          <p className="text-xs text-purple-100/90 max-w-xs mx-auto font-medium">
            Ganhe um voucher para usar o Salya gratuitamente com acesso total durante 60 dias.
          </p>
        </div>

        {/* Voucher Input & Visual Ticket Body */}
        <div className="p-8">
          <form onSubmit={handleActivate} className="space-y-6">
            {/* Visual Voucher Ticket Box */}
            <div className="relative bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-3xl p-5 shadow-xl border border-purple-500/30 overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-75">VOUCHER CÓDIGO</span>
                  <div className="text-2xl font-black tracking-wider font-mono text-purple-200">
                    {code || 'DIGITE SEU CÓDIGO'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-100 font-medium pt-1">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    <span>60 dias de uso grátis</span>
                  </div>
                </div>

                <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                  <span className="material-symbols-outlined text-3xl text-yellow-300">redeem</span>
                </div>
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Código do Voucher Promocional
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EX: SALYA60D"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-lg font-black tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all uppercase"
                  disabled={loading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg">
                  60D FREE
                </span>
              </div>
              {errorMsg && (
                <div className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A ATIVAR VOUCHER...</span>
                </>
              ) : (
                <>
                  <span>ATIVAR O TEU VOUCHER</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

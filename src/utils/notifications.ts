import Swal from 'sweetalert2';

// Configuração base premium
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#1e293b',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const notify = {
  success: (title: string, message?: string) => {
    Toast.fire({
      icon: 'success',
      title,
      text: message,
      background: '#f0fdf4',
      iconColor: '#22c55e',
    });
  },
  
  error: (title: string, message?: string) => {
    Toast.fire({
      icon: 'error',
      title,
      text: message,
      background: '#fef2f2',
      iconColor: '#ef4444',
    });
  },

  warning: (title: string, message?: string) => {
    Toast.fire({
      icon: 'warning',
      title,
      text: message,
      background: '#fffbeb',
      iconColor: '#f59e0b',
    });
  },

  info: (title: string, message?: string) => {
    Toast.fire({
      icon: 'info',
      title,
      text: message,
      background: '#eff6ff',
      iconColor: '#3b82f6',
    });
  },

  // Modal para confirmações ou erros críticos
  modal: {
    success: (title: string, message: string) => {
      Swal.fire({
        icon: 'success',
        title,
        text: message,
        confirmButtonColor: '#3b82f6',
        customClass: {
          popup: 'rounded-2xl border-none shadow-2xl',
          confirmButton: 'px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm'
        }
      });
    },

    error: (title: string, message: string) => {
      Swal.fire({
        icon: 'error',
        title,
        text: message,
        confirmButtonColor: '#ef4444',
        customClass: {
          popup: 'rounded-2xl border-none shadow-2xl',
          confirmButton: 'px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm'
        }
      });
    },

    confirm: async (title: string, message: string, confirmText = 'Confirmar') => {
      const result = await Swal.fire({
        title,
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'rounded-2xl border-none shadow-2xl',
          confirmButton: 'px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm',
          cancelButton: 'px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm ml-2'
        }
      });
      return result.isConfirmed;
    }
  }
};

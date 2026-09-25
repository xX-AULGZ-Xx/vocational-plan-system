import Swal, { SweetAlertOptions } from 'sweetalert2';

const customSwal = Swal.mixin({
  customClass: {
    popup: 'swal2-modal-modern font-sans shadow-2xl',
    title: 'text-slate-900 font-bold text-base sm:text-lg shrink-0',
    htmlContainer: 'text-slate-600 text-xs sm:text-sm',
    confirmButton: 'px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-theme-primary/40',
    cancelButton: 'px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0 focus:outline-none',
    denyButton: 'px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-500/40',
    actions: 'flex items-center justify-center gap-2 mt-4',
  },
  buttonsStyling: false,
});

export const showAlert = {
  success: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'ตกลง',
      timer: 2500,
      timerProgressBar: true,
    });
  },

  error: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'ตกลง',
    });
  },

  warning: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'ตกลง',
    });
  },

  info: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'ตกลง',
    });
  },

  confirm: async (title: string, text?: string, confirmText: string = 'ยืนยัน', cancelText: string = 'ยกเลิก') => {
    const result = await customSwal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  toast: (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'info', text?: string) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    return Swal.fire({
      toast: true,
      position: isMobile ? 'top' : 'top-end',
      backdrop: false, // Absolutely NO dark backdrop for toast notifications
      showConfirmButton: false,
      timer: isMobile ? 3500 : 4000,
      timerProgressBar: true,
      icon,
      title,
      text,
      showClass: {
        popup: isMobile ? 'swal2-toast-mobile-in' : 'swal2-toast-desktop-in',
      },
      hideClass: {
        popup: isMobile ? 'swal2-toast-mobile-out' : 'swal2-toast-desktop-out',
      },
      customClass: {
        container: 'z-[999999] pointer-events-none swal2-toast-no-backdrop',
        popup: `swal2-toast-popup ${
          isMobile
            ? 'swal2-toast-mobile'
            : 'swal2-toast-desktop'
        }`,
      },
    });
  },

  fire: (options: SweetAlertOptions) => customSwal.fire(options),
};

export default customSwal;

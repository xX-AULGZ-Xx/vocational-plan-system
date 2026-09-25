import Swal, { SweetAlertOptions } from 'sweetalert2';

const customSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-theme font-sans shadow-2xl border border-slate-200 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden',
    title: 'text-slate-900 font-bold text-lg shrink-0',
    htmlContainer: 'text-slate-600 text-sm overflow-y-auto max-h-[calc(100dvh-12rem)]',
    confirmButton: 'px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs sm:text-sm font-bold rounded-theme shadow-md transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0',
    cancelButton: 'px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-theme transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0',
    denyButton: 'px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-theme transition-all mx-1.5 cursor-pointer active:scale-95 shrink-0',
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
        popup: `font-sans shadow-2xl border border-slate-200/90 rounded-2xl bg-white/95 backdrop-blur-md p-3.5 pointer-events-auto ${
          isMobile
            ? 'swal2-toast-mobile mx-auto max-w-sm w-[calc(100vw-1.5rem)] mt-3 text-left'
            : 'swal2-toast-desktop mr-5 mt-4 max-w-sm text-left'
        }`,
        title: 'text-slate-900 font-bold text-xs sm:text-sm leading-tight',
        htmlContainer: 'text-slate-600 text-[11px] sm:text-xs mt-1 leading-snug',
      },
    });
  },

  fire: (options: SweetAlertOptions) => customSwal.fire(options),
};

export default customSwal;

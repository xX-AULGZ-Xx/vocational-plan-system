import Swal, { SweetAlertOptions } from 'sweetalert2';

const customSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-theme font-sans shadow-2xl border border-slate-200',
    title: 'text-slate-900 font-bold text-lg',
    htmlContainer: 'text-slate-600 text-sm',
    confirmButton: 'px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs sm:text-sm font-bold rounded-theme shadow-md transition-all mx-1.5 cursor-pointer active:scale-95',
    cancelButton: 'px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-theme transition-all mx-1.5 cursor-pointer active:scale-95',
    denyButton: 'px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-theme transition-all mx-1.5 cursor-pointer active:scale-95',
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

  toast: (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      icon,
      title,
    });
  },

  fire: (options: SweetAlertOptions) => customSwal.fire(options),
};

export default customSwal;

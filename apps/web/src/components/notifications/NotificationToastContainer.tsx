'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, ActiveToastItem, NotificationItem } from '@/lib/notification-context';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  X,
  ExternalLink,
  Bell,
  Clock,
} from 'lucide-react';

interface ToastCardProps {
  toast: ActiveToastItem;
  onDismiss: (id: string) => void;
  onNavigate: (item: NotificationItem) => void;
}

function ToastCard({ toast, onDismiss, onNavigate }: ToastCardProps) {
  const noti = toast.notification;
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const remainingTimeRef = useRef(toast.durationMs);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismissWithAnimation = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 220); // wait for exit animation
  }, [toast.id, onDismiss]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      handleDismissWithAnimation();
    }, remainingTimeRef.current);
  }, [handleDismissWithAnimation]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const getStyleByType = (type: string) => {
    switch (type) {
      case 'PROJECT_FINAL_APPROVED':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-700',
          bgColor: 'bg-emerald-100',
          borderColor: 'border-emerald-300',
          progressColor: 'bg-emerald-600',
          ringColor: 'ring-emerald-400/40',
          glowShadow: 'shadow-emerald-500/10',
          badgeText: 'อนุมัติโครงการแล้ว',
          badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        };
      case 'PROJECT_APPROVED':
        return {
          icon: CheckCircle2,
          iconColor: 'text-blue-700',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300',
          progressColor: 'bg-blue-600',
          ringColor: 'ring-blue-400/40',
          glowShadow: 'shadow-blue-500/10',
          badgeText: 'ผ่านการพิจารณา',
          badgeColor: 'bg-blue-100 text-blue-950 border-blue-300',
        };
      case 'PROJECT_REVISION':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-700',
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-400',
          progressColor: 'bg-amber-600',
          ringColor: 'ring-amber-400/40',
          glowShadow: 'shadow-amber-500/10',
          badgeText: 'แจ้งขอให้แก้ไข',
          badgeColor: 'bg-amber-100 text-amber-950 border-amber-400',
        };
      case 'PROJECT_REJECTED':
        return {
          icon: XCircle,
          iconColor: 'text-rose-700',
          bgColor: 'bg-rose-100',
          borderColor: 'border-rose-300',
          progressColor: 'bg-rose-600',
          ringColor: 'ring-rose-400/40',
          glowShadow: 'shadow-rose-500/10',
          badgeText: 'ไม่อนุมัติโครงการ',
          badgeColor: 'bg-rose-100 text-rose-950 border-rose-300',
        };
      case 'APPROVAL_REQUIRED':
      case 'PROJECT_SUBMITTED':
        return {
          icon: FileText,
          iconColor: 'text-indigo-700',
          bgColor: 'bg-indigo-100',
          borderColor: 'border-indigo-300',
          progressColor: 'bg-indigo-600',
          ringColor: 'ring-indigo-400/40',
          glowShadow: 'shadow-indigo-500/10',
          badgeText: 'รอการพิจารณา',
          badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-300',
        };
      default:
        return {
          icon: Bell,
          iconColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          progressColor: 'bg-blue-600',
          ringColor: 'ring-blue-400/40',
          glowShadow: 'shadow-blue-500/10',
          badgeText: 'การแจ้งเตือนใหม่',
          badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
        };
    }
  };

  const style = getStyleByType(noti.type);
  const Icon = style.icon;

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={pauseTimer}
      onTouchEnd={resumeTimer}
      onClick={() => onNavigate(noti)}
      className={`group relative pointer-events-auto bg-white text-slate-900 rounded-2xl border border-slate-300/90 shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${style.glowShadow} overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 active:scale-[0.99] ring-1 ring-slate-900/10 ${
        isExiting ? 'toast-exit-animation' : 'toast-spring-entry'
      }`}
      role="alert"
    >
      {/* Light Shimmer Sweep Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="toast-shimmer-beam absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      <div className="p-3.5 sm:p-4 flex items-start gap-3.5 relative z-10">
        {/* Leading Icon with spring bounce & glowing ring */}
        <div className={`p-2.5 rounded-xl ${style.bgColor} ${style.borderColor} border shrink-0 shadow-xs ring-4 ${style.ringColor} group-hover:scale-110 group-hover:rotate-6 transition duration-300 toast-icon-pop`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-2xs ${style.badgeColor}`}>
              {style.badgeText}
            </span>
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              เมื่อสักครู่
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-slate-950 line-clamp-1 leading-snug group-hover:text-blue-900 transition">
            {noti.title}
          </h4>

          <p className="text-[11px] sm:text-xs text-slate-800 font-normal line-clamp-2 mt-1 leading-relaxed">
            {noti.message}
          </p>

          {/* Call to action label with hover slide */}
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-blue-900 group-hover:text-blue-700">
            <span className="group-hover:underline">แตะเพื่อเปิดดูรายละเอียด</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismissWithAnimation();
          }}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-90"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shrinking Time Progress Bar (CSS Animation) */}
      <div className="h-1.5 w-full bg-slate-100 overflow-hidden relative z-10">
        <div
          className={`h-full ${style.progressColor} origin-left shadow-xs`}
          style={{
            animationName: 'shrinkToastProgress',
            animationDuration: `${toast.durationMs}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

export default function NotificationToastContainer() {
  const router = useRouter();
  const { activeToasts, dismissToast, markAsRead } = useNotifications();

  if (!activeToasts || activeToasts.length === 0) {
    return null;
  }

  const handleNavigate = (noti: NotificationItem) => {
    if (!noti.is_read) {
      markAsRead(noti.id);
    }
    dismissToast(String(noti.id));
    if (noti.link_url) {
      router.push(noti.link_url);
    } else {
      router.push('/notifications');
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes shrinkToastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        /* Mobile Spring Entry */
        @keyframes toastSpringInMobile {
          0% {
            opacity: 0;
            transform: translateY(-40px) scale(0.9);
          }
          60% {
            opacity: 1;
            transform: translateY(6px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Desktop Spring Entry */
        @keyframes toastSpringInDesktop {
          0% {
            opacity: 0;
            transform: translateX(60px) scale(0.9);
          }
          60% {
            opacity: 1;
            transform: translateX(-6px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        /* Exit Animation */
        @keyframes toastExit {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
        }

        /* Shimmer Beam Sweep */
        @keyframes shimmerSweep {
          0% {
            transform: translateX(-100%) skewX(-20deg);
          }
          50%, 100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }

        /* Icon Pop */
        @keyframes iconPop {
          0% {
            transform: scale(0.5) rotate(-15deg);
          }
          70% {
            transform: scale(1.15) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        .toast-spring-entry {
          animation: toastSpringInMobile 450ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @media (min-width: 640px) {
          .toast-spring-entry {
            animation: toastSpringInDesktop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
        }

        .toast-exit-animation {
          animation: toastExit 220ms ease-in forwards !important;
        }

        .toast-shimmer-beam {
          animation: shimmerSweep 3s infinite ease-in-out;
        }

        .toast-icon-pop {
          animation: iconPop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div
        aria-live="polite"
        className="fixed z-[999999] pointer-events-none flex flex-col gap-3 top-20 sm:top-20 inset-x-2 sm:inset-x-auto sm:right-6 w-[calc(100%-1rem)] sm:w-[420px] max-w-full sm:max-w-md mx-auto sm:mx-0"
      >
        {activeToasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </>
  );
}

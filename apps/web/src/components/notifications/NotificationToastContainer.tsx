'use client';

import React, { useState, useEffect } from 'react';
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
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50; // update every 50ms
    const totalSteps = toast.durationMs / interval;
    const decrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return Math.max(0, prev - decrement);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.id, toast.durationMs, isPaused, onDismiss]);

  const getStyleByType = (type: string) => {
    switch (type) {
      case 'PROJECT_FINAL_APPROVED':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          progressColor: 'bg-emerald-500',
          badgeText: 'อนุมัติโครงการแล้ว',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        };
      case 'PROJECT_APPROVED':
        return {
          icon: CheckCircle2,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          progressColor: 'bg-blue-500',
          badgeText: 'ผ่านการพิจารณา',
          badgeColor: 'bg-blue-100 text-blue-800',
        };
      case 'PROJECT_REVISION':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-300',
          progressColor: 'bg-amber-500',
          badgeText: 'แจ้งขอให้แก้ไข',
          badgeColor: 'bg-amber-100 text-amber-900',
        };
      case 'PROJECT_REJECTED':
        return {
          icon: XCircle,
          iconColor: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          progressColor: 'bg-rose-500',
          badgeText: 'ไม่อนุมัติโครงการ',
          badgeColor: 'bg-rose-100 text-rose-800',
        };
      case 'APPROVAL_REQUIRED':
      case 'PROJECT_SUBMITTED':
        return {
          icon: FileText,
          iconColor: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          progressColor: 'bg-indigo-500',
          badgeText: 'รอการพิจารณา',
          badgeColor: 'bg-indigo-100 text-indigo-800',
        };
      default:
        return {
          icon: Bell,
          iconColor: 'text-theme-primary',
          bgColor: 'bg-theme-primary/10',
          borderColor: 'border-slate-200',
          progressColor: 'bg-theme-primary',
          badgeText: 'การแจ้งเตือนใหม่',
          badgeColor: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const style = getStyleByType(noti.type);
  const Icon = style.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onClick={() => onNavigate(noti)}
      className="group relative pointer-events-auto bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-3xl hover:-translate-y-0.5 animate-in slide-in-from-top-4 sm:slide-in-from-right-6 fade-in duration-300 ring-1 ring-black/5"
      role="alert"
    >
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Leading Icon */}
        <div className={`p-2.5 rounded-xl ${style.bgColor} ${style.borderColor} border shrink-0 shadow-2xs group-hover:scale-110 transition duration-200`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`px-2 py-0.2 text-[10px] font-bold rounded-full border ${style.badgeColor}`}>
              {style.badgeText}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              เมื่อสักครู่
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-theme-primary transition">
            {noti.title}
          </h4>

          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
            {noti.message}
          </p>

          {/* Call to action label */}
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-theme-primary group-hover:underline">
            <span>แตะเพื่อเปิดดูรายละเอียด</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shrinking Time Progress Bar */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${style.progressColor} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
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
    <div
      aria-live="polite"
      className="fixed z-[999999] pointer-events-none flex flex-col gap-2.5 top-3 sm:top-4 inset-x-3 sm:inset-x-auto sm:right-4 max-w-md w-auto sm:w-full"
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
  );
}

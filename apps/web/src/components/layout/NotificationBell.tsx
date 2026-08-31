'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, NotificationItem } from '@/lib/notification-context';
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'เมื่อสักครู่';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'เมื่อวานนี้';
      if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;

      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_FINAL_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'PROJECT_APPROVED':
        return <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'PROJECT_REVISION':
        return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'PROJECT_REJECTED':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'APPROVAL_REQUIRED':
      case 'PROJECT_SUBMITTED':
        return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    setIsOpen(false);
    if (item.link_url) {
      router.push(item.link_url);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-hidden"
        title="การแจ้งเตือน (Notifications)"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">ไม่มีรายการแจ้งเตือนในขณะนี้</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                    !item.is_read
                      ? 'bg-blue-50/60 hover:bg-blue-50'
                      : 'hover:bg-slate-50 opacity-85'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!item.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'} truncate`}>
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id);
                          }}
                          className="hover:text-rose-600 transition"
                          title="ลบการแจ้งเตือน"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-900 hover:text-blue-700 flex items-center justify-center gap-1 transition"
            >
              <span>ดูประวัติการแจ้งเตือนทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

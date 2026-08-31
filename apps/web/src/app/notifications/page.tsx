'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNotifications, NotificationItem } from '@/lib/notification-context';
import {
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications, isLoading } = useNotifications();
  const [filterType, setFilterType] = useState<string>('all'); // all, unread, approval, revision
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((item) => {
    // Filter type
    if (filterType === 'unread' && item.is_read) return false;
    if (filterType === 'approval' && !['APPROVAL_REQUIRED', 'PROJECT_SUBMITTED', 'PROJECT_APPROVED', 'PROJECT_FINAL_APPROVED'].includes(item.type)) return false;
    if (filterType === 'revision' && item.type !== 'PROJECT_REVISION') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_FINAL_APPROVED':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'PROJECT_APPROVED':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'PROJECT_REVISION':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'PROJECT_REJECTED':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'APPROVAL_REQUIRED':
      case 'PROJECT_SUBMITTED':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleActionClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    if (item.link_url) {
      router.push(item.link_url);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-theme shadow-xs border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-theme-primary-light text-theme-primary rounded-theme border border-theme-primary/20 shadow-2xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>ศูนย์การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                  {unreadCount} ข้อความใหม่
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามความเคลื่อนไหว ผลการพิจารณาอนุมัติโครงการ และข้อเสนอแนะแบบ Real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchNotifications()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-theme text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            title="รีเฟรชรายการ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-theme text-xs font-bold text-theme-primary bg-theme-primary-light hover:bg-theme-primary hover:text-white border border-theme-primary/30 transition shadow-2xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>อ่านทั้งหมดแล้ว</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-theme shadow-xs border border-slate-200">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'unread', label: `ยังไม่ได้อ่าน (${unreadCount})` },
            { id: 'approval', label: 'การอนุมัติ/สายบังคับบัญชา' },
            { id: 'revision', label: 'ขอให้แก้ไข' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-theme text-xs font-bold whitespace-nowrap transition ${
                filterType === tab.id
                  ? 'bg-theme-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาข้อความ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-theme text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-theme-primary focus:bg-white transition"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-theme shadow-xs border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-semibold text-slate-600">ไม่พบรายการแจ้งเตือน</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterType === 'unread' ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' : 'ไม่มีรายการแจ้งเตือนในเงื่อนไขที่เลือก'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleActionClick(item)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition cursor-pointer ${
                !item.is_read
                  ? 'bg-theme-primary-light/40 hover:bg-theme-primary-light/70'
                  : 'hover:bg-slate-50 opacity-90'
              }`}
            >
              <div className="p-2.5 rounded-theme bg-white border border-slate-200 shadow-2xs mt-0.5">
                {getNotificationIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className={`text-sm ${!item.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                    {item.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatThaiDate(item.created_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.message}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <div className="flex items-center gap-3">
                    {item.link_url && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-theme-primary hover:underline">
                        <span>เปิดดูรายละเอียด</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                    {!item.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                      >
                        ทำเครื่องหมายว่าอ่านแล้ว
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 transition rounded-theme hover:bg-rose-50"
                    title="ลบการแจ้งเตือน"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

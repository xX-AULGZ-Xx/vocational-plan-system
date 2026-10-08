'use client';

import React, { useState, useEffect } from 'react';
import { Search, Users, UserPlus, X, Check, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import ChatAvatar from './ChatAvatar';

interface UserItem {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string | null;
  role?: string;
  position?: string;
  is_online?: boolean;
  department?: { id: number; name: string };
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated?: (roomId: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onRoomCreated }: NewChatModalProps) {
  const { token, user: currentUser } = useAuth();
  const { openDirectChat, createGroupChat } = useChat();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedUserIds([]);
      setGroupName('');
      setGroupDescription('');
      return;
    }

    const timer = setTimeout(() => {
      fetchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const fetchUsers = async (q: string) => {
    try {
      setIsLoading(true);
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : null);
      const res = await fetch(`/api/v1/chat/users?q=${encodeURIComponent(q)}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      setIsSubmitting(true);
      const roomId = await openDirectChat(targetUserId);
      if (roomId) {
        onRoomCreated?.(roomId);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    try {
      setIsSubmitting(true);
      const roomId = await createGroupChat(groupName.trim(), groupDescription.trim(), selectedUserIds);
      if (roomId) {
        onRoomCreated?.(roomId);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">เริ่มการสนทนาใหม่</h3>
            <p className="text-xs text-slate-500">เลือกผู้ใช้งานหรือสร้างกลุ่มสนทนาเพื่อติดต่อประสานงาน</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
              tab === 'direct'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>แชทส่วนตัว 1:1</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
              tab === 'group'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>สร้างกลุ่มสนทนา</span>
          </button>
        </div>

        {/* Content */}
        {tab === 'direct' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="p-3.5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู บุคลากร หรือแผนก..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Users List */}
            <div className="overflow-y-auto p-3 space-y-1 flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span className="text-sm">กำลังค้นหาบุคลากร...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm">ไม่พบบุคลากรที่ค้นหา</p>
                </div>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => !isSubmitting && handleStartDirectChat(u.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/60 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChatAvatar
                        src={u.avatar_url}
                        name={u.full_name}
                        size="md"
                        isOnline={u.is_online}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">
                          {u.full_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {u.position || u.department?.name || u.role}
                        </p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                      ส่งข้อความ
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroupChat} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 space-y-3 border-b border-slate-100 bg-slate-50/40">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อกลุ่มสนทนา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ทีมงานจัดซื้อ, คณะทำงานอบรม..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับกลุ่ม..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  เลือกสมาชิก ({selectedUserIds.length} คน)
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาสมาชิก..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Selectable users list */}
            <div className="overflow-y-auto p-3 space-y-1 flex-1 max-h-48">
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUserSelection(u.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ChatAvatar
                        src={u.avatar_url}
                        name={u.full_name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.position || u.department?.name}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!groupName.trim() || selectedUserIds.length === 0 || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                <span>สร้างกลุ่ม ({selectedUserIds.length})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

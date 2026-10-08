'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChat, ChatRoom } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ChatMessageItem from './ChatMessageItem';
import ChatInput from './ChatInput';
import NewChatModal from './NewChatModal';
import ChatAvatar from './ChatAvatar';
import {
  MessageSquare,
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Search,
  Plus,
  ChevronLeft,
  FolderKanban,
  Users,
  User as UserIcon,
  Circle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function FloatingChatWidget() {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    rooms,
    messages,
    totalUnreadCount,
    isLoadingRooms,
    isLoadingMessages,
    isWidgetOpen,
    widgetActiveRoomId,
    typingUsers,
    toggleWidget,
    setWidgetActiveRoom,
    markAsRead,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PROJECT' | 'DIRECT' | 'GROUP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (widgetActiveRoomId && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, widgetActiveRoomId]);

  // Don't show floating widget on full /chat page or auth/setup pages
  const isFullChatPage = pathname === '/chat';
  const isAuthOrSetup = pathname === '/login' || pathname === '/setup' || pathname?.startsWith('/surveys');

  if (!user || isFullChatPage || isAuthOrSetup) {
    return null;
  }

  const activeRoom = rooms.find((r) => r.id === widgetActiveRoomId);

  // Filter rooms
  const filteredRooms = rooms.filter((r) => {
    if (activeTab !== 'ALL' && r.type !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.displayName.toLowerCase().includes(q) ||
      (r.subtitle && r.subtitle.toLowerCase().includes(q)) ||
      (r.project?.project_code && r.project.project_code.toLowerCase().includes(q))
    );
  });

  // Current room typing text
  const currentRoomTyping = widgetActiveRoomId ? typingUsers[widgetActiveRoomId] : null;
  const typingNames = currentRoomTyping ? Object.values(currentRoomTyping) : [];

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isWidgetOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => toggleWidget(true)}
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none ring-4 ring-blue-500/20"
            title="เปิดกล่องข้อความและการสนทนา"
          >
            <MessageSquare className="w-6 h-6 transition-transform group-hover:rotate-6" />

            {/* Unread Counter Badge */}
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white shadow-md ring-2 ring-white animate-pulse">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Floating Chat Popup Window */}
      {isWidgetOpen && (
        <div className="fixed bottom-4 right-4 z-40 w-[92vw] sm:w-[380px] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Top Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {widgetActiveRoomId ? (
                <button
                  onClick={() => {
                    setWidgetActiveRoom(null);
                  }}
                  className="p-1 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="กลับไปยังรายการห้อง"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
              )}

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {widgetActiveRoomId ? activeRoom?.displayName || 'ห้องสนทนา' : 'ข้อความและการสนทนา'}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {widgetActiveRoomId
                    ? activeRoom?.subtitle || 'สนทนาแบบเรียลไทม์'
                    : `${rooms.length} ห้องสนทนา`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <Link
                href={widgetActiveRoomId ? `/chat?roomId=${widgetActiveRoomId}` : '/chat'}
                onClick={() => toggleWidget(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="ขยายเป็นหน้าเต็ม"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => toggleWidget(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="ย่อหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Room List or Messages Feed */}
          {widgetActiveRoomId && activeRoom ? (
            /* Active Conversation View */
            <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    กำลังโหลดข้อความ...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 px-4 text-slate-400">
                    <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs">ยังไม่มีข้อความ เริ่มต้นการสนทนาได้เลย</p>
                  </div>
                ) : (
                  messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)
                )}

                {/* Typing Indicator */}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 italic py-1 px-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{typingNames.join(', ')} กำลังพิมพ์...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <ChatInput roomId={widgetActiveRoomId} />
            </div>
          ) : (
            /* Room List View */
            <div className="flex flex-col flex-1 min-h-0 bg-white">
              {/* Search & New Chat Button */}
              <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาการสนทนา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition shrink-0"
                  title="เริ่มแชทใหม่"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Room Categories Tabs */}
              <div className="flex border-b border-slate-100 px-3 py-1.5 gap-1 text-[11px] overflow-x-auto no-scrollbar">
                {[
                  { key: 'ALL', label: 'ทั้งหมด' },
                  { key: 'PROJECT', label: 'โครงการ' },
                  { key: 'DIRECT', label: '1:1 ส่วนตัว' },
                  { key: 'GROUP', label: 'กลุ่ม' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      activeTab === t.key
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Rooms List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {isLoadingRooms ? (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-xs">
                    กำลังโหลดห้องสนทนา...
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">ไม่พบการสนทนา</p>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
                    >
                      + เริ่มต้นการสนทนาใหม่
                    </button>
                  </div>
                ) : (
                  filteredRooms.map((r) => {
                    const isUnread = (r.unread_count || 0) > 0;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setWidgetActiveRoom(r.id);
                          markAsRead(r.id);
                        }}
                        className={`flex items-center gap-3 p-3 hover:bg-blue-50/50 cursor-pointer transition ${
                          isUnread ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <ChatAvatar
                          src={r.displayAvatar}
                          name={r.displayName}
                          type={r.type}
                          size="md"
                          isOnline={
                            r.type === 'DIRECT' &&
                            r.participants.some(
                              (p) => p.user?.is_online && p.user_id !== user?.id?.toString()
                            )
                          }
                        />

                        {/* Info & Snippet */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h5 className={`text-xs truncate max-w-[170px] ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                              {r.displayName}
                            </h5>
                            {r.last_message?.created_at && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(r.last_message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {r.last_message ? (
                                r.last_message.message_type === 'PROJECT_CARD' ? '📋 การ์ดข้อมูลโครงการ' :
                                r.last_message.message_type === 'FILE' ? '📎 ไฟล์แนบ' :
                                r.last_message.content || 'ส่งข้อความ'
                              ) : (
                                <span className="italic text-slate-400">ยังไม่มีข้อความ</span>
                              )}
                            </p>
                            {isUnread && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shrink-0">
                                {r.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onRoomCreated={(roomId) => {
          setWidgetActiveRoom(roomId);
        }}
      />
    </>
  );
}

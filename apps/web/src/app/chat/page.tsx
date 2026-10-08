'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useChat, ChatRoom } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ChatMessageItem from '@/components/chat/ChatMessageItem';
import ChatInput from '@/components/chat/ChatInput';
import NewChatModal from '@/components/chat/NewChatModal';
import ChatAvatar from '@/components/chat/ChatAvatar';
import DeleteChatRoomModal from '@/components/chat/DeleteChatRoomModal';
import {
  MessageSquare,
  Search,
  Plus,
  FolderKanban,
  Users,
  User as UserIcon,
  ChevronLeft,
  ArrowUpRight,
  Shield,
  Info,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Paperclip,
  Trash2,
} from 'lucide-react';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    rooms,
    activeRoomId,
    activeRoom,
    messages,
    isLoadingRooms,
    isLoadingMessages,
    selectRoom,
    openDirectChat,
    openProjectChat,
    typingUsers,
    markAsRead,
  } = useChat();

  const [filterTab, setFilterTab] = useState<'ALL' | 'PROJECT' | 'DIRECT' | 'GROUP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [isMobileViewList, setIsMobileViewList] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle URL deep linking (e.g. /chat?roomId=1 or /chat?projectId=2 or /chat?userId=3)
  useEffect(() => {
    const roomIdParam = searchParams.get('roomId');
    const projectIdParam = searchParams.get('projectId');
    const userIdParam = searchParams.get('userId');

    if (roomIdParam) {
      selectRoom(roomIdParam);
      setIsMobileViewList(false);
    } else if (projectIdParam) {
      openProjectChat(projectIdParam).then((rId) => {
        if (rId) setIsMobileViewList(false);
      });
    } else if (userIdParam) {
      openDirectChat(userIdParam).then((rId) => {
        if (rId) setIsMobileViewList(false);
      });
    }
  }, [searchParams, selectRoom, openProjectChat, openDirectChat]);

  // Scroll to bottom on messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterTab !== 'ALL' && r.type !== filterTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.displayName.toLowerCase().includes(q) ||
        (r.subtitle && r.subtitle.toLowerCase().includes(q)) ||
        (r.project?.project_code && r.project.project_code.toLowerCase().includes(q))
      );
    });
  }, [rooms, filterTab, searchQuery]);

  const handleSelectRoom = (roomId: string) => {
    selectRoom(roomId);
    markAsRead(roomId);
    setIsMobileViewList(false);
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: typeof messages } = {};

    messages.forEach((msg) => {
      const d = new Date(msg.created_at);
      const dateKey = d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  }, [messages]);

  // Typing users in current room
  const currentRoomTyping = activeRoomId ? typingUsers[activeRoomId] : null;
  const typingNames = currentRoomTyping ? Object.values(currentRoomTyping) : [];

  return (
    <div className="h-[calc(100vh-6.5rem)] flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
      {/* Left Sidebar: Conversations list */}
      <div
        className={`w-full lg:w-80 xl:w-96 flex flex-col border-r border-slate-200 shrink-0 ${
          !isMobileViewList ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">แชทและการติดต่อสื่อสาร</h2>
            <p className="text-xs text-slate-500">สนทนาแบบเรียลไทม์กับบุคลากรและทีมงาน</p>
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างแชท</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ, บุคลากร, โครงการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex border-b border-slate-100 p-2 gap-1 overflow-x-auto no-scrollbar bg-slate-50/30">
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PROJECT', label: 'โครงการ' },
            { key: 'DIRECT', label: 'ส่วนตัว (1:1)' },
            { key: 'GROUP', label: 'กลุ่ม' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterTab === tab.key
                  ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Room List Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoadingRooms ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              กำลังโหลดรายการสนทนา...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">ไม่พบการสนทนา</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
              >
                + เริ่มต้นการสนทนาใหม่
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isSelected = room.id === activeRoomId;
              const isUnread = (room.unread_count || 0) > 0;

              return (
                <div
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/80 border-r-4 border-blue-600'
                      : isUnread
                      ? 'bg-slate-50/80 hover:bg-blue-50/30'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Room Icon / Avatar */}
                  <ChatAvatar
                    src={room.displayAvatar}
                    name={room.displayName}
                    type={room.type}
                    size="lg"
                    isOnline={
                      room.type === 'DIRECT' &&
                      room.participants.some(
                        (p) => p.user?.is_online && p.user_id !== user?.id?.toString()
                      )
                    }
                  />

                  {/* Room Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className={`text-sm truncate max-w-[170px] ${
                          isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                        }`}
                      >
                        {room.displayName}
                      </h4>
                      {room.last_message?.created_at && (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(room.last_message.created_at).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {room.last_message ? (
                          room.last_message.message_type === 'PROJECT_CARD' ? (
                            '📋 การ์ดข้อมูลโครงการ'
                          ) : room.last_message.message_type === 'FILE' ? (
                            '📎 ไฟล์แนบ'
                          ) : (
                            room.last_message.content || 'ส่งข้อความ'
                          )
                        ) : (
                          <span className="italic text-slate-400">ยังไม่มีข้อความ</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isUnread && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                            {room.unread_count}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete(room);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="ลบห้องสนทนา"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Messages & Conversation Window */}
      {activeRoomId && activeRoom ? (
        <div
          className={`flex-1 flex flex-col min-w-0 bg-slate-50 ${
            isMobileViewList ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Active Room Header */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back button */}
              <button
                onClick={() => setIsMobileViewList(true)}
                className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base truncate max-w-[280px] sm:max-w-md">
                    {activeRoom.displayName}
                  </h3>
                  {activeRoom.type === 'PROJECT' && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full shrink-0">
                      ห้องโครงการ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-[280px] sm:max-w-md">
                  {activeRoom.subtitle || `${activeRoom.participants.length} ผู้เข้าร่วม`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeRoom.project_id && (
                <Link
                  href={`/projects/${activeRoom.project_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เปิดดูโครงการ</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <button
                onClick={() => setRoomToDelete(activeRoom)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="ลบห้องสนทนานี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                className={`p-2 rounded-xl transition ${
                  showInfoSidebar ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="ข้อมูลห้องและสมาชิก"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Feed + Optional Info Panel */}
          <div className="flex flex-1 min-h-0">
            {/* Messages Feed */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    กำลังโหลดข้อความ...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-24 px-4 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <h4 className="font-semibold text-slate-700 text-sm mb-1">ยังไม่มีข้อความในการสนทนานี้</h4>
                    <p className="text-xs text-slate-400">พิมพ์ข้อความหรือแนบเอกสารเพื่อเริ่มการพูดคุย</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([dateStr, msgs]) => (
                    <div key={dateStr} className="space-y-2">
                      {/* Date Divider */}
                      <div className="flex items-center justify-center my-4">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-3 py-0.5 rounded-full shadow-2xs">
                          {dateStr}
                        </span>
                      </div>

                      {msgs.map((msg) => (
                        <ChatMessageItem key={msg.id} message={msg} />
                      ))}
                    </div>
                  ))
                )}

                {/* Typing Indicator */}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic py-1 px-3 bg-white/70 rounded-full w-fit animate-pulse border border-slate-200/50">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>{typingNames.join(', ')} กำลังพิมพ์...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <ChatInput roomId={activeRoomId} />
            </div>

            {/* Room Info / Participants Sidebar */}
            {showInfoSidebar && (
              <div className="w-72 border-l border-slate-200 bg-white p-4 overflow-y-auto shrink-0 hidden md:block animate-in slide-in-from-right duration-150 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-3">สมาชิกในห้อง ({activeRoom.participants.length})</h4>
                  <div className="space-y-2">
                    {activeRoom.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChatAvatar
                            src={p.user?.avatar_url}
                            name={p.user?.full_name}
                            size="sm"
                            isOnline={p.user?.is_online}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{p.user?.full_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{p.user?.position || p.user?.role}</p>
                          </div>
                        </div>
                        {p.role === 'OWNER' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            เจ้าของ
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone: Delete Room Button */}
                <div className="pt-4 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRoomToDelete(activeRoom)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200/80 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ลบห้องสนทนานี้</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty state when no room is selected */
        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/50 p-8 text-center">
          <div className="max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">เลือกห้องสนทนาเพื่อเริ่มพูดคุย</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              ติดต่อสื่อสารกับผู้เสนอโครงการ คณะกรรมการพิจารณา หรือบุคลากรฝ่ายต่างๆ แบบเรียลไทม์ พร้อมแชร์เอกสารและการ์ดโครงการได้ทันที
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                + เริ่มการสนทนาใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onRoomCreated={(rId) => {
          selectRoom(rId);
          setIsMobileViewList(false);
        }}
      />

      {/* Delete Chat Room Modal */}
      <DeleteChatRoomModal
        isOpen={!!roomToDelete}
        room={roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onDeleted={() => {
          setRoomToDelete(null);
          setIsMobileViewList(true);
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-6.5rem)] flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>กำลังโหลดระบบสนทนา...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}


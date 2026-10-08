'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ChatMessageItem from '@/components/chat/ChatMessageItem';
import ChatInput from '@/components/chat/ChatInput';
import {
  MessageSquare,
  Users,
  Shield,
  Loader2,
  FolderKanban,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface ProjectChatTabProps {
  projectId: string;
  project: any;
}

export default function ProjectChatTab({ projectId, project }: ProjectChatTabProps) {
  const { user } = useAuth();
  const {
    openProjectChat,
    activeRoom,
    messages,
    isLoadingMessages,
    typingUsers,
    fetchRooms,
  } = useChat();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch project room
  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      setIsInitializing(true);
      openProjectChat(projectId)
        .then((rId) => {
          if (isMounted && rId) {
            setRoomId(rId);
          }
        })
        .finally(() => {
          if (isMounted) setIsInitializing(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [projectId, openProjectChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Typing users
  const currentRoomTyping = roomId ? typingUsers[roomId] : null;
  const typingNames = currentRoomTyping ? Object.values(currentRoomTyping) : [];

  if (isInitializing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">กำลังเปิดห้องสนทนาและเชื่อมต่อผู้เกี่ยวข้องในโครงการ...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[680px]">
      {/* Top Banner / Stakeholder Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                ห้องปรึกษาและติดตามงาน: {project?.title}
              </h3>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full shrink-0">
                เรียลไทม์
              </span>
            </div>
            <p className="text-xs text-blue-200/80 truncate">
              สมาชิก: ผู้เสนอโครงการ, คณะกรรมการพิจารณา 4 ฝ่าย, เจ้าหน้าที่งานแผนงาน
            </p>
          </div>
        </div>

        {activeRoom?.participants && (
          <div className="hidden md:flex items-center gap-1 shrink-0 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-xl">
            <Users className="w-4 h-4" />
            <span>{activeRoom.participants.length} ผู้เข้าร่วม</span>
          </div>
        )}
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            กำลังโหลดข้อความ...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 px-4 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h4 className="font-semibold text-slate-700 text-sm mb-1">ยังไม่มีข้อความในการปรึกษาโครงการนี้</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              สามารถพิมพ์สอบถามความคืบหน้า ชี้แจงรายละเอียด หรือแนบไฟล์เอกสารเพิ่มเติมได้ที่นี่
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)
        )}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic py-1 px-3 bg-white/80 rounded-full w-fit animate-pulse border border-slate-200/60">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>{typingNames.join(', ')} กำลังพิมพ์...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      {roomId && (
        <ChatInput
          roomId={roomId}
          placeholder="พิมพ์ข้อความปรึกษาเกี่ยวกับโครงการนี้... (กด Enter เพื่อส่ง)"
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ProjectCardPreview from './ProjectCardPreview';
import ChatAvatar from './ChatAvatar';
import ImageLightboxModal from './ImageLightboxModal';
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Smile,
  Plus,
  Reply,
} from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  showSenderName?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '✅'];

export default function ChatMessageItem({ message, showSenderName = true }: ChatMessageItemProps) {
  const { user } = useAuth();
  const { toggleReaction, setReplyingToMessage } = useChat();
  const isMe = user && message.sender_id.toString() === user.id.toString();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string; size?: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Group reactions by emoji
  const reactionGroups = React.useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [];
    const map = new Map<string, { emoji: string; count: number; hasReacted: boolean; userNames: string[] }>();
    for (const r of message.reactions) {
      const existing = map.get(r.emoji) || { emoji: r.emoji, count: 0, hasReacted: false, userNames: [] };
      existing.count += 1;
      const isCurrentUser = user && r.user_id.toString() === user.id.toString();
      if (isCurrentUser) {
        existing.hasReacted = true;
      }
      const displayName = isCurrentUser ? 'คุณ' : (r.user?.full_name || r.user?.username || 'ผู้ใช้');
      existing.userNames.push(displayName);
      map.set(r.emoji, existing);
    }
    return Array.from(map.values());
  }, [message.reactions, user]);

  // Handle reaction click
  const handleEmojiClick = (emoji: string) => {
    toggleReaction(message.id, emoji);
    setShowEmojiPicker(false);
  };

  // Format time (e.g. 14:30)
  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // System message
  if (message.message_type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-slate-200/80 text-slate-600 text-xs px-3 py-1 rounded-full text-center max-w-md shadow-2xs">
          {message.content}
        </div>
      </div>
    );
  }

  const getAttachmentIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-600 shrink-0" />;
      case 'DOCX':
        return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'EXCEL':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
      default:
        return <File className="w-5 h-5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className={`relative flex gap-2.5 my-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
      {/* Sender Avatar */}
      {!isMe && (
        <ChatAvatar
          src={message.sender?.avatar_url}
          name={message.sender?.full_name}
          size="sm"
          className="mb-1"
        />
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
        {/* Sender Name & Role (when not me) */}
        {!isMe && showSenderName && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
              {message.sender?.full_name || 'ผู้ใช้'}
            </span>
            {message.sender?.position && (
              <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[150px]">
                • {message.sender.position}
              </span>
            )}
          </div>
        )}

        {/* Bubble & Hover Actions Wrapper */}
        <div className="relative group/bubble">
          {/* Quick Reaction & Reply Action Bar on Hover */}
          <div
            className={`absolute top-0 -translate-y-1/2 z-10 hidden group-hover/bubble:flex items-center gap-0.5 bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md rounded-full px-1.5 py-0.5 transition-all duration-150 ${
              isMe ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick Emojis */}
            {QUICK_EMOJIS.slice(0, 5).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-slate-100 hover:scale-125 transition active:scale-95"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}

            {/* Emoji More Picker */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition"
                title="อีโมจิเพิ่มเติม"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Extended Emoji Picker Popup */}
              {showEmojiPicker && (
                <div
                  className={`absolute bottom-full mb-1 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 flex flex-wrap gap-1.5 w-56 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}
                >
                  <p className="w-full text-[10px] font-medium text-slate-400 px-1 mb-0.5">เลือกการแสดงความรู้สึก</p>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-slate-100 hover:scale-120 transition active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Button */}
            <button
              type="button"
              onClick={() => setReplyingToMessage(message)}
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
              title="ตอบกลับข้อความนี้"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-2xs break-words relative transition-all ${
              isMe
                ? 'bg-blue-600 text-white rounded-br-xs'
                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
            }`}
          >
            {/* Replying To Quote Block */}
            {message.reply_to && (
              <div
                className={`mb-2 px-2.5 py-1.5 rounded-lg text-xs border-l-2 transition ${
                  isMe
                    ? 'bg-blue-700/80 border-l-amber-300 text-blue-100'
                    : 'bg-slate-100 border-l-blue-600 text-slate-700'
                }`}
              >
                <span className={`font-semibold block truncate text-[11px] ${isMe ? 'text-amber-200' : 'text-blue-700'}`}>
                  {message.reply_to.sender?.full_name || 'ผู้ใช้'}
                </span>
                <p className="truncate text-[11px] opacity-90 mt-0.5">
                  {message.reply_to.content || (message.reply_to.message_type === 'PROJECT_CARD' ? '[การ์ดโครงการ]' : '[ไฟล์แนบ]')}
                </p>
              </div>
            )}

            {/* Project Card Message */}
            {message.message_type === 'PROJECT_CARD' && message.metadata && (
              <div className="my-1">
                <ProjectCardPreview data={message.metadata} />
              </div>
            )}

            {/* Text Content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {message.attachments.map((att) => {
                  if (att.file_type === 'IMAGE') {
                    return (
                      <div
                        key={att.id}
                        className="rounded-xl overflow-hidden border border-black/10 max-w-sm group/img relative cursor-pointer shadow-2xs"
                        onClick={() =>
                          setLightboxImage({
                            url: att.file_url,
                            name: att.file_name,
                            size: att.file_size,
                          })
                        }
                      >
                        <div className="block overflow-hidden relative">
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="w-full h-auto max-h-64 object-cover group-hover/img:scale-102 transition duration-200"
                            loading="lazy"
                          />
                          {/* Hover Overlay Hint */}
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 flex items-center justify-center transition-all duration-200">
                            <span className="opacity-0 group-hover/img:opacity-100 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-xs transition transform translate-y-1 group-hover/img:translate-y-0 shadow-md">
                              🔍 คลิกเพื่อดูภาพขยาย
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={att.id}
                      href={att.file_url}
                      download={att.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition ${
                        isMe
                          ? 'bg-blue-700/60 border-blue-500 hover:bg-blue-700 text-white'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getAttachmentIcon(att.file_type)}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate max-w-[200px] sm:max-w-[260px]">
                            {att.file_name}
                          </p>
                          <p className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {formatBytes(att.file_size)}
                          </p>
                        </div>
                      </div>
                      <Download className={`w-4 h-4 shrink-0 ${isMe ? 'text-blue-200' : 'text-slate-500'}`} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Grouped Reactions Display */}
        {reactionGroups.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactionGroups.map((group) => (
              <button
                key={group.emoji}
                type="button"
                onClick={() => toggleReaction(message.id, group.emoji)}
                title={`${group.userNames.join(', ')}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border shadow-2xs ${
                  group.hasReacted
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium hover:bg-blue-100'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{group.emoji}</span>
                <span className="text-[11px]">{group.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className={`text-[10px] text-slate-400 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {formatMessageTime(message.created_at)}
        </span>
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url || null}
        fileName={lightboxImage?.name}
        fileSize={lightboxImage?.size}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}

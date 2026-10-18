'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  Copy,
  Check,
  MoreHorizontal,
  User,
  X,
} from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  showSenderName?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '✅'];

export default function ChatMessageItem({ message, showSenderName = true }: ChatMessageItemProps) {
  const { user } = useAuth();
  const { toggleReaction, setReplyingToMessage, activeRoom, onlineUserIds } = useChat();
  const isMe = user && message.sender_id.toString() === user.id.toString();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchMovedRef = useRef(false);

  // Long-press detection for touch devices
  const handleTouchStart = () => {
    touchMovedRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(40);
          } catch (e) {}
        }
        setShowMobileActionMenu(true);
      }
    }, 450);
  };

  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleCopyText = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      setShowMobileActionMenu(false);
    } catch (e) {
      console.warn('Failed to copy text:', e);
    }
  };

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

  // Render message text with highlighted mentions (@User, @ทุกคน, @all)
  const renderFormattedContent = (contentStr: string) => {
    if (!contentStr) return null;

    // Collect participant names to accurately match multi-word names
    const participantNames: string[] = [];
    if (activeRoom && activeRoom.participants) {
      activeRoom.participants.forEach((p) => {
        if (p.user?.full_name) participantNames.push(p.user.full_name);
        if (p.user?.username) participantNames.push(p.user.username);
      });
    }
    participantNames.push('ทุกคน', 'all', 'All');

    // Sort longest names first to prevent partial truncation
    const uniqueNames = Array.from(new Set(participantNames)).sort((a, b) => b.length - a.length);
    const escapedNames = uniqueNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const mentionPattern = escapedNames
      ? new RegExp(`(@(?:${escapedNames}|[\\u0E00-\\u0E7F\\w._-]+))`, 'gi')
      : /(@(?:ทุกคน|all|[\u0E00-\u0E7F\w._-]+))/gi;

    const parts = contentStr.split(mentionPattern);
    const myFullName = user?.full_name?.toLowerCase();
    const myUsername = user?.username?.toLowerCase();

    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, idx) => {
          if (part.startsWith('@') && part.length > 1) {
            const mentionText = part.slice(1).trim().toLowerCase();
            const isMentioningMe =
              (myFullName && mentionText === myFullName) ||
              (myUsername && mentionText === myUsername) ||
              mentionText === 'ทุกคน' ||
              mentionText === 'all';

            if (isMentioningMe) {
              return (
                <span
                  key={idx}
                  className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs shadow-2xs transition-all ${
                    isMe
                      ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500/50'
                      : 'bg-amber-100 text-amber-950 border border-amber-300 ring-1 ring-amber-200'
                  }`}
                >
                  {part}
                </span>
              );
            }

            return (
              <span
                key={idx}
                className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-medium transition ${
                  isMe
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-theme-primary-light text-theme-primary border border-theme-primary-light'
                }`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div className={`relative flex gap-2.5 my-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
      {/* Sender Avatar */}
      {!isMe && (
        <Link
          href={`/profile/${message.sender_id}`}
          className="mb-1 hover:opacity-80 transition-opacity shrink-0"
          title={`ดูโปรไฟล์ ${message.sender?.full_name || ''}`}
        >
          <ChatAvatar
            src={message.sender?.avatar_url}
            name={message.sender?.full_name}
            size="sm"
            isOnline={onlineUserIds.has(message.sender_id.toString()) || Boolean(message.sender?.is_online)}
          />
        </Link>
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[75%]`}>
        {/* Sender Name & Role (when not me) */}
        {!isMe && showSenderName && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <Link
              href={`/profile/${message.sender_id}`}
              className="text-xs font-semibold text-slate-700 hover:text-theme-primary transition-colors hover:underline truncate max-w-[200px]"
              title="ดูโปรไฟล์"
            >
              {message.sender?.full_name || 'ผู้ใช้'}
            </Link>
            {message.sender?.position && (
              <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[150px]">
                • {message.sender.position}
              </span>
            )}
          </div>
        )}

        {/* Bubble & Hover Actions Wrapper */}
        <div
          className="relative group/bubble select-text"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Mobile Tap Trigger: subtle 3-dots icon on mobile */}
          <button
            type="button"
            onClick={() => setShowMobileActionMenu(true)}
            className={`sm:hidden absolute top-1 ${
              isMe ? '-left-6 text-slate-400' : '-right-6 text-slate-400'
            } p-1 rounded-full opacity-60 hover:opacity-100 transition`}
            title="ตัวเลือกข้อความ"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
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
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-theme-primary rounded-full hover:bg-theme-primary-light transition"
              title="ตอบกลับข้อความนี้"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bubble Container */}
          {message.message_type === 'PROJECT_CARD' && message.metadata ? (
            /* Project Card Message - Render clean card without blue padding box */
            <div className="flex flex-col gap-1 max-w-md w-full">
              {message.reply_to && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs border-l-2 transition ${
                    isMe
                      ? 'bg-theme-primary text-white border-l-amber-300'
                      : 'bg-slate-100 text-slate-700 border-l-theme-primary'
                  }`}
                >
                  <span className="font-semibold block truncate text-[11px]">
                    {message.reply_to.sender?.full_name || 'ผู้ใช้'}
                  </span>
                  <p className="truncate text-[11px] opacity-90 mt-0.5">
                    {message.reply_to.content || '[การ์ดโครงการ]'}
                  </p>
                </div>
              )}
              {/* Optional Custom Note if not default prefix */}
              {message.content &&
                !message.content.startsWith('แชร์โครงการ:') &&
                !message.content.startsWith('เปิดห้องปรึกษาโครงการ') && (
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-2xs break-words relative text-sm ${
                      isMe
                        ? 'bg-theme-primary text-white rounded-br-xs self-end'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs self-start'
                    }`}
                  >
                    {renderFormattedContent(message.content)}
                  </div>
                )}
              <div className="overflow-hidden rounded-2xl shadow-xs">
                <ProjectCardPreview data={message.metadata} />
              </div>
            </div>
          ) : message.attachments &&
            message.attachments.length > 0 &&
            message.attachments.every((a) => a.file_type === 'IMAGE') &&
            (!message.content || !message.content.trim()) ? (
            /* Pure Images - Render without blue bubble wrapper */
            <div className="flex flex-col gap-1">
              {message.reply_to && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs border-l-2 mb-1 transition ${
                    isMe
                      ? 'bg-theme-primary text-white border-l-amber-300'
                      : 'bg-slate-100 text-slate-700 border-l-theme-primary'
                  }`}
                >
                  <span className="font-semibold block truncate text-[11px]">
                    {message.reply_to.sender?.full_name || 'ผู้ใช้'}
                  </span>
                  <p className="truncate text-[11px] opacity-90 mt-0.5">
                    {message.reply_to.content || '[รูปภาพ]'}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="rounded-2xl overflow-hidden border border-slate-200/90 max-w-sm group/img relative cursor-pointer shadow-sm hover:shadow-md transition bg-slate-100"
                    onClick={() =>
                      setLightboxImage({
                        url: att.file_url,
                        name: att.file_name,
                        size: att.file_size,
                      })
                    }
                  >
                    <img
                      src={att.file_url}
                      alt={att.file_name}
                      className="w-full h-auto max-h-80 object-cover group-hover/img:scale-102 transition duration-200 block"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-all duration-200">
                      <span className="opacity-0 group-hover/img:opacity-100 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-xs transition transform translate-y-1 group-hover/img:translate-y-0 shadow-md">
                        🔍 คลิกเพื่อดูภาพขยาย
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Text & Mixed File Bubble */
            <div
              className={`rounded-2xl px-4 py-2.5 shadow-2xs break-words relative transition-all ${
                isMe
                  ? 'bg-theme-primary text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
              }`}
            >
              {/* Replying To Quote Block */}
              {message.reply_to && (
                <div
                  className={`mb-2 px-2.5 py-1.5 rounded-lg text-xs border-l-2 transition ${
                    isMe
                      ? 'bg-white/15 border-l-amber-300 text-white/90'
                      : 'bg-slate-100 border-l-theme-primary text-slate-700'
                  }`}
                >
                  <span
                    className={`font-semibold block truncate text-[11px] ${
                      isMe ? 'text-amber-200' : 'text-theme-primary'
                    }`}
                  >
                    {message.reply_to.sender?.full_name || 'ผู้ใช้'}
                  </span>
                  <p className="truncate text-[11px] opacity-90 mt-0.5">
                    {message.reply_to.content ||
                      (message.reply_to.message_type === 'PROJECT_CARD'
                        ? '[การ์ดโครงการ]'
                        : '[ไฟล์แนบ]')}
                  </p>
                </div>
              )}

              {/* Text Content */}
              {message.content && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {renderFormattedContent(message.content)}
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
                            ? 'bg-white/15 border-white/25 hover:bg-white/20 text-white'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getAttachmentIcon(att.file_type)}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate max-w-[200px] sm:max-w-[260px]">
                              {att.file_name}
                            </p>
                            <p className={`text-[10px] ${isMe ? 'text-white/80' : 'text-slate-400'}`}>
                              {formatBytes(att.file_size)}
                            </p>
                          </div>
                        </div>
                        <Download
                          className={`w-4 h-4 shrink-0 ${isMe ? 'text-white/80' : 'text-slate-500'}`}
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                    ? 'bg-theme-primary-light border-theme-primary/30 text-theme-primary font-medium hover:bg-theme-primary-light/80'
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

      {/* Mobile Long-press Action Sheet (Bottom Sheet for Mobile Touch Screens) */}
      {showMobileActionMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setShowMobileActionMenu(false)}
          />

          {/* Action Sheet Panel */}
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-4 pb-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

            {/* Message Snippet Preview */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-3">
              <ChatAvatar
                src={message.sender?.avatar_url}
                name={message.sender?.full_name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{message.sender?.full_name || 'ผู้ใช้'}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {message.content || (message.attachments?.length ? '📎 ไฟล์แนบ' : 'ข้อความ')}
                </p>
              </div>
            </div>

            {/* Quick Emoji Reaction Bar */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-2">แสดงความรู้สึก (Reactions)</p>
              <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleEmojiClick(emoji);
                      setShowMobileActionMenu(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center text-2xl rounded-2xl bg-slate-100/70 hover:bg-theme-primary-light hover:scale-125 transition active:scale-95 shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReplyingToMessage(message);
                  setShowMobileActionMenu(false);
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover active:scale-98 transition shadow-sm"
              >
                <Reply className="w-4 h-4" />
                <span>ตอบกลับ (Reply)</span>
              </button>

              {message.content ? (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 active:scale-98 transition"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMobileActionMenu(false)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 active:scale-98 transition"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>ปิด</span>
                </button>
              )}
            </div>

            {/* Profile link for other sender */}
            {!isMe && (
              <Link
                href={`/profile/${message.sender_id}`}
                onClick={() => setShowMobileActionMenu(false)}
                className="flex items-center justify-center gap-2 py-2.5 text-xs text-slate-500 hover:text-theme-primary font-medium transition"
              >
                <User className="w-4 h-4" />
                <span>ดูโปรไฟล์ {message.sender?.full_name}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

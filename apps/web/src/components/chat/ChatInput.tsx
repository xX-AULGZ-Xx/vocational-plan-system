'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ShareProjectModal from './ShareProjectModal';
import ChatAvatar from './ChatAvatar';
import {
  Send,
  Paperclip,
  FolderKanban,
  Smile,
  X,
  Loader2,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Reply,
  AtSign,
  Users,
} from 'lucide-react';

interface ChatInputProps {
  roomId?: string;
  placeholder?: string;
}

interface MentionCandidate {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string | null;
  position?: string;
  department?: string;
  is_online?: boolean;
  isAll?: boolean;
}

export default function ChatInput({ roomId, placeholder = 'พิมพ์ข้อความที่นี่... (กด Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่, พิมพ์ @ เพื่อแท็ก)' }: ChatInputProps) {
  const { user } = useAuth();
  const { sendMessage, sendTyping, uploadFile, isSending, replyingToMessage, setReplyingToMessage, rooms, activeRoom } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention State
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  // Current Target Room
  const targetRoom = useMemo(() => {
    return (roomId ? rooms.find((r) => r.id === roomId) : null) || activeRoom;
  }, [roomId, rooms, activeRoom]);

  // Candidates list for mention
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const list: MentionCandidate[] = [];

    // Add "@ทุกคน" for group and project chats
    if (targetRoom && (targetRoom.type === 'GROUP' || targetRoom.type === 'PROJECT')) {
      list.push({
        id: 'all',
        full_name: 'ทุกคน',
        username: 'all',
        position: 'แท็กทุกคนในห้องนี้',
        isAll: true,
      });
    }

    if (targetRoom && targetRoom.participants) {
      targetRoom.participants.forEach((p) => {
        if (p.user && user && p.user_id?.toString() !== user.id?.toString()) {
          // Avoid duplicates
          if (!list.some((item) => item.id.toString() === p.user.id.toString())) {
            list.push({
              id: p.user.id.toString(),
              full_name: p.user.full_name || p.user.username || 'ผู้ใช้',
              username: p.user.username,
              avatar_url: p.user.avatar_url,
              position: p.user.position || p.user.role,
              department: p.user.department?.name,
              is_online: p.user.is_online,
            });
          }
        }
      });
    }

    return list;
  }, [targetRoom, user]);

  // Filtered candidates by search query
  const filteredCandidates = useMemo(() => {
    if (!mentionQuery) return mentionCandidates;
    const q = mentionQuery.toLowerCase();
    return mentionCandidates.filter((c) => {
      const matchName = c.full_name.toLowerCase().includes(q);
      const matchUsername = c.username?.toLowerCase().includes(q);
      const matchPosition = c.position?.toLowerCase().includes(q);
      return matchName || matchUsername || matchPosition;
    });
  }, [mentionCandidates, mentionQuery]);

  // Close mention menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionMenuRef.current &&
        !mentionMenuRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionMenu(false);
      }
    };
    if (showMentionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMentionMenu]);

  // Reset selected index when filtered candidates change
  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [filteredCandidates.length, mentionQuery]);

  // Auto-focus when replying
  useEffect(() => {
    if (replyingToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingToMessage]);

  // Common quick emojis for fast messaging
  const quickEmojis = ['👍', '👏', '🙏', '❤️', '😊', '🎉', '📋', '✅', '🔥', '💡', '📌', '👌'];

  // Check for @ mention trigger in text
  const checkMentionTrigger = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    // Matches @ followed by search string right at the end before cursor
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      const query = match[1];
      const atIndex = match.index! + (match[0].startsWith(' ') ? 1 : 0);
      setMentionQuery(query);
      setMentionStartIndex(atIndex);
      setShowMentionMenu(true);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  // Handle typing indicator & mention check
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newText);
    sendTyping(true, roomId);
    checkMentionTrigger(newText, cursorPos);

    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Insert mention token into text
  const insertMention = (candidate: MentionCandidate) => {
    if (!textareaRef.current) return;
    const nameToInsert = candidate.isAll ? 'ทุกคน' : (candidate.full_name || candidate.username || 'ผู้ใช้');
    const mentionToken = `@${nameToInsert} `;

    const cursorPos = textareaRef.current.selectionStart;
    const startIdx = mentionStartIndex >= 0 ? mentionStartIndex : cursorPos;
    const before = content.slice(0, startIdx);
    const after = content.slice(cursorPos);
    const newContent = `${before}${mentionToken}${after}`;

    setContent(newContent);
    setShowMentionMenu(false);

    const newCursorPos = before.length + mentionToken.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  // Quick mention button trigger
  const handleMentionButtonClick = () => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || content.length;
    const before = content.slice(0, cursorPos);
    const after = content.slice(cursorPos);
    const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const inserted = `${needsSpace ? ' ' : ''}@`;
    const newContent = `${before}${inserted}${after}`;

    setContent(newContent);
    const newPos = before.length + inserted.length;
    setMentionQuery('');
    setMentionStartIndex(newPos - 1);
    setShowMentionMenu(true);
    setMentionSelectedIndex(0);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await uploadFile(file);
        if (uploaded) {
          setAttachments((prev) => [...prev, uploaded]);
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0 && !selectedProject) return;

    try {
      if (selectedProject) {
        // Send project card
        await sendMessage(trimmed || `แชร์โครงการ: ${selectedProject.title}`, {
          roomId,
          message_type: 'PROJECT_CARD',
          metadata: {
            project_id: selectedProject.id,
            project_code: selectedProject.project_code,
            title: selectedProject.title,
            status: selectedProject.status,
            total_budget: selectedProject.total_budget,
            fiscal_year: selectedProject.fiscal_year,
            department_name: selectedProject.department?.name,
          },
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setSelectedProject(null);
      } else {
        // Send standard message or attachments
        await sendMessage(trimmed, {
          roomId,
          message_type: attachments.length > 0 && !trimmed ? 'FILE' : 'TEXT',
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }

      setContent('');
      setAttachments([]);
      sendTyping(false, roomId);
      setShowMentionMenu(false);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // When mention menu is visible, intercept navigation keys
    if (showMentionMenu && filteredCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + filteredCandidates.length) % filteredCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredCandidates[mentionSelectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const getAttachmentIcon = (fileType: string) => {
    switch (fileType) {
      case 'IMAGE':
        return <ImageIcon className="w-3.5 h-3.5 text-sky-500" />;
      case 'PDF':
        return <FileText className="w-3.5 h-3.5 text-red-500" />;
      case 'DOCX':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'EXCEL':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <File className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="relative bg-white border-t border-slate-200/80 p-3 sm:p-3.5 transition-all">
      {/* Mention Autocomplete Dropdown Popup */}
      {showMentionMenu && filteredCandidates.length > 0 && (
        <div
          ref={mentionMenuRef}
          className="absolute bottom-full left-4 sm:left-6 mb-2 w-72 sm:w-80 max-h-64 overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100"
        >
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-blue-600" />
              แท็กสมาชิกในห้อง
            </span>
            <span className="text-[10px] font-normal text-slate-400">↑↓ เลือก, Enter ยืนยัน</span>
          </div>
          <div className="py-1 space-y-0.5">
            {filteredCandidates.map((candidate, idx) => {
              const isSelected = idx === mentionSelectedIndex;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(candidate);
                  }}
                  onMouseEnter={() => setMentionSelectedIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition ${
                    isSelected ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {candidate.isAll ? (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="relative shrink-0">
                      <ChatAvatar src={candidate.avatar_url} name={candidate.full_name} size="sm" />
                      {candidate.is_online && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{candidate.full_name}</span>
                      {candidate.isAll && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          ทุกคน
                        </span>
                      )}
                    </div>
                    {(candidate.position || candidate.department || candidate.username) && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {candidate.position || candidate.department || `@${candidate.username}`}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Replying To Message Banner */}
      {replyingToMessage && (
        <div className="mb-2 p-2.5 rounded-xl bg-blue-50/70 border-l-4 border-l-blue-600 border border-blue-200/80 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-blue-900 block truncate">
                กำลังตอบกลับ {replyingToMessage.sender?.full_name || 'ผู้ใช้'}
              </span>
              <p className="text-slate-600 truncate text-[11px] mt-0.5">
                {replyingToMessage.content || (replyingToMessage.attachments?.length ? `[ไฟล์แนบ ${replyingToMessage.attachments[0].file_name}]` : '[ข้อความ]')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-blue-100/80 transition"
            title="ยกเลิกการตอบกลับ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attached Project Card Preview before sending */}
      {selectedProject && (
        <div className="mb-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderKanban className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-blue-900 block truncate">
                แนบโครงการ: {selectedProject.title}
              </span>
              <span className="text-blue-600 text-[11px]">
                {selectedProject.project_code || 'โครงการ'} • งบฯ {Number(selectedProject.total_budget || 0).toLocaleString()} บาท
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedProject(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-blue-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Uploaded File Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 max-w-xs"
            >
              {getAttachmentIcon(att.file_type)}
              <span className="truncate max-w-[150px] font-medium">{att.file_name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-slate-400 hover:text-rose-500 ml-1 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="mb-2 p-2 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-wrap gap-1.5 max-w-xs animate-in fade-in zoom-in-95 duration-100">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        {/* Action Tools Left */}
        <div className="flex items-center gap-0.5 sm:gap-1 pb-1 text-slate-500 shrink-0">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="แนบไฟล์ (เอกสาร, รูปภาพ, PDF)"
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Paperclip className="w-5 h-5" />}
          </button>

          {/* Mention Tag Button */}
          <button
            type="button"
            onClick={handleMentionButtonClick}
            title="แท็กสมาชิก (@)"
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
          >
            <AtSign className="w-5 h-5" />
          </button>

          {/* Share Project Card Button */}
          <button
            type="button"
            onClick={() => setShowProjectModal(true)}
            title="แชร์ข้อมูลโครงการ"
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition hidden sm:flex"
          >
            <FolderKanban className="w-5 h-5" />
          </button>

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="ใส่อีโมจิ"
            className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full text-sm bg-transparent border-0 focus:outline-none resize-none max-h-32 text-slate-800 placeholder-slate-400 leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0 && !selectedProject) || isSending}
          className="p-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-all shrink-0 flex items-center justify-center pb-2.5"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Share Project Modal */}
      <ShareProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSelectProject={(project) => setSelectedProject(project)}
      />
    </div>
  );
}

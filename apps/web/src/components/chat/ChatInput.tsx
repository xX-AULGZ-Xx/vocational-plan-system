'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/lib/chat-context';
import ShareProjectModal from './ShareProjectModal';
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
} from 'lucide-react';

interface ChatInputProps {
  roomId?: string;
  placeholder?: string;
}

export default function ChatInput({ roomId, placeholder = 'พิมพ์ข้อความที่นี่... (กด Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)' }: ChatInputProps) {
  const { sendMessage, sendTyping, uploadFile, isSending, replyingToMessage, setReplyingToMessage } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when replying
  useEffect(() => {
    if (replyingToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingToMessage]);

  // Common quick emojis for fast messaging
  const quickEmojis = ['👍', '👏', '🙏', '❤️', '😊', '🎉', '📋', '✅', '🔥', '💡', '📌', '👌'];

  // Handle typing indicator
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    sendTyping(true, roomId);

    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
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

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="bg-white border-t border-slate-200/80 p-3 sm:p-3.5 transition-all">
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
        <div className="flex items-center gap-1 pb-1 text-slate-500 shrink-0">
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

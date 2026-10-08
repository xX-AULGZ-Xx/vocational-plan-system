'use client';

import React from 'react';
import { ChatMessage } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import ProjectCardPreview from './ProjectCardPreview';
import ChatAvatar from './ChatAvatar';
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  ExternalLink,
  Shield,
  User as UserIcon,
} from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  showSenderName?: boolean;
}

export default function ChatMessageItem({ message, showSenderName = true }: ChatMessageItemProps) {
  const { user } = useAuth();
  const isMe = user && message.sender_id.toString() === user.id.toString();

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
    <div className={`flex gap-2.5 my-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
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

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-2xs break-words relative transition-all ${
            isMe
              ? 'bg-blue-600 text-white rounded-br-xs'
              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
          }`}
        >
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
                    <div key={att.id} className="rounded-lg overflow-hidden border border-black/10 max-w-sm">
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={att.file_url}
                          alt={att.file_name}
                          className="w-full h-auto max-h-60 object-cover hover:opacity-95 transition"
                        />
                      </a>
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

        {/* Timestamp */}
        <span className={`text-[10px] text-slate-400 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

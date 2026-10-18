'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatRoom, useChat } from '@/lib/chat-context';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteChatRoomModalProps {
  isOpen: boolean;
  room: ChatRoom | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function DeleteChatRoomModal({
  isOpen,
  room,
  onClose,
  onDeleted,
}: DeleteChatRoomModalProps) {
  const { deleteRoom } = useChat();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !room || typeof document === 'undefined') return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await deleteRoom(room.id);
      onClose();
      if (onDeleted) onDeleted();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบห้องสนทนา');
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ลบห้องสนทนา</h3>
              <p className="text-xs text-slate-500 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-2 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            คุณแน่ใจหรือไม่ว่าต้องการลบห้องสนทนา{' '}
            <span className="font-bold text-slate-900">&ldquo;{room.displayName}&rdquo;</span>?
          </p>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              ข้อความ รูปภาพ และไฟล์แนบทั้งหมดในห้องนี้จะถูกลบออกจากระบบอย่างถาวรสำหรับสมาชิกทุกคน
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังลบ...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบห้องสนทนา</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

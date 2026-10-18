'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Maximize2,
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  fileName?: string;
  fileSize?: number;
  onClose: () => void;
}

export default function ImageLightboxModal({
  isOpen,
  imageUrl,
  fileName = 'รูปภาพ',
  fileSize,
  onClose,
}: ImageLightboxModalProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset zoom & rotation when modal opens/changes image
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, imageUrl]);

  // Keyboard controls: ESC to close, + / - to zoom
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        setScale(1);
        setRotation(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setRotation(0);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!mounted || !isOpen || !imageUrl) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent px-4 sm:px-6 flex items-center justify-between text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-medium truncate drop-shadow-sm">
              {fileName}
            </h3>
            {fileSize ? (
              <p className="text-xs text-white/60">{formatBytes(fileSize)}</p>
            ) : null}
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Open in new tab */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            title="เปิดในแท็บใหม่"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          {/* Download button */}
          <a
            href={imageUrl}
            download={fileName}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            title="ดาวน์โหลดรูปภาพ"
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition ml-1"
            title="ปิด (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image View Area */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden"
        onClick={onClose}
      >
        <img
          src={imageUrl}
          alt={fileName}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl cursor-default transition-all"
        />
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        className="absolute bottom-6 inset-x-0 flex justify-center z-10 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-2xl text-white">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-full hover:bg-white/15 transition disabled:opacity-30 disabled:hover:bg-transparent"
            title="ซูมออก (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono px-2 min-w-[50px] text-center text-white/80">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="p-2 rounded-full hover:bg-white/15 transition disabled:opacity-30 disabled:hover:bg-transparent"
            title="ซูมเข้า (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            type="button"
            onClick={handleRotate}
            className="p-2 rounded-full hover:bg-white/15 transition"
            title="หมุนรูปภาพ"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-full hover:bg-white/15 transition"
            title="รีเซ็ตขนาด (0)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

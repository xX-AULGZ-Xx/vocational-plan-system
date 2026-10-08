'use client';

import React, { useState } from 'react';
import { FolderKanban, Users, User as UserIcon } from 'lucide-react';

interface ChatAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  type?: 'DIRECT' | 'GROUP' | 'PROJECT' | string;
  isOnline?: boolean;
  className?: string;
}

const colorPalette = [
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-indigo-600 text-white',
  'bg-purple-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-600 text-white',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
];

function getInitialsColor(name?: string | null) {
  if (!name) return 'bg-slate-700 text-white';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  // If Thai or English, take first 1 or 2 characters
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

export default function ChatAvatar({
  src,
  name,
  size = 'md',
  type = 'DIRECT',
  isOnline = false,
  className = '',
}: ChatAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-12 h-12 text-lg',
  }[size];

  const onlineBadgeClasses = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-3.5 h-3.5 ring-2',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size];

  // Project Room
  if (type === 'PROJECT') {
    return (
      <div className={`relative shrink-0 ${className}`}>
        <div className={`${sizeClasses} rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs font-bold`}>
          <FolderKanban className={iconSizes} />
        </div>
      </div>
    );
  }

  // Group Room
  if (type === 'GROUP') {
    return (
      <div className={`relative shrink-0 ${className}`}>
        <div className={`${sizeClasses} rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs font-bold`}>
          <Users className={iconSizes} />
        </div>
      </div>
    );
  }

  // Direct 1:1 or User Profile
  const initials = getInitials(name);
  const bgColor = getInitialsColor(name);
  const showImage = Boolean(src && !imgError);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full overflow-hidden flex items-center justify-center font-bold select-none shadow-2xs ${
          showImage ? 'bg-slate-200' : bgColor
        }`}
      >
        {showImage ? (
          <img
            src={src!}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials || <UserIcon className={iconSizes} />}</span>
        )}
      </div>

      {/* Online indicator */}
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 bg-emerald-500 rounded-full ring-white ${onlineBadgeClasses}`}
        />
      )}
    </div>
  );
}

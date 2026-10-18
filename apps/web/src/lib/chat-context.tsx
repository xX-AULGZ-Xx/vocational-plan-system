'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

export interface ChatAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'IMAGE' | 'PDF' | 'DOCX' | 'EXCEL' | 'OTHER' | string;
  file_size: number;
}

export interface ChatSender {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string | null;
  role?: string;
  position?: string;
  is_online?: boolean;
}

export interface ChatMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at?: string;
  user?: {
    id: string;
    full_name: string;
    username?: string;
  };
}

export interface ChatMessageReply {
  id: string;
  content: string | null;
  message_type: string;
  sender: {
    id: string;
    full_name: string;
    username?: string;
  };
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  reply_to_id?: string | null;
  content: string | null;
  message_type: 'TEXT' | 'FILE' | 'IMAGE' | 'PROJECT_CARD' | 'SYSTEM' | string;
  metadata?: any;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  sender: ChatSender;
  reply_to?: ChatMessageReply | null;
  attachments?: ChatAttachment[];
  reactions?: ChatMessageReaction[];
}

export interface ChatParticipant {
  id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  user: {
    id: string;
    full_name: string;
    username?: string;
    avatar_url?: string | null;
    role?: string;
    position?: string;
    is_online?: boolean;
    department?: { id: number; name: string };
  };
}

export interface ChatRoom {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'PROJECT';
  name: string | null;
  displayName: string;
  displayAvatar: string | null;
  subtitle?: string;
  description: string | null;
  project_id: string | null;
  project?: any;
  unread_count: number;
  last_read_at?: string | null;
  last_message?: ChatMessage | null;
  participants: ChatParticipant[];
  updated_at: string;
  created_at: string;
}

interface ChatContextType {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  messages: ChatMessage[];
  totalUnreadCount: number;
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  isWidgetOpen: boolean;
  widgetActiveRoomId: string | null;
  typingUsers: { [roomId: string]: { [userId: string]: string } };
  onlineUserIds: Set<string>;
  replyingToMessage: ChatMessage | null;
  setReplyingToMessage: (message: ChatMessage | null) => void;
  fetchRooms: () => Promise<void>;
  selectRoom: (roomId: string | null) => Promise<void>;
  openDirectChat: (targetUserId: string) => Promise<string | null>;
  openProjectChat: (projectId: string) => Promise<string | null>;
  createGroupChat: (name: string, description?: string, participantIds?: string[]) => Promise<string | null>;
  sendMessage: (
    content: string,
    options?: {
      roomId?: string;
      message_type?: string;
      metadata?: any;
      reply_to_id?: string;
      attachments?: Array<{
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
      }>;
    }
  ) => Promise<ChatMessage | null>;
  sendTyping: (isTyping: boolean, roomId?: string) => void;
  markAsRead: (roomId: string) => Promise<void>;
  uploadFile: (file: File) => Promise<any>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<boolean>;
  toggleWidget: (open?: boolean) => void;
  setWidgetActiveRoom: (roomId: string | null) => void;
}

const ChatContext = createContext<ChatContextType>({
  rooms: [],
  activeRoomId: null,
  activeRoom: null,
  messages: [],
  totalUnreadCount: 0,
  isLoadingRooms: false,
  isLoadingMessages: false,
  isSending: false,
  isWidgetOpen: false,
  widgetActiveRoomId: null,
  typingUsers: {},
  onlineUserIds: new Set(),
  replyingToMessage: null,
  setReplyingToMessage: () => {},
  fetchRooms: async () => {},
  selectRoom: async () => {},
  openDirectChat: async () => null,
  openProjectChat: async () => null,
  createGroupChat: async () => null,
  sendMessage: async () => null,
  sendTyping: () => {},
  markAsRead: async () => {},
  uploadFile: async () => null,
  toggleReaction: async () => {},
  deleteRoom: async () => false,
  toggleWidget: () => {},
  setWidgetActiveRoom: () => {},
});

export const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:5050';
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // If running in development frontend (e.g. port 3000-3009), connect directly to backend port 5050
  if (window.location.port && /^300\d$/.test(window.location.port)) {
    return `${window.location.protocol}//${window.location.hostname}:5050`;
  }
  return window.location.origin;
};

// Sound notification synthesizer using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio permission/context errors silently
  }
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false);
  const [widgetActiveRoomId, setWidgetActiveRoomId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: { [userId: string]: string } }>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const openProjectChatRequestsRef = useRef<Map<string, Promise<string | null>>>(new Map());
  activeRoomRef.current = activeRoomId || widgetActiveRoomId;

  // Calculate active room
  const activeRoom = rooms.find((r) => r.id === (activeRoomId || widgetActiveRoomId)) || null;

  // Auth header helper
  const getAuthHeaders = useCallback(() => {
    const currentToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : null);
    const headers: Record<string, string> = {};
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    return headers;
  }, [token]);

  // Mark room as read
  const markAsRead = useCallback(
    async (roomId: string) => {
      if (!roomId) return;
      const targetId = roomId.toString();

      // 1. Optimistic local update: reset this room's unread count to 0 and recalculate totalUnreadCount
      setRooms((prev) => {
        const next = prev.map((r) => (r.id.toString() === targetId ? { ...r, unread_count: 0 } : r));
        const sumUnread = next.reduce((acc: number, r: ChatRoom) => acc + (r.unread_count || 0), 0);
        setTotalUnreadCount(sumUnread);
        return next;
      });

      // 2. Notify backend to update last_read_at in database
      try {
        await fetch(`/api/v1/chat/rooms/${targetId}/read`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      } catch (err) {
        console.error('Error marking room as read:', err);
      }
    },
    [getAuthHeaders]
  );

  // Fetch all chat rooms
  const fetchRooms = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingRooms(true);
      const res = await fetch('/api/v1/chat/rooms', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const currentActive = activeRoomRef.current;
        const normalized = data.data.map((r: ChatRoom) => {
          if (currentActive && r.id.toString() === currentActive.toString()) {
            return { ...r, unread_count: 0 };
          }
          return r;
        });
        setRooms(normalized);
        const sumUnread = normalized.reduce((acc: number, r: ChatRoom) => acc + (r.unread_count || 0), 0);
        setTotalUnreadCount(sumUnread);
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [user, getAuthHeaders]);

  // Fetch messages for a specific room
  const fetchMessages = useCallback(
    async (roomId: string) => {
      try {
        setIsLoadingMessages(true);
        const res = await fetch(`/api/v1/chat/rooms/${roomId}/messages?limit=100`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMessages(data.data);
          // Mark room unread count locally as 0 and recalculate total unread count
          setRooms((prev) => {
            const next = prev.map((r) => (r.id.toString() === roomId.toString() ? { ...r, unread_count: 0 } : r));
            const sumUnread = next.reduce((acc: number, r: ChatRoom) => acc + (r.unread_count || 0), 0);
            setTotalUnreadCount(sumUnread);
            return next;
          });
        }
      } catch (err) {
        console.error('Error fetching messages for room:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [getAuthHeaders]
  );

  // Select active room
  const selectRoom = useCallback(
    async (roomId: string | null) => {
      // Leave old room socket if any
      const previousRoomId = activeRoomRef.current;
      if (previousRoomId && previousRoomId !== roomId && socketRef.current) {
        socketRef.current.emit('leave_chat_room', { roomId: previousRoomId });
      }

      setActiveRoomId(roomId);
      setReplyingToMessage(null);

      if (roomId) {
        if (socketRef.current) {
          socketRef.current.emit('join_chat_room', { roomId });
        }
        await fetchMessages(roomId);
        await markAsRead(roomId);
      } else {
        setMessages([]);
      }
    },
    [fetchMessages, markAsRead]
  );

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const currentToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : null);
    if (!currentToken) return;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token: currentToken },
      query: { token: currentToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ [ChatSocket] Connected to backend gateway, socketId:', socket.id);
      // Re-join active room if any
      if (activeRoomRef.current) {
        socket.emit('join_chat_room', { roomId: activeRoomRef.current });
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [ChatSocket] Connection error:', err.message);
    });

    // Real-time message receiver
    socket.on('chat_message', (msg: ChatMessage) => {
      const currentActive = activeRoomRef.current;
      const isForActiveRoom = currentActive === msg.room_id.toString();

      if (isForActiveRoom) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Immediately mark as read on backend if user is viewing this room
        markAsRead(msg.room_id.toString());
      }

      // Update room list latest message and unread count
      setRooms((prev) => {
        const next = prev.map((r) => {
          if (r.id.toString() === msg.room_id.toString()) {
            const isSenderMe = user && msg.sender_id.toString() === user.id.toString();
            const shouldIncrementUnread = !isForActiveRoom && !isSenderMe;
            return {
              ...r,
              last_message: msg,
              unread_count: isForActiveRoom ? 0 : shouldIncrementUnread ? (r.unread_count || 0) + 1 : (r.unread_count || 0),
              updated_at: msg.created_at || new Date().toISOString(),
            };
          }
          return r;
        });
        const sumUnread = next.reduce((acc: number, r: ChatRoom) => acc + (r.unread_count || 0), 0);
        setTotalUnreadCount(sumUnread);
        return next;
      });

      // Play sound if not sender
      if (user && msg.sender_id.toString() !== user.id.toString()) {
        playNotificationSound();
      }
    });

    // Real-time notification for messages across all joined rooms
    socket.on('chat_notification', (data: { room_id: string; message: ChatMessage }) => {
      const currentActive = activeRoomRef.current;
      if (currentActive !== data.room_id) {
        fetchRooms();
      }
    });

    // Typing indicators
    socket.on('user_typing_start', (data: { roomId: string; userId: string; userName: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.roomId]: {
          ...(prev[data.roomId] || {}),
          [data.userId]: data.userName,
        },
      }));
    });

    socket.on('user_typing_stop', (data: { roomId: string; userId: string }) => {
      setTypingUsers((prev) => {
        const roomTyping = { ...(prev[data.roomId] || {}) };
        delete roomTyping[data.userId];
        return {
          ...prev,
          [data.roomId]: roomTyping,
        };
      });
    });

    // Real-time message reactions
    socket.on('chat_message_reaction', (data: { message_id: string; room_id: string; reactions: ChatMessageReaction[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.message_id ? { ...m, reactions: data.reactions } : m
        )
      );
    });

    // Real-time room deletion
    socket.on('chat_room_deleted', (data: { roomId: string; deletedBy?: string }) => {
      const deletedId = data.roomId.toString();
      setRooms((prev) => prev.filter((r) => r.id !== deletedId));
      setActiveRoomId((curr) => {
        if (curr === deletedId) {
          setMessages([]);
          return null;
        }
        return curr;
      });
      setWidgetActiveRoomId((curr) => (curr === deletedId ? null : curr));
    });

    // Initial online users list from server
    socket.on('online_users', (data: { userIds: string[] }) => {
      if (Array.isArray(data?.userIds)) {
        setOnlineUserIds(new Set(data.userIds.map(String)));
      }
    });

    // User online status change
    socket.on('user_status_changed', (data: { userId: string | number; status: 'ONLINE' | 'OFFLINE' }) => {
      if (!data?.userId) return;
      const targetId = String(data.userId);
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.status === 'ONLINE') {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
    });

    // Room marked as read on another device/tab
    socket.on('chat_room_read', (data: { roomId: string }) => {
      if (!data?.roomId) return;
      setRooms((prev) => {
        const next = prev.map((r) => (r.id.toString() === data.roomId.toString() ? { ...r, unread_count: 0 } : r));
        const sumUnread = next.reduce((acc: number, r: ChatRoom) => acc + (r.unread_count || 0), 0);
        setTotalUnreadCount(sumUnread);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token, fetchRooms, markAsRead]);

  // Initial rooms fetch
  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user, fetchRooms]);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        roomId?: string;
        message_type?: string;
        metadata?: any;
        reply_to_id?: string;
        attachments?: Array<{
          file_name: string;
          file_url: string;
          file_type: string;
          file_size: number;
        }>;
      }
    ): Promise<ChatMessage | null> => {
      const targetRoomId = options?.roomId || activeRoomId || widgetActiveRoomId;
      if (!targetRoomId) return null;

      const targetReplyToId = options?.reply_to_id !== undefined ? options.reply_to_id : (replyingToMessage ? replyingToMessage.id : undefined);

      try {
        setIsSending(true);
        // Stop typing immediately when sending
        if (socketRef.current) {
          socketRef.current.emit('typing_stop', { roomId: targetRoomId });
        }

        const res = await fetch(`/api/v1/chat/rooms/${targetRoomId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            content,
            message_type: options?.message_type || 'TEXT',
            metadata: options?.metadata,
            reply_to_id: targetReplyToId,
            attachments: options?.attachments,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          setReplyingToMessage(null);
          return data.data;
        } else {
          throw new Error(data.message || 'ส่งข้อความไม่สำเร็จ');
        }
      } catch (err) {
        console.error('Error sending message:', err);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [activeRoomId, widgetActiveRoomId, getAuthHeaders, replyingToMessage]
  );

  // Send typing event
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendTyping = useCallback(
    (isTyping: boolean, roomId?: string) => {
      const targetRoomId = roomId || activeRoomId || widgetActiveRoomId;
      if (!targetRoomId || !socketRef.current || !user) return;

      if (isTyping) {
        socketRef.current.emit('typing_start', {
          roomId: targetRoomId,
          userName: user.full_name || user.username || 'ผู้ใช้',
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit('typing_stop', { roomId: targetRoomId });
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketRef.current.emit('typing_stop', { roomId: targetRoomId });
      }
    },
    [activeRoomId, widgetActiveRoomId, user]
  );


  // Upload file attachment
  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/chat/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }
    },
    [getAuthHeaders]
  );

  // Open direct chat
  const openDirectChat = useCallback(
    async (targetUserId: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/v1/chat/rooms/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ targetUserId }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          const roomId = data.data.id.toString();
          await fetchRooms();
          await selectRoom(roomId);
          setWidgetActiveRoomId(roomId);
          return roomId;
        }
      } catch (err) {
        console.error('Error opening direct chat:', err);
      }
      return null;
    },
    [getAuthHeaders, fetchRooms, selectRoom]
  );

  // Open project chat
  const openProjectChat = useCallback(
    async (projectId: string): Promise<string | null> => {
      if (!projectId) return null;
      if (openProjectChatRequestsRef.current.has(projectId)) {
        return await openProjectChatRequestsRef.current.get(projectId)!;
      }

      const task = (async (): Promise<string | null> => {
        try {
          const res = await fetch(`/api/v1/chat/rooms/project/${projectId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (data.success && data.data) {
            const roomId = data.data.id.toString();
            await fetchRooms();
            await selectRoom(roomId);
            setWidgetActiveRoomId(roomId);
            return roomId;
          }
        } catch (err) {
          console.error('Error opening project chat:', err);
        } finally {
          openProjectChatRequestsRef.current.delete(projectId);
        }
        return null;
      })();

      openProjectChatRequestsRef.current.set(projectId, task);
      return await task;
    },
    [getAuthHeaders, fetchRooms, selectRoom]
  );

  // Create group chat
  const createGroupChat = useCallback(
    async (name: string, description?: string, participantIds?: string[]): Promise<string | null> => {
      try {
        const res = await fetch('/api/v1/chat/rooms/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ name, description, participantIds }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          const roomId = data.data.id.toString();
          await fetchRooms();
          await selectRoom(roomId);
          setWidgetActiveRoomId(roomId);
          return roomId;
        }
      } catch (err) {
        console.error('Error creating group chat:', err);
      }
      return null;
    },
    [getAuthHeaders, fetchRooms, selectRoom]
  );

  // Toggle reaction on a message
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await fetch(`/api/v1/chat/messages/${messageId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ emoji }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, reactions: data.data.reactions } : m
            )
          );
        }
      } catch (err) {
        console.error('Error toggling reaction:', err);
      }
    },
    [getAuthHeaders]
  );

  // Delete a chat room
  const deleteRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/v1/chat/rooms/${roomId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setRooms((prev) => prev.filter((r) => r.id !== roomId));
          if (activeRoomRef.current === roomId) {
            setActiveRoomId(null);
            setMessages([]);
          }
          setWidgetActiveRoomId((curr) => (curr === roomId ? null : curr));
          return true;
        } else {
          throw new Error(data.message || 'ไม่สามารถลบห้องสนทนาได้');
        }
      } catch (err: any) {
        console.error('Error deleting room:', err);
        throw err;
      }
    },
    [getAuthHeaders]
  );

  // Toggle floating widget
  const toggleWidget = useCallback((open?: boolean) => {
    setIsWidgetOpen((prev) => (open !== undefined ? open : !prev));
  }, []);

  // Set widget active room
  const setWidgetActiveRoom = useCallback((roomId: string | null) => {
    setWidgetActiveRoomId(roomId);
    if (roomId) {
      if (socketRef.current) {
        socketRef.current.emit('join_chat_room', { roomId });
      }
      fetchMessages(roomId);
      markAsRead(roomId);
    }
  }, [fetchMessages, markAsRead]);

  return (
    <ChatContext.Provider
      value={{
        rooms,
        activeRoomId,
        activeRoom,
        messages,
        totalUnreadCount,
        isLoadingRooms,
        isLoadingMessages,
        isSending,
        isWidgetOpen,
        widgetActiveRoomId,
        typingUsers,
        onlineUserIds,
        replyingToMessage,
        setReplyingToMessage,
        fetchRooms,
        selectRoom,
        openDirectChat,
        openProjectChat,
        createGroupChat,
        sendMessage,
        sendTyping,
        markAsRead,
        uploadFile,
        toggleReaction,
        deleteRoom,
        toggleWidget,
        setWidgetActiveRoom,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import NotificationToastContainer from '@/components/notifications/NotificationToastContainer';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface ActiveToastItem {
  id: string;
  notification: NotificationItem;
  createdAt: number;
  durationMs: number;
}

export interface DataUpdateEvent {
  scope: 'PROJECTS' | 'APPROVALS' | 'SYSTEM' | 'EVALUATION';
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'SUBMITTED' | 'APPROVED' | 'REVISED' | 'REJECTED' | string;
  projectId?: string;
  status?: string;
  stepOrder?: number;
  nextStepOrder?: number;
  leaderId?: string;
  departmentId?: number;
  approverId?: string;
  execution_status?: string;
  timestamp: string;
  [key: string]: any;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  activeToasts: ActiveToastItem[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  lastDataUpdate: DataUpdateEvent | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  dismissToast: (id: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
  subscribeDataUpdate: (callback: (event: DataUpdateEvent) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  activeToasts: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,
  permissionStatus: 'default',
  lastDataUpdate: null,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  dismissToast: () => {},
  requestNotificationPermission: async () => false,
  subscribeDataUpdate: () => () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToasts, setActiveToasts] = useState<ActiveToastItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [lastDataUpdate, setLastDataUpdate] = useState<DataUpdateEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataUpdateListenersRef = useRef<Set<(event: DataUpdateEvent) => void>>(new Set());

  // Check initial notification permission on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      } else {
        setPermissionStatus('unsupported');
      }
    }
  }, []);

  // Unlock AudioContext on first user interaction (avoids browser autoplay restrictions)
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass();
          if (tempCtx.state === 'suspended') {
            tempCtx.resume().catch(() => {});
          }
        }
      } catch (e) {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      return permission === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }, []);

  const subscribeDataUpdate = useCallback((callback: (event: DataUpdateEvent) => void) => {
    dataUpdateListenersRef.current.add(callback);
    return () => {
      dataUpdateListenersRef.current.delete(callback);
    };
  }, []);

  // Play pleasant melodic chime sound (Web Audio API)
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // 3-tone pleasant digital chime (C6 -> E6 -> G6)
      const notes = [
        { freq: 523.25, time: 0, dur: 0.12, gain: 0.15 },
        { freq: 659.25, time: 0.08, dur: 0.14, gain: 0.18 },
        { freq: 783.99, time: 0.16, dur: 0.28, gain: 0.22 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(note.gain, now + note.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch (e) {
      // AudioContext may be blocked before interaction
    }
  };

  // Mobile Device Vibration
  const triggerMobileVibration = () => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate([120, 60, 120]);
      }
    } catch (e) {}
  };

  // Native Browser Notification (Desktop OS notification & Android push popup)
  const triggerBrowserNotification = (noti: NotificationItem) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        const title = noti.title || '🔔 มีการแจ้งเตือนใหม่';
        const nativeNoti = new Notification(title, {
          body: noti.message || '',
          icon: '/icon.png',
          badge: '/apple-icon.png',
          tag: `noti-${noti.id}`,
        });

        nativeNoti.onclick = () => {
          window.focus();
          if (noti.link_url) {
            window.location.href = noti.link_url;
          }
        };
      }
    } catch (e) {
      console.warn('[Notification] Browser notification trigger error:', e);
    }
  };

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id && String(t.notification.id) !== id));
  }, []);

  // Track recent notification IDs to deduplicate across dual SSE/WebSocket transports
  const recentNotiIdsRef = useRef<Set<string>>(new Set());

  const handleIncomingNotification = useCallback((newNoti: NotificationItem) => {
    if (!newNoti || !newNoti.id) return;
    const notiIdStr = String(newNoti.id);

    // If we have seen this notification ID in the last 10 seconds, ignore duplicate delivery
    if (recentNotiIdsRef.current.has(notiIdStr)) {
      return;
    }
    recentNotiIdsRef.current.add(notiIdStr);
    setTimeout(() => {
      recentNotiIdsRef.current.delete(notiIdStr);
    }, 10000);

    setNotifications((prev) => {
      const exists = prev.some((item) => String(item.id) === notiIdStr);
      if (exists) return prev;
      return [newNoti, ...prev];
    });
    setUnreadCount((prev) => prev + 1);

    // 1. Play Audio chime
    playNotificationSound();

    // 2. Mobile Device Vibration
    triggerMobileVibration();

    // 3. Desktop / Mobile Native Browser Notification
    triggerBrowserNotification(newNoti);

    // 4. In-App Interactive Toast Banner (Top banner on Mobile, Top-Right on Desktop)
    setActiveToasts((prev) => {
      const exists = prev.some((t) => String(t.notification.id) === notiIdStr);
      if (exists) return prev;
      const newToast: ActiveToastItem = {
        id: `toast-${notiIdStr}-${Date.now()}`,
        notification: newNoti,
        createdAt: Date.now(),
        durationMs: 6500, // 6.5s auto dismiss
      };
      // Keep at most 3 active toasts visible simultaneously to prevent clutter
      return [newToast, ...prev.slice(0, 2)];
    });
  }, []);

  const handleIncomingDataUpdate = useCallback((data: DataUpdateEvent) => {
    setLastDataUpdate(data);

    // Notify all context subscribers
    dataUpdateListenersRef.current.forEach((listener) => {
      try {
        listener(data);
      } catch (listenerErr) {
        console.error('[Realtime] Listener error on data_update:', listenerErr);
      }
    });

    // Also dispatch a DOM CustomEvent so non-context components (e.g. SettingsProvider) can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vps:data_update', { detail: data }));
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/notifications?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        if (data.meta) {
          setUnreadCount(data.meta.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Establish Real-time Connection (Dual-Channel: WebSocket & SSE Active Redundancy)
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setNotifications([]);
      setActiveToasts([]);
      setUnreadCount(0);
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    const extractNotification = (payload: any): NotificationItem | null => {
      if (!payload) return null;
      if (payload.action === 'NEW_NOTIFICATION' && payload.notification) {
        return payload.notification;
      }
      if (payload.notification) {
        return payload.notification;
      }
      if (payload.title || payload.message) {
        return payload as NotificationItem;
      }
      return null;
    };

    // 1. Primary Real-time Transport: Socket.IO (HTTP Polling -> WebSocket Upgrade)
    const socket = io({
      path: '/socket.io',
      auth: { token },
      query: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ [WebSocket] Connected successfully to notification gateway');
      setIsConnected(true);
    });

    socket.on('connect_error', (err: any) => {
      if (err?.message?.includes('Authentication failed')) {
        console.warn('⚠️ [WebSocket] Auth token rejected, falling back to SSE');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [WebSocket] Disconnected:', reason);
    });

    socket.on('notification', (payload: any) => {
      console.log('🔔 [WebSocket] notification received:', payload);
      const noti = extractNotification(payload);
      if (noti) {
        handleIncomingNotification(noti);
      }
    });

    socket.on('unread_count', (payload: any) => {
      if (typeof payload?.count === 'number') {
        setUnreadCount(payload.count);
      }
    });

    socket.on('data_update', (data: DataUpdateEvent) => {
      handleIncomingDataUpdate(data);
    });

    // 2. Secondary Real-time Transport: Server-Sent Events (SSE) active streaming
    try {
      const sseUrl = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        console.log('📡 [SSE] Connected to notification stream');
        setIsConnected(true);
      });

      eventSource.addEventListener('unread_count', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data.count === 'number') {
            setUnreadCount(data.count);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('notification', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('📡 [SSE] notification received:', data);
          const noti = extractNotification(data);
          if (noti) {
            handleIncomingNotification(noti);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('data_update', (e) => {
        try {
          const data = JSON.parse(e.data) as DataUpdateEvent;
          handleIncomingDataUpdate(data);
        } catch (err) {}
      });

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.warn('[SSE] Connection closed.');
        }
      };
    } catch (sseErr) {
      console.warn('[SSE] Initialization error:', sseErr);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [token, user, fetchNotifications, handleIncomingNotification, handleIncomingDataUpdate]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await fetch('/api/v1/notifications/read-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!token) return;
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await fetch(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        activeToasts,
        unreadCount,
        isLoading,
        isConnected,
        permissionStatus,
        lastDataUpdate,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        dismissToast,
        requestNotificationPermission,
        subscribeDataUpdate,
      }}
    >
      {children}
      <NotificationToastContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { showAlert } from './sweetalert';

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
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  lastDataUpdate: DataUpdateEvent | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  subscribeDataUpdate: (callback: (event: DataUpdateEvent) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,
  lastDataUpdate: null,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  subscribeDataUpdate: () => () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<DataUpdateEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataUpdateListenersRef = useRef<Set<(event: DataUpdateEvent) => void>>(new Set());

  const subscribeDataUpdate = useCallback((callback: (event: DataUpdateEvent) => void) => {
    dataUpdateListenersRef.current.add(callback);
    return () => {
      dataUpdateListenersRef.current.delete(callback);
    };
  }, []);

  // Play subtle chime sound when real-time notification arrives
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // AudioContext might be blocked until user interaction
    }
  };

  const handleIncomingNotification = useCallback((newNoti: NotificationItem) => {
    setNotifications((prev) => [newNoti, ...prev.filter((item) => item.id !== newNoti.id)]);
    setUnreadCount((prev) => prev + 1);
    playNotificationSound();
    showAlert.toast?.(newNoti.title, 'info');
  }, []);

  const handleIncomingDataUpdate = useCallback((data: DataUpdateEvent) => {
    setLastDataUpdate(data);
    dataUpdateListenersRef.current.forEach((listener) => {
      try {
        listener(data);
      } catch (listenerErr) {
        console.error('[Realtime] Listener error on data_update:', listenerErr);
      }
    });
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

  // Establish Real-time Connection (WebSocket with SSE Fallback)
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
      setUnreadCount(0);
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    let isSocketConnected = false;

    // 1. Primary Real-time Transport: WebSocket (Socket.IO)
    const socket = io({
      path: '/socket.io',
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ [WebSocket] Connected successfully to notification gateway');
      isSocketConnected = true;
      setIsConnected(true);

      // If SSE fallback was active, we can close it
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [WebSocket] Disconnected:', reason);
      isSocketConnected = false;
      setIsConnected(false);
    });

    socket.on('notification', (payload: any) => {
      if (payload?.action === 'NEW_NOTIFICATION' && payload?.notification) {
        handleIncomingNotification(payload.notification);
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

    // 2. Secondary Fallback Transport: Server-Sent Events (SSE) if WebSocket fails
    const connectSSEFallback = () => {
      if (isSocketConnected || eventSourceRef.current) return;
      try {
        const sseUrl = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('connected', () => {
          console.log('📡 [SSE Fallback] Connected to notification stream');
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
            if (data.action === 'NEW_NOTIFICATION' && data.notification) {
              handleIncomingNotification(data.notification);
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
            console.warn('[SSE Fallback] Connection closed.');
          }
        };
      } catch (sseErr) {
        console.warn('[SSE Fallback] Initialization error:', sseErr);
      }
    };

    socket.on('connect_error', () => {
      if (!isSocketConnected) {
        connectSSEFallback();
      }
    });

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
        unreadCount,
        isLoading,
        isConnected,
        lastDataUpdate,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        subscribeDataUpdate,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

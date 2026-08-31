'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Play subtle notification audio if supported
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

  // Initial fetch and SSE Connection setup
  useEffect(() => {
    if (!token || !user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Setup Server-Sent Events (SSE) Stream
    const sseUrl = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Connected to real-time notification stream');
    });

    eventSource.addEventListener('unread_count', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.count === 'number') {
          setUnreadCount(data.count);
        }
      } catch (err) {
        console.error('SSE unread_count parse error:', err);
      }
    });

    eventSource.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.action === 'NEW_NOTIFICATION' && data.notification) {
          const newNoti: NotificationItem = data.notification;
          setNotifications((prev) => [newNoti, ...prev.filter((item) => item.id !== newNoti.id)]);
          setUnreadCount((prev) => prev + 1);
          playNotificationSound();

          // Display lightweight toast
          showAlert.toast?.(newNoti.title, 'info');
        }
      } catch (err) {
        console.error('SSE notification parse error:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE] EventSource error or reconnection attempt:', err);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [token, user, fetchNotifications]);

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
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

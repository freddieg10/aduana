import { create } from 'zustand';
import type { Notification } from '../types';

const SEED_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'warning', expedienteId: '4', message: 'ALERTA: Falta permiso sanitario', read: false, createdAt: '2026-04-08T08:00:00Z' },
  { id: '2', type: 'info', expedienteId: '1', message: 'Embarque próximo a llegar', read: false, createdAt: '2026-04-09T10:00:00Z' },
  { id: '3', type: 'info', expedienteId: '5', message: 'Checklist actualizado (75%)', read: true, createdAt: '2026-04-09T12:00:00Z' },
];

interface NotificationState {
  notifications: Notification[];
  unreadCount: () => number;
  add: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: SEED_NOTIFICATIONS,

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  add: (data) => {
    const n: Notification = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ notifications: [n, ...s.notifications] }));
  },

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
}));

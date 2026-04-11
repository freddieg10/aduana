import { create } from 'zustand';
import type { User } from '../types';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin García', email: 'admin@aduana.com', password: 'admin123', role: 'admin' },
  { id: '2', name: 'Agente López', email: 'agente@aduana.com', password: 'agente123', role: 'agent' },
  { id: '3', name: 'Cliente Pérez', email: 'cliente@aduana.com', password: 'cliente123', role: 'client' },
];

interface AuthState {
  user: Omit<User, 'password'> | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const stored = sessionStorage.getItem('auth-user');
const initialUser = stored ? JSON.parse(stored) as Omit<User, 'password'> : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  login: (email, password) => {
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) return false;
    const { password: _, ...safeUser } = found;
    sessionStorage.setItem('auth-user', JSON.stringify(safeUser));
    set({ user: safeUser });
    return true;
  },
  logout: () => {
    sessionStorage.removeItem('auth-user');
    set({ user: null });
  },
}));

import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { clearPersistedData } from './persistence';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin García', email: 'admin@aduana.com', password: 'admin123', role: 'admin' },
  { id: '2', name: 'Agente López', email: 'agente@aduana.com', password: 'agente123', role: 'agent' },
  // Client user is tied to the RNC of BRAVO S A and only sees that importer's expedientes.
  { id: '3', name: 'Cliente Pérez', email: 'cliente@aduana.com', password: 'cliente123', role: 'client', clienteKey: 'RNC:101000011' },
];

export type SafeUser = Omit<User, 'password'>;

/** Bumped when the stored user shape changes, so stale sessions are simply dropped. */
const SESSION_KEY = 'auth-user-v2';

/** Demo accounts surfaced as one-click buttons on the login page. */
export const DEMO_ACCOUNTS = MOCK_USERS.map((u) => ({ email: u.email, password: u.password, role: u.role, name: u.name }));

interface AuthState {
  user: SafeUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

/** Where each role lands after login and when it hits a route it may not use. */
export const homeForRole = (role: UserRole): string => (role === 'client' ? '/portal' : '/dashboard');

const stored = sessionStorage.getItem(SESSION_KEY);
const initialUser = stored ? (JSON.parse(stored) as SafeUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  login: (email, password) => {
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) return false;
    const safeUser: SafeUser = { id: found.id, name: found.name, email: found.email, role: found.role, clienteKey: found.clienteKey };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    set({ user: safeUser });
    return true;
  },
  /** Ends the session and wipes the data persisted for it. See `clearPersistedData`. */
  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
    clearPersistedData();
    set({ user: null });
  },
}));

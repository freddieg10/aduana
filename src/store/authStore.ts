import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { clearPersistedData } from './persistence';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin García', email: 'admin@aduana.com', password: 'admin123', role: 'admin' },
  { id: '2', name: 'Digitador López', email: 'digitador@aduana.com', password: 'digitador123', role: 'digitador' },
  // Client user is tied to the RNC of BRAVO S A and only sees that importer's expedientes.
  { id: '3', name: 'Cliente Pérez', email: 'cliente@aduana.com', password: 'cliente123', role: 'cliente', clienteKey: 'RNC:101000011' },
];

export type SafeUser = Omit<User, 'password'>;

/** Bumped when the stored user shape changes, so stale sessions are simply dropped. */
const SESSION_KEY = 'auth-user-v2';

/** Demo accounts surfaced as one-click buttons on the login page. */
export const DEMO_ACCOUNTS = MOCK_USERS.map((u) => ({ email: u.email, password: u.password, role: u.role, name: u.name }));

interface AuthState {
  user: SafeUser | null;
  login: (email: string, password: string) => boolean;
  /** Signs in as the cliente named by an access link. Returns false for a malformed token. */
  loginConEnlace: (token: string) => boolean;
  logout: () => void;
}

/**
 * Client access links.
 *
 * An admin generates `#/acceso/<token>` for a cliente; opening it signs that person in with
 * no password. The token is only the base64 of the cliente key, so it is a convenience for
 * the POC and NOT a security boundary: anyone who can guess a client's RNC can build one.
 * A real deployment needs a signed, expiring token issued by a backend.
 */
export const buildAccessToken = (clienteKey: string): string => btoa(clienteKey);

export const parseAccessToken = (token: string): string | null => {
  try {
    const key = atob(token);
    return /^(CED|PAS|RNC|TID):[0-9A-Z]+$/.test(key) ? key : null;
  } catch {
    return null;
  }
};

export const buildAccessLink = (clienteKey: string): string =>
  `${window.location.origin}${window.location.pathname}#/acceso/${buildAccessToken(clienteKey)}`;

/** Where each role lands after login and when it hits a route it may not use. */
export const homeForRole = (role: UserRole): string => (role === 'cliente' ? '/portal' : '/dashboard');

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
  loginConEnlace: (token) => {
    const clienteKey = parseAccessToken(token);
    if (!clienteKey) return false;
    const safeUser: SafeUser = {
      id: `link-${clienteKey}`,
      name: 'Cliente',
      email: '',
      role: 'cliente',
      clienteKey,
    };
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

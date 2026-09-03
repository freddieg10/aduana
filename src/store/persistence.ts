import { useExpedientesStore } from './expedientesStore';
import { useRelacionadosStore } from './relacionadosStore';
import { useNotificationStore } from './notificationStore';

/**
 * Session-scoped persistence.
 *
 * Every store below writes to localStorage, so a page refresh (or an accidental tab close)
 * keeps the user's work. Logging out wipes those keys and puts each store back to its seed,
 * so the next session starts clean.
 *
 * The theme store is deliberately NOT here: a light/dark preference is a display setting,
 * not session data, and should survive logout.
 */
interface PersistedStore {
  persist: { clearStorage: () => void };
  getState: () => { resetToSeed: () => void };
}

const PERSISTED_STORES: PersistedStore[] = [
  useExpedientesStore,
  useRelacionadosStore,
  useNotificationStore,
];

/** The localStorage keys those stores own, for diagnostics and manual cleanup. */
export const PERSISTED_KEYS = [
  'aduana-expedientes',
  'aduana-relacionados',
  'aduana-notifications',
] as const;

/**
 * Resets in-memory state to the seed data and drops the persisted copy.
 *
 * Order matters: `resetToSeed` is a `set`, which makes the persist middleware write the seed
 * straight back to storage. Clearing afterwards leaves no key behind, so a logout really does
 * empty the browser. Storage can also be unavailable (private browsing, disabled site data),
 * so a failure to clear it must not stop the reset — otherwise data would stay on screen.
 */
export function clearPersistedData(): void {
  for (const store of PERSISTED_STORES) {
    store.getState().resetToSeed();
    try {
      store.persist.clearStorage();
    } catch {
      /* storage unavailable — the in-memory reset above already happened */
    }
  }
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DIGITADORES, GESTORES, TASA_CAMBIO_DEFAULT } from '../data/catalogos';

export interface TarifaServicio {
  id: string;
  servicio: string;
  precio: number;
  moneda: 'DOP' | 'USD';
  notas: string;
}

export interface SettingsState {
  /** RD$ per USD used for new expedientes. */
  tasaUsd: number;
  tasaUsdActualizada: string;
  /**
   * Days after arrival before the Art. 52 surcharge applies. The DGA gives importers a
   * window to file after the goods arrive; past it the declaration carries a recargo.
   * Confirm the exact figure with the DGA before relying on the reports.
   */
  diasArt52: number;
  tarifario: TarifaServicio[];
  digitadores: string[];
  gestores: string[];

  setTasaUsd: (tasa: number) => void;
  setDiasArt52: (dias: number) => void;
  addTarifa: (t: Omit<TarifaServicio, 'id'>) => void;
  updateTarifa: (id: string, t: Partial<TarifaServicio>) => void;
  removeTarifa: (id: string) => void;
  setDigitadores: (nombres: string[]) => void;
  setGestores: (nombres: string[]) => void;
  resetToSeed: () => void;
}

const SEED_TARIFARIO: TarifaServicio[] = [
  { id: 'tf-1', servicio: 'Gestión de despacho a consumo', precio: 8500, moneda: 'DOP', notas: 'Por expediente' },
  { id: 'tf-2', servicio: 'Renglón adicional', precio: 150, moneda: 'DOP', notas: 'A partir del renglón 11' },
  { id: 'tf-3', servicio: 'Manejo de contenedor', precio: 3500, moneda: 'DOP', notas: 'Por contenedor' },
  { id: 'tf-4', servicio: 'Trámite VUCE / permisos', precio: 2500, moneda: 'DOP', notas: 'Por permiso' },
  { id: 'tf-5', servicio: 'Despacho urgente', precio: 100, moneda: 'USD', notas: 'Fuera de horario' },
];

const SEED: Pick<SettingsState, 'tasaUsd' | 'tasaUsdActualizada' | 'diasArt52' | 'tarifario' | 'digitadores' | 'gestores'> = {
  tasaUsd: TASA_CAMBIO_DEFAULT,
  tasaUsdActualizada: '',
  diasArt52: 30,
  tarifario: SEED_TARIFARIO,
  digitadores: DIGITADORES,
  gestores: GESTORES,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...SEED,

      setTasaUsd: (tasa) => set({ tasaUsd: tasa, tasaUsdActualizada: new Date().toISOString() }),
      setDiasArt52: (dias) => set({ diasArt52: dias }),

      addTarifa: (t) => set((s) => ({ tarifario: [...s.tarifario, { ...t, id: crypto.randomUUID() }] })),
      updateTarifa: (id, t) => set((s) => ({ tarifario: s.tarifario.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      removeTarifa: (id) => set((s) => ({ tarifario: s.tarifario.filter((x) => x.id !== id) })),

      setDigitadores: (nombres) => set({ digitadores: nombres }),
      setGestores: (nombres) => set({ gestores: nombres }),

      resetToSeed: () => set({ ...SEED }),
    }),
    {
      name: 'aduana-settings',
      version: 1,
      partialize: (s) => ({
        tasaUsd: s.tasaUsd, tasaUsdActualizada: s.tasaUsdActualizada, diasArt52: s.diasArt52,
        tarifario: s.tarifario, digitadores: s.digitadores, gestores: s.gestores,
      }),
    },
  ),
);

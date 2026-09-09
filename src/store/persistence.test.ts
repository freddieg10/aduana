import { describe, it, expect } from 'vitest';
import { clearPersistedData, PERSISTED_KEYS } from './persistence';
import { useExpedientesStore } from './expedientesStore';
import { useRelacionadosStore } from './relacionadosStore';
import { useNotificationStore } from './notificationStore';

describe('clearPersistedData', () => {
  it('puts every session store back to its seed', () => {
    const expedientesAntes = useExpedientesStore.getState().expedientes.length;
    const clientesAntes = useRelacionadosStore.getState().clientes.length;
    const notificacionesAntes = useNotificationStore.getState().notifications.length;

    // dirty every store the way a session would
    useExpedientesStore.getState().remove(useExpedientesStore.getState().expedientes[0].id);
    useRelacionadosStore.getState().addCliente({
      tipo: 'Persona', tipoDocumento: 'CED', documento: '001-1234567-8', nombre: 'JUAN PEREZ',
      email: '', calle: '', ciudad: '', telefono: '', zona: '', fax: '', pais: '214',
    });
    useNotificationStore.getState().add({ type: 'info', expedienteId: '1', message: 'temporal', read: false });

    expect(useExpedientesStore.getState().expedientes).toHaveLength(expedientesAntes - 1);
    expect(useRelacionadosStore.getState().clientes).toHaveLength(clientesAntes + 1);
    expect(useNotificationStore.getState().notifications).toHaveLength(notificacionesAntes + 1);

    clearPersistedData();

    expect(useExpedientesStore.getState().expedientes).toHaveLength(expedientesAntes);
    expect(useRelacionadosStore.getState().clientes).toHaveLength(clientesAntes);
    expect(useNotificationStore.getState().notifications).toHaveLength(notificacionesAntes);
    expect(useRelacionadosStore.getState().clientes.some((c) => c.nombre === 'JUAN PEREZ')).toBe(false);
  });

  it('survives storage being unavailable', () => {
    // In this environment localStorage does not exist, so clearStorage is a no-op and the
    // in-memory reset must still happen — the same path a private-browsing session takes.
    expect(() => clearPersistedData()).not.toThrow();
  });

  it('lists one storage key per persisted store, and not the theme', () => {
    expect(PERSISTED_KEYS).toHaveLength(4);
    expect(PERSISTED_KEYS).toContain('aduana-settings');
    expect(PERSISTED_KEYS).not.toContain('aduana-theme-storage');
  });
});

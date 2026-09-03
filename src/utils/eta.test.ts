import { describe, it, expect } from 'vitest';
import { etaRowClass } from './eta';
import { ExpedienteStatus } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-02T12:00:00Z').getTime();
const withEta = (eta: string, status: ExpedienteStatus) =>
  ({ status, declaracion: { eta } } as Parameters<typeof etaRowClass>[0]);

describe('etaRowClass', () => {
  it('is orange when the ETA has passed and the file is not yet filed', () => {
    expect(etaRowClass(withEta('2026-08-01', ExpedienteStatus.Registrado), now)).toBe('row-overdue');
    expect(etaRowClass(withEta('2026-08-01', ExpedienteStatus.PreLiquidado), now)).toBe('row-overdue');
  });

  it('is yellow when the ETA is within 7 days', () => {
    const in3days = new Date(now + 3 * DAY).toISOString().slice(0, 10);
    expect(etaRowClass(withEta(in3days, ExpedienteStatus.Manifestado), now)).toBe('row-warning');
  });

  it('is empty when the ETA is far away', () => {
    const in30days = new Date(now + 30 * DAY).toISOString().slice(0, 10);
    expect(etaRowClass(withEta(in30days, ExpedienteStatus.Registrado), now)).toBe('');
  });

  it('never highlights files at or past Presentado', () => {
    for (const s of [ExpedienteStatus.Presentado, ExpedienteStatus.ProcesoVerificacion, ExpedienteStatus.Verificado, ExpedienteStatus.Despacho, ExpedienteStatus.Completo]) {
      expect(etaRowClass(withEta('2020-01-01', s), now)).toBe('');
    }
  });

  it('ignores missing or invalid ETAs', () => {
    expect(etaRowClass(withEta('', ExpedienteStatus.Registrado), now)).toBe('');
    expect(etaRowClass(withEta('garbage', ExpedienteStatus.Registrado), now)).toBe('');
  });
});

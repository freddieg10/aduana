import { describe, it, expect } from 'vitest';
import { findPuerto } from './puertos';

describe('findPuerto', () => {
  it('resolves by code, exact name, and loose name', () => {
    expect(findPuerto('DOHAI')?.nombre).toBe('RIO HAINA');
    expect(findPuerto('RIO HAINA')?.codigo).toBe('DOHAI');
    expect(findPuerto('Haina')?.codigo).toBe('DOHAI');
    expect(findPuerto('Puerto Plata')?.codigo).toBe('DOPOP');
    expect(findPuerto('caucedo')?.codigo).toBe('DOCAU');
  });

  it('returns undefined for unknown or empty values', () => {
    expect(findPuerto('')).toBeUndefined();
    expect(findPuerto('Rotterdam')).toBeUndefined();
  });
});

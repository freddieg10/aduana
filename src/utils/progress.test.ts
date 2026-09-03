import { describe, it, expect } from 'vitest';
import { computeProgress } from './progress';

const item = (completed: boolean) => ({ id: '', label: '', completed, completedAt: null });

describe('computeProgress', () => {
  it('is 0 for an empty checklist', () => {
    expect(computeProgress([])).toBe(0);
  });

  it('rounds to the nearest whole percent', () => {
    expect(computeProgress([item(true), item(false), item(false)])).toBe(33);
    expect(computeProgress([item(true), item(true), item(false)])).toBe(67);
    expect(computeProgress([item(true), item(true)])).toBe(100);
  });
});

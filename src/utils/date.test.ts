import { describe, it, expect } from 'vitest';
import { fmtDate, fmtDateTime } from './date';

describe('fmtDate', () => {
  it('formats ISO dates as dd/mm/yyyy', () => {
    expect(fmtDate('2026-04-05T14:30:00Z')).toMatch(/^0[45]\/04\/2026$/); // day depends on local TZ
    expect(fmtDate(new Date(2026, 0, 9))).toBe('09/01/2026');
  });

  it('returns a dash for empty or invalid input', () => {
    expect(fmtDate('')).toBe('—');
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
    expect(fmtDate('not a date')).toBe('—');
  });
});

describe('fmtDateTime', () => {
  it('includes hours and minutes', () => {
    expect(fmtDateTime(new Date(2026, 2, 3, 7, 5))).toBe('03/03/2026 07:05');
  });
});

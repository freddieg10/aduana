import type { ChecklistItem } from '../types';

export function computeProgress(checklist: ChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100);
}

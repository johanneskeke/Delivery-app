import type { Stop, StopTag } from '../domain/types';

export const tagLabel: Record<StopTag, string> = {
  priority: 'Prio',
  cooled: 'Gekühlt',
  fragile: 'Zerbrechlich',
  heavy: 'Schwer',
};

export function timeWindowLabel(stop: Stop): string | null {
  return stop.timeWindow ? `${stop.timeWindow.from}–${stop.timeWindow.to}` : null;
}

export function formatTime(iso?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

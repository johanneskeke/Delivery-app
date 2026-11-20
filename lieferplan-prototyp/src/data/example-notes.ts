/**
 * Pre-filled driver note (decided 2026-11-20, "Settings and notes details"): synthetic example from an "earlier driver"
 * at the house number that does not exist, written in German as a Berlin driver would. "Reset demo" keeps it.
 */
import { tour } from './bundle';

export type DriverNote = { text: string; at: string; example?: boolean };

const ADDRESS = 'Chamissoplatz 9';
const stopNo = tour.stops.find((s) => s.address === ADDRESS)?.no;

export const EXAMPLE_NOTES: Record<number, DriverNote> = stopNo
  ? { [stopNo]: { text: 'Nr. 9 gibt es nicht – Eingang ist Nr. 8, Seitenflügel, 2. OG.', at: '2026-11-12', example: true } }
  : {};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-26" → "Thu 26 Nov 2026" (no locale dependency on the phone). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-11-20T16:45:39+01:00" → "20 Nov 2026, 16:45" (time as written by the engine). */
export function formatDateTime(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}, ${iso.slice(11, 16)}`;
}

/** "2026-11-19" → "19 Nov" */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "16:59" → "17:00": a precomputed clock time rounded to the quarter hour, so it does not look more exact than it is. */
export function roundToQuarter(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.round((h * 60 + m) / 15) * 15;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" by the phone's clock. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Minutes from "08:30" to "17:00". */
export function minutesBetween(from: string, to: string): number {
  const m = (t: string) => {
    const [h, mm] = t.split(':').map(Number);
    return h * 60 + mm;
  };
  return m(to) - m(from);
}

/** 195 → "3 h 15 min", 45 → "45 min". */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

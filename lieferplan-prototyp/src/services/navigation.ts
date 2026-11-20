import type { LatLng } from '../data/types';

/**
 * Hand-off to the navigation app (decided 2026-11-20, docs/01 Step 5 and "Settings and notes details").
 * - Google Maps URLs: https://developers.google.com/maps/documentation/urls
 * - Apple Maps unified URLs (iOS 18.4+): https://developer.apple.com/documentation/mapkit/unified-map-urls
 * - Waze deep links: https://waze.com/ul?ll=<lat>,<lng>&navigate=yes
 * No origin anywhere: every app starts at the current location.
 */

type Place = LatLng | string;

const placeText = (p: Place) => (typeof p === 'string' ? p : `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
const enc = (p: Place) => encodeURIComponent(placeText(p));

/** One driving link per halt to the parking point; starts turn-by-turn directly. */
export function drivingUrl(parking: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${enc(parking)}&travelmode=driving&dir_action=navigate`;
}

/**
 * One walking link per halt with all doors: the earlier doors as waypoints, the last door as destination.
 * No dir_action, so Google first shows the overview of all doors. Rule D (≤4 stops) keeps it at ≤3 waypoints.
 */
export function walkingUrl(doors: Place[]): string {
  if (doors.length === 0) throw new Error('walkingUrl needs at least one door');
  const destination = doors[doors.length - 1];
  const waypoints = doors.slice(0, -1);
  const parts = ['api=1', `destination=${enc(destination)}`, 'travelmode=walking'];
  if (waypoints.length) parts.push(`waypoints=${encodeURIComponent(waypoints.map(placeText).join('|'))}`);
  return `https://www.google.com/maps/dir/?${parts.join('&')}`;
}

/** Apple Maps directions; `waypoints` are tried only in the map test (not documented for walking). */
export function appleUrl(destination: Place, mode: 'driving' | 'walking', waypoints: Place[] = []): string {
  const parts = [`destination=${enc(destination)}`, `mode=${mode}`, ...waypoints.map((w) => `waypoint=${enc(w)}`)];
  return `https://maps.apple.com/directions?${parts.join('&')}`;
}

/** Waze: driving only; navigation starts directly. Coordinates only (Waze needs ll=). */
export function wazeUrl(p: LatLng): string {
  return `https://waze.com/ul?ll=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&navigate=yes`;
}

// ---------------------------------------------------------------- switch for the navigation app (settings)

export type NavApp = 'google' | 'apple' | 'waze';
export const NAV_APPS: NavApp[] = ['google', 'apple', 'waze'];
export const NAV_APP_NAME: Record<NavApp, string> = { google: 'Google Maps', apple: 'Apple Maps', waze: 'Waze' };

/** Driving to the parking point (or to the depot address, which Waze cannot take as text). */
export function driveLink(app: NavApp, target: Place): string {
  switch (app) {
    case 'google':
      return drivingUrl(target);
    case 'apple':
      return appleUrl(target, 'driving');
    case 'waze':
      return typeof target === 'string' ? `https://waze.com/ul?q=${encodeURIComponent(target)}&navigate=yes` : wazeUrl(target);
  }
}

/** Waze has no walking mode: walking then uses Apple Maps (always on the iPhone). */
export const walkApp = (app: NavApp): Exclude<NavApp, 'waze'> => (app === 'waze' ? 'apple' : app);

/** One walking link for the whole halt (Google Maps only); null → one link per door instead. */
export function walkHaltLink(app: NavApp, doors: LatLng[]): string | null {
  return walkApp(app) === 'google' ? walkingUrl(doors) : null;
}

/** Walking link to one door (Apple Maps, also when Waze is chosen). */
export function walkDoorLink(app: NavApp, door: LatLng): string {
  return walkApp(app) === 'google' ? walkingUrl([door]) : appleUrl(door, 'walking');
}

import type { LatLng } from '../data/types';

/**
 * Hand-off to Google Maps via the official Maps URLs (https://developers.google.com/maps/documentation/urls).
 * On the phone the links open the Google Maps app if installed, otherwise the browser.
 * Decided 2026-11-20 (docs/01, Step 5): no origin (Google starts at the current location).
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

// ---------------------------------------------------------------- switch for the navigation app

/** The settings (Tue 2026-11-24) add Apple Maps and Waze; until then every button uses Google Maps. */
export type NavApp = 'google';
export const NAV_APP_NAME: Record<NavApp, string> = { google: 'Google Maps' };

export function driveLink(app: NavApp, parking: Place): string {
  switch (app) {
    case 'google':
      return drivingUrl(parking);
  }
}

/** Walking links for one halt: Google Maps takes all doors in one link. */
export function walkLinks(app: NavApp, doors: Place[]): { label: string; url: string }[] {
  switch (app) {
    case 'google':
      return [{ label: `Walk in ${NAV_APP_NAME[app]}`, url: walkingUrl(doors) }];
  }
}

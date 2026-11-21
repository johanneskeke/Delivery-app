import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bundleProblems, importData, meta, plans, route, tour } from '../src/data/bundle';
import { formatDate } from '../src/lib/format';
import { drivingUrl, walkingUrl } from '../src/services/navigation';

test('Google Maps links (decided 2026-11-20)', () => {
  assert.equal(
    drivingUrl({ lat: 52.4893, lng: 13.3906 }),
    'https://www.google.com/maps/dir/?api=1&destination=52.489300%2C13.390600&travelmode=driving&dir_action=navigate',
  );
  // One walking link per halt: earlier doors as waypoints, last door as destination, no origin, no dir_action.
  assert.equal(
    walkingUrl([{ lat: 52.493361, lng: 13.392972 }, { lat: 52.49272, lng: 13.392795 }]),
    'https://www.google.com/maps/dir/?api=1&destination=52.492720%2C13.392795&travelmode=walking&waypoints=52.493361%2C13.392972',
  );
  assert.equal(
    walkingUrl(['Bergmannstraße 12, 10961 Berlin']),
    'https://www.google.com/maps/dir/?api=1&destination=Bergmannstra%C3%9Fe%2012%2C%2010961%20Berlin&travelmode=walking',
  );
});

test('data bundle: format version and synthetic label', () => {
  assert.deepEqual(bundleProblems(), []);
  assert.equal(meta.synthetic, true);
  assert.equal(tour.header.tour_id, 'KRZ-61-07');
});

test('data bundle: 95 shipments on 58 stops, 10 import notes', () => {
  assert.equal(tour.shipments.length, 95);
  assert.equal(tour.stops.length, 58);
  assert.equal(importData.notes.length, 10);
  assert.ok(importData.notes.some((n) => n.text === 'Chamissoplatz 9 not found, Chamissoplatz 8 used'));
});

test('data bundle: every plan has every stop exactly once', () => {
  const all = tour.stops.map((s) => s.no).sort((a, b) => a - b);
  for (const plan of Object.values(plans)) {
    const seen = plan.halts.flatMap((h) => h.stops.map((s) => s.no)).sort((a, b) => a - b);
    assert.deepEqual(seen, all, plan.mode);
  }
});

test('data bundle: proposed plans have no conflicts and a slot for every shipment', () => {
  for (const mode of ['only_necessary', 'replan_full'] as const) {
    const p = plans[mode];
    assert.equal(p.kpis.conflicts, 0, mode);
    assert.equal(Object.keys(p.slots).length, 95, mode);
  }
  assert.ok(plans.before.kpis.conflicts > 0);
});

test('the app uses "replan completely" (B8, redesign 2026-11-20) and every heavy parcel sits in slot 1–2', () => {
  assert.equal(meta.start_mode, 'replan_full');
  assert.equal(route.mode, 'replan_full');
  const weight = new Map(tour.shipments.map((s) => [s.id, s.weight_kg]));
  const heavyUp = Object.entries(route.slots).filter(
    ([id, s]) => (weight.get(id) ?? 0) > 10 && /[34]$/.test(s.slot) && s.slot !== 'C4',
  );
  assert.deepEqual(heavyUp, []);
});

test('date format', () => {
  assert.equal(formatDate('2026-11-26'), 'Thu 26 Nov 2026');
});

test('start card: return time rounded to the quarter hour', async () => {
  const { roundToQuarter } = await import('../src/lib/format');
  assert.equal(roundToQuarter('16:59'), '17:00');
  assert.equal(roundToQuarter('08:07'), '08:00');
  assert.equal(roundToQuarter('08:08'), '08:15');
});

test('insights: time saved from the rounded time spans', async () => {
  const { formatDuration, minutesBetween } = await import('../src/lib/format');
  assert.equal(minutesBetween('17:00', '20:15'), 195);
  assert.equal(formatDuration(195), '3 h 15 min');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(120), '2 h');
});

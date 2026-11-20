import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultSlots, createDemoTour } from '../src/domain/demo-tour';
import { distanceM } from '../src/lib/geo';
import { demoProvider, distanceToDisruptionM, findImpacts } from '../src/services/disruptions';
import { defaultHaltOptions } from '../src/services/halts';
import { recommendSlot } from '../src/services/loading';
import { drivingUrl, walkingUrl } from '../src/services/navigation';
import { buildOriginalPlan, buildProposedPlan, indexStops } from '../src/services/routing';

const tour = createDemoTour(new Date('2026-11-26T08:00:00+01:00'));
const ctx = { area: { south: 0, west: 0, north: 0, east: 0 }, date: tour.date };

test('Demo-Sperrung trifft die Stopps an der Bergmannstraße', async () => {
  const disruptions = await demoProvider.fetch(ctx);
  const affected = findImpacts(tour.stops, disruptions).map((i) => i.stopId).sort();
  assert.deepEqual(affected, ['s04', 's12']);
});

test('Vorschlag bündelt Stopps, jeder Stopp kommt genau einmal vor', async () => {
  const disruptions = await demoProvider.fetch(ctx);
  const plan = buildProposedPlan(tour, disruptions);
  const ids = plan.halts.flatMap((h) => h.stopIds).sort();
  assert.deepEqual(ids, tour.stops.map((s) => s.id).sort());
  assert.ok(plan.halts.length < tour.stops.length, 'mindestens zwei Stopps teilen sich einen Halt');

  const stops = indexStops(tour.stops);
  for (const h of plan.halts) {
    assert.ok(h.stopIds.length <= defaultHaltOptions.maxStopsPerHalt);
    for (const id of h.stopIds) {
      assert.ok(distanceM(h.parking, stops[id].position!) <= 260, `Fußweg zu ${id} zu lang`);
    }
  }
});

test('Kein Parkpunkt liegt in der Sperrung', async () => {
  const disruptions = await demoProvider.fetch(ctx);
  const plan = buildProposedPlan(tour, disruptions);
  for (const h of plan.halts) {
    assert.ok(distanceToDisruptionM(h.parking, disruptions[0]) > defaultHaltOptions.closureBufferM, `${h.id} parkt in Sperrung`);
  }
});

test('Zeitfenster-Stopps kommen zuerst, Vorschlag ist kürzer als das Original', async () => {
  const disruptions = await demoProvider.fetch(ctx);
  const impacts = findImpacts(tour.stops, disruptions);
  const original = buildOriginalPlan(tour, impacts);
  const proposed = buildProposedPlan(tour, disruptions);
  assert.ok(proposed.halts[0].stopIds.includes('s04'), 'Café (08–10 Uhr) zuerst');
  assert.ok(proposed.driveDistanceM < original.driveDistanceM);
  console.log(
    `Original: ${original.halts.length} Halte, ${original.driveDistanceM} m · Vorschlag: ${proposed.halts.length} Halte, ${proposed.driveDistanceM} m`,
  );
  proposed.halts.forEach((h, i) => console.log(`  Halt ${i + 1}: ${h.stopIds.join(', ')} ${h.notes.join(' | ')}`));
});

test('Fach-Empfehlung: gleicher Halt → gleiches Fach', async () => {
  const disruptions = await demoProvider.fetch(ctx);
  const plan = buildProposedPlan(tour, disruptions);
  const slots = createDefaultSlots();
  const multiHalt = plan.halts.find((h) => h.stopIds.length > 1)!;
  const [a, b] = multiHalt.stopIds;
  const pkgA = tour.packages.find((p) => p.stopId === a)!;
  const pkgB = tour.packages.find((p) => p.stopId === b)!;

  const first = recommendSlot(pkgA, plan, tour.packages, slots)!;
  const packages = tour.packages.map((p) => (p.id === pkgA.id ? { ...p, slotId: 'C3' } : p));
  const second = recommendSlot(pkgB, plan, packages, slots)!;
  assert.equal(second.slotId, 'C3');
  assert.match(second.reason, /denselben Halt/);
  assert.ok(first.slotId);
});

test('Google-Maps-Links', () => {
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

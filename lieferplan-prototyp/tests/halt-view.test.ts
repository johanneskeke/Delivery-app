import assert from 'node:assert/strict';
import { test } from 'node:test';

import { route } from '../src/data/bundle';
import { completeStatus, stopCard, stopDone, takeOut } from '../src/data/halt-view';

const haltWith = (address: string) => {
  const h = route.halts.find((x) => x.stops.some((s) => s.address === address));
  assert.ok(h, `no halt with ${address}`);
  return h;
};

test('Solmsstraße: one line why names the closure and the parking street', () => {
  const h = haltWith('Solmsstraße 7');
  assert.equal(h.reason?.text, 'Solmsstraße closed – park here');
  assert.equal(h.parking.street, 'Fürbringerstraße');
  assert.equal(h.reason?.source, 'VIZ Berlin');
});

test('Zossener Straße 14: bulky item on the floor, the other parcel on the shelf', () => {
  const t = takeOut(haltWith('Zossener Straße 14'));
  assert.match(t, /Floor × 1 \(bulky\)/);
  assert.match(t, /[ABC]\d × 2/); // the workshop also gets two normal parcels
});

test('Chamissoplatz 9: import note on the stop card', () => {
  const h = haltWith('Chamissoplatz 9');
  const card = stopCard(h.stops.find((s) => s.address === 'Chamissoplatz 9')!);
  assert.equal(card.importNote, 'Chamissoplatz 9 not found, Chamissoplatz 8 used');
});

test('every halt has something to take out or is a pickup', () => {
  for (const h of route.halts) {
    const cards = h.stops.map(stopCard);
    assert.ok(takeOut(h) || cards.every((c) => c.pickupOnly), h.id);
  }
});

test('pickups are marked and not taken out of a shelf', () => {
  const pickupStops = route.halts.flatMap((h) => h.stops).map(stopCard).filter((c) => c.pickups > 0);
  assert.equal(pickupStops.reduce((n, c) => n + c.pickups, 0), 3);
  assert.ok(pickupStops.every((c) => c.badges.includes('Pickup')));
});

test('a stop with a parcel and a pickup is done only when both are confirmed (or not at home)', () => {
  const stop = route.halts.flatMap((h) => h.stops).find((s) => stopCard(s).pickups > 0 && stopCard(s).parcels > 0)!;
  const card = stopCard(stop);
  assert.equal(stopDone(card, { delivered: true }), false);
  assert.equal(stopDone(card, { pickedUp: true }), false);
  assert.equal(stopDone(card, { delivered: true, pickedUp: true }), true);
  assert.equal(stopDone(card, { notHome: 'neighbour' }), true);
  assert.deepEqual(completeStatus(stop), { delivered: true, pickedUp: true });
});
